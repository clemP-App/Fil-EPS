import { load } from "cheerio";
import { HTML_ITEM_CAP } from "@/lib/constants";
import { parseLooseDate } from "@/lib/dates";
import { cleanTitle, excerpt, isGenericTitle } from "@/lib/text";
import type { CollectedItem, HtmlCollectConfig } from "@/lib/types";
import { canonicalUrl, isNavigationUrl, safeImageUrl } from "@/lib/url";
import { CollectorError } from "@/collector/http";

export function extractHtmlList(html: string, pageUrl: string, config: HtmlCollectConfig): CollectedItem[] {
  if (!config.itemSelector || !config.titleSelector) throw new CollectorError("Configuration HTML incomplète.");
  let hrefInclude: RegExp | null = null;
  if (config.hrefInclude) {
    try {
      hrefInclude = new RegExp(config.hrefInclude, "i");
    } catch {
      throw new CollectorError("Filtre de liens HTML invalide.");
    }
  }
  const $ = load(html);
  const baseAttr = $("base[href]").first().attr("href");
  let resolveAgainst = pageUrl;
  if (baseAttr) {
    try {
      resolveAgainst = new URL(baseAttr, pageUrl).href;
    } catch {
      resolveAgainst = pageUrl;
    }
  }
  const items: CollectedItem[] = [];
  const seen = new Set<string>();
  $(config.itemSelector).each((_, element) => {
    if (items.length >= (config.maxItems ?? HTML_ITEM_CAP)) return;
    const root = $(element);
    const titleNode = root.find(config.titleSelector).first();
    const linkNode = config.linkSelector ? root.find(config.linkSelector).first() : titleNode;
    const href = linkNode.attr("href") || titleNode.attr("href");
    const title = cleanTitle(titleNode.text() || linkNode.text());
    if (!href || isGenericTitle(title)) return;
    let absolute: string;
    try {
      absolute = new URL(href, resolveAgainst).href;
    } catch {
      return;
    }
    if (isNavigationUrl(absolute, pageUrl)) return;
    if (hrefInclude && !hrefInclude.test(absolute)) return;
    const canonical = canonicalUrl(absolute);
    if (!canonical || seen.has(canonical)) return;
    seen.add(canonical);
    const summary = config.summarySelector ? excerpt(root.find(config.summarySelector).first().text()) : null;
    const dateNode = config.dateSelector ? root.find(config.dateSelector).first() : null;
    const rawDate = dateNode ? dateNode.attr(config.dateAttribute || "datetime") || dateNode.text() : "";
    const image = config.imageSelector ? root.find(config.imageSelector).first().attr("src") : null;
    items.push({
      title,
      originalUrl: absolute,
      summary,
      imageUrl: safeImageUrl(image, pageUrl),
      publishedAt: parseLooseDate(rawDate),
      modifiedAt: null,
      guid: canonical,
      categories: [],
      section: config.section ?? null,
    });
  });
  return items;
}

export function openGraphImage(html: string, pageUrl: string): string | null {
  const $ = load(html);
  const raw =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[property="og:image:url"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content");
  const image = safeImageUrl(raw, pageUrl);
  if (!image || isDecorativeImage(image)) return null;
  return image;
}

export function contentImage(html: string, pageUrl: string): string | null {
  const $ = load(html);
  const root = $(".entry-content, .texte, .article__content, [itemprop='articleBody']").first();
  if (!root.length) return null;
  let chosen: string | null = null;
  root.find("img").each((_, element) => {
    if (chosen) return;
    const node = $(element);
    const image = safeImageUrl(node.attr("src") || node.attr("data-src") || node.attr("data-lazy-src"), pageUrl);
    if (!image || isDecorativeImage(image)) return;
    const width = Number(node.attr("width") || 0);
    const height = Number(node.attr("height") || 0);
    if ((width && width < 200) || (height && height < 140)) return;
    chosen = image;
  });
  return chosen;
}

function isDecorativeImage(url: string): boolean {
  return /logo|favicon|sprite|apple-touch-icon|placeholder|thumb-standard-empty|gravatar|emoji|cropped-republique|image_logo/i.test(url);
}

export function extractPageMetadata(html: string, pageUrl: string, modifiedHint: string | null): CollectedItem | null {
  const $ = load(html);
  const title = cleanTitle(
    $('meta[property="og:title"]').attr("content") || $("h1").first().text() || $("title").first().text() || "",
  );
  if (isGenericTitle(title)) return null;
  const canonical = canonicalUrl($('link[rel="canonical"]').attr("href") || pageUrl) || canonicalUrl(pageUrl);
  if (!canonical) return null;
  const summary = excerpt(
    $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || "",
  );
  return {
    title,
    originalUrl: pageUrl,
    summary,
    imageUrl: openGraphImage(html, pageUrl),
    publishedAt: parseLooseDate($('meta[property="article:published_time"]').attr("content")),
    modifiedAt: parseLooseDate($('meta[property="article:modified_time"]').attr("content")) || modifiedHint,
    guid: canonical,
    categories: [],
    section: null,
  };
}
