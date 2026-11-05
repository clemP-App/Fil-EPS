import { USER_AGENT } from "@/lib/constants";

export class CollectorError extends Error {
  constructor(message: string) {
    super(message.slice(0, 300));
    this.name = "CollectorError";
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

export const politeFetch: Fetcher = async (url, options) => {
  const target = new URL(url);
  const robots = await loadRobots(target.origin);
  const decision = robotsAllows(robots.text, url);
  if (!decision.allowed) throw new CollectorError(`robots.txt interdit l'accès à ${target.pathname}`);
  await waitForHost(target.host, Math.max(800, decision.crawlDelayMs));
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
        headers: {
          "user-agent": USER_AGENT,
          accept: options?.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "fr-FR,fr;q=0.9",
        },
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new CollectorError(`HTTP ${response.status} pour ${url}`);
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if (!response.ok) throw new CollectorError(`HTTP ${response.status} pour ${url}`);
      return {
        url: response.url,
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        body: await readLimited(response, options?.maxBytes ?? 1_500_000),
      };
    } catch (error) {
      if (error instanceof CollectorError && !/HTTP 429|HTTP 5/.test(error.message)) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      await sleep(800);
    }
  }
  throw new CollectorError(lastError?.message || "échec réseau");
};

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
