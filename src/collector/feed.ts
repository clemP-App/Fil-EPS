import { XMLParser } from "fast-xml-parser";
import { FEED_ITEM_CAP } from "@/lib/constants";
import { parseFeedDate } from "@/lib/dates";
import { cleanTitle, excerpt, isGenericTitle } from "@/lib/text";
import type { CollectedItem } from "@/lib/types";
import { canonicalUrl, safeImageUrl } from "@/lib/url";
import { CollectorError } from "@/collector/http";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  processEntities: true,
  removeNSPrefix: false,
});

export function parseFeed(xml: string): { kind: "rss" | "atom"; items: CollectedItem[] } {
  let document: Record<string, unknown>;
  try {
    document = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new CollectorError("Flux XML illisible.");
  }
  const rss = asRecord(document.rss);
  const channel = asRecord(rss?.channel) ?? asRecord(asRecord(document["rdf:RDF"])?.channel);
  if (channel) return { kind: "rss", items: cap(readItems(asArray(channel.item), false)) };
  const feed = asRecord(document.feed);
  if (feed) return { kind: "atom", items: cap(readItems(asArray(feed.entry), true)) };
  throw new CollectorError("Le document n'est pas un flux RSS ou Atom.");
}

function readItems(nodes: unknown[], atom: boolean): CollectedItem[] {
  const items: CollectedItem[] = [];
  for (const node of nodes) {
    const record = asRecord(node);
    if (!record) continue;
    const link = atom ? atomLink(record) : text(record.link);
    const canonical = canonicalUrl(link);
    const title = cleanTitle(text(record.title));
    if (!canonical || isGenericTitle(title)) continue;
    const description = text(record.description) || text(record.summary);
    const encoded = text(record["content:encoded"]) || text(record.content);
    const published = atom
      ? parseFeedDate(text(record.published))
      : parseFeedDate(text(record.pubDate) || text(record["dc:date"]));
    const modified = parseFeedDate(text(record.updated) || text(record["dcterms:modified"]));
    items.push({
      title,
      originalUrl: link,
      summary: excerpt(description) || excerpt(encoded),
      imageUrl: imageOf(record, `${description}\n${encoded}`, link),
      publishedAt: published,
      modifiedAt: modified && modified !== published ? modified : atom && !published ? modified : null,
      guid: text(record.guid) || text(record.id) || null,
      categories: categoriesOf(record),
      section: null,
    });
  }
  return items;
}

function imageOf(record: Record<string, unknown>, html: string, base: string): string | null {
  const media = asArray(record["media:content"])
    .map((entry) => asRecord(entry))
    .find((entry) => entry && looksLikeImage(`${entry["@_type"] ?? ""} ${entry["@_medium"] ?? ""} ${entry["@_url"] ?? ""}`));
  const thumbnail = asRecord(asArray(record["media:thumbnail"])[0]);
  const enclosure = asRecord(record.enclosure);
  const fromMedia = (typeof media?.["@_url"] === "string" ? media["@_url"] : null) || (typeof thumbnail?.["@_url"] === "string" ? thumbnail["@_url"] : null);
  const fromEnclosure =
    typeof enclosure?.["@_url"] === "string" && /image|jpg|jpeg|png|webp|gif/i.test(`${enclosure["@_type"] ?? ""}${enclosure["@_url"]}`)
      ? enclosure["@_url"]
      : null;
  const fromHtml = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
  const youtube = youtubePoster(html);
  return safeImageUrl(fromMedia || fromEnclosure || fromHtml || youtube, base);
}

function youtubePoster(html: string): string | null {
  const id = html.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{6,})/i)?.[1];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

function looksLikeImage(value: string): boolean {
  return /image|jpe?g|png|webp|gif/i.test(value) && !/video|audio/i.test(value);
}

function categoriesOf(record: Record<string, unknown>): string[] {
  return asArray(record.category)
    .map((category) => text(category) || stringAttr(category, "@_term") || stringAttr(category, "@_label"))
    .map((category) => category.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function atomLink(record: Record<string, unknown>): string {
  const links = asArray(record.link);
  const alternate = links.find((link) => {
    const rel = stringAttr(link, "@_rel");
    return !rel || rel === "alternate";
  });
  return stringAttr(alternate, "@_href") || text(alternate);
}

function cap(items: CollectedItem[]): CollectedItem[] {
  return [...items]
    .sort((a, b) => {
      if (a.publishedAt && !b.publishedAt) return -1;
      if (!a.publishedAt && b.publishedAt) return 1;
      if (a.publishedAt && b.publishedAt && a.publishedAt !== b.publishedAt) return a.publishedAt < b.publishedAt ? 1 : -1;
      return 0;
    })
    .slice(0, FEED_ITEM_CAP);
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return text(value[0]);
  const record = asRecord(value);
  if (!record) return "";
  if (typeof record["#text"] === "string" || typeof record["#text"] === "number") return String(record["#text"]).trim();
  return "";
}

function stringAttr(value: unknown, key: string): string {
  const record = asRecord(value);
  const attr = record?.[key];
  return typeof attr === "string" ? attr.trim() : "";
}

function asArray(value: unknown): unknown[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
