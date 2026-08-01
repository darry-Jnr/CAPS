import { randomUUID } from "crypto";
import { chatCompletion, estimateTokens, type ChatMessage, type GroqUsage } from "@/lib/groq";
import { compressSegment } from "@/lib/paritok";
import { retrieveChunks } from "@/lib/retrieval";
import { storeApi } from "@/lib/store";
import {
  detectStudyIntent,
  generateStudyContent,
  studyConfirmation,
  type StudyContent,
} from "@/lib/study";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WITH_DOC_SYSTEM =
  "You are CAPS, a study assistant for students. Answer the student's question using ONLY the document context provided. If the context does not contain the answer, say so plainly. Be concise and clear.";
const NO_DOC_SYSTEM =
  "You are CAPS, a study assistant for students. Answer the student's question concisely.";

interface ChatBody {
  messages: ChatMessage[];
  docId?: string;
  paritokOn?: boolean;
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.messages?.length) {
    return Response.json({ error: "messages is required" }, { status: 400 });
  }

  const messages = body.messages;
  const docId = body.docId;
  const paritokOn = body.paritokOn ?? true;
  const question = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const doc = docId ? await storeApi.getDocument(docId) : undefined;
  const intent = detectStudyIntent(question);

  if (intent && !doc) {
    return Response.json({
      reply: "Upload a document first, then I can summarise it or quiz you on it.",
      mode: paritokOn ? "on" : "off",
      elapsedMs: Date.now() - startedAt,
    });
  }

  const selected = doc ? retrieveChunks(doc.chunks, question) : [];

  const originalContext = selected.join("\n\n");

  let contextText = originalContext;
  let compression: { originalTokens: number; compressedTokens: number } | undefined;
  let fallbackReason: string | undefined;

  if (paritokOn && selected.length > 0) {
    try {
      const compressed = await Promise.all(
        selected.map((chunk) => compressSegment(chunk, question, "file_read")),
      );
      contextText = compressed.map((c) => c.compressed).join("\n\n");
      compression = {
        originalTokens: estimateTokens(originalContext),
        compressedTokens: estimateTokens(contextText),
      };
    } catch (error) {
      contextText = originalContext;
      fallbackReason = error instanceof Error ? error.message : "Paritok unavailable";
    }
  }

  const contextMessages: ChatMessage[] = [
    { role: "system", content: doc ? WITH_DOC_SYSTEM : NO_DOC_SYSTEM },
  ];
  if (doc) {
    contextMessages.push({ role: "system", content: `Document: ${doc.name}\n\nContext:\n${contextText}` });
  }
  contextMessages.push(...messages.filter((m) => m.role !== "system"));

  let content: string;
  let usage: GroqUsage;
  let study: StudyContent | undefined;

  if (intent && doc) {
    const result = await generateStudyContent(contextText, doc.name, intent);
    if (result) {
      study = result.study;
      content = studyConfirmation(study, doc.name);
      usage = result.usage;
    } else {
      const completion = await chatCompletion(contextMessages);
      content = completion.content;
      usage = completion.usage;
    }
  } else {
    const completion = await chatCompletion(contextMessages);
    content = completion.content;
    usage = completion.usage;
  }

  let baselineTokens = usage.prompt_tokens;
  if (paritokOn && compression) {
    const delta = Math.max(0, compression.originalTokens - compression.compressedTokens);
    baselineTokens = usage.prompt_tokens + delta;
  }

  await storeApi.addQuestion({
    id: randomUUID(),
    askedAt: Date.now(),
    mode: paritokOn ? "on" : "off",
    question,
    promptTokens: usage.prompt_tokens,
    baselineTokens,
    elapsedMs: Date.now() - startedAt,
    answerChars: content.length,
    docId,
  });

  return Response.json({
    reply: content,
    usage,
    mode: paritokOn ? "on" : "off",
    elapsedMs: Date.now() - startedAt,
    compression,
    fallbackReason,
    study,
    doc: doc ? { name: doc.name, chunks: doc.chunks.length } : undefined,
  });
}
