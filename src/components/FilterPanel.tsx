"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  EMPTY_EXCLUSIONS,
  exclusionsFromFilters,
  filtersFromExclusions,
  memoryChangesResults,
  readExclusions,
  toggleExclusion,
  writeExclusions,
  type Exclusions,
  type FilterGroup,
} from "@/lib/filter-memory";
import { EMPTY_FILTERS, filtersToQuery, type PublicFilters } from "@/lib/filters";
import { sourceBlockedReason } from "@/lib/source-access";
import { ACADEMIES, APSAS, CONTENT_TYPES, LEVELS, REGION_LABELS, THEMES } from "@/lib/taxonomy";

type Option = { value: string; label: string; reason: string | null };

export function FilterPanel({
  filters,
  action,
  bare = false,
  applyMemory = false,
}: {
  filters: PublicFilters;
  action: string;
  bare?: boolean;
  applyMemory?: boolean;
}) {
  const router = useRouter();
  const [excluded, setExcluded] = useState<Exclusions>(() => exclusionsFromFilters(filters));

  useEffect(() => {
    const stored = readExclusions();
    const resolved = exclusionsFromFilters(filters, stored);
    setExcluded(resolved);
    if (!applyMemory || !memoryChangesResults(filters, stored)) return;
    router.replace(`${action}${filtersToQuery(filtersFromExclusions(filters, resolved))}`);
  }, [action, applyMemory, filters, router]);

  function toggle(group: FilterGroup, slug: string) {
    setExcluded((current) => {
      const next = toggleExclusion(current, group, slug);
      writeExclusions(next);
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    writeExclusions(excluded);
    const next = filtersFromExclusions(
      {
        ...EMPTY_FILTERS,
        q: String(data.get("q") ?? "").trim(),
        sort: data.get("tri") === "pertinence" ? "pertinence" : "date",
        period: String(data.get("periode") ?? "") as PublicFilters["period"],
        from: String(data.get("du") ?? ""),
        to: String(data.get("au") ?? ""),
      },
      excluded,
    );
    router.push(`${action}${filtersToQuery(next)}`);
  }

  function reset() {
    writeExclusions(EMPTY_EXCLUSIONS);
    setExcluded(EMPTY_EXCLUSIONS);
    router.push(action);
  }

  return (
    <form action={action} method="get" onSubmit={submit} className={bare ? "" : "surface p-4"} aria-labelledby="titre-filtres">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id="titre-filtres" className="text-xl font-bold tracking-tight">Filtres</h2>
        <a
          href={action}
          className="text-sm text-pine underline"
          onClick={(event) => {
            event.preventDefault();
            reset();
          }}
        >
          Réinitialiser
        </a>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm">
          Recherche
          <input name="q" defaultValue={filters.q} type="search" className="mt-1" />
        </label>
        <label className="text-sm">
          Tri
          <select name="tri" defaultValue={filters.sort} className="mt-1">
            <option value="date">Date</option>
            <option value="pertinence">Pertinence</option>
          </select>
        </label>
        <fieldset className="text-sm">
          <legend>Période</legend>
          <select name="periode" defaultValue={filters.period} className="mt-1">
            <option value="">Toutes les dates</option>
            <option value="aujourdhui">Aujourd’hui</option>
            <option value="7j">7 derniers jours</option>
            <option value="30j">30 derniers jours</option>
            <option value="90j">3 derniers mois</option>
            <option value="annee">Année en cours</option>
            <option value="personnalisee">Dates personnalisées</option>
          </select>
        </fieldset>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label>Du<input type="date" name="du" defaultValue={filters.from} className="mt-1" /></label>
          <label>Au<input type="date" name="au" defaultValue={filters.to} className="mt-1" /></label>
        </div>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <FilterGroup title="Académies et sources" group="academie" excluded={excluded.academie} onToggle={toggle} groups={groupAcademies()} />
        <FilterGroup title="Thématiques" group="theme" excluded={excluded.theme} onToggle={toggle} options={THEMES.map(option)} hint="« Autres » ne contient que les publications classées manuellement." />
        <FilterGroup title="APSA" group="apsa" excluded={excluded.apsa} onToggle={toggle} options={APSAS.map(option)} />
        <FilterGroup title="Niveaux" group="niveau" excluded={excluded.niveau} onToggle={toggle} options={LEVELS.map(option)} />
        <FilterGroup title="Types de contenu" group="type" excluded={excluded.type} onToggle={toggle} options={CONTENT_TYPES.map(option)} />
      </div>
      <p className="mt-3 text-sm text-muted">Toutes les cases sont cochées. Décochez ce que vous ne voulez pas afficher : ce choix reste dans ce navigateur. Une publication sans thème, sans APSA ou sans niveau reste visible.</p>
      <button type="submit" className="button mt-3">Appliquer les filtres</button>
    </form>
  );
}

export function ActiveFilters({ filters, pathname }: { filters: PublicFilters; pathname: string }) {
  const chips = [
    ...filters.academies.map((slug) => chip("Académie", label(ACADEMIES, slug), filtersToQuery(filters, { academies: filters.academies.filter((item) => item !== slug), page: 1 }))),
    ...filters.themes.map((slug) => chip("Thème", label(THEMES, slug), filtersToQuery(filters, { themes: filters.themes.filter((item) => item !== slug), page: 1 }))),
    ...filters.apsas.map((slug) => chip("APSA", label(APSAS, slug), filtersToQuery(filters, { apsas: filters.apsas.filter((item) => item !== slug), page: 1 }))),
    ...filters.levels.map((slug) => chip("Niveau", label(LEVELS, slug), filtersToQuery(filters, { levels: filters.levels.filter((item) => item !== slug), page: 1 }))),
    ...filters.types.map((slug) => chip("Type", label(CONTENT_TYPES, slug), filtersToQuery(filters, { types: filters.types.filter((item) => item !== slug), page: 1 }))),
    ...filters.excludeAcademies.map((slug) => chip("Sans", label(ACADEMIES, slug), filtersToQuery(filters, { excludeAcademies: filters.excludeAcademies.filter((item) => item !== slug), page: 1 }))),
    ...filters.excludeThemes.map((slug) => chip("Sans", label(THEMES, slug), filtersToQuery(filters, { excludeThemes: filters.excludeThemes.filter((item) => item !== slug), page: 1 }))),
    ...filters.excludeApsas.map((slug) => chip("Sans", label(APSAS, slug), filtersToQuery(filters, { excludeApsas: filters.excludeApsas.filter((item) => item !== slug), page: 1 }))),
    ...filters.excludeLevels.map((slug) => chip("Sans", label(LEVELS, slug), filtersToQuery(filters, { excludeLevels: filters.excludeLevels.filter((item) => item !== slug), page: 1 }))),
    ...filters.excludeTypes.map((slug) => chip("Sans", label(CONTENT_TYPES, slug), filtersToQuery(filters, { excludeTypes: filters.excludeTypes.filter((item) => item !== slug), page: 1 }))),
  ];
  if (filters.q) chips.unshift(chip("Recherche", filters.q, filtersToQuery(filters, { q: "", page: 1 })));
  if (filters.period) chips.push(chip("Période", filters.period, filtersToQuery(filters, { period: "", from: "", to: "", page: 1 })));
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((item) => (
        <li key={item.key}>
          <Link href={`${pathname}${item.href}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-chip px-3 py-1 text-sm no-underline">
            <span>{item.text}</span>
            <span className="text-clay" aria-hidden="true">×</span>
            <span className="sr-only">Retirer {item.text}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FilterGroup({
  title,
  group,
  excluded,
  onToggle,
  options,
  groups,
  hint,
}: {
  title: string;
  group: FilterGroup;
  excluded: string[];
  onToggle: (group: FilterGroup, slug: string) => void;
  options?: Option[];
  groups?: Array<{ title: string; options: Option[] }>;
  hint?: string;
}) {
  const hidden = groups ? groups.reduce((count, item) => count + item.options.filter((option) => !option.reason && excluded.includes(option.value)).length, 0) : (options ?? []).filter((option) => !option.reason && excluded.includes(option.value)).length;
  return (
    <details className="rounded-2xl border border-line bg-paper p-3">
      <summary className="font-semibold">
        {title}
        {hidden ? <span className="ml-2 text-sm font-normal text-clay">{hidden} masquée{hidden > 1 ? "s" : ""}</span> : null}
      </summary>
      <div className="mt-3 max-h-56 space-y-3 overflow-auto pr-1">
        {groups
          ? groups.map((item) => (
              <div key={item.title}>
                <p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{item.title}</p>
                <OptionList group={group} excluded={excluded} options={item.options} onToggle={onToggle} />
              </div>
            ))
          : <OptionList group={group} excluded={excluded} options={options ?? []} onToggle={onToggle} />}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </details>
  );
}

function OptionList({
  group,
  excluded,
  options,
  onToggle,
}: {
  group: FilterGroup;
  excluded: string[];
  options: Option[];
  onToggle: (group: FilterGroup, slug: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {options.map((option) => {
        const blocked = Boolean(option.reason);
        const checked = !blocked && !excluded.includes(option.value);
        return (
          <li key={option.value}>
            <label className={`flex items-start gap-2 text-sm ${blocked ? "cursor-not-allowed text-muted" : ""}`} title={option.reason ?? undefined}>
              <input
                type="checkbox"
                name={group}
                value={option.value}
                checked={checked}
                disabled={blocked}
                onChange={() => onToggle(group, option.value)}
                className="mt-1 w-auto disabled:opacity-40"
              />
              <span>
                {option.label}
                {option.reason ? <span className="sr-only">. {option.reason}</span> : null}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function option(term: { slug: string; label: string }): Option {
  return { value: term.slug, label: term.label, reason: null };
}

function groupAcademies() {
  return (["metropole", "outremer", "national"] as const).map((group) => ({
    title: REGION_LABELS[group],
    options: ACADEMIES.filter((academy) => academy.regionGroup === group).map((academy) => ({
      value: academy.slug,
      label: academy.label,
      reason: sourceBlockedReason(academy.slug),
    })),
  }));
}

function label(list: Array<{ slug: string; label: string }>, slug: string) {
  return list.find((item) => item.slug === slug)?.label ?? slug;
}

function chip(prefix: string, value: string, href: string) {
  return { key: `${prefix}-${value}`, text: `${prefix} : ${value}`, href };
}
