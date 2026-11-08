import { VERIFIED_SOURCES } from "@/collector/verified-sources";
import { ACADEMIES } from "@/lib/taxonomy";

const enabled = new Set(VERIFIED_SOURCES.filter((source) => source.enabled).map((source) => source.slug));

export function sourceBlockedReason(slug: string): string | null {
  const source = ACADEMIES.find((item) => item.slug === slug);
  if (!source || enabled.has(slug)) return null;
  return source.kind === "academie"
    ? "Le site de cette académie ne permet pas de récupérer les articles."
    : "Le site de cette source ne permet pas de récupérer les articles.";
}

export function availableAcademySlugs(): string[] {
  return ACADEMIES.filter((item) => enabled.has(item.slug)).map((item) => item.slug);
}
