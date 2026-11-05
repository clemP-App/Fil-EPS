const UA = "FilEPS/0.1 (bot de veille documentaire EPS; metadonnees uniquement)";
const response = await fetch("https://ww2.ac-poitiers.fr/eps/", {
  headers: { "user-agent": UA, accept: "text/html" },
  signal: AbortSignal.timeout(15000),
});
const html = await response.text();
const index = html.indexOf("article1035");
console.log(html.slice(Math.max(0, index - 700), index + 900).replace(/\n+/g, "\n"));
console.log("\n---DATES---");
for (const match of [...html.matchAll(/<time[\s\S]{0,180}<\/time>/gi)].slice(0, 4)) {
  console.log(match[0].replace(/\s+/g, " "));
}
