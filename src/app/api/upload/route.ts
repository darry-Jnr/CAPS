import { randomUUID } from "crypto";
import { chunkText } from "@/lib/pdf";
import { extensionOf, extractTextFromFile } from "@/lib/extract";
import { storeApi } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (!extensionOf(file.name)) {
      return Response.json(
        { error: "Unsupported file type. Upload a PDF, Word (.docx), or text (.txt) file." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File too large (max 10MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromFile(file.name, buffer);
    if (!text) {
      return Response.json({ error: "No readable text found in this file" }, { status: 422 });
    }

    const chunks = chunkText(text);
    const docId = randomUUID();
    storeApi.addDocument({ id: docId, name: file.name, chunks, uploadedAt: Date.now() });

    return Response.json({ docId, name: file.name, chunks: chunks.length, chars: text.length });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
