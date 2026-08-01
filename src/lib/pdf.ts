import { extractText } from "unpdf";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const result = await extractText(data, { mergePages: true });
  const text = (result.text ?? "").replace(/[ \t]+/g, " ").trim();
  return text;
}

const CHUNK_CHARS = 3000;
const OVERLAP_CHARS = 200;

export function chunkText(text: string, chunkChars = CHUNK_CHARS, overlap = OVERLAP_CHARS): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + chunkChars;
    if (end < text.length) {
      const boundary = text.lastIndexOf(" ", end);
      if (boundary > start + chunkChars * 0.6) end = boundary;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end - overlap;
  }
  return chunks;
}
