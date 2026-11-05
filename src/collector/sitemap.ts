import { XMLParser } from "fast-xml-parser";
import { SITEMAP_FETCH_CAP } from "@/lib/constants";
import { parseFeedDate } from "@/lib/dates";
import type { CollectedItem, SitemapCollectConfig } from "@/lib/types";
import { canonicalUrl, isNavigationUrl } from "@/lib/url";
import { extractPageMetadata } from "@/collector/html";
import { CollectorError, decodeBody, robotsSitemaps, type Fetcher } from "@/collector/http";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  removeNSPrefix: true,
});

export function parseSitemapXml(xml: string): { kind: "index" | "urlset" | "unknown"; entries: Array<{ loc: string; lastmod: string | null }> } {
  let document: Record<string, unknown>;
  try {
    document = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return { kind: "unknown", entries: [] };
  }
  const index = asRecord(document.sitemapindex);
  if (index?.sitemap) return { kind: "index", entries: readEntries(index.sitemap) };
  const urlset = asRecord(document.urlset);
  if (urlset?.url) return { kind: "urlset", entries: readEntries(urlset.url) };
  return { kind: "unknown", entries: [] };
}

export async function collectSitemap(options: {
  config: SitemapCollectConfig;
  homepage: string | null;
  fetchImpl: Fetcher;
  known?: Map<string, string | null>;
}): Promise<CollectedItem[]> {
  if (!options.config.includePattern) throw new CollectorError("Motif de sitemap manquant.");
  let include: RegExp;
  let exclude: RegExp | null = null;
  try {
    include = new RegExp(options.config.includePattern, "i");
    exclude = options.config.excludePattern ? new RegExp(options.config.excludePattern, "i") : null;
  } catch {
    throw new CollectorError("Motif de sitemap invalide.");
  }
  const seeds = await sitemapSeeds(options.config, options.homepage, options.fetchImpl);
  const urls: Array<{ loc: string; lastmod: string | null }> = [];
  for (const seed of seeds.slice(0, 4)) {
    try {
      const response = await options.fetchImpl(seed, { accept: "application/xml,text/xml" });
      const parsed = parseSitemapXml(decodeBody(response.body, response.contentType));
      if (parsed.kind === "index") {
        for (const child of parsed.entries.slice(0, 3)) {
          const childResponse = await options.fetchImpl(child.loc, { accept: "application/xml,text/xml" });
          const childParsed = parseSitemapXml(decodeBody(childResponse.body, childResponse.contentType));
          urls.push(...childParsed.entries);
        }
      } else {
        urls.push(...parsed.entries);
      }
    } catch (error) {
      if (seeds.length === 1) throw error;
    }
  }
  const candidates = urls
    .filter((entry) => include.test(entry.loc) && !exclude?.test(entry.loc) && !isNavigationUrl(entry.loc, entry.loc))
    .map((entry) => ({ ...entry, canonical: canonicalUrl(entry.loc), modified: parseFeedDate(entry.lastmod) }))
    .filter((entry) => entry.canonical)
    .sort((a, b) => {
      if (a.modified && !b.modified) return -1;
      if (!a.modified && b.modified) return 1;
      if (a.modified && b.modified && a.modified !== b.modified) return a.modified < b.modified ? 1 : -1;
      return 0;
    });
  const items: CollectedItem[] = [];
  const cap = Math.min(options.config.maxUrls ?? SITEMAP_FETCH_CAP, SITEMAP_FETCH_CAP);
  for (const candidate of candidates) {
    if (items.length >= cap) break;
    const canonical = candidate.canonical!;
    if (options.known?.has(canonical)) {
      const stored = options.known.get(canonical);
      if (!candidate.modified || (stored && candidate.modified <= stored)) continue;
    }
    const response = await options.fetchImpl(candidate.loc, { accept: "text/html" });
    const metadata = extractPageMetadata(decodeBody(response.body, response.contentType), response.url, candidate.modified);
    if (metadata) items.push(metadata);
  }
  return items;
}

async function sitemapSeeds(config: SitemapCollectConfig, homepage: string | null, fetchImpl: Fetcher): Promise<string[]> {
  if (config.sitemapUrl) return [config.sitemapUrl];
  if (!homepage) throw new CollectorError("Aucune URL de sitemap.");
  const seeds: string[] = [];
  try {
    const robots = await fetchImpl(new URL("/robots.txt", homepage).href, { accept: "text/plain" });
    seeds.push(...robotsSitemaps(decodeBody(robots.body, robots.contentType)));
  } catch {
    // Les adresses habituelles sont essayées ensuite.
  }
  seeds.push(new URL("/sitemap.xml", homepage).href, new URL("/wp-sitemap.xml", homepage).href);
  return [...new Set(seeds)];
}

function readEntries(value: unknown): Array<{ loc: string; lastmod: string | null }> {
  const nodes = Array.isArray(value) ? value : [value];
  return nodes
    .map((node) => {
      const record = asRecord(node);
      return { loc: text(record?.loc), lastmod: text(record?.lastmod) || null };
    })
    .filter((entry) => /^https?:\/\//i.test(entry.loc));
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  const record = asRecord(value);
  if (record && (typeof record["#text"] === "string" || typeof record["#text"] === "number")) return String(record["#text"]).trim();
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
