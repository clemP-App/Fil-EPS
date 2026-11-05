"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  ADMIN_COOKIE,
  clearLoginAttempts,
  loginAllowed,
  passwordsMatch,
  registerLoginFailure,
  signSession,
  verifySession,
} from "@/lib/auth-token";
import { getRepository } from "@/lib/app-db";
import type { SourceDefinition } from "@/lib/types";

async function requireAdmin() {
  const jar = await cookies();
  if (!verifySession(jar.get(ADMIN_COOKIE)?.value, process.env.ADMIN_SECRET)) redirect("/admin/login");
}

export async function loginAction(formData: FormData) {
  if (!loginAllowed("admin")) redirect("/admin/login?erreur=attente");
  if (!process.env.ADMIN_SECRET || !process.env.ADMIN_PASSWORD) redirect("/admin/login?erreur=config");
  const password = String(formData.get("password") ?? "");
  if (!passwordsMatch(password, process.env.ADMIN_PASSWORD)) {
    registerLoginFailure("admin");
    redirect("/admin/login?erreur=motdepasse");
  }
  clearLoginAttempts("admin");
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signSession(process.env.ADMIN_SECRET), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function updateSourceAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const configText = String(formData.get("config") ?? "{}");
  let config: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(configText) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("objet attendu");
    config = parsed as Record<string, unknown>;
  } catch {
    redirect(`/admin/sources/${slug}?erreur=config`);
  }
  const method = String(formData.get("method") ?? "rss");
  await (await getRepository()).updateSource(slug, {
    homepageUrl: emptyToNull(formData.get("homepage")),
    feedUrl: emptyToNull(formData.get("feed")),
    method: method === "html" || method === "sitemap" ? method : "rss",
    enabled: formData.get("enabled") === "on",
    config,
  });
  revalidateTag("journal");
  revalidatePath("/");
  revalidatePath("/sources");
  redirect("/admin?enregistre=1");
}

export async function createSourceAction(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[a-z0-9-]{2,64}$/.test(slug) || name.length < 2) redirect("/admin?erreur=source");
  const kind = formData.get("kind") === "national" ? "national" : "academie";
  const region = String(formData.get("region") ?? "metropole");
  const definition: SourceDefinition = {
    slug,
    name,
    kind,
    regionGroup: region === "outremer" || region === "national" ? region : "metropole",
    homepageUrl: emptyToNull(formData.get("homepage")),
    feedUrl: emptyToNull(formData.get("feed")),
    method: formData.get("method") === "html" || formData.get("method") === "sitemap" ? (formData.get("method") as "html" | "sitemap") : "rss",
    enabled: formData.get("enabled") === "on",
    config: {},
  };
  try {
    await (await getRepository()).createSource(definition);
  } catch {
    redirect("/admin?erreur=existe");
  }
  revalidateTag("journal");
  revalidatePath("/sources");
  redirect("/admin?enregistre=1");
}

export async function classificationAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const repo = await getRepository();
  if (formData.get("intent") === "reclassify") {
    await repo.reclassify(id);
  } else if (formData.get("intent") === "hide") {
    await repo.setStatus(id, "hidden");
  } else if (formData.get("intent") === "show") {
    await repo.setStatus(id, "published");
  } else {
    await repo.setClassification(
      id,
      {
        themes: formData.getAll("themes").map(String),
        apsas: formData.getAll("apsas").map(String),
        levels: formData.getAll("levels").map(String),
        tags: String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
        contentType: emptyToNull(formData.get("contentType")),
      },
      true,
    );
  }
  revalidateTag("journal");
  revalidatePath("/");
  revalidatePath(`/publication/${id}`);
  revalidatePath("/admin/publications");
  redirect(`/admin/publications/${id}?enregistre=1`);
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}
