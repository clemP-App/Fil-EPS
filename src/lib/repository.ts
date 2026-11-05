import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { classify } from "@/lib/classify";
import { SQLITE_SCHEMA } from "@/lib/schema";
import { Binder, isUniqueViolation, splitSql, type Sql } from "@/lib/sql";
import { APSAS, CONTENT_TYPES, LEVELS, THEMES, type Rubric } from "@/lib/taxonomy";
import { fold, tagSlug } from "@/lib/text";
import type {
  Catalog,
  CatalogPublication,
  CollectedItem,
  Publication,
  SourceDefinition,
  SourceRecord,
  SyncRun,
  TermRef,
} from "@/lib/types";
import { canonicalUrl, likePattern } from "@/lib/url";

type SourceSyncRow = {
  id: string;
  slug: string;
  customized: number | string;
  name: string;
  kind: string;
  region_group: string;
  homepage_url: string | null;
  feed_url: string | null;
  collect_method: string;
  config_json: string;
  enabled: number | string;
  status: string;
};

type PublicationRow = {
  id: string;
  source_id: string;
  title: string;
  summary: string | null;
  original_url: string;
  canonical_url: string;
  image_url: string | null;
  published_at: string | null;
  modified_at: string | null;
  discovered_at: string;
  last_seen_at: string;
  content_type: string | null;
  status: string;
  raw_categories: string;
  classification_locked: number | string;
  is_demo: number | string;
  source_name: string;
  source_slug: string;
  source_kind: string;
};

type StoredPublication = {
  id: string;
  source_id: string;
  title: string;
  summary: string | null;
  original_url: string;
  canonical_url: string;
  image_url: string | null;
  published_at: string | null;
  modified_at: string | null;
  discovered_at: string;
  last_seen_at: string;
  content_type: string | null;
  status: string;
  guid: string | null;
  raw_categories: string;
  classification_locked: number | string;
  is_demo: number | string;
};

export type ListQuery = {
  academies?: string[];
  themes?: string[];
  apsas?: string[];
  levels?: string[];
  contentTypes?: string[];
  from?: string | null;
  to?: string | null;
  tokens?: string[];
  sort?: "date" | "pertinence";
  page?: number;
  pageSize?: number;
  includeHidden?: boolean;
  includeDemo?: boolean;
  ids?: string[];
  excludeIds?: string[];
  anyOf?: { themes?: string[]; levels?: string[]; contentTypes?: string[] };
};

export type UpsertOptions = {
  discoveredAt?: string;
  lastSeenAt?: string;
  status?: "published" | "hidden";
  demo?: boolean;
  fromFeed?: boolean;
  preset?: {
    themes: string[];
    apsas: string[];
    levels: string[];
    tags: string[];
    contentType: string | null;
    locked: boolean;
  } | null;
};

export type UpsertResult = "inserted" | "updated" | "unchanged" | "duplicate" | "invalid";

const SELECT_PUBLICATION = `
  SELECT
    p.id, p.source_id, p.title, p.summary, p.original_url, p.canonical_url, p.image_url,
    p.published_at, p.modified_at, p.discovered_at, p.last_seen_at, p.content_type,
    p.status, p.raw_categories, p.classification_locked, p.is_demo,
    s.name AS source_name, s.slug AS source_slug, s.kind AS source_kind
  FROM publications p
  JOIN sources s ON s.id = p.source_id
`;

export function createRepository(sql: Sql) {
  return {
    dialect: sql.dialect,

    async init() {
      if (sql.dialect === "sqlite") {
        await sql.exec(SQLITE_SCHEMA);
      } else {
        const existing = await sql.get<{ name: string | null }>("SELECT to_regclass('public.publications') AS name");
        if (!existing?.name) {
          const migration = fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", "001_init.sql"), "utf8");
          for (const statement of splitSql(migration)) await sql.exec(statement);
        }
      }
      await seedTerms();
      await sql.run("INSERT INTO schema_meta (key, value) VALUES ('version', '1') ON CONFLICT (key) DO NOTHING");
    },

    async ensureSources(definitions: SourceDefinition[]) {
      const now = new Date().toISOString();
      const rows = await sql.all<SourceSyncRow>(
        `SELECT id, slug, customized, name, kind, region_group, homepage_url, feed_url, collect_method, config_json, enabled, status
         FROM sources`,
      );
      const bySlug = new Map(rows.map((row) => [row.slug, row]));
      for (const definition of definitions) {
        const existing = bySlug.get(definition.slug);
        const config = JSON.stringify(definition.config ?? {});
        if (!existing) {
          await sql.run(
            `INSERT INTO sources (
              id, slug, name, kind, region_group, homepage_url, feed_url, collect_method, config_json,
              enabled, customized, status, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12,$12)`,
            [
              randomUUID(),
              definition.slug,
              definition.name,
              definition.kind,
              definition.regionGroup,
              definition.homepageUrl,
              definition.feedUrl,
              definition.method,
              config,
              definition.enabled ? 1 : 0,
              definition.enabled ? "pending" : "unconfigured",
              now,
            ],
          );
          continue;
        }
        if (Number(existing.customized) === 1) {
          if (existing.name === definition.name && existing.kind === definition.kind && existing.region_group === definition.regionGroup) continue;
          await sql.run("UPDATE sources SET name = $1, kind = $2, region_group = $3, updated_at = $4 WHERE id = $5", [
            definition.name,
            definition.kind,
            definition.regionGroup,
            now,
            existing.id,
          ]);
          continue;
        }
        const enabled = definition.enabled ? 1 : 0;
        const nextStatus = enabled === 1 && existing.status === "unconfigured" ? "pending" : enabled === 0 ? "unconfigured" : existing.status;
        const unchanged =
          existing.name === definition.name &&
          existing.kind === definition.kind &&
          existing.region_group === definition.regionGroup &&
          (existing.homepage_url ?? null) === (definition.homepageUrl ?? null) &&
          (existing.feed_url ?? null) === (definition.feedUrl ?? null) &&
          existing.collect_method === definition.method &&
          existing.config_json === config &&
          Number(existing.enabled) === enabled &&
          existing.status === nextStatus;
        if (unchanged) continue;
        await sql.run(
          `UPDATE sources
           SET name = $1, kind = $2, region_group = $3, homepage_url = $4, feed_url = $5,
               collect_method = $6, config_json = $7, enabled = $8,
               status = CASE WHEN $8 = 1 AND status = 'unconfigured' THEN 'pending' WHEN $8 = 0 THEN 'unconfigured' ELSE status END,
               updated_at = $9
           WHERE id = $10`,
          [
            definition.name,
            definition.kind,
            definition.regionGroup,
            definition.homepageUrl,
            definition.feedUrl,
            definition.method,
            config,
            definition.enabled ? 1 : 0,
            now,
            existing.id,
          ],
        );
      }
    },

    async listPublications(query: ListQuery = {}) {
      const page = Math.max(1, query.page ?? 1);
      const pageSize = Math.min(80, Math.max(1, query.pageSize ?? 12));
      const whereBinder = new Binder();
      const where = buildWhere(whereBinder, query);
      const totalRow = await sql.get<{ total: number | string }>(
        `SELECT COUNT(*) AS total FROM publications p JOIN sources s ON s.id = p.source_id WHERE ${where}`,
        whereBinder.values,
      );
      const listBinder = new Binder();
      const listWhere = buildWhere(listBinder, query);
      const order = buildOrder(listBinder, query);
      const limit = listBinder.add(pageSize);
      const offset = listBinder.add((page - 1) * pageSize);
      const rows = await sql.all<PublicationRow>(
        `${SELECT_PUBLICATION} WHERE ${listWhere} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`,
        listBinder.values,
      );
      return { items: await hydrate(rows), total: Number(totalRow?.total ?? 0), page, pageSize };
    },

    async getPublication(id: string, options?: { includeHidden?: boolean; includeDemo?: boolean }) {
      const result = await this.listPublications({
        ids: [id],
        page: 1,
        pageSize: 1,
        includeHidden: options?.includeHidden,
        includeDemo: options?.includeDemo,
      });
      return result.items[0] ?? null;
    },

    async getMany(ids: string[]) {
      if (ids.length === 0) return [];
      const result = await this.listPublications({ ids: ids.slice(0, 100), page: 1, pageSize: Math.min(100, ids.length) });
      const byId = new Map(result.items.map((item) => [item.id, item]));
      return ids.flatMap((id) => {
        const item = byId.get(id);
        return item ? [item] : [];
      });
    },

    async listRubric(rubric: Rubric, limit: number, excludeIds: string[] = []) {
      const result = await this.listPublications({
        anyOf: { themes: rubric.themes, levels: rubric.levels, contentTypes: rubric.contentTypes },
        excludeIds,
        page: 1,
        pageSize: limit,
        sort: "date",
      });
      return result.items;
    },

    async listSimilar(publication: Publication, limit = 4) {
      const [byApsa, byTheme, bySource] = await Promise.all([
        publication.apsas.length
          ? this.listPublications({ apsas: publication.apsas.map((item) => item.slug), page: 1, pageSize: 20 })
          : Promise.resolve({ items: [] as Publication[] }),
        publication.themes.length
          ? this.listPublications({ themes: publication.themes.map((item) => item.slug), page: 1, pageSize: 20 })
          : Promise.resolve({ items: [] as Publication[] }),
        this.listPublications({ academies: [publication.sourceSlug], page: 1, pageSize: 10 }),
      ]);
      const unique = new Map<string, Publication>();
      for (const item of [...byApsa.items, ...byTheme.items, ...bySource.items]) {
        if (item.id !== publication.id) unique.set(item.id, item);
      }
      return [...unique.values()]
        .map((item) => ({ item, score: similarity(publication, item) }))
        .filter((entry) => entry.score >= 2)
        .sort((a, b) => b.score - a.score || (a.item.publishedAt && b.item.publishedAt ? b.item.publishedAt.localeCompare(a.item.publishedAt) : 0))
        .slice(0, limit)
        .map((entry) => entry.item);
    },

    async stats() {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [total, recent, success, enabled, errors] = await Promise.all([
        sql.get<{ total: number | string }>("SELECT COUNT(*) AS total FROM publications WHERE status = 'published' AND is_demo = 0"),
        sql.get<{ total: number | string }>("SELECT COUNT(*) AS total FROM publications WHERE status = 'published' AND is_demo = 0 AND discovered_at >= $1", [weekAgo]),
        sql.get<{ value: string | null }>("SELECT MAX(last_success_at) AS value FROM sources"),
        sql.get<{ total: number | string }>("SELECT COUNT(*) AS total FROM sources WHERE enabled = 1"),
        sql.get<{ total: number | string }>("SELECT COUNT(*) AS total FROM sources WHERE status = 'error'"),
      ]);
      return {
        total: Number(total?.total ?? 0),
        recent: Number(recent?.total ?? 0),
        lastSuccessAt: success?.value ?? null,
        enabledSources: Number(enabled?.total ?? 0),
        errorSources: Number(errors?.total ?? 0),
      };
    },

    async listSources(): Promise<SourceRecord[]> {
      const rows = await sql.all<Record<string, unknown>>(
        `SELECT s.*, (
           SELECT COUNT(*) FROM publications p
           WHERE p.source_id = s.id AND p.status = 'published' AND p.is_demo = 0
         ) AS publication_count
         FROM sources s`,
      );
      return rows.map(mapSource).sort(compareSources);
    },

    async getSource(slug: string) {
      const sources = await this.listSources();
      return sources.find((source) => source.slug === slug) ?? null;
    },

    async updateSource(
      slug: string,
      patch: { homepageUrl: string | null; feedUrl: string | null; method: SourceRecord["method"]; enabled: boolean; config: Record<string, unknown> },
    ) {
      const now = new Date().toISOString();
      const enabled = patch.enabled ? 1 : 0;
      await sql.run(
        `UPDATE sources
         SET homepage_url = $1, feed_url = $2, collect_method = $3, enabled = $4, config_json = $5,
             customized = 1,
             status = CASE WHEN $4 = 0 THEN 'disabled' WHEN status IN ('disabled', 'unconfigured') THEN 'pending' ELSE status END,
             updated_at = $6
         WHERE slug = $7`,
        [patch.homepageUrl, patch.feedUrl, patch.method, enabled, JSON.stringify(patch.config ?? {}), now, slug],
      );
    },

    async createSource(definition: SourceDefinition) {
      const existing = await sql.get("SELECT id FROM sources WHERE slug = $1", [definition.slug]);
      if (existing) throw new Error("Cette source existe déjà.");
      const now = new Date().toISOString();
      await sql.run(
        `INSERT INTO sources (
          id, slug, name, kind, region_group, homepage_url, feed_url, collect_method, config_json,
          enabled, customized, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,$11,$12,$12)`,
        [
          randomUUID(),
          definition.slug,
          definition.name,
          definition.kind,
          definition.regionGroup,
          definition.homepageUrl,
          definition.feedUrl,
          definition.method,
          JSON.stringify(definition.config ?? {}),
          definition.enabled ? 1 : 0,
          definition.enabled ? "pending" : "disabled",
          now,
        ],
      );
    },

    async knownCanonicals(sourceId: string) {
      const rows = await sql.all<{ canonical_url: string; modified_at: string | null }>(
        "SELECT canonical_url, modified_at FROM publications WHERE source_id = $1",
        [sourceId],
      );
      return new Map(rows.map((row) => [row.canonical_url, row.modified_at]));
    },

    async upsertCollected(source: { id: string; name: string }, item: CollectedItem, options: UpsertOptions = {}): Promise<UpsertResult> {
      const canonical = canonicalUrl(item.originalUrl);
      const title = item.title.trim();
      if (!canonical || title.length < 4) return "invalid";
      const now = new Date().toISOString();
      const byGuid = item.guid
        ? await sql.get<StoredPublication>("SELECT * FROM publications WHERE source_id = $1 AND guid = $2", [source.id, item.guid])
        : undefined;
      const byUrl = await sql.get<StoredPublication>("SELECT * FROM publications WHERE canonical_url = $1", [canonical]);
      const byOriginal = await sql.get<StoredPublication>(
        "SELECT * FROM publications WHERE source_id = $1 AND original_url = $2",
        [source.id, item.originalUrl],
      );
      const existing = byGuid ?? (byUrl && byUrl.source_id === source.id ? byUrl : undefined) ?? byOriginal;
      if (!existing && byUrl && byUrl.source_id !== source.id) return "duplicate";

      const categories = [...new Set(item.categories.map((category) => category.trim()).filter(Boolean))].slice(0, 12);
      const locked = existing ? Number(existing.classification_locked) === 1 : false;
      const usePreset = options.preset?.locked === true;
      const classification = usePreset
        ? options.preset!
        : locked
          ? null
          : classify({
              title,
              summary: item.summary,
              categories,
              section: item.section,
              url: item.originalUrl,
              fromFeed: options.fromFeed === true,
            });
      const contentType = sanitizeContentType(usePreset ? options.preset!.contentType : classification?.contentType ?? existing?.content_type ?? null);
      const summary = item.summary?.trim() ? item.summary.trim() : existing?.summary ?? null;
      const previousImage = existing?.image_url && !/placeholder\.com|via\.placeholder/i.test(existing.image_url) ? existing.image_url : null;
      const image = item.imageUrl ?? previousImage;
      const publishedAt = item.publishedAt ?? existing?.published_at ?? null;
      const modifiedAt = item.modifiedAt ?? existing?.modified_at ?? null;
      let nextCanonical = canonical;
      if (existing && existing.canonical_url !== canonical) {
        const clash = await sql.get<{ id: string }>("SELECT id FROM publications WHERE canonical_url = $1 AND id <> $2", [canonical, existing.id]);
        if (clash) nextCanonical = existing.canonical_url;
      }
      const status = options.status ?? (existing?.status === "hidden" ? "hidden" : "published");
      const demo = existing ? Number(existing.is_demo) === 1 : Boolean(options.demo);
      const safeTitle = demo && !title.includes("[FICTIF]") ? `[FICTIF] ${title}` : title;
      const changed = !existing
        ? true
        : existing.title !== safeTitle ||
          (existing.summary ?? null) !== summary ||
          existing.original_url !== item.originalUrl ||
          existing.canonical_url !== nextCanonical ||
          (existing.image_url ?? null) !== image ||
          (existing.published_at ?? null) !== publishedAt ||
          (existing.modified_at ?? null) !== modifiedAt ||
          (existing.content_type ?? null) !== contentType ||
          existing.raw_categories !== JSON.stringify(categories) ||
          (existing.guid ?? null) !== (item.guid ?? existing.guid ?? null);

      const termLabels = classification
        ? termLabelsFor(classification.themes, classification.apsas, classification.levels, classification.tags, contentType)
        : await existingLabels(existing?.id);
      const search = buildSearch(safeTitle, summary, source.name, categories, termLabels);
      const guid = item.guid ?? existing?.guid ?? null;

      if (!existing) {
        const id = randomUUID();
        try {
          await sql.run(
            `INSERT INTO publications (
              id, source_id, title, title_folded, summary, original_url, canonical_url, image_url,
              published_at, modified_at, discovered_at, last_seen_at, content_type, status, guid,
              raw_categories, search_text, classification_locked, is_demo, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20)`,
            [
              id,
              source.id,
              safeTitle,
              fold(safeTitle),
              summary,
              item.originalUrl,
              nextCanonical,
              image,
              publishedAt,
              modifiedAt,
              options.discoveredAt ?? now,
              options.lastSeenAt ?? now,
              contentType,
              status,
              guid,
              JSON.stringify(categories),
              search,
              usePreset ? 1 : 0,
              demo ? 1 : 0,
              now,
            ],
          );
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          return "duplicate";
        }
        if (classification) await replaceTaxonomy(id, classification.themes, classification.apsas, classification.levels, classification.tags);
        return "inserted";
      }

      await sql.run(
        `UPDATE publications
         SET title = $1, title_folded = $2, summary = $3, original_url = $4, canonical_url = $5,
             image_url = $6, published_at = $7, modified_at = $8, last_seen_at = $9, content_type = $10,
             guid = $11, raw_categories = $12, search_text = $13, classification_locked = $14,
             status = $15, updated_at = $16
         WHERE id = $17`,
        [
          safeTitle,
          fold(safeTitle),
          summary,
          item.originalUrl,
          nextCanonical,
          image,
          publishedAt,
          modifiedAt,
          options.lastSeenAt ?? now,
          contentType,
          guid,
          JSON.stringify(categories),
          search,
          usePreset ? 1 : Number(existing.classification_locked) ? 1 : 0,
          status,
          now,
          existing.id,
        ],
      );
      if (classification && (!locked || usePreset)) {
        await replaceTaxonomy(existing.id, classification.themes, classification.apsas, classification.levels, classification.tags);
      }
      return changed ? "updated" : "unchanged";
    },

    async setClassification(
      id: string,
      input: { themes: string[]; apsas: string[]; levels: string[]; tags: string[]; contentType: string | null },
      locked: boolean,
    ) {
      const publication = await this.getPublication(id, { includeHidden: true, includeDemo: true });
      if (!publication) return;
      const contentType = sanitizeContentType(input.contentType);
      const themes = known(input.themes, THEMES);
      const apsas = known(input.apsas, APSAS);
      const levels = known(input.levels, LEVELS);
      const tags = input.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
      const now = new Date().toISOString();
      await replaceTaxonomy(id, themes, apsas, levels, tags);
      await sql.run(
        `UPDATE publications
         SET content_type = $1, classification_locked = $2, search_text = $3, updated_at = $4
         WHERE id = $5`,
        [contentType, locked ? 1 : 0, buildSearch(publication.title, publication.summary, publication.sourceName, publication.categories, termLabelsFor(themes, apsas, levels, tags, contentType)), now, id],
      );
    },

    async reclassify(id: string) {
      const publication = await this.getPublication(id, { includeHidden: true, includeDemo: true });
      if (!publication) return;
      const result = classify({
        title: publication.title,
        summary: publication.summary,
        categories: publication.categories,
        url: publication.originalUrl,
        fromFeed: publication.contentType === "article" || publication.contentType === null,
      });
      await this.setClassification(id, result, false);
    },

    async setStatus(id: string, status: "published" | "hidden") {
      await sql.run("UPDATE publications SET status = $1, updated_at = $2 WHERE id = $3", [status, new Date().toISOString(), id]);
    },

    async startRun(sourceId: string | null) {
      const id = randomUUID();
      await sql.run(
        "INSERT INTO sync_runs (id, source_id, started_at, status, new_count, updated_count, error_count, log_json) VALUES ($1,$2,$3,'running',0,0,0,'[]')",
        [id, sourceId, new Date().toISOString()],
      );
      return id;
    },

    async finishRun(
      id: string,
      data: { status: string; newCount: number; updatedCount: number; errorCount: number; message: string | null; logs: string[]; startedAt: number },
    ) {
      const finished = new Date();
      await sql.run(
        `UPDATE sync_runs
         SET finished_at = $1, duration_ms = $2, new_count = $3, updated_count = $4, error_count = $5,
             status = $6, message = $7, log_json = $8
         WHERE id = $9`,
        [finished.toISOString(), finished.getTime() - data.startedAt, data.newCount, data.updatedCount, data.errorCount, data.status, data.message, JSON.stringify(data.logs.slice(-40)), id],
      );
    },

    async markSourceSuccess(id: string) {
      const now = new Date().toISOString();
      await sql.run("UPDATE sources SET status = 'ok', last_sync_at = $1, last_success_at = $1, last_error = NULL, updated_at = $1 WHERE id = $2", [now, id]);
    },

    async markSourceError(id: string, message: string) {
      const now = new Date().toISOString();
      await sql.run("UPDATE sources SET status = 'error', last_sync_at = $1, last_error = $2, updated_at = $1 WHERE id = $3", [now, message.slice(0, 300), id]);
    },

    async listSyncRuns(limit = 40): Promise<SyncRun[]> {
      const rows = await sql.all<Record<string, unknown>>(
        `SELECT r.*, s.name AS source_name
         FROM sync_runs r
         LEFT JOIN sources s ON s.id = r.source_id
         ORDER BY r.started_at DESC
         LIMIT $1`,
        [limit],
      );
      return rows.map((row) => ({
        id: String(row.id),
        sourceId: row.source_id ? String(row.source_id) : null,
        sourceName: row.source_name ? String(row.source_name) : null,
        startedAt: String(row.started_at),
        finishedAt: row.finished_at ? String(row.finished_at) : null,
        durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
        newCount: Number(row.new_count ?? 0),
        updatedCount: Number(row.updated_count ?? 0),
        errorCount: Number(row.error_count ?? 0),
        status: String(row.status),
        message: row.message ? String(row.message) : null,
        logs: parseJson<string[]>(String(row.log_json ?? "[]"), []),
      }));
    },

    async countAll() {
      const row = await sql.get<{ total: number | string }>("SELECT COUNT(*) AS total FROM publications");
      return Number(row?.total ?? 0);
    },

    async importCatalog(catalog: Catalog) {
      if (catalog.origin !== "collector" || catalog.version !== 1) throw new Error("Catalogue refusé.");
      let imported = 0;
      for (const item of catalog.publications) {
        if (item.isDemo) continue;
        const source = await sql.get<{ id: string; name: string }>("SELECT id, name FROM sources WHERE slug = $1", [item.sourceSlug]);
        if (!source) continue;
        const result = await this.upsertCollected(
          source,
          {
            title: item.title,
            originalUrl: item.originalUrl,
            summary: item.summary,
            imageUrl: item.imageUrl,
            publishedAt: item.publishedAt,
            modifiedAt: item.modifiedAt,
            guid: item.guid,
            categories: item.categories,
            section: null,
          },
          {
            discoveredAt: item.discoveredAt,
            lastSeenAt: item.lastSeenAt,
            status: item.status,
            preset: item.classificationLocked
              ? { ...item, contentType: item.contentType, locked: true }
              : null,
          },
        );
        if (result === "inserted") imported += 1;
      }
      return imported;
    },

    async toCatalog(): Promise<Catalog> {
      const publications: CatalogPublication[] = [];
      let page = 1;
      let total = 0;
      do {
        const batch = await this.listPublications({ includeHidden: true, page, pageSize: 80, sort: "date" });
        total = batch.total;
        for (const item of batch.items) {
          publications.push({
            sourceSlug: item.sourceSlug,
            title: item.title,
            summary: item.summary,
            originalUrl: item.originalUrl,
            canonicalUrl: item.canonicalUrl,
            imageUrl: item.imageUrl,
            publishedAt: item.publishedAt,
            modifiedAt: item.modifiedAt,
            discoveredAt: item.discoveredAt,
            lastSeenAt: item.lastSeenAt,
            contentType: item.contentType,
            status: item.status,
            guid: null,
            categories: item.categories,
            classificationLocked: item.classificationLocked,
            themes: item.themes.map((term) => term.slug),
            apsas: item.apsas.map((term) => term.slug),
            levels: item.levels.map((term) => term.slug),
            tags: item.tags.map((term) => term.label),
          });
        }
        page += 1;
      } while (publications.length < total && page < 40);
      return {
        version: 1,
        origin: "collector",
        generatedAt: new Date().toISOString(),
        note: "Métadonnées collectées sur les sites sources. Extraits courts uniquement, sans texte intégral.",
        publications,
      };
    },
  };

  async function seedTerms() {
    await upsertTerms("themes", THEMES);
    await upsertTerms("apsas", APSAS);
    await upsertTerms("levels", LEVELS);
    await upsertTerms("content_types", CONTENT_TYPES);
  }

  async function upsertTerms(table: "themes" | "apsas" | "levels" | "content_types", terms: Array<{ slug: string; label: string }>) {
    if (terms.length === 0) return;
    const binder = new Binder();
    const values = terms.map((term) => `(${binder.add(term.slug)}, ${binder.add(term.label)})`).join(", ");
    await sql.run(
      `INSERT INTO ${table} (slug, label) VALUES ${values} ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label`,
      binder.values,
    );
  }

  async function hydrate(rows: PublicationRow[]): Promise<Publication[]> {
    if (rows.length === 0) return [];
    const binder = new Binder();
    const list = binder.list(rows.map((row) => row.id));
    const [themes, apsas, levels, tags] = await Promise.all([
      sql.all<{ publication_id: string; slug: string; label: string }>(
        `SELECT pt.publication_id, t.slug, t.label FROM publication_themes pt JOIN themes t ON t.slug = pt.theme_slug WHERE pt.publication_id IN (${list})`,
        binder.values,
      ),
      sql.all<{ publication_id: string; slug: string; label: string }>(
        `SELECT pa.publication_id, a.slug, a.label FROM publication_apsas pa JOIN apsas a ON a.slug = pa.apsa_slug WHERE pa.publication_id IN (${list})`,
        binder.values,
      ),
      sql.all<{ publication_id: string; slug: string; label: string }>(
        `SELECT pl.publication_id, l.slug, l.label FROM publication_levels pl JOIN levels l ON l.slug = pl.level_slug WHERE pl.publication_id IN (${list})`,
        binder.values,
      ),
      sql.all<{ publication_id: string; slug: string; label: string }>(
        `SELECT pt.publication_id, t.slug, t.label FROM publication_tags pt JOIN tags t ON t.slug = pt.tag_slug WHERE pt.publication_id IN (${list})`,
        binder.values,
      ),
    ]);
    const grouped = (links: Array<{ publication_id: string; slug: string; label: string }>) => {
      const map = new Map<string, TermRef[]>();
      for (const link of links) {
        const current = map.get(link.publication_id) ?? [];
        current.push({ slug: link.slug, label: link.label });
        map.set(link.publication_id, current);
      }
      return map;
    };
    const themeMap = grouped(themes);
    const apsaMap = grouped(apsas);
    const levelMap = grouped(levels);
    const tagMap = grouped(tags);
    return rows.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_name,
      sourceSlug: row.source_slug,
      sourceKind: row.source_kind,
      title: row.title,
      summary: row.summary,
      originalUrl: row.original_url,
      canonicalUrl: row.canonical_url,
      imageUrl: row.image_url,
      publishedAt: row.published_at,
      modifiedAt: row.modified_at,
      discoveredAt: row.discovered_at,
      lastSeenAt: row.last_seen_at,
      contentType: row.content_type,
      contentTypeLabel: CONTENT_TYPES.find((type) => type.slug === row.content_type)?.label ?? null,
      status: row.status === "hidden" ? "hidden" : "published",
      themes: themeMap.get(row.id) ?? [],
      apsas: apsaMap.get(row.id) ?? [],
      levels: levelMap.get(row.id) ?? [],
      tags: tagMap.get(row.id) ?? [],
      categories: parseJson<string[]>(row.raw_categories, []),
      classificationLocked: Number(row.classification_locked) === 1,
      isDemo: Number(row.is_demo) === 1,
    }));
  }

  async function replaceTaxonomy(id: string, themes: string[], apsas: string[], levels: string[], tags: string[]) {
    await sql.run("DELETE FROM publication_themes WHERE publication_id = $1", [id]);
    await sql.run("DELETE FROM publication_apsas WHERE publication_id = $1", [id]);
    await sql.run("DELETE FROM publication_levels WHERE publication_id = $1", [id]);
    await sql.run("DELETE FROM publication_tags WHERE publication_id = $1", [id]);
    for (const slug of known(themes, THEMES)) await sql.run("INSERT INTO publication_themes (publication_id, theme_slug) VALUES ($1, $2)", [id, slug]);
    for (const slug of known(apsas, APSAS)) await sql.run("INSERT INTO publication_apsas (publication_id, apsa_slug) VALUES ($1, $2)", [id, slug]);
    for (const slug of known(levels, LEVELS)) await sql.run("INSERT INTO publication_levels (publication_id, level_slug) VALUES ($1, $2)", [id, slug]);
    const seenTags = new Set<string>();
    for (const label of tags) {
      const slug = tagSlug(label);
      if (!slug || seenTags.has(slug)) continue;
      seenTags.add(slug);
      await sql.run("INSERT INTO tags (slug, label) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET label = $2", [slug, label]);
      await sql.run("INSERT INTO publication_tags (publication_id, tag_slug) VALUES ($1, $2)", [id, slug]);
    }
  }

  async function existingLabels(id: string | undefined): Promise<string[]> {
    if (!id) return [];
    const [publication] = await hydrate(
      await sql.all<PublicationRow>(`${SELECT_PUBLICATION} WHERE p.id = $1`, [id]),
    );
    if (!publication) return [];
    return [
      ...publication.themes.map((term) => term.label),
      ...publication.apsas.map((term) => term.label),
      ...publication.levels.map((term) => term.label),
      ...publication.tags.map((term) => term.label),
      publication.contentTypeLabel ?? "",
    ].filter(Boolean);
  }
}

export type Repository = ReturnType<typeof createRepository>;

function buildWhere(binder: Binder, query: ListQuery): string {
  const clauses: string[] = [];
  if (!query.includeDemo) clauses.push("p.is_demo = 0");
  if (!query.includeHidden) clauses.push("p.status = 'published'");
  if (query.ids?.length) clauses.push(`p.id IN (${binder.list(query.ids)})`);
  if (query.excludeIds?.length) clauses.push(`p.id NOT IN (${binder.list(query.excludeIds)})`);
  if (query.academies?.length) clauses.push(`s.slug IN (${binder.list(query.academies)})`);
  if (query.themes?.length) clauses.push(existsIn("publication_themes", "theme_slug", binder, query.themes));
  if (query.apsas?.length) clauses.push(existsIn("publication_apsas", "apsa_slug", binder, query.apsas));
  if (query.levels?.length) clauses.push(existsIn("publication_levels", "level_slug", binder, query.levels));
  if (query.contentTypes?.length) clauses.push(`p.content_type IN (${binder.list(query.contentTypes)})`);
  if (query.from || query.to) {
    clauses.push("p.published_at IS NOT NULL");
    if (query.from) clauses.push(`p.published_at >= ${binder.add(query.from)}`);
    if (query.to) clauses.push(`p.published_at < ${binder.add(query.to)}`);
  }
  for (const token of query.tokens ?? []) {
    clauses.push(`p.search_text LIKE ${binder.add(likePattern(token))} ESCAPE '\\'`);
  }
  if (query.anyOf) {
    const parts: string[] = [];
    if (query.anyOf.themes?.length) parts.push(existsIn("publication_themes", "theme_slug", binder, query.anyOf.themes));
    if (query.anyOf.levels?.length) parts.push(existsIn("publication_levels", "level_slug", binder, query.anyOf.levels));
    if (query.anyOf.contentTypes?.length) parts.push(`p.content_type IN (${binder.list(query.anyOf.contentTypes)})`);
    clauses.push(parts.length ? `(${parts.join(" OR ")})` : "1 = 0");
  }
  return clauses.length ? clauses.join(" AND ") : "1 = 1";
}

function existsIn(table: string, column: string, binder: Binder, values: string[]): string {
  return `EXISTS (SELECT 1 FROM ${table} link WHERE link.publication_id = p.id AND link.${column} IN (${binder.list(values)}))`;
}

function buildOrder(binder: Binder, query: ListQuery): string {
  const chronological = "CASE WHEN p.published_at IS NULL THEN 1 ELSE 0 END, p.published_at DESC, p.discovered_at DESC, p.id ASC";
  if (query.sort !== "pertinence" || !query.tokens?.length) return chronological;
  const score = query.tokens
    .map((token) => {
      const title = binder.add(likePattern(token));
      const body = binder.add(likePattern(token));
      return `(CASE WHEN p.title_folded LIKE ${title} ESCAPE '\\' THEN 4 ELSE 0 END + CASE WHEN p.search_text LIKE ${body} ESCAPE '\\' THEN 1 ELSE 0 END)`;
    })
    .join(" + ");
  return `(${score}) DESC, ${chronological}`;
}

function sanitizeContentType(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return CONTENT_TYPES.some((type) => type.slug === slug) ? slug : null;
}

function known(slugs: string[], terms: Array<{ slug: string }>): string[] {
  const allowed = new Set(terms.map((term) => term.slug));
  return [...new Set(slugs.filter((slug) => allowed.has(slug)))];
}

function termLabelsFor(themes: string[], apsas: string[], levels: string[], tags: string[], contentType: string | null): string[] {
  return [
    ...themes.map((slug) => THEMES.find((term) => term.slug === slug)?.label ?? ""),
    ...apsas.map((slug) => APSAS.find((term) => term.slug === slug)?.label ?? ""),
    ...levels.map((slug) => LEVELS.find((term) => term.slug === slug)?.label ?? ""),
    ...tags,
    CONTENT_TYPES.find((type) => type.slug === contentType)?.label ?? "",
  ].filter(Boolean);
}

function buildSearch(title: string, summary: string | null, sourceName: string, categories: string[], labels: string[]): string {
  return fold([title, summary, sourceName, ...categories, ...labels].filter(Boolean).join(" \n ")).slice(0, 8000);
}

function similarity(target: Publication, candidate: Publication): number {
  let score = 0;
  for (const apsa of candidate.apsas) if (target.apsas.some((item) => item.slug === apsa.slug)) score += 5;
  for (const theme of candidate.themes) if (target.themes.some((item) => item.slug === theme.slug)) score += 3;
  for (const level of candidate.levels) if (target.levels.some((item) => item.slug === level.slug)) score += 2;
  if (candidate.contentType && candidate.contentType === target.contentType) score += 1;
  if (candidate.sourceSlug === target.sourceSlug) score += 2;
  return score;
}

function mapSource(row: Record<string, unknown>): SourceRecord {
  let config: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(String(row.config_json ?? "{}")) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) config = parsed as Record<string, unknown>;
  } catch {
    config = {};
  }
  const method = String(row.collect_method);
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    kind: row.kind === "national" ? "national" : "academie",
    regionGroup: row.region_group === "outremer" || row.region_group === "national" ? row.region_group : "metropole",
    homepageUrl: row.homepage_url ? String(row.homepage_url) : null,
    feedUrl: row.feed_url ? String(row.feed_url) : null,
    method: method === "html" || method === "sitemap" ? method : "rss",
    config,
    enabled: Number(row.enabled) === 1,
    customized: Number(row.customized) === 1,
    status: String(row.status),
    lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
    lastSuccessAt: row.last_success_at ? String(row.last_success_at) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    publicationCount: Number(row.publication_count ?? 0),
  };
}

function compareSources(a: SourceRecord, b: SourceRecord): number {
  const order = { metropole: 0, outremer: 1, national: 2 };
  return order[a.regionGroup] - order[b.regionGroup] || a.name.localeCompare(b.name, "fr");
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
