import Link from "next/link";
import { ACADEMIES, APSAS, CONTENT_TYPES, LEVELS, REGION_LABELS, THEMES } from "@/lib/taxonomy";
import { filtersToQuery, type PublicFilters } from "@/lib/filters";

export function FilterPanel({ filters, action, bare = false }: { filters: PublicFilters; action: string; bare?: boolean }) {
  return (
    <form action={action} method="get" className={bare ? "" : "surface p-4"} aria-labelledby="titre-filtres">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id="titre-filtres" className="text-xl font-bold tracking-tight">Filtres</h2>
        <Link href={action} className="text-sm text-pine underline">Réinitialiser</Link>
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
        <FilterGroup title="Académies et sources" name="academie" selected={filters.academies} groups={groupAcademies()} />
        <FilterGroup title="Thématiques" name="theme" selected={filters.themes} options={THEMES.map((term) => ({ value: term.slug, label: term.label }))} hint="« Autres » ne contient que les publications classées manuellement." />
        <FilterGroup title="APSA" name="apsa" selected={filters.apsas} options={APSAS.map((term) => ({ value: term.slug, label: term.label }))} />
        <FilterGroup title="Niveaux" name="niveau" selected={filters.levels} options={LEVELS.map((term) => ({ value: term.slug, label: term.label }))} />
        <FilterGroup title="Types de contenu" name="type" selected={filters.types} options={CONTENT_TYPES.map((term) => ({ value: term.slug, label: term.label }))} />
      </div>
      <p className="mt-3 text-sm text-muted">Les filtres se combinent. Dans un même groupe, une publication est retenue si elle correspond à l’un des choix. Une publication sans date connue est exclue d’un filtre temporel.</p>
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
  name,
  selected,
  options,
  groups,
  hint,
}: {
  title: string;
  name: string;
  selected: string[];
  options?: Array<{ value: string; label: string }>;
  groups?: Array<{ title: string; options: Array<{ value: string; label: string }> }>;
  hint?: string;
}) {
  return (
    <details className="rounded-2xl border border-line bg-paper p-3" open={selected.length > 0}>
      <summary className="font-semibold">
        {title}
        {selected.length ? <span className="ml-2 text-sm font-normal text-pine">{selected.length}</span> : null}
      </summary>
      <div className="mt-3 max-h-56 space-y-3 overflow-auto pr-1">
        {groups
          ? groups.map((group) => (
              <div key={group.title}>
                <p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{group.title}</p>
                <OptionList name={name} selected={selected} options={group.options} />
              </div>
            ))
          : <OptionList name={name} selected={selected} options={options ?? []} />}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </details>
  );
}

function OptionList({ name, selected, options }: { name: string; selected: string[]; options: Array<{ value: string; label: string }> }) {
  return (
    <ul className="space-y-1">
      {options.map((option) => (
        <li key={option.value}>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name={name} value={option.value} defaultChecked={selected.includes(option.value)} className="mt-1 w-auto" />
            <span>{option.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function groupAcademies() {
  return (["metropole", "outremer", "national"] as const).map((group) => ({
    title: REGION_LABELS[group],
    options: ACADEMIES.filter((academy) => academy.regionGroup === group).map((academy) => ({ value: academy.slug, label: academy.label })),
  }));
}

function label(list: Array<{ slug: string; label: string }>, slug: string) {
  return list.find((item) => item.slug === slug)?.label ?? slug;
}

function chip(prefix: string, value: string, href: string) {
  return { key: `${prefix}-${value}`, text: `${prefix} : ${value}`, href };
}
