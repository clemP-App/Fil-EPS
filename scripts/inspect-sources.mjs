const UA = "FilEPS/0.1 (bot de veille documentaire EPS; metadonnees uniquement)";

async function grab(url) {
  const response = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xml,application/rss+xml,*/*" },
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
  });
  const text = await response.text();
  console.log("\n####", response.status, response.headers.get("content-type"), response.url);
  return text;
}

const paris = await grab("https://pia.ac-paris.fr/portail/jcms/p1_6824773/feed/Rss2.jsp?id=d_7258&pcat=d_9708");
console.log("paris items", (paris.match(/<item[\s>]/gi) || []).length);
for (const match of [...paris.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].slice(0, 6)) {
  console.log(" -", match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim());
}

const poitiers = await grab("https://ww2.ac-poitiers.fr/eps/");
for (const match of [...poitiers.matchAll(/<h[23][^>]*>[\s\S]{0,500}?<\/h[23]>/gi)].slice(0, 10)) {
  console.log("HEAD", match[0].replace(/\s+/g, " ").slice(0, 360));
}
const classNames = [...poitiers.matchAll(/class="([^"]+)"/gi)].map((match) => match[1]);
const frequent = new Map();
for (const name of classNames) frequent.set(name, (frequent.get(name) || 0) + 1);
console.log(
  [...frequent.entries()]
    .filter(([name, count]) => /article|item|post|une|actu|titre|resume/i.test(name) && count < 40)
    .slice(0, 30),
);

const robots = await grab("https://ww2.ac-poitiers.fr/robots.txt");
console.log(robots.split(/\r?\n/).filter((line) => /sitemap|disallow|user-agent/i.test(line)).slice(0, 30).join("\n"));
