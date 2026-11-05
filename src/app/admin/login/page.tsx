import type { Metadata } from "next";
import { loginAction } from "@/server/admin-actions";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  motdepasse: "Mot de passe incorrect.",
  attente: "Trop de tentatives. Réessayez dans quelques minutes.",
  config: "L’administration n’est pas configurée : ADMIN_SECRET et ADMIN_PASSWORD manquent.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const code = typeof params.erreur === "string" ? params.erreur : "";
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-4xl">Administration</h1>
      <p className="mt-2 text-muted">Accès réservé à la personne qui héberge le journal.</p>
      {ERRORS[code] ? <p className="mt-4 text-clay">{ERRORS[code]}</p> : null}
      <form action={loginAction} className="mt-6 flex flex-col gap-3">
        <label>
          Mot de passe
          <input className="mt-1" type="password" name="password" autoComplete="current-password" required />
        </label>
        <button type="submit">Entrer</button>
      </form>
    </div>
  );
}
