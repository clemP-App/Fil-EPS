/**
 * Découverte prudente des sites EPS et de leurs flux.
 * N'enregistre que des métadonnées (statut, titres). Ne contourne aucune protection.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA =
  "FilEPS/0.1 (bot de veille documentaire EPS; metadonnees uniquement; contact: admin local)";

const seeds = [
  { slug: "aix-marseille", urls: ["https://eps.ac-aix-marseille.fr/", "https://www.pedagogie.ac-aix-marseille.fr/"] },
  { slug: "amiens", urls: ["https://eps.ac-amiens.fr/"] },
  { slug: "besancon", urls: ["https://eps.ac-besancon.fr/", "https://eps.ac-besancon.fr/feed/"] },
  { slug: "bordeaux", urls: ["https://eps.ac-bordeaux.fr/", "https://ent2d.ac-bordeaux.fr/disciplines/eps/", "https://webetab.ac-bordeaux.fr/eps/"] },
  { slug: "clermont-ferrand", urls: ["https://eps.ac-clermont.fr/", "https://www.ac-clermont.fr/"] },
  { slug: "corse", urls: ["https://sites.ac-corse.fr/eps/", "https://sites.ac-corse.fr/eps/feed/", "https://sites.ac-corse.fr/eps/category/actualites/"] },
  { slug: "creteil", urls: ["https://eps.ac-creteil.fr/", "https://eps.ac-creteil.fr/spip.php?page=backend"] },
  { slug: "dijon", urls: ["https://eps.wp.ac-dijon.fr/", "https://eps.wp.ac-dijon.fr/feed/"] },
  { slug: "grenoble", urls: ["https://eps.ac-grenoble.fr/", "https://eps.web.ac-grenoble.fr/", "https://disciplines.ac-grenoble.fr/eps/"] },
  { slug: "guadeloupe", urls: ["https://eps.ac-guadeloupe.fr/", "https://sites.ac-guadeloupe.fr/eps/"] },
  { slug: "guyane", urls: ["https://eps.ac-guyane.fr/", "https://eps.dis.ac-guyane.fr/", "https://pedagogie.ac-guyane.fr/eps/"] },
  { slug: "lille", urls: ["https://eps.ac-lille.fr/", "https://www.ac-lille.fr/"] },
  { slug: "limoges", urls: ["https://eps.ac-limoges.fr/", "https://www.ac-limoges.fr/"] },
  { slug: "lyon", urls: ["https://eps.enseigne.ac-lyon.fr/spip/", "https://eps.enseigne.ac-lyon.fr/spip/spip.php?page=backend", "https://eps.ac-lyon.fr/"] },
  { slug: "martinique", urls: ["https://eps.ac-martinique.fr/", "https://sites.ac-martinique.fr/eps/"] },
  { slug: "mayotte", urls: ["https://eps.ac-mayotte.fr/", "https://eps.ac-mayotte.yt/"] },
  { slug: "montpellier", urls: ["https://eps.ac-montpellier.fr/", "https://pedagogie.ac-montpellier.fr/eps/"] },
  { slug: "nancy-metz", urls: ["https://eps.ac-nancy-metz.fr/", "https://sites.ac-nancy-metz.fr/eps/"] },
  { slug: "nantes", urls: ["https://eps.ac-nantes.fr/", "https://www.pedagogie.ac-nantes.fr/eps/"] },
  { slug: "nice", urls: ["https://eps.ac-nice.fr/", "https://www.ac-nice.fr/"] },
  { slug: "normandie", urls: ["https://eps.ac-normandie.fr/", "https://eps.dis.ac-normandie.fr/", "https://eps.ac-rouen.fr/", "https://eps.ac-caen.fr/"] },
  { slug: "nouvelle-caledonie", urls: ["https://eps.ac-noumea.nc/", "https://www.ac-noumea.nc/"] },
  { slug: "orleans-tours", urls: ["https://eps.ac-orleans-tours.fr/", "https://eps.ac-orleans-tours.fr/wordpress/"] },
  { slug: "paris", urls: ["https://eps.ac-paris.fr/", "https://pia.ac-paris.fr/portail/jcms/p1_5147919/sites-disciplinaires-des-academies"] },
  { slug: "poitiers", urls: ["https://eps.ac-poitiers.fr/", "https://ww2.ac-poitiers.fr/eps/", "https://ww2.ac-poitiers.fr/eps/spip.php?page=backend"] },
  { slug: "polynesie", urls: ["https://www.ac-polynesie.pf/", "https://eps.ac-polynesie.pf/"] },
  { slug: "reims", urls: ["https://eps.ac-reims.fr/", "https://www.ac-reims.fr/"] },
  { slug: "rennes", urls: ["https://eps.ac-rennes.fr/", "https://pedagogie.ac-rennes.fr/eps/"] },
  { slug: "reunion", urls: ["https://eps.ac-reunion.fr/", "https://eps.ac-reunion.fr/wordpress/"] },
  { slug: "strasbourg", urls: ["https://eps.ac-strasbourg.fr/", "https://www.ac-strasbourg.fr/"] },
  { slug: "toulouse", urls: ["https://eps.ac-toulouse.fr/", "https://disciplines.ac-toulouse.fr/eps/", "https://pedagogie.ac-toulouse.fr/eps/"] },
  { slug: "versailles", urls: ["https://eps.ac-versailles.fr/", "https://blog.ac-versailles.fr/"] },
  { slug: "eduscol", urls: ["https://eduscol.education.gouv.fr/4434/education-physique-et-sportive"] },
  { slug: "annuaire-pearltrees", urls: ["https://www.pearltrees.com/pascal_nogaro/sites-acad/id40665990"] },
];

const extraFeedGuesses = [
  "feed/",
  "feed",
  "rss/",
  "rss.xml",
  "?feed=rss2",
  "spip.php?page=backend",
  "backend.php",
];

async function fetchUrl(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(14000),
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.8",
        "accept-language": "fr-FR,fr;q=0.9",
      },
    });
    const buf = Buffer.from(await response.arrayBuffer());
    const slice = buf.subarray(0, 500_000);
    const text = slice.toString("utf8");
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      type: response.headers.get("content-type"),
      ms: Date.now() - started,
      bytes: buf.length,
      text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      type: null,
      ms: Date.now() - started,
      bytes: 0,
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function decodeBasic(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractFeeds(html, base) {
  const found = new Set();
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const raw = tag[0];
    if (!/alternate/i.test(raw) || !/(rss|atom|xml)/i.test(raw)) continue;
    const href = raw.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) {
      try {
        found.add(new URL(href, base).href);
      } catch {
        /* ignore */
      }
    }
  }
  for (const match of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = match[1];
    if (!/(feed|rss|atom|backend)/i.test(href)) continue;
    if (/comment|mailto:|javascript:/i.test(href)) continue;
    try {
      found.add(new URL(href, base).href);
    } catch {
      /* ignore */
    }
  }
  return [...found].slice(0, 8);
}

function extractHeadings(html) {
  return [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => decodeBasic(match[1]))
    .filter((title) => title.length > 3)
    .slice(0, 8);
}

function extractLinks(html, base) {
  const links = new Set();
  for (const match of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], base);
      if (!/^https?:$/.test(url.protocol)) continue;
      const href = url.href;
      if (/ac-|education\.gouv|eduscol|eps/i.test(href)) links.add(href.split("#")[0]);
    } catch {
      /* ignore */
    }
  }
  return [...links].slice(0, 80);
}

function inspectFeed(xml) {
  const channel = decodeBasic(xml.match(/<channel[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const blocks = xml.includes("<entry")
    ? xml.split(/<entry[\s>]/i).slice(1)
    : xml.split(/<item[\s>]/i).slice(1);
  const items = blocks.slice(0, 5).map((block) => ({
    title: decodeBasic(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    link: decodeBasic(
      block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1] ??
        block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ??
        "",
    ),
    date: decodeBasic(
      block.match(/<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i)?.[1] ??
        "",
    ),
  }));
  return { channel, count: blocks.length, items };
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

const flat = [];
for (const seed of seeds) {
  for (const url of seed.urls) flat.push({ slug: seed.slug, url });
}

console.log(`Probe de ${flat.length} URL…`);
const pages = await mapPool(flat, 4, async (entry) => {
  const result = await fetchUrl(entry.url);
  const isXml = /xml|rss|atom/i.test(result.type ?? "") || /<(rss|feed|rdf:RDF)\b/i.test(result.text.slice(0, 500));
  const summary = {
    slug: entry.slug,
    url: entry.url,
    ok: result.ok,
    status: result.status,
    finalUrl: result.finalUrl,
    type: result.type,
    ms: result.ms,
    bytes: result.bytes,
    error: result.error ?? null,
    title: decodeBasic(result.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").slice(0, 180),
    feeds: isXml ? [] : extractFeeds(result.text, result.finalUrl || entry.url),
    headings: isXml ? [] : extractHeadings(result.text),
    links: isXml ? [] : extractLinks(result.text, result.finalUrl || entry.url).slice(0, 25),
    feed: isXml ? inspectFeed(result.text) : null,
  };
  console.log(`${result.ok ? "OK" : "KO"} ${result.status} ${entry.slug} ${entry.url} ${summary.title.slice(0, 70)}`);
  return summary;
});

const feedUrls = new Set();
for (const page of pages) {
  if (page.feed) feedUrls.add(page.finalUrl || page.url);
  for (const feed of page.feeds) feedUrls.add(feed);
}

for (const page of pages) {
  if (!page.ok || page.feed || /xml|rss|atom/i.test(page.type ?? "")) continue;
  let base;
  try {
    base = new URL(page.finalUrl || page.url);
  } catch {
    continue;
  }
  for (const guess of extraFeedGuesses) {
    try {
      feedUrls.add(new URL(guess, base).href);
    } catch {
      /* ignore */
    }
  }
}

const unchecked = [...feedUrls].filter((url) => !pages.some((page) => page.url === url || page.finalUrl === url));
console.log(`Vérification de ${unchecked.length} flux candidats…`);
const feeds = await mapPool(unchecked.slice(0, 120), 3, async (url) => {
  const result = await fetchUrl(url);
  const isFeed = /<(rss|feed|rdf:RDF)\b/i.test(result.text.slice(0, 800)) && /<(item|entry)\b/i.test(result.text);
  const summary = {
    url,
    ok: result.ok,
    status: result.status,
    finalUrl: result.finalUrl,
    type: result.type,
    error: result.error ?? null,
    isFeed,
    feed: isFeed ? inspectFeed(result.text) : null,
  };
  if (isFeed) console.log(`FLUX ${result.status} ${url} :: ${summary.feed.items.map((item) => item.title).slice(0, 2).join(" | ")}`);
  return summary;
});

const report = { generatedAt: new Date().toISOString(), pages, feeds: feeds.filter((feed) => feed.isFeed) };
await mkdir(path.join(process.cwd(), "data"), { recursive: true });
await writeFile(path.join(process.cwd(), "data", "probe-report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(`Flux confirmés: ${report.feeds.length}`);
for (const feed of report.feeds) {
  console.log(`- ${feed.url}`);
  for (const item of feed.feed.items.slice(0, 3)) console.log(`    · ${item.date} ${item.title}`);
}
