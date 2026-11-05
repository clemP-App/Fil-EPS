export const USER_AGENT =
  "FilEPS/0.1 (bot de veille documentaire EPS; metadonnees uniquement; pas de texte integral)";

export const SITE_NAME = "Fil EPS";

export const FEATURED_SUMMARY_MIN = 80;
export const FEATURED_POOL = 40;
export const FEED_ITEM_CAP = 40;
export const HTML_ITEM_CAP = 20;
export const SITEMAP_FETCH_CAP = 12;
export const IMAGE_LOOKUP_CAP = 12;

export function siteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return value.replace(/\/+$/, "");
}
