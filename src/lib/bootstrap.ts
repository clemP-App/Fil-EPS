import fs from "node:fs";
import path from "node:path";
import { buildSourceDefinitions } from "@/collector/sources";
import { openDefaultSql } from "@/lib/db-driver";
import { createRepository, type Repository } from "@/lib/repository";
import type { Catalog } from "@/lib/types";

let envLoaded = false;

export function loadEnvFiles() {
  if (envLoaded) return;
  envLoaded = true;
  for (const file of [".env", ".env.local"]) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index < 0) continue;
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export async function bootstrapRepository(): Promise<Repository> {
  loadEnvFiles();
  const repo = createRepository(openDefaultSql());
  await repo.init();
  await repo.ensureSources(buildSourceDefinitions());
  if ((await repo.countAll()) === 0) {
    const catalog = readCatalog();
    if (catalog) await repo.importCatalog(catalog);
  }
  return repo;
}

function readCatalog(): Catalog | null {
  const file = path.join(process.cwd(), "data", "catalog.json");
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Catalog;
    if (parsed.origin !== "collector" || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}
