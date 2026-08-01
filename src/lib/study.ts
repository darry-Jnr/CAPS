import { chatCompletion, type GroqUsage } from "@/lib/groq";

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface StudyIntent {
  summary: boolean;
  quiz: boolean;
  concepts: boolean;
}

export interface StudyContent {
  summary: string;
  keyConcepts: string[];
  quiz: QuizQuestion[];
}

const SUMMARY_WORDS = ["summar", "summary", "overview", "tl;dr", "tldr", "recap", "main idea", "key point", "brief me"];
const QUIZ_WORDS = ["quiz", "test me", "flashcard", "concept check", "q&a", "question me", "multiple choice"];
const CONCEPT_WORDS = ["study guide", "revise", "revision", "review", "learn", "key concept", "notes", "study"];

const containsAny = (text: string, words: string[]) => words.some((w) => text.includes(w));

export function detectStudyIntent(question: string): StudyIntent | null {
  const q = question.toLowerCase();
  const summary = containsAny(q, SUMMARY_WORDS);
  const quiz = containsAny(q, QUIZ_WORDS);
  const concepts = containsAny(q, CONCEPT_WORDS);
  if (!summary && !quiz && !concepts) return null;
  return { summary, quiz, concepts };
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sanitizeQuiz(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: QuizQuestion[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { question?: unknown }).question === "string" &&
      Array.isArray((item as { options?: unknown }).options) &&
      ((item as { options: unknown[] }).options as unknown[]).length === 4 &&
      typeof (item as { answerIndex?: unknown }).answerIndex === "number"
    ) {
      const q = item as { question: string; options: unknown[]; answerIndex: number };
      if (q.answerIndex >= 0 && q.answerIndex < 4) {
        out.push({ question: q.question, options: q.options.map(String), answerIndex: q.answerIndex });
      }
    }
  }
  return out.slice(0, 8);
}

function buildPrompt(context: string, docName: string | undefined, intent: StudyIntent): string {
  const parts: string[] = [];
  parts.push(
    "You are CAPS, a study assistant for students. Produce a study pack from the document context below.",
  );
  if (docName) parts.push(`Document: "${docName}"`);
  parts.push(
    "Return ONLY valid JSON. No markdown code fences, no commentary, no text outside the JSON object.",
  );

  const schema: string[] = [];
  if (intent.summary) {
    schema.push('"summary": "<concise 2-3 sentence summary of the document>"');
  }
  schema.push('"keyConcepts": ["<5-8 short bullet-style key concepts>"]');
  if (intent.quiz) {
    schema.push(
      '"quiz": [{"question": "<question>", "options": ["<option A>","<option B>","<option C>","<option D>"], "answerIndex": <0-3>}]',
    );
  }
  parts.push(`JSON schema (use exactly this shape):\n{ ${schema.join(", ")} }`);

  if (intent.quiz) {
    parts.push(
      'Generate exactly 5 multiple-choice quiz questions that test understanding of the most important material. "answerIndex" is the zero-based index of the correct option.',
    );
  }
  if (!intent.summary) parts.push('If "summary" is not requested, omit it.');
  parts.push(
    "Only use facts present in the context. Do not invent information.\n\nContext:\n" + context.slice(0, 8000),
  );

  return parts.join("\n");
}

export function studyConfirmation(study: StudyContent, docName?: string): string {
  const parts: string[] = [];
  if (study.summary) parts.push("a summary");
  if (study.keyConcepts.length > 0) parts.push(`${study.keyConcepts.length} key concepts`);
  if (study.quiz.length > 0) parts.push(`${study.quiz.length} quiz questions`);
  const doc = docName ? ` for "${docName}"` : "";
  return `Got it${doc}. Here's ${parts.join(", ")} — open the study panel.`;
}

export async function generateStudyContent(
  context: string,
  docName: string | undefined,
  intent: StudyIntent,
): Promise<{ study: StudyContent; usage: GroqUsage } | null> {
  const prompt = buildPrompt(context, docName, intent);
  const { content, usage } = await chatCompletion([{ role: "system", content: prompt }]);
  const raw = extractJson(content);
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as { summary?: unknown; keyConcepts?: unknown; quiz?: unknown };
  const study: StudyContent = {
    summary: typeof obj.summary === "string" ? obj.summary : "",
    keyConcepts: Array.isArray(obj.keyConcepts)
      ? obj.keyConcepts.filter((c): c is string => typeof c === "string").slice(0, 10)
      : [],
    quiz: sanitizeQuiz(obj.quiz),
  };

  if (!study.summary && study.keyConcepts.length === 0 && study.quiz.length === 0) return null;
  return { study, usage };
}
