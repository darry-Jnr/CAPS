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

interface StoreShape {
  docs: Map<string, DocumentRecord>;
  questions: QuestionRecord[];
}

const globalStore = globalThis as unknown as { __capsStore?: StoreShape };

const store: StoreShape = (globalStore.__capsStore ??= {
  docs: new Map(),
  questions: [],
});

export const storeApi = {
  addDocument(doc: DocumentRecord) {
    store.docs.set(doc.id, doc);
  },

  getDocument(id: string): DocumentRecord | undefined {
    return store.docs.get(id);
  },

  addQuestion(q: QuestionRecord) {
    store.questions.push(q);
  },

  getAnalytics() {
    const stats = this.getStats();
    const questions = store.questions.map((q) => {
      const doc = q.docId ? store.docs.get(q.docId) : undefined;
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

    const docs = [...store.docs.values()].map((doc) => {
      const docQuestions = store.questions.filter((q) => q.docId === doc.id);
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

    return { stats, questions, docs };
  },

  getStats(): StatsSnapshot {
    let tokensWithout = 0;
    let tokensWith = 0;
    const latencyWithout: number[] = [];
    const latencyWith: number[] = [];

    for (const q of store.questions) {
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
      docsUploaded: store.docs.size,
      chunksStored: [...store.docs.values()].reduce((n, d) => n + d.chunks.length, 0),
      questionsAsked: store.questions.length,
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
  },
};
