import { X509Certificate } from "node:crypto";
import tls from "node:tls";
import { USER_AGENT } from "@/lib/constants";

export class CollectorError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options?: { retryable?: boolean }) {
    super(message.slice(0, 300));
    this.name = "CollectorError";
    this.retryable = options?.retryable ?? false;
  }
}

export type FetchResult = {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
};

export type Fetcher = (url: string, options?: { maxBytes?: number; accept?: string }) => Promise<FetchResult>;

type RobotGroup = {
  agents: string[];
  rules: Array<{ allow: boolean; path: string }>;
  crawlDelay: number | null;
  closed: boolean;
};

const robotsCache = new Map<string, { text: string; warning?: string }>();
const nextSlot = new Map<string, number>();

export function resetFetchState(): void {
  robotsCache.clear();
  nextSlot.clear();
  chainRecoveryTried.clear();
}

export function parseRobots(text: string): RobotGroup[] {
  const groups: RobotGroup[] = [];
  let current: RobotGroup | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const index = line.indexOf(":");
    if (index < 0) continue;
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    if (key === "user-agent") {
      if (!current || current.closed) {
        current = { agents: [], rules: [], crawlDelay: null, closed: false };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      current.closed = true;
      if (value) current.rules.push({ allow: key === "allow", path: value });
    } else if (key === "crawl-delay") {
      current.closed = true;
      const delay = Number(value);
      if (Number.isFinite(delay) && delay > 0) current.crawlDelay = delay;
    }
  }
  return groups;
}

export function robotsSitemaps(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter((line) => line.toLowerCase().startsWith("sitemap:"))
    .map((line) => line.slice(line.indexOf(":") + 1).trim())
    .filter(Boolean);
}

export function robotsAllows(text: string, target: string, userAgent = USER_AGENT): { allowed: boolean; crawlDelayMs: number } {
  let path = "/";
  try {
    path = new URL(target).pathname || "/";
  } catch {
    return { allowed: false, crawlDelayMs: 0 };
  }
  if (path === "/robots.txt") return { allowed: true, crawlDelayMs: 0 };
  const groups = parseRobots(text);
  const product = userAgent.split(/[\s/]/)[0]?.toLowerCase() || "";
  const specific = groups.filter((group) =>
    group.agents.some((item) => item !== "*" && item.length > 0 && product.startsWith(item)),
  );
  const chosen = specific.length ? specific : groups.filter((group) => group.agents.includes("*"));
  let allowed = true;
  let best = -1;
  let delay = 0;
  for (const group of chosen) delay = Math.max(delay, group.crawlDelay ?? 0);
  for (const group of chosen) {
    for (const rule of group.rules) {
      if (!path.startsWith(rule.path)) continue;
      if (rule.path.length > best || (rule.path.length === best && rule.allow)) {
        best = rule.path.length;
        allowed = rule.allow;
      }
    }
  }
  return { allowed, crawlDelayMs: Math.min(delay * 1000, 10_000) };
}

const FETCH_TIMEOUT_MS = 30_000;
const extraAnchors: string[] = [];
const chainRecoveryTried = new Set<string>();

export function describeFetchFailure(error: unknown, url: string): string {
  const host = hostnameOf(url);
  const chain = errorChain(error);
  const blob = chain.map((item) => [item.name, codeOf(item), item.message].filter(Boolean).join(" ")).join(" ");
  if (/CERT_HAS_EXPIRED|certificate has expired/i.test(blob)) return `Le certificat de sécurité du site ${host} a expiré.`;
  if (/ERR_TLS_CERT_ALTNAME_INVALID|does not match certificate/i.test(blob)) {
    return `Le certificat de sécurité ne correspond pas à l'adresse ${host}.`;
  }
  if (/UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER|SELF_SIGNED_CERT|DEPTH_ZERO_SELF_SIGNED|unable to verify the first certificate|self-signed certificate/i.test(blob)) {
    return `Le certificat de sécurité du site ${host} est incomplet.`;
  }
  if (/UND_ERR_CONNECT_TIMEOUT|ENETUNREACH|EHOSTUNREACH|ECONNREFUSED/i.test(blob)) return `Le site ${host} ne répond pas.`;
  if (/ETIMEDOUT|TimeoutError|aborted due to timeout|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT/i.test(blob)) {
    return `Le site ${host} a mis trop de temps à répondre.`;
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(blob)) return `L'adresse ${host} est introuvable.`;
  if (/ECONNRESET|EPIPE|socket disconnected/i.test(blob)) return `La connexion avec ${host} a été coupée.`;
  return `Le site ${host} n'a pas pu être consulté.`;
}

export function describeHttpFailure(status: number, url: string): string {
  const host = hostnameOf(url);
  if (status === 401 || status === 403) return `Le site ${host} refuse l'accès.`;
  if (status === 404) return `La page demandée est introuvable sur ${host}.`;
  if (status === 408) return `Le site ${host} a mis trop de temps à répondre.`;
  if (status === 429) return `Le site ${host} demande de patienter avant une nouvelle visite.`;
  if (status >= 500) return `Le site ${host} est momentanément indisponible.`;
  return `Le site ${host} a renvoyé une erreur.`;
}

export const politeFetch: Fetcher = async (url, options) => {
  const target = new URL(url);
  const robots = await loadRobots(target.origin);
  const decision = robotsAllows(robots.text, url);
  if (!decision.allowed) throw new CollectorError(`Le site ${target.hostname} interdit la collecte automatique.`);
  await waitForHost(target.host, Math.max(800, decision.crawlDelayMs));
  let lastError: unknown = null;
  let recovered = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestOnce(url, options);
    } catch (error) {
      if (error instanceof CollectorError && !error.retryable) throw error;
      lastError = error;
      if (!recovered && isIncompleteChain(error)) {
        recovered = true;
        const added = await completeCertificateChain(url).catch(() => false);
        if (added) {
          attempt -= 1;
          continue;
        }
      }
      if (attempt < 1) await sleep(800);
    }
  }
  throw new CollectorError(describeFetchFailure(lastError, url));
};

async function requestOnce(url: string, options?: { maxBytes?: number; accept?: string }): Promise<FetchResult> {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "user-agent": USER_AGENT,
      accept: options?.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "fr-FR,fr;q=0.9",
    },
  });
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new CollectorError(describeHttpFailure(response.status, url), { retryable });
  }
  return {
    url: response.url,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    body: await readLimited(response, options?.maxBytes ?? 1_500_000),
  };
}

function isIncompleteChain(error: unknown): boolean {
  const blob = errorChain(error)
    .map((item) => `${codeOf(item)} ${item.message}`)
    .join(" ");
  return /UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER/.test(blob);
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function codeOf(error: Error): string {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

function errorChain(error: unknown): Error[] {
  const chain: Error[] = [];
  const seen = new Set<unknown>();
  const queue: unknown[] = [error];
  while (queue.length > 0 && chain.length < 8) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (current instanceof Error) chain.push(current);
    const record = current as { cause?: unknown; errors?: unknown };
    if (record.cause) queue.push(record.cause);
    if (Array.isArray(record.errors)) queue.push(...record.errors);
  }
  return chain;
}

/**
 * Certains sites académiques envoient le certificat du site sans l'intermédiaire.
 * On télécharge l'intermédiaire indiqué dans le certificat, on vérifie qu'il est
 * signé par une autorité déjà approuvée, puis seulement on l'utilise.
 */
async function completeCertificateChain(pageUrl: string): Promise<boolean> {
  if (typeof tls.getCACertificates !== "function" || typeof tls.setDefaultCACertificates !== "function") return false;
  const host = new URL(pageUrl).hostname;
  if (chainRecoveryTried.has(host)) return false;
  chainRecoveryTried.add(host);
  const peer = await readPeerCertificate(host);
  const anchors = tls.getCACertificates("default").map((pem) => new X509Certificate(pem));
  const accepted: string[] = [];
  const seen = new Set<string>();
  let uris = issuerUris(peer.infoAccess);
  for (let depth = 0; depth < 4 && uris.length; depth += 1) {
    const next: string[] = [];
    for (const uri of uris) {
      if (seen.has(uri)) continue;
      seen.add(uri);
      for (const pem of await downloadCertificatePems(uri)) {
        let certificate: X509Certificate;
        try {
          certificate = new X509Certificate(pem);
        } catch {
          continue;
        }
        if (!chainsToTrust(certificate, anchors)) continue;
        accepted.push(certificate.toString());
        next.push(...caIssuerUris(certificate.infoAccess));
      }
    }
    uris = next;
  }
  return rememberAnchors(accepted);
}

function chainsToTrust(certificate: X509Certificate, anchors: X509Certificate[]): boolean {
  return anchors.some((anchor) => {
    try {
      return certificate.checkIssued(anchor) && certificate.verify(anchor.publicKey);
    } catch {
      return false;
    }
  });
}

function rememberAnchors(pems: string[]): boolean {
  const fresh = pems.map((pem) => pem.trim()).filter((pem) => pem.startsWith("-----BEGIN CERTIFICATE-----") && !extraAnchors.includes(pem));
  if (!fresh.length || typeof tls.getCACertificates !== "function" || typeof tls.setDefaultCACertificates !== "function") return false;
  extraAnchors.push(...fresh);
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...extraAnchors]);
  return true;
}

function readPeerCertificate(host: string): Promise<tls.PeerCertificate> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false, timeout: 10_000 }, () => {
      const certificate = socket.getPeerCertificate(false);
      socket.end();
      if (!certificate || Object.keys(certificate).length === 0) {
        reject(new Error("certificat absent"));
        return;
      }
      resolve(certificate);
    });
    socket.once("error", reject);
    socket.setTimeout(10_000, () => {
      socket.destroy();
      reject(new Error("timeout"));
    });
  });
}

function issuerUris(info: tls.PeerCertificate["infoAccess"]): string[] {
  if (!info) return [];
  const uris: string[] = [];
  for (const [key, value] of Object.entries(info)) {
    if (!/CA Issuers/i.test(key)) continue;
    for (const uri of value ?? []) if (isPublicCertificateUrl(uri)) uris.push(uri);
  }
  return uris;
}

function caIssuerUris(info: string | undefined): string[] {
  if (!info) return [];
  return [...info.matchAll(/CA Issuers - URI:(\S+)/g)]
    .map((match) => match[1])
    .filter(isPublicCertificateUrl);
}

function isPublicCertificateUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
    if (host.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

async function downloadCertificatePems(start: string): Promise<string[]> {
  let current = start;
  for (let hop = 0; hop < 3; hop += 1) {
    if (!isPublicCertificateUrl(current)) return [];
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: { "user-agent": USER_AGENT, accept: "application/pkix-cert, application/x-x509-ca-cert, */*" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return [];
      current = new URL(location, current).href;
      await response.arrayBuffer().catch(() => undefined);
      continue;
    }
    if (!response.ok) return [];
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 20_000) return [];
    return certificatesFromBytes(bytes);
  }
  return [];
}

function certificatesFromBytes(bytes: Buffer): string[] {
  const text = bytes.toString("utf8");
  if (text.includes("BEGIN CERTIFICATE")) {
    return text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [];
  }
  try {
    return [new X509Certificate(bytes).toString()];
  } catch {
    return [];
  }
}

async function loadRobots(origin: string): Promise<{ text: string; warning?: string }> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      headers: { "user-agent": USER_AGENT, accept: "text/plain,*/*" },
    });
    const value = response.ok
      ? { text: (await response.text()).slice(0, 200_000) }
      : { text: "", warning: `robots.txt HTTP ${response.status}` };
    robotsCache.set(origin, value);
    return value;
  } catch {
    const value = { text: "", warning: "robots.txt inaccessible" };
    robotsCache.set(origin, value);
    return value;
  }
}

async function waitForHost(host: string, delay: number) {
  const now = Date.now();
  const start = Math.max(now, nextSlot.get(host) ?? now);
  nextSlot.set(host, start + delay);
  if (start > now) await sleep(start - now);
}

async function readLimited(response: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new CollectorError("Réponse trop volumineuse, collecte interrompue.");
  if (!response.body) return Buffer.from(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new CollectorError("Réponse trop volumineuse, collecte interrompue.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function decodeBody(body: Buffer, contentType: string): string {
  const head = body.subarray(0, 240).toString("latin1");
  const charset = (contentType.match(/charset=([^;]+)/i)?.[1] || head.match(/encoding=["']([^"']+)["']/i)?.[1] || "utf-8")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "");
  try {
    return new TextDecoder(charset).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}
