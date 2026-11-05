import { FEATURED_POOL, FEATURED_SUMMARY_MIN } from "@/lib/constants";

export type Featureable = {
  id: string;
  sourceSlug: string;
  publishedAt: string | null;
  discoveredAt: string;
  summary: string | null;
  imageUrl: string | null;
};

/**
 * Mise en avant automatique, sans sélection humaine.
 * 1. Trier par date de publication connue, puis par date de découverte.
 * 2. L'article principal est, parmi les 40 plus récents, le premier qui a un résumé
 *    d'au moins 80 caractères et une illustration ; à défaut un résumé suffisant ;
 *    à défaut le plus récent.
 * 3. Les quatre cartes suivantes privilégient des académies différentes.
 */
export function selectFeatured<T extends Featureable>(items: T[]): { lead: T | null; secondary: T[]; rest: T[] } {
  const ranked = [...items].sort(compareRecency);
  if (ranked.length === 0) return { lead: null, secondary: [], rest: [] };
  const pool = ranked.slice(0, FEATURED_POOL);
  const lead =
    pool.find((item) => Boolean(item.imageUrl) && (item.summary?.trim().length ?? 0) >= FEATURED_SUMMARY_MIN) ??
    pool.find((item) => (item.summary?.trim().length ?? 0) >= FEATURED_SUMMARY_MIN) ??
    pool[0];
  const remaining = ranked.filter((item) => item.id !== lead.id);
  const secondary: T[] = [];
  const used = new Set<string>([lead.sourceSlug]);
  for (const item of remaining) {
    if (secondary.length >= 4) break;
    if (used.has(item.sourceSlug)) continue;
    secondary.push(item);
    used.add(item.sourceSlug);
  }
  for (const item of remaining) {
    if (secondary.length >= 4) break;
    if (secondary.some((chosen) => chosen.id === item.id)) continue;
    secondary.push(item);
  }
  const chosen = new Set([lead.id, ...secondary.map((item) => item.id)]);
  return { lead, secondary, rest: ranked.filter((item) => !chosen.has(item.id)) };
}

export function compareRecency(a: Featureable, b: Featureable): number {
  if (a.publishedAt && !b.publishedAt) return -1;
  if (!a.publishedAt && b.publishedAt) return 1;
  if (a.publishedAt && b.publishedAt && a.publishedAt !== b.publishedAt) {
    return a.publishedAt < b.publishedAt ? 1 : -1;
  }
  if (a.discoveredAt !== b.discoveredAt) return a.discoveredAt < b.discoveredAt ? 1 : -1;
  return a.id < b.id ? -1 : 1;
}
