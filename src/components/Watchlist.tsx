"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Story } from "@/components/Story";
import {
  EMPTY_EXCLUSIONS,
  filtersFromExclusions,
  hasExclusions,
  keptSlugs,
  readExclusions,
  toggleExclusion,
  writeExclusions,
  type Exclusions,
} from "@/lib/filter-memory";
import { EMPTY_FILTERS, filtersToQuery } from "@/lib/filters";
import { sourceBlockedReason } from "@/lib/source-access";
import { ACADEMIES, THEMES } from "@/lib/taxonomy";
import type { Publication } from "@/lib/types";

export function Watchlist() {
  const [excluded, setExcluded] = useState<Exclusions | null>(null);
  const [items, setItems] = useState<Publication[]>([]);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => setExcluded(readExclusions()), []);

  const academies = keptSlugs("academie", excluded?.academie ?? []);
  const themes = keptSlugs("theme", excluded?.theme ?? []);
  const blocked = excluded !== null && (academies.length === 0 || themes.length === 0);

  useEffect(() => {
    if (!excluded) return;
    const selectedAcademies = keptSlugs("academie", excluded.academie);
    const selectedThemes = keptSlugs("theme", excluded.theme);
    if (selectedAcademies.length === 0 || selectedThemes.length === 0) {
      setItems([]);
      setTotal(0);
      return;
    }
    const params = new URLSearchParams();
    for (const slug of excluded.academie) params.append("sans-academie", slug);
    for (const slug of excluded.theme) params.append("sans-theme", slug);
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
  }, [excluded]);

  if (!excluded) return <p className="text-muted">Lecture de vos préférences…</p>;

  function toggle(group: "academie" | "theme", slug: string) {
    setExcluded((current) => {
      const next = toggleExclusion(current ?? EMPTY_EXCLUSIONS, group, slug);
      writeExclusions(next);
      return next;
    });
  }

  const query = filtersToQuery(filtersFromExclusions(EMPTY_FILTERS, excluded));

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <form className="surface h-fit p-4" onSubmit={(event) => event.preventDefault()}>
        <h2 className="text-2xl font-extrabold tracking-tight">Préférences</h2>
        <p className="mt-1 text-sm text-muted">Toutes les cases sont cochées. Décochez ce que vous ne voulez pas suivre. Le choix reste dans ce navigateur et revient dans les filtres du journal.</p>
        <fieldset className="mt-4">
          <legend className="font-semibold">Académies suivies</legend>
          <ul className="mt-2 max-h-64 space-y-1 overflow-auto">
            {ACADEMIES.map((academy) => {
              const reason = sourceBlockedReason(academy.slug);
              return (
                <li key={academy.slug}>
                  <label className={`flex gap-2 text-sm ${reason ? "cursor-not-allowed text-muted" : ""}`} title={reason ?? undefined}>
                    <input
                      className="mt-1 w-auto disabled:opacity-40"
                      type="checkbox"
                      checked={!reason && !excluded.academie.includes(academy.slug)}
                      disabled={Boolean(reason)}
                      onChange={() => toggle("academie", academy.slug)}
                    />
                    <span>
                      {academy.label}
                      {reason ? <span className="sr-only">. {reason}</span> : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="font-semibold">Thèmes suivis</legend>
          <ul className="mt-2 space-y-1">
            {THEMES.map((theme) => (
              <li key={theme.slug}>
                <label className="flex gap-2 text-sm">
                  <input className="mt-1 w-auto" type="checkbox" checked={!excluded.theme.includes(theme.slug)} onChange={() => toggle("theme", theme.slug)} />
                  {theme.label}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </form>
      <section>
        {blocked ? (
          <p>Recochez au moins une académie et un thème pour afficher votre veille. Le journal complet reste disponible sur <Link className="text-pine underline" href="/">la une</Link>.</p>
        ) : failed ? (
          <p>La veille n’a pas pu être chargée.</p>
        ) : (
          <>
            <p className="mb-3 text-muted">{total.toLocaleString("fr-FR")} publication{total > 1 ? "s" : ""} correspondent à votre veille.</p>
            {hasExclusions(excluded) ? <p className="mb-4"><Link className="text-pine underline" href={`/recherche${query}`}>Ouvrir ces critères dans la recherche</Link></p> : null}
            {items.map((publication) => <Story key={publication.id} publication={publication} />)}
            {items.length === 0 ? <p>Aucune publication collectée ne correspond encore à ces préférences.</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
