import { getRepository } from "@/lib/app-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repo = await getRepository();
    const stats = await repo.stats();
    return Response.json({ ok: true, driver: repo.dialect, publications: stats.total, lastSuccessAt: stats.lastSuccessAt });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
