"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Story } from "@/components/Story";
import { ACADEMIES, THEMES } from "@/lib/taxonomy";
import type { Publication } from "@/lib/types";

type Prefs = { academies: string[]; themes: string[] };
const KEY = "veille-eps-prefs";

function readPrefs(): Prefs {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<Prefs>;
    return {
      academies: Array.isArray(parsed.academies) ? parsed.academies.filter((item) => typeof item === "string") : [],
      themes: Array.isArray(parsed.themes) ? parsed.themes.filter((item) => typeof item === "string") : [],
    };
  } catch {
    return { academies: [], themes: [] };
  }
}

export function Watchlist() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [items, setItems] = useState<Publication[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => setPrefs(readPrefs()), []);

  useEffect(() => {
    if (!prefs || (prefs.academies.length === 0 && prefs.themes.length === 0)) {
      setItems([]);
      setTotal(0);
      return;
    }
    const params = new URLSearchParams();
    for (const slug of prefs.academies) params.append("academie", slug);
    for (const slug of prefs.themes) params.append("theme", slug);
    const controller = new AbortController();
    fetch(`/api/publications?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("lecture impossible");
        return response.json() as Promise<{ items: Publication[]; total: number }>;
      })
      .then((data) => {
        setFailed(false);
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, [prefs]);

  if (!prefs) return <p className="text-muted">Lecture de vos préférences…</p>;

  function toggle(group: keyof Prefs, slug: string) {
    const next = {
      ...prefs!,
      [group]: prefs![group].includes(slug) ? prefs![group].filter((item) => item !== slug) : [...prefs![group], slug],
    };
    setPrefs(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  const query = new URLSearchParams();
  for (const slug of prefs.academies) query.append("academie", slug);
  for (const slug of prefs.themes) query.append("theme", slug);

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <form className="surface h-fit p-4" onSubmit={(event) => event.preventDefault()}>
        <h2 className="text-2xl font-extrabold tracking-tight">Préférences</h2>
        <p className="mt-1 text-sm text-muted">Elles restent dans ce navigateur et ne masquent pas le reste du journal.</p>
        <fieldset className="mt-4">
          <legend className="font-semibold">Académies suivies</legend>
          <ul className="mt-2 max-h-64 space-y-1 overflow-auto">
            {ACADEMIES.map((academy) => (
              <li key={academy.slug}>
                <label className="flex gap-2 text-sm">
                  <input className="mt-1 w-auto" type="checkbox" checked={prefs.academies.includes(academy.slug)} onChange={() => toggle("academies", academy.slug)} />
                  {academy.label}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="font-semibold">Thèmes suivis</legend>
          <ul className="mt-2 space-y-1">
            {THEMES.map((theme) => (
              <li key={theme.slug}>
                <label className="flex gap-2 text-sm">
                  <input className="mt-1 w-auto" type="checkbox" checked={prefs.themes.includes(theme.slug)} onChange={() => toggle("themes", theme.slug)} />
                  {theme.label}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </form>
      <section>
        {prefs.academies.length === 0 && prefs.themes.length === 0 ? (
          <p>Choisissez au moins une académie ou un thème. Le journal complet reste disponible sur <Link className="text-pine underline" href="/">la une</Link>.</p>
        ) : failed ? (
          <p>La veille n’a pas pu être chargée.</p>
        ) : (
          <>
            <p className="mb-3 text-muted">{total.toLocaleString("fr-FR")} publication{total > 1 ? "s" : ""} correspondent à votre veille.</p>
            {query.size > 0 ? <p className="mb-4"><Link className="text-pine underline" href={`/recherche?${query.toString()}`}>Ouvrir ces critères dans la recherche</Link></p> : null}
            {items.map((publication) => <Story key={publication.id} publication={publication} />)}
            {items.length === 0 ? <p>Aucune publication collectée ne correspond encore à ces préférences.</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
