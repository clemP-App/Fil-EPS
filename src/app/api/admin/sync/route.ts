import { cookies } from "next/headers";
import { runSync } from "@/collector/sync";
import { verifySession, ADMIN_COOKIE } from "@/lib/auth-token";
import { getRepository } from "@/lib/app-db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const jar = await cookies();
  if (!verifySession(jar.get(ADMIN_COOKIE)?.value, process.env.ADMIN_SECRET)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { slug?: unknown };
  const slug = typeof body.slug === "string" && /^[a-z0-9-]{2,64}$/.test(body.slug) ? body.slug : null;
  try {
    const summary = await runSync(await getRepository(), { slug });
    return Response.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synchronisation impossible.";
    return Response.json({ error: message.slice(0, 300) }, { status: 500 });
  }
}
