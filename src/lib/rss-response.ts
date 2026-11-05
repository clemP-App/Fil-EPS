import { SITE_NAME } from "@/lib/constants";
import { toQueryParts } from "@/lib/filters";
import { getRepository } from "@/lib/app-db";
import { renderRss, type RssEntry } from "@/lib/rss";
import type { PublicFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function rssResponse(filters: PublicFilters, path: string) {
  const parts = toQueryParts({ ...filters, page: 1, sort: "date" });
  const result = await (await getRepository()).listPublications({ ...parts, pageSize: 40 });
  const items: RssEntry[] = result.items.map((publication) => ({
    title: publication.title,
    portalPath: `/publication/${publication.id}`,
    summary: publication.summary,
    publishedAt: publication.publishedAt,
    discoveredAt: publication.discoveredAt,
    sourceName: publication.sourceName,
    originalUrl: publication.originalUrl,
  }));
  const xml = renderRss({
    title: SITE_NAME,
    path,
    description: "Dernières publications académiques d'EPS repérées par Fil EPS. Chaque entrée ouvre une fiche du portail.",
    items,
  });
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}
