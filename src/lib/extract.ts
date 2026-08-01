import mammoth from "mammoth";
import { extractPdfText } from "@/lib/pdf";

export type SupportedExt = "pdf" | "docx" | "txt";

export const SUPPORTED_EXTENSIONS: SupportedExt[] = ["pdf", "docx", "txt"];

export function extensionOf(name: string): SupportedExt | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext && (SUPPORTED_EXTENSIONS as string[]).includes(ext)) {
    return ext as SupportedExt;
  }
  return null;
}

export async function extractTextFromFile(name: string, buffer: Buffer): Promise<string> {
  const ext = extensionOf(name);
  if (!ext) {
    throw new Error("Unsupported file type");
  }
  switch (ext) {
    case "pdf":
      return extractPdfText(buffer);
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.replace(/[ \t]+/g, " ").trim();
    }
    case "txt":
      return buffer.toString("utf8").replace(/[ \t]+/g, " ").trim();
  }
}
