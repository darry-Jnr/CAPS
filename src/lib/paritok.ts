import { config } from "@/lib/config";

export type CompressKind = "file_read" | "code" | "log_output" | "web";

export interface CompressResult {
  compressed: string;
  gpu_available: boolean;
  raw?: unknown;
}

const cache = new Map<string, string>();

const cacheKey = (content: string, query: string, kind: CompressKind) => {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 33) ^ content.charCodeAt(i);
  }
  return `${hash.toString(36)}:${kind}:${query.slice(0, 120)}`;
};

/**
 * Compress a segment of context on Paritok's hosted GPU server.
 * Caches results per (content hash, query) so repeated questions are fast.
 */
export async function compressSegment(
  content: string,
  query: string,
  kind: CompressKind = "file_read",
): Promise<CompressResult> {
  if (!config.hasParitok) {
    throw new Error("PARITOK_API_KEY not set");
  }

  const key = cacheKey(content, query, kind);
  const hit = cache.get(key);
  if (hit !== undefined) {
    return { compressed: hit, gpu_available: true };
  }

  const res = await fetch(config.paritokApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.paritokApiKey}`,
    },
    body: JSON.stringify({ content, query, kind }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`Paritok compress failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { compressed?: string; gpu_available?: boolean };
  if (!data.compressed) {
    throw new Error("Paritok compress returned no output");
  }

  cache.set(key, data.compressed);
  return { compressed: data.compressed, gpu_available: !!data.gpu_available, raw: data };
}

export function isParitokConfigured(): boolean {
  return config.hasParitok;
}
