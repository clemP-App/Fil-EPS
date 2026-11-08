import type { PublicFilters } from "@/lib/filters";
import { availableAcademySlugs } from "@/lib/source-access";
import { APSAS, CONTENT_TYPES, LEVELS, THEMES } from "@/lib/taxonomy";

export const FILTER_MEMORY_KEY = "veille-eps-filtres";
export const LEGACY_WATCH_KEY = "veille-eps-prefs";

export type FilterGroup = "academie" | "theme" | "apsa" | "niveau" | "type";

export type Exclusions = Record<FilterGroup, string[]>;

export const EMPTY_EXCLUSIONS: Exclusions = {
  academie: [],
  theme: [],
  apsa: [],
  niveau: [],
  type: [],
};

const AVAILABLE: Record<FilterGroup, () => string[]> = {
  academie: availableAcademySlugs,
  theme: () => THEMES.map((item) => item.slug),
  apsa: () => APSAS.map((item) => item.slug),
  niveau: () => LEVELS.map((item) => item.slug),
  type: () => CONTENT_TYPES.map((item) => item.slug),
};

export function availableSlugs(group: FilterGroup): string[] {
  return AVAILABLE[group]();
}

export function keptSlugs(group: FilterGroup, excluded: string[]): string[] {
  const hidden = new Set(excluded);
  return availableSlugs(group).filter((slug) => !hidden.has(slug));
}

export function resolveGroup(urlSelected: string[], urlExcluded: string[], storedExcluded: string[], available: string[]): string[] {
  const known = new Set(available);
  if (urlExcluded.length) return urlExcluded.filter((slug) => known.has(slug));
  if (urlSelected.length) return available.filter((slug) => !urlSelected.includes(slug));
  return storedExcluded.filter((slug) => known.has(slug));
}

export function urlMissesStoredExclusion(urlSelected: string[], urlExcluded: string[], stored: string[]): boolean {
  return stored.length > 0 && urlSelected.length === 0 && urlExcluded.length === 0;
}

export function exclusionsFromFilters(filters: PublicFilters, stored: Exclusions = EMPTY_EXCLUSIONS): Exclusions {
  return {
    academie: resolveGroup(filters.academies, filters.excludeAcademies, stored.academie, availableSlugs("academie")),
    theme: resolveGroup(filters.themes, filters.excludeThemes, stored.theme, availableSlugs("theme")),
    apsa: resolveGroup(filters.apsas, filters.excludeApsas, stored.apsa, availableSlugs("apsa")),
    niveau: resolveGroup(filters.levels, filters.excludeLevels, stored.niveau, availableSlugs("niveau")),
    type: resolveGroup(filters.types, filters.excludeTypes, stored.type, availableSlugs("type")),
  };
}

export function filtersFromExclusions(filters: PublicFilters, exclusions: Exclusions): PublicFilters {
  return {
    ...filters,
    academies: [],
    themes: [],
    apsas: [],
    levels: [],
    types: [],
    excludeAcademies: exclusions.academie,
    excludeThemes: exclusions.theme,
    excludeApsas: exclusions.apsa,
    excludeLevels: exclusions.niveau,
    excludeTypes: exclusions.type,
    page: 1,
  };
}

export function memoryChangesResults(filters: PublicFilters, stored: Exclusions): boolean {
  return (
    urlMissesStoredExclusion(filters.academies, filters.excludeAcademies, stored.academie) ||
    urlMissesStoredExclusion(filters.themes, filters.excludeThemes, stored.theme) ||
    urlMissesStoredExclusion(filters.apsas, filters.excludeApsas, stored.apsa) ||
    urlMissesStoredExclusion(filters.levels, filters.excludeLevels, stored.niveau) ||
    urlMissesStoredExclusion(filters.types, filters.excludeTypes, stored.type)
  );
}

export function hasExclusions(exclusions: Exclusions): boolean {
  return Object.values(exclusions).some((list) => list.length > 0);
}

export function migrateLegacyPrefs(raw: unknown): Exclusions {
  const parsed = raw && typeof raw === "object" ? (raw as { academies?: unknown; themes?: unknown }) : {};
  const academies = stringList(parsed.academies).filter((slug) => availableSlugs("academie").includes(slug));
  const themes = stringList(parsed.themes).filter((slug) => availableSlugs("theme").includes(slug));
  return {
    academie: academies.length ? availableSlugs("academie").filter((slug) => !academies.includes(slug)) : [],
    theme: themes.length ? availableSlugs("theme").filter((slug) => !themes.includes(slug)) : [],
    apsa: [],
    niveau: [],
    type: [],
  };
}

export function sanitizeExclusions(raw: unknown): Exclusions {
  const parsed = raw && typeof raw === "object" ? (raw as Partial<Record<FilterGroup, unknown>>) : {};
  return {
    academie: stringList(parsed.academie).filter((slug) => availableSlugs("academie").includes(slug)),
    theme: stringList(parsed.theme).filter((slug) => availableSlugs("theme").includes(slug)),
    apsa: stringList(parsed.apsa).filter((slug) => availableSlugs("apsa").includes(slug)),
    niveau: stringList(parsed.niveau).filter((slug) => availableSlugs("niveau").includes(slug)),
    type: stringList(parsed.type).filter((slug) => availableSlugs("type").includes(slug)),
  };
}

export function readExclusions(): Exclusions {
  if (typeof window === "undefined") return EMPTY_EXCLUSIONS;
  try {
    const current = window.localStorage.getItem(FILTER_MEMORY_KEY);
    if (current) return sanitizeExclusions(JSON.parse(current) as unknown);
    const legacy = window.localStorage.getItem(LEGACY_WATCH_KEY);
    const migrated = legacy ? migrateLegacyPrefs(JSON.parse(legacy) as unknown) : EMPTY_EXCLUSIONS;
    window.localStorage.setItem(FILTER_MEMORY_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return EMPTY_EXCLUSIONS;
  }
}

export function writeExclusions(exclusions: Exclusions): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FILTER_MEMORY_KEY, JSON.stringify(sanitizeExclusions(exclusions)));
}

export function toggleExclusion(exclusions: Exclusions, group: FilterGroup, slug: string): Exclusions {
  const current = exclusions[group];
  const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
  return sanitizeExclusions({ ...exclusions, [group]: next });
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
