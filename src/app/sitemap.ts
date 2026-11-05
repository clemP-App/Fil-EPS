import type { MetadataRoute } from "next";
import { getRepository } from "@/lib/app-db";
import { siteUrl } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticRoutes: MetadataRoute.Sitemap = ["", "/recherche", "/sources", "/a-propos", "/favoris", "/veille"].map((path) => ({
    url: `${base}${path || "/"}`,
  }));
  try {
    const result = await (await getRepository()).listPublications({ page: 1, pageSize: 80, sort: "date" });
    return [
      ...staticRoutes,
      ...result.items.map((publication) => ({
        url: `${base}/publication/${publication.id}`,
        lastModified: publication.modifiedAt ?? publication.discoveredAt,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
