import { config } from "@/lib/config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletion {
  content: string;
  usage: GroqUsage;
  model: string;
}

interface GroqResponse {
  choices?: { message?: { content?: string } }[];
  usage?: Partial<GroqUsage>;
  model?: string;
  error?: { message?: string };
}

export async function chatCompletion(messages: ChatMessage[]): Promise<ChatCompletion> {
  if (!config.hasGroq) {
    throw new Error("GROQ_API_KEY not set");
  }

  const res = await fetch(config.groqApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.groqApiKey}`,
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages,
      temperature: 0.4,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const data = (await res.json()) as GroqResponse;

  if (!res.ok) {
    throw new Error(`Groq error ${res.status}: ${data.error?.message ?? res.statusText}`);
  }

  const content = data.choices?.[0]?.message?.content ?? "";
  const usage: GroqUsage = {
    prompt_tokens: data.usage?.prompt_tokens ?? 0,
    completion_tokens: data.usage?.completion_tokens ?? 0,
    total_tokens: data.usage?.total_tokens ?? 0,
  };

  return { content, usage, model: data.model ?? config.groqModel };
}

/** Cost of a prompt in USD, given the model's per-1M input price. */
export function inputCostUsd(promptTokens: number): number {
  return (promptTokens / 1_000_000) * config.groqInputPricePer1M;
}

/** Rough token estimate for text we haven't sent to Groq (≈4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
