import { fold } from "@/lib/text";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
]);

export function canonicalUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol === "http:") url.protocol = "https:";
  url.port = "";
  const search = normalizeSearch(url.search);
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.hostname}${url.pathname}${search}`;
}

function normalizeSearch(search: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return "";
  const parts = raw
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq < 0) return { key: decodeQuery(part), value: "", bare: true };
      return { key: decodeQuery(part.slice(0, eq)), value: decodeQuery(part.slice(eq + 1)), bare: false };
    })
    .filter((part) => part.key && !TRACKING_PARAMS.has(part.key.toLowerCase()));
  parts.sort((a, b) => a.key.localeCompare(b.key) || a.value.localeCompare(b.value));
  if (!parts.length) return "";
  return `?${parts
    .map((part) => (part.bare ? encodeQuery(part.key) : `${encodeQuery(part.key)}=${encodeQuery(part.value)}`))
    .join("&")}`;
}

function decodeQuery(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

export function safeImageUrl(raw: string | null | undefined, base?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("data:") || /placeholder\.com|via\.placeholder|image_logo_h\.jpg/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.href.length > 1000) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function isMembersArea(url: string, categories: string[] = []): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (path.split("/").includes("accessynd")) return true;
  } catch {
    return false;
  }
  return categories.some((category) => fold(category).includes("espace adherent"));
}

export function isNavigationUrl(target: string, pageUrl: string): boolean {
  let url: URL;
  let page: URL;
  try {
    url = new URL(target);
    page = new URL(pageUrl);
  } catch {
    return true;
  }
  if (url.href === page.href) return true;
  const path = url.pathname.toLowerCase();
  if (path === "/" || path === "") return true;
  return (
    path.includes("/category/") ||
    path.includes("/tag/") ||
    path.includes("/author/") ||
    path.includes("/page/") ||
    path.endsWith("/feed") ||
    path.endsWith("/feed/") ||
    path.includes("/wp-json/") ||
    path.includes("/wp-admin/") ||
    path.includes("/wp-login")
  );
}

export function likePattern(token: string): string {
  return `%${token.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
