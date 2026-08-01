const num = (value: string | undefined, fallback: number): number =>
  value === undefined || value === "" ? fallback : Number(value);

export const config = {
  groqApiUrl: process.env.GROQ_API_URL ?? "https://api.groq.com/openai/v1/chat/completions",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqInputPricePer1M: num(process.env.GROQ_INPUT_PRICE_PER_1M, 0.59),
  groqOutputPricePer1M: num(process.env.GROQ_OUTPUT_PRICE_PER_1M, 0.79),
  paritokApiUrl: process.env.PARITOK_API_URL ?? "https://www.paritok.com/api/compress",
  paritokApiKey: process.env.PARITOK_API_KEY ?? "",
  hasGroq: false,
  hasParitok: false,
};

config.hasGroq = config.groqApiKey.length > 0;
config.hasParitok = config.paritokApiKey.length > 0;
