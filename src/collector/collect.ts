import { collectSitemap } from "@/collector/sitemap";
import { parseFeed } from "@/collector/feed";
import { extractHtmlList, contentImage, openGraphImage } from "@/collector/html";
import { CollectorError, decodeBody, politeFetch, type Fetcher } from "@/collector/http";
import { IMAGE_LOOKUP_CAP } from "@/lib/constants";
import type { SourceRecord, CollectedItem, HtmlCollectConfig, SitemapCollectConfig } from "@/lib/types";
import { isMembersArea } from "@/lib/url";

export async function collectSource(
  source: SourceRecord,
  fetchImpl: Fetcher = politeFetch,
  known?: Map<string, string | null>,
): Promise<CollectedItem[]> {
  if (source.method === "rss") {
    if (!source.feedUrl) throw new CollectorError("URL de flux manquante.");
    const response = await fetchImpl(source.feedUrl, {
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
    });
    const items = parseFeed(decodeBody(response.body, response.contentType)).items;
    await fillMissingImages(items, fetchImpl);
    return items;
  }
  if (source.method === "html") {
    const config = source.config as HtmlCollectConfig;
    const url = (typeof config.listUrl === "string" && config.listUrl) || source.homepageUrl;
    if (!url || !config.itemSelector || !config.titleSelector) throw new CollectorError("Configuration HTML incomplète.");
    const response = await fetchImpl(url, { accept: "text/html,application/xhtml+xml" });
    return extractHtmlList(decodeBody(response.body, response.contentType), response.url, config);
  }
  if (source.method === "sitemap") {
    const config = source.config as SitemapCollectConfig;
    return collectSitemap({ config, homepage: source.homepageUrl, fetchImpl, known });
  }
  throw new CollectorError("Méthode de collecte inconnue.");
}

export async function fillMissingImages(items: CollectedItem[], fetchImpl: Fetcher, cap = IMAGE_LOOKUP_CAP): Promise<void> {
  let lookedUp = 0;
  for (const item of items) {
    if (lookedUp >= cap) return;
    const poster = item.imageUrl && /i\.ytimg\.com|img\.youtube\.com/i.test(item.imageUrl);
    if (item.imageUrl && !poster) continue;
    if (!item.originalUrl || isMembersArea(item.originalUrl, item.categories)) continue;
    lookedUp += 1;
    try {
      const response = await fetchImpl(item.originalUrl, { accept: "text/html,application/xhtml+xml", maxBytes: 900_000 });
      const html = decodeBody(response.body, response.contentType);
      const image = openGraphImage(html, response.url) || contentImage(html, response.url);
      if (image) item.imageUrl = image;
    } catch {
      continue;
    }
  }
}
