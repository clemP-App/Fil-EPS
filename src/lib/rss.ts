import { siteUrl } from "@/lib/constants";
import { xmlEscape } from "@/lib/text";

export type RssEntry = {
  title: string;
  portalPath: string;
  summary: string | null;
  publishedAt: string | null;
  discoveredAt: string;
  sourceName: string;
  originalUrl: string;
};

export function renderRss(options: {
  title: string;
  path: string;
  description: string;
  items: RssEntry[];
}): string {
  const self = `${siteUrl()}${options.path}`;
  const items = options.items
    .map((item) => {
      const link = `${siteUrl()}${item.portalPath}`;
      const dateNote = item.publishedAt
        ? ""
        : ` Date de publication inconnue. Repérée le ${item.discoveredAt}.`;
      const description = `${item.sourceName}. ${item.summary ?? "Aucun résumé fourni par la source."}${dateNote} Source originale : ${item.originalUrl}`;
      const pubDate = item.publishedAt ? `<pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>` : "";
      return `    <item>
      <title>${xmlEscape(item.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      ${pubDate}
      <description>${xmlEscape(description)}</description>
      <source url="${xmlEscape(item.originalUrl)}">${xmlEscape(item.sourceName)}</source>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(options.title)}</title>
    <link>${xmlEscape(siteUrl())}</link>
    <atom:link href="${xmlEscape(self)}" rel="self" type="application/rss+xml"/>
    <description>${xmlEscape(options.description)}</description>
    <language>fr-fr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
