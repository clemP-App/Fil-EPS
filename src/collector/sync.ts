import fs from "node:fs";
import path from "node:path";
import { collectSource } from "@/collector/collect";
import { CollectorError, politeFetch } from "@/collector/http";
import type { Repository } from "@/lib/repository";
import type { SourceRecord } from "@/lib/types";

export type SyncSummary = {
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  duplicateCount: number;
  errorCount: number;
  sources: number;
  logs: string[];
};

export async function runSync(repo: Repository, options?: { slug?: string | null }): Promise<SyncSummary> {
  const sources = (await repo.listSources()).filter((source) => source.enabled && (!options?.slug || source.slug === options.slug));
  const summary: SyncSummary = { newCount: 0, updatedCount: 0, unchangedCount: 0, duplicateCount: 0, errorCount: 0, sources: sources.length, logs: [] };
  if (options?.slug && sources.length === 0) {
    summary.errorCount = 1;
    summary.logs.push("Source introuvable ou désactivée.");
    return summary;
  }
  for (const source of sources) {
    const startedAt = Date.now();
    const runId = await repo.startRun(source.id);
    const logs: string[] = [];
    try {
      const known = source.method === "sitemap" ? await repo.knownCanonicals(source.id) : undefined;
      const items = await collectSource(source, politeFetch, known);
      let newCount = 0;
      let updatedCount = 0;
      let unchangedCount = 0;
      let duplicateCount = 0;
      for (const item of items) {
        const result = await repo.upsertCollected(source, item, { fromFeed: source.method === "rss" });
        if (result === "inserted") newCount += 1;
        else if (result === "updated") updatedCount += 1;
        else if (result === "unchanged") unchangedCount += 1;
        else if (result === "duplicate") duplicateCount += 1;
      }
      logs.push(`${items.length} élément(s) lus, ${newCount} nouveau(x), ${updatedCount} mis à jour, ${duplicateCount} doublon(s).`);
      await repo.markSourceSuccess(source.id);
      await repo.finishRun(runId, { status: "success", newCount, updatedCount, errorCount: 0, message: logs[0] ?? null, logs, startedAt });
      summary.newCount += newCount;
      summary.updatedCount += updatedCount;
      summary.unchangedCount += unchangedCount;
      summary.duplicateCount += duplicateCount;
      summary.logs.push(`${source.name} : ${logs[0]}`);
    } catch (error) {
      const message = error instanceof CollectorError || error instanceof Error ? error.message : "Erreur inconnue";
      logs.push(message);
      await repo.markSourceError(source.id, message);
      await repo.finishRun(runId, { status: "error", newCount: 0, updatedCount: 0, errorCount: 1, message, logs, startedAt });
      summary.errorCount += 1;
      summary.logs.push(`${source.name} : ${message}`);
    }
  }
  await writeCatalog(repo, summary);
  return summary;
}

async function writeCatalog(repo: Repository, summary: SyncSummary) {
  try {
    const catalog = await repo.toCatalog();
    const file = path.join(process.cwd(), "data", "catalog.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "export impossible";
    summary.logs.push(`Catalogue non écrit : ${message}`);
  }
}

export function assertSyncSource(source: SourceRecord | null, slug: string): SourceRecord {
  if (!source) throw new CollectorError(`Source ${slug} introuvable.`);
  return source;
}
