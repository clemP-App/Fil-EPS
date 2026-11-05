export function fold(input: string): string {
  return input
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(value: string | null | undefined, max = 420): string | null {
  if (!value) return null;
  const text = stripTags(value)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*L['’]article\s+.+?\s+est apparu en premier sur\s+\S.*$/i, "")
    .replace(/\s+\S*&\S*$/u, "")
    .trim();
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > 180 ? cut.slice(0, space) : cut).trim()}…`;
}

export function stripTags(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => safeChar(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => safeChar(parseInt(code, 16)));
}

function safeChar(code: number): string {
  if (!Number.isFinite(code) || code < 32 || code > 0x10ffff) return " ";
  return String.fromCodePoint(code);
}

export function cleanTitle(value: string): string {
  const title = stripTags(value).replace(/\s+/g, " ").trim();
  if (title.length <= 400) return title;
  return `${title.slice(0, 397).trim()}…`;
}

export function tagSlug(label: string): string {
  return fold(label)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isGenericTitle(title: string): boolean {
  const folded = fold(title);
  return (
    folded.length < 8 ||
    /^(accueil|contact|mentions legales|connexion|lire la suite|en savoir plus|actualites|menu|rechercher|plan du site|flux rss)$/.test(
      folded,
    )
  );
}

export function xmlEscape(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
