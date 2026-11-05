import { describe, expect, it } from "vitest";
import { classify } from "@/lib/classify";
import { parseFeed } from "@/collector/feed";
import { extractHtmlList, openGraphImage, contentImage } from "@/collector/html";
import { fillMissingImages } from "@/collector/collect";
import { robotsAllows } from "@/collector/http";
import { parseSitemapXml } from "@/collector/sitemap";
import { parisStartOfDay, parseLooseDate } from "@/lib/dates";
import { selectFeatured } from "@/lib/featuring";
import { passwordsMatch, signSession, verifySession } from "@/lib/auth-token";
import { openSqlite } from "@/lib/db-driver";
import { createRepository } from "@/lib/repository";
import { renderRss } from "@/lib/rss";
import { canonicalUrl, isMembersArea, safeImageUrl } from "@/lib/url";
import { fold, excerpt } from "@/lib/text";
import type { SourceDefinition } from "@/lib/types";

const lyon: SourceDefinition = {
  slug: "lyon",
  name: "Lyon",
  kind: "academie",
  regionGroup: "metropole",
  homepageUrl: "https://eps.example",
  feedUrl: "https://eps.example/feed",
  method: "rss",
  enabled: true,
  config: {},
};

async function repoWithSource() {
  const repo = createRepository(openSqlite(":memory:"));
  await repo.init();
  await repo.ensureSources([lyon]);
  const source = (await repo.listSources()).find((item) => item.slug === "lyon");
  if (!source) throw new Error("source absente");
  return { repo, source };
}

describe("texte et dates", () => {
  it("ignore les accents et la casse", () => {
    expect(fold("Évaluation")).toBe("evaluation");
    expect(fold("Œuvre")).toBe("oeuvre");
  });

  it("place minuit à Paris", () => {
    expect(parisStartOfDay(new Date("2026-11-04T15:00:00Z")).toISOString()).toBe("2026-11-03T23:00:00.000Z");
  });

  it("lit une date française jour/mois/année", () => {
    expect(parseLooseDate("publié le 09/10/2026")).toBe("2026-10-09T12:00:00.000Z");
    expect(parseLooseDate("9 mars 2026")).toBe("2026-03-09T12:00:00.000Z");
    expect(parseLooseDate("Le 19 juin 2023")).toBe("2023-06-19T12:00:00.000Z");
    expect(parseLooseDate("pas une date")).toBeNull();
  });

  it("normalise l'adresse canonique", () => {
    expect(canonicalUrl("http://EPS.Example/article/?utm_source=news&b=2&a=1")).toBe("https://eps.example/article?a=1&b=2");
    expect(canonicalUrl("https://eps.ac-creteil.fr/spip.php?article1537")).toBe("https://eps.ac-creteil.fr/spip.php?article1537");
    expect(safeImageUrl("https://www.aeeps.org/theme/aeepsorg/assets/dist/img/image_logo_h.jpg?v1.6")).toBeNull();
    expect(isMembersArea("https://lesite.snepfsu.fr/accessynd/dossier-special-inter-2027/", ["Espace Adhérents"])).toBe(true);
    expect(isMembersArea("https://lesite.snepfsu.fr/ma-carriere/mutations/mutations-inter/reunions-inter-2027/")).toBe(false);
  });

  it("nettoie un extrait coupé ou suffixé par WordPress", () => {
    expect(excerpt("Les correspondants. L’article Qui contacter ? est apparu en premier sur Le Site du SNEP-FSU.")).toBe("Les correspondants.");
    expect(excerpt("  Cher·ères collègues et futur·es coll& \n")).toBe("Cher·ères collègues et futur·es");
  });
});

describe("classification", () => {
  it("relie badminton, AFL2 et le lycée professionnel", () => {
    const result = classify({ title: "Évaluation AFL2 en badminton au lycée professionnel", fromFeed: true });
    expect(result.apsas).toContain("badminton");
    expect(result.themes).toContain("evaluation");
    expect(result.levels).toContain("lycee-professionnel");
    expect(result.themes).not.toContain("autres");
  });

  it("ne confond pas tennis et tennis de table, ni via et l'IA", () => {
    expect(classify({ title: "Cycle de tennis de table", fromFeed: true }).apsas).toEqual(["tennis-de-table"]);
    expect(classify({ title: "Envoyer le travail via le cahier", fromFeed: false }).themes).not.toContain("intelligence-artificielle");
    expect(classify({ title: "Usages de l'IA générative en EPS", fromFeed: true }).themes).toContain("intelligence-artificielle");
  });

  it("laisse vide un texte trop pauvre", () => {
    const result = classify({ title: "Réunion de secteur", fromFeed: false });
    expect(result.themes).toEqual([]);
    expect(result.contentType).toBeNull();
    expect(result.themes).not.toContain("autres");
  });
});

describe("une automatique", () => {
  it("privilégie un résumé illustré puis la diversité des académies", () => {
    const items = [
      item("recent", "lyon", "2026-11-04", "court", null),
      item("resume", "corse", "2026-11-03", "x".repeat(90), null),
      item("image", "besancon", "2026-11-02", "y".repeat(90), "https://example.org/a.jpg"),
      item("autre", "guyane", "2026-11-01", "z".repeat(20), null),
    ];
    const featured = selectFeatured(items);
    expect(featured.lead?.id).toBe("image");
    expect(featured.secondary.map((entry) => entry.sourceSlug)).toEqual(["lyon", "corse", "guyane"]);
  });
});

describe("collecte", () => {
  it("lit un flux RSS sans inventer la date du jour", () => {
    const parsed = parseFeed(`<?xml version="1.0"?><rss version="2.0"><channel><title>EPS</title><item>
      <title><![CDATA[Badminton en 4e]]></title>
      <link>https://eps.example/badminton</link>
      <guid>https://eps.example/?p=4</guid>
      <description><![CDATA[<p>Situation de badminton.</p>]]></description>
    </item></channel></rss>`);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].publishedAt).toBeNull();
    expect(parsed.items[0].summary).toContain("Situation de badminton");
  });

  it("retient l'image du contenu quand le résumé n'en a pas", () => {
    const parsed = parseFeed(`<rss version="2.0"><channel><item>
      <title>Retour sur les tests d'aptitudes</title>
      <link>https://pedagogie.ac-lille.fr/eps/retour-tests</link>
      <pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate>
      <description><![CDATA[Panorama national 2026]]></description>
      <content:encoded><![CDATA[<img src="https://pedagogie.ac-lille.fr/eps/photo.jpg" alt="">]]></content:encoded>
    </item></channel></rss>`);
    expect(parsed.items[0].imageUrl).toBe("https://pedagogie.ac-lille.fr/eps/photo.jpg");
  });

  it("prend l'image Open Graph quand le flux n'en a pas", async () => {
    const items = [{
      title: "La dette par le SNEP-FSU",
      originalUrl: "https://lesite.snepfsu.fr/la-dette/",
      summary: "Extrait",
      imageUrl: "https://i.ytimg.com/vi/asMjoIdOn_k/hqdefault.jpg",
      publishedAt: null,
      modifiedAt: null,
      guid: null,
      categories: [],
      section: null,
    }];
    await fillMissingImages(items, async () => ({
      url: items[0].originalUrl,
      status: 200,
      contentType: "text/html",
      body: Buffer.from('<meta property="og:image" content="https://lesite.snepfsu.fr/wp-content/uploads/2026/11/la-dette-la-comprendre.jpg" />'),
    }));
    expect(items[0].imageUrl).toBe("https://lesite.snepfsu.fr/wp-content/uploads/2026/11/la-dette-la-comprendre.jpg");
    expect(openGraphImage('<meta property="og:image" content="https://lesite.snepfsu.fr/wp-content/uploads/logo.png" />', "https://lesite.snepfsu.fr/")).toBeNull();
    const fromBody = contentImage(
      `<div class="entry-content"><img width="379" height="92" src="https://pedagogie.ac-amiens.fr/eps/banner.png"><img width="510" height="510" src="https://pedagogie.ac-amiens.fr/eps/applis.png"></div>`,
      "https://pedagogie.ac-amiens.fr/eps/article",
    );
    expect(fromBody).toBe("https://pedagogie.ac-amiens.fr/eps/applis.png");
  });

  it("ignore les liens de rubrique dans une page HTML", () => {
    const items = extractHtmlList(
      `<div class="fr-card"><h3 class="fr-card__title"><a href="spip.php?rubrique12">iPackEPS</a></h3></div>
       <div class="fr-card"><h3 class="fr-card__title"><a href="spip.php?article9">Lettre de rentrée 2026</a></h3><p class="fr-card__desc">Un extrait utile pour la classe.</p><p class="fr-card__detail">publié le 09/10/2026</p></div>
       <div class="fr-card"><h3 class="fr-card__title"><a href="/">Accueil</a></h3></div>`,
      "https://ww2.ac-poitiers.fr/eps/",
      { itemSelector: ".fr-card", titleSelector: "h3 a", summarySelector: ".fr-card__desc", dateSelector: ".fr-card__detail", hrefInclude: "spip\\.php\\?article\\d+" },
    );
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Lettre de rentrée 2026");
    expect(items[0].publishedAt).toBe("2026-10-09T12:00:00.000Z");
    expect(items[0].originalUrl).toBe("https://ww2.ac-poitiers.fr/eps/spip.php?article9");
  });

  it("résout les liens HTML depuis la balise base", () => {
    const items = extractHtmlList(
      `<base href="https://pia.ac-paris.fr/portail/"><div class="fr-card"><h3><a href="jcms/p1_12/video-escalade">Vidéo d'inspiration en escalade</a></h3><p class="fr-card__detail">10/06/2026</p></div>`,
      "https://pia.ac-paris.fr/portail/jcms/p2_1452454/ressources",
      { itemSelector: ".fr-card", titleSelector: "h3 a", dateSelector: ".fr-card__detail", hrefInclude: "/portail/jcms/p1_\\d+" },
    );
    expect(items).toHaveLength(1);
    expect(items[0].originalUrl).toBe("https://pia.ac-paris.fr/portail/jcms/p1_12/video-escalade");
    expect(items[0].publishedAt).toBe("2026-06-10T12:00:00.000Z");
  });

  it("lit la carte récente e-novEPS et ignore l'ancien onglet", () => {
    const items = extractHtmlList(
      `<main id="content"><ul class="o-list-type-article"><li>
        <a class="media__link" href="https://pedagogie.ac-nantes.fr/les-disciplines-du-second-degre/education-physique-et-sportive/enseigner/revue-e-nov-eps-publications-du-gaip/e-nov-eps-n29-1">
          <img src="/medias/photo/logo.jpg" alt="">
          <h3 class="media__title">E-nov EPS n°29</h3>
        </a>
        <time class="media__date"><span class="date__item">9 mars 2026</span></time>
        <p class="media__summary">La revue fait peau neuve.</p>
      </li></ul>
      <div class="cke-layoutmanager__column"><a class="lien_interne" href="https://pedagogie.ac-nantes.fr/ancien">n°25</a></div></main>`,
      "https://pedagogie.ac-nantes.fr/les-disciplines-du-second-degre/education-physique-et-sportive/enseigner/revue-e-nov-eps-publications-du-gaip-1",
      {
        itemSelector: "main#content ul.o-list-type-article > li",
        titleSelector: ".media__title",
        linkSelector: "a.media__link",
        summarySelector: ".media__summary",
        dateSelector: "time.media__date .date__item",
        imageSelector: "img",
        hrefInclude: "/revue-e-nov-eps-publications-du-gaip/e-nov-eps-",
      },
    );
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("E-nov EPS n°29");
    expect(items[0].publishedAt).toBe("2026-03-09T12:00:00.000Z");
    expect(items[0].summary).toBe("La revue fait peau neuve.");
    expect(items[0].originalUrl).toContain("/e-nov-eps-n29-1");
  });

  it("retient la vignette d'un flux vidéo", () => {
    const parsed = parseFeed(`<rss version="2.0"><channel><item>
      <title>Rencontre départementale de rugby</title>
      <link>https://tube-education-physique-et-sportive.apps.education.fr/w/abc</link>
      <pubDate>Mon, 02 Nov 2026 15:27:22 GMT</pubDate>
      <media:content type="video/mp4" url="https://tube.example/video.mp4"/>
      <media:thumbnail url="https://tube.example/thumb.jpg"/>
    </item></channel></rss>`);
    expect(parsed.items[0].imageUrl).toBe("https://tube.example/thumb.jpg");
  });

  it("respecte robots.txt", () => {
    const rules = "User-agent: *\nDisallow: /\nAllow: /feed";
    expect(robotsAllows(rules, "https://eps.example/feed").allowed).toBe(true);
    expect(robotsAllows(rules, "https://eps.example/secret").allowed).toBe(false);
    expect(robotsAllows("User-agent: *\nDisallow: /", "https://eps.example/robots.txt").allowed).toBe(true);
    const poitiers = "User-agent: *\nDisallow:\n\nUser-agent: ltx71\nDisallow: /\n";
    expect(robotsAllows(poitiers, "https://ww2.ac-poitiers.fr/eps/").allowed).toBe(true);
  });

  it("lit un sitemap", () => {
    const parsed = parseSitemapXml(`<urlset><url><loc>https://eps.example/a</loc><lastmod>2026-10-01</lastmod></url></urlset>`);
    expect(parsed.kind).toBe("urlset");
    expect(parsed.entries[0].loc).toBe("https://eps.example/a");
  });
});

describe("dépôt", () => {
  it("n'enregistre pas deux fois la même publication", async () => {
    const { repo, source } = await repoWithSource();
    const article = collected("https://eps.example/a", "Séance de danse");
    expect(await repo.upsertCollected(source, article, { fromFeed: true })).toBe("inserted");
    expect(await repo.upsertCollected(source, article, { fromFeed: true })).toBe("unchanged");
    expect((await repo.listPublications()).total).toBe(1);
  });

  it("conserve la première source en cas de doublon d'adresse", async () => {
    const { repo, source } = await repoWithSource();
    await repo.ensureSources([{ ...lyon, slug: "corse", name: "Corse" }]);
    const other = (await repo.listSources()).find((item) => item.slug === "corse");
    if (!other) throw new Error("source absente");
    await repo.upsertCollected(source, collected("https://eps.example/partage", "Document partagé"), { fromFeed: true });
    expect(await repo.upsertCollected(other, collected("https://eps.example/partage", "Document partagé"), { fromFeed: true })).toBe("duplicate");
    expect((await repo.listPublications()).total).toBe(1);
  });

  it("combine recherche accentuée et filtres, et écarte les dates inconnues", async () => {
    const { repo, source } = await repoWithSource();
    await repo.upsertCollected(source, { ...collected("https://eps.example/eval", "Évaluation en lycée professionnel"), publishedAt: "2026-10-01T00:00:00.000Z" }, { fromFeed: true });
    await repo.upsertCollected(source, collected("https://eps.example/sans-date", "Évaluation sans date"), { fromFeed: true });
    const found = await repo.listPublications({ tokens: ["evaluation"], levels: ["lycee-professionnel"], from: "2026-09-01T00:00:00.000Z" });
    expect(found.total).toBe(1);
    expect(found.items[0].title).toContain("Évaluation en lycée");
  });

  it("masque les publications et sépare les données fictives", async () => {
    const { repo, source } = await repoWithSource();
    await repo.upsertCollected(source, collected("https://eps.example/vrai", "Article réel de danse"), { fromFeed: true });
    const hidden = (await repo.listPublications()).items[0];
    await repo.setStatus(hidden.id, "hidden");
    await repo.upsertCollected(source, collected("https://eps.example/faux", "Exemple de cours"), { demo: true, fromFeed: true });
    expect((await repo.listPublications()).total).toBe(0);
    expect((await repo.getPublication(hidden.id))).toBeNull();
    const admin = await repo.listPublications({ includeHidden: true, includeDemo: true });
    expect(admin.total).toBe(2);
    expect(admin.items.some((item) => item.title.startsWith("[FICTIF]"))).toBe(true);
  });

  it("ne réécrit pas une classification verrouillée", async () => {
    const { repo, source } = await repoWithSource();
    await repo.upsertCollected(source, collected("https://eps.example/note", "Note de rentrée"), { fromFeed: true });
    const publication = (await repo.listPublications()).items[0];
    await repo.setClassification(publication.id, { themes: ["formation"], apsas: [], levels: [], tags: [], contentType: "formation" }, true);
    await repo.upsertCollected(source, collected("https://eps.example/note", "Note de badminton"), { fromFeed: true });
    const updated = await repo.getPublication(publication.id);
    expect(updated?.themes.map((term) => term.slug)).toEqual(["formation"]);
    expect(updated?.apsas).toEqual([]);
  });
});

describe("rss et session", () => {
  it("produit un flux échappé, sans date inventée", () => {
    const xml = renderRss({
      title: "VEILLE <EPS>",
      path: "/rss.xml",
      description: "Flux",
      items: [{ title: "Titre <script>", portalPath: "/publication/1", summary: null, publishedAt: null, discoveredAt: "2026-11-01T00:00:00.000Z", sourceName: "Lyon", originalUrl: "https://eps.example/a" }],
    });
    expect(xml).toContain("&lt;EPS&gt;");
    expect(xml).toContain("&lt;script&gt;");
    expect(xml).not.toContain("<pubDate>");
    expect(xml).toContain("Date de publication inconnue");
  });

  it("refuse un cookie modifié", () => {
    const token = signSession("secret", 1_000);
    expect(verifySession(token, "secret", 1_000)).toBe(true);
    expect(verifySession(token, "autre", 1_000)).toBe(false);
    expect(verifySession(`${token}x`, "secret", 1_000)).toBe(false);
    expect(passwordsMatch("bonjour", "bonjour")).toBe(true);
    expect(passwordsMatch("bonjour", "bonjour!")).toBe(false);
  });
});

function item(id: string, sourceSlug: string, publishedAt: string, summary: string, imageUrl: string | null) {
  return { id, sourceSlug, publishedAt, discoveredAt: publishedAt, summary, imageUrl };
}

function collected(url: string, title: string) {
  return { title, originalUrl: url, summary: "Résumé suffisamment précis pour la fiche.", imageUrl: null, publishedAt: null, modifiedAt: null, guid: url, categories: [], section: null };
}
