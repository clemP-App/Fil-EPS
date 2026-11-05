import { periodBounds, type PeriodKey } from "@/lib/dates";
import { ACADEMIES, APSAS, CONTENT_TYPES, LEVELS, THEMES } from "@/lib/taxonomy";
import { fold } from "@/lib/text";

export type PublicFilters = {
  q: string;
  academies: string[];
  themes: string[];
  apsas: string[];
  levels: string[];
  types: string[];
  period: PeriodKey;
  from: string;
  to: string;
  sort: "date" | "pertinence";
  page: number;
};

export const EMPTY_FILTERS: PublicFilters = {
  q: "",
  academies: [],
  themes: [],
  apsas: [],
  levels: [],
  types: [],
  period: "",
  from: "",
  to: "",
  sort: "date",
  page: 1,
};

const PERIODS = new Set<PeriodKey>(["", "aujourdhui", "7j", "30j", "90j", "annee", "personnalisee"]);

export function parsePublicFilters(input: Record<string, string | string[] | undefined>): PublicFilters {
  const period = one(input.periode) as PeriodKey;
  return {
    q: one(input.q).slice(0, 160),
    academies: many(input.academie).filter((slug) => ACADEMIES.some((item) => item.slug === slug)),
    themes: many(input.theme).filter((slug) => THEMES.some((item) => item.slug === slug)),
    apsas: many(input.apsa).filter((slug) => APSAS.some((item) => item.slug === slug)),
    levels: many(input.niveau).filter((slug) => LEVELS.some((item) => item.slug === slug)),
    types: many(input.type).filter((slug) => CONTENT_TYPES.some((item) => item.slug === slug)),
    period: PERIODS.has(period) ? period : "",
    from: /^\d{4}-\d{2}-\d{2}$/.test(one(input.du)) ? one(input.du) : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(one(input.au)) ? one(input.au) : "",
    sort: one(input.tri) === "pertinence" ? "pertinence" : "date",
    page: Math.min(500, Math.max(1, Number.parseInt(one(input.page) || "1", 10) || 1)),
  };
}

export function filtersActive(filters: PublicFilters): boolean {
  return Boolean(
    filters.q ||
      filters.academies.length ||
      filters.themes.length ||
      filters.apsas.length ||
      filters.levels.length ||
      filters.types.length ||
      filters.period ||
      filters.from ||
      filters.to ||
      filters.page > 1 ||
      filters.sort !== "date",
  );
}

export function searchTokens(query: string): string[] {
  return fold(query)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2)
    .slice(0, 8);
}

export function toQueryParts(filters: PublicFilters, now = new Date()) {
  const bounds = periodBounds(filters.period, filters.from, filters.to, now);
  return {
    academies: filters.academies,
    themes: filters.themes,
    apsas: filters.apsas,
    levels: filters.levels,
    contentTypes: filters.types,
    from: bounds.from,
    to: bounds.to,
    tokens: searchTokens(filters.q),
    sort: filters.sort,
    page: filters.page,
    pageSize: 12,
  };
}

export function filtersToQuery(filters: PublicFilters, patch: Partial<PublicFilters> = {}): string {
  const next: PublicFilters = {
    ...filters,
    ...patch,
    academies: patch.academies ?? filters.academies,
    themes: patch.themes ?? filters.themes,
    apsas: patch.apsas ?? filters.apsas,
    levels: patch.levels ?? filters.levels,
    types: patch.types ?? filters.types,
  };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  for (const slug of next.academies) params.append("academie", slug);
  for (const slug of next.themes) params.append("theme", slug);
  for (const slug of next.apsas) params.append("apsa", slug);
  for (const slug of next.levels) params.append("niveau", slug);
  for (const slug of next.types) params.append("type", slug);
  if (next.period) params.set("periode", next.period);
  if (next.period === "personnalisee") {
    if (next.from) params.set("du", next.from);
    if (next.to) params.set("au", next.to);
  }
  if (next.sort === "pertinence") params.set("tri", "pertinence");
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function one(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

function many(value: string | string[] | undefined): string[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const slugs = list.flatMap((item) => item.split(",")).map((item) => item.trim().toLowerCase());
  return [...new Set(slugs.filter((slug) => /^[a-z0-9-]{1,64}$/.test(slug)))];
}
