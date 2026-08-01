import { storeApi } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  await storeApi.resetSession();
  return Response.json({ ok: true });
}
