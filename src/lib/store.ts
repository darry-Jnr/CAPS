import { kv } from "@vercel/kv";
import { config } from "@/lib/config";

export interface DocumentRecord {
  id: string;
  name: string;
  chunks: string[];
  uploadedAt: number;
}

export interface QuestionRecord {
  id: string;
  askedAt: number;
  mode: "on" | "off";
  question: string;
  promptTokens: number;
  baselineTokens: number;
  elapsedMs: number;
  answerChars: number;
  docId?: string;
}

export interface StatsSnapshot {
  docsUploaded: number;
  chunksStored: number;
  questionsAsked: number;
  tokensWithout: number;
  tokensWith: number;
  savedTokens: number;
  savedPercent: number;
  costWithoutUsd: number;
  costWithUsd: number;
  costSavedUsd: number;
  latencyWithoutMs: { avg: number; latest: number; count: number };
  latencyWithMs: { avg: number; latest: number; count: number };
  paritokConfigured: boolean;
}

interface DocMeta {
  id: string;
  name: string;
  uploadedAt: number;
  chunkCount: number;
}

const PREFIX = "caps";
const docsKey = () => `${PREFIX}:docs`;
const questionsKey = () => `${PREFIX}:questions`;
const chunkKey = (docId: string, index: number) => `${PREFIX}:chunk:${docId}:${index}`;

const kvConfigured = () =>
  (process.env.KV_REST_API_URL ?? "").length > 0 &&
  (process.env.KV_REST_API_TOKEN ?? "").length > 0;

const memory = (globalThis as unknown as { __capsStore?: { docs: Map<string, DocumentRecord>; questions: QuestionRecord[] } }).__capsStore ??= {
  docs: new Map<string, DocumentRecord>(),
  questions: [],
};

async function loadAll(): Promise<{ docs: DocumentRecord[]; questions: QuestionRecord[] }> {
  if (!kvConfigured()) {
    return { docs: [...memory.docs.values()], questions: [...memory.questions] };
  }

  const metas = (await kv.get<DocMeta[]>(docsKey())) ?? [];
  const questions = (await kv.get<QuestionRecord[]>(questionsKey())) ?? [];

  const pipeline = kv.pipeline();
  const chunkKeys: string[] = [];
  for (const meta of metas) {
    for (let i = 0; i < meta.chunkCount; i++) {
      chunkKeys.push(chunkKey(meta.id, i));
      pipeline.get<string>(chunkKey(meta.id, i));
    }
  }
  const values = chunkKeys.length ? ((await pipeline.exec()) as (string | null | undefined)[]) : [];

  const docs: DocumentRecord[] = metas.map((meta) => {
    const chunks: string[] = [];
    for (let i = 0; i < meta.chunkCount; i++) {
      const value = values.shift();
      if (typeof value === "string") chunks.push(value);
    }
    return { id: meta.id, name: meta.name, uploadedAt: meta.uploadedAt, chunks };
  });

  return { docs, questions };
}

function computeStats(docs: DocumentRecord[], questions: QuestionRecord[]): StatsSnapshot {
  let tokensWithout = 0;
  let tokensWith = 0;
  const latencyWithout: number[] = [];
  const latencyWith: number[] = [];

  for (const q of questions) {
    if (q.mode === "on") {
      tokensWith += q.promptTokens;
      tokensWithout += q.baselineTokens;
      latencyWith.push(q.elapsedMs);
    } else {
      tokensWithout += q.promptTokens;
      tokensWith += q.promptTokens;
      latencyWithout.push(q.elapsedMs);
    }
  }

  const savedTokens = Math.max(0, tokensWithout - tokensWith);
  const savedPercent = tokensWithout > 0 ? (savedTokens / tokensWithout) * 100 : 0;

  const costWithoutUsd = (tokensWithout / 1_000_000) * config.groqInputPricePer1M;
  const costWithUsd = (tokensWith / 1_000_000) * config.groqInputPricePer1M;

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const latest = (arr: number[]) => (arr.length ? arr[arr.length - 1] : 0);

  return {
    docsUploaded: docs.length,
    chunksStored: docs.reduce((n, d) => n + d.chunks.length, 0),
    questionsAsked: questions.length,
    tokensWithout,
    tokensWith,
    savedTokens,
    savedPercent,
    costWithoutUsd,
    costWithUsd,
    costSavedUsd: costWithoutUsd - costWithUsd,
    latencyWithoutMs: { avg: avg(latencyWithout), latest: latest(latencyWithout), count: latencyWithout.length },
    latencyWithMs: { avg: avg(latencyWith), latest: latest(latencyWith), count: latencyWith.length },
    paritokConfigured: config.hasParitok,
  };
}

export const storeApi = {
  async addDocument(doc: DocumentRecord) {
    if (kvConfigured()) {
      const metas = (await kv.get<DocMeta[]>(docsKey())) ?? [];
      metas.push({ id: doc.id, name: doc.name, uploadedAt: doc.uploadedAt, chunkCount: doc.chunks.length });
      await kv.set(docsKey(), metas);
      const pipeline = kv.pipeline();
      doc.chunks.forEach((chunk, i) => pipeline.set(chunkKey(doc.id, i), chunk));
      await pipeline.exec();
      return;
    }
    memory.docs.set(doc.id, doc);
  },

  async getDocument(id: string): Promise<DocumentRecord | undefined> {
    if (kvConfigured()) {
      const metas = (await kv.get<DocMeta[]>(docsKey())) ?? [];
      const meta = metas.find((m) => m.id === id);
      if (!meta) return undefined;
      const pipeline = kv.pipeline();
      for (let i = 0; i < meta.chunkCount; i++) {
        pipeline.get<string>(chunkKey(id, i));
      }
      const values = meta.chunkCount ? ((await pipeline.exec()) as (string | null | undefined)[]) : [];
      return {
        id: meta.id,
        name: meta.name,
        uploadedAt: meta.uploadedAt,
        chunks: values.filter((v): v is string => typeof v === "string"),
      };
    }
    return memory.docs.get(id);
  },

  async addQuestion(q: QuestionRecord) {
    if (kvConfigured()) {
      const questions = (await kv.get<QuestionRecord[]>(questionsKey())) ?? [];
      questions.push(q);
      await kv.set(questionsKey(), questions);
      return;
    }
    memory.questions.push(q);
  },

  async getAnalytics() {
    const { docs, questions } = await loadAll();
    const stats = computeStats(docs, questions);
    const questionRows = questions.map((q) => {
      const doc = q.docId ? docs.find((d) => d.id === q.docId) : undefined;
      const saved = Math.max(0, q.baselineTokens - q.promptTokens);
      return {
        question: q.question,
        mode: q.mode,
        promptTokens: q.promptTokens,
        baselineTokens: q.baselineTokens,
        savedTokens: saved,
        savedPercent: q.baselineTokens > 0 ? (saved / q.baselineTokens) * 100 : 0,
        elapsedMs: q.elapsedMs,
        askedAt: q.askedAt,
        docName: doc?.name,
      };
    });

    const docRows = docs.map((doc) => {
      const docQuestions = questions.filter((q) => q.docId === doc.id);
      const tokensSaved = docQuestions.reduce(
        (sum, q) => sum + Math.max(0, q.baselineTokens - q.promptTokens),
        0,
      );
      return {
        name: doc.name,
        chunks: doc.chunks.length,
        uploadedAt: doc.uploadedAt,
        questionsAsked: docQuestions.length,
        tokensSaved,
      };
    });

    return { stats, questions: questionRows, docs: docRows };
  },

  async getStats(): Promise<StatsSnapshot> {
    const { docs, questions } = await loadAll();
    return computeStats(docs, questions);
  },
};
