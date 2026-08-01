import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const probe = url.searchParams.get("probe") === "1";

  const base = {
    ok: true,
    groqConfigured: config.hasGroq,
    paritokConfigured: config.hasParitok,
  };

  if (!probe) {
    return Response.json(base);
  }

  if (!config.hasParitok) {
    return Response.json({ ...base, probe: "skipped", reason: "PARITOK_API_KEY not set" });
  }

  const startedAt = Date.now();
  try {
    const res = await fetch(config.paritokApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.paritokApiKey}`,
      },
      body: JSON.stringify({
        content: "The mitochondria is the powerhouse of the cell and produces ATP through cellular respiration.",
        query: "what does the mitochondria do",
        kind: "file_read",
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      return Response.json(
        { ...base, probe: "failed", status: res.status },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { compressed?: string; gpu_available?: boolean };
    return Response.json({
      ...base,
      probe: "ok",
      gpuAvailable: !!data.gpu_available,
      latencyMs: Date.now() - startedAt,
      compressed: data.compressed ? `${data.compressed.length} chars` : undefined,
    });
  } catch (error) {
    return Response.json(
      {
        ...base,
        probe: "failed",
        error: error instanceof Error ? error.message : "Paritok unreachable",
      },
      { status: 502 },
    );
  }
}
