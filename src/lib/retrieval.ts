/**
 * Dependency-free retrieval: score chunks by how many of the query's
 * significant words they mention, return the top matches.
 */
const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "but", "is", "are", "was", "were",
  "in", "on", "at", "to", "for", "with", "by", "from", "as", "it", "its",
  "this", "that", "what", "whats", "how", "why", "does", "do", "can",
  "could", "would", "please", "explain", "tell", "me", "about", "give",
  "i", "you", "we", "they", "he", "she", "my", "your", "be", "have", "has",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function scoreChunk(chunk: string, queryWords: string[]): number {
  const words = new Set(tokenize(chunk));
  let score = 0;
  for (const word of queryWords) {
    if (words.has(word)) score += 1;
  }
  return score;
}

export function retrieveChunks(chunks: string[], query: string, max = 6): string[] {
  if (chunks.length === 0) return [];
  if (chunks.length <= max) return chunks;

  const queryWords = tokenize(query).filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const scored = chunks.map((chunk, index) => ({ chunk, index, score: scoreChunk(chunk, queryWords) }));

  if (queryWords.length > 0) {
    scored.sort((a, b) => b.score - a.score || a.index - b.index);
    const top = scored.filter((s) => s.score > 0).slice(0, max);
    if (top.length > 0) {
      return top
        .sort((a, b) => a.index - b.index)
        .map((s) => s.chunk);
    }
  }

  return chunks.slice(0, max);
}
