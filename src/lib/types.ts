export type TermRef = { slug: string; label: string };

export type Publication = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceSlug: string;
  sourceKind: string;
  title: string;
  summary: string | null;
  originalUrl: string;
  canonicalUrl: string;
  imageUrl: string | null;
  publishedAt: string | null;
  modifiedAt: string | null;
  discoveredAt: string;
  lastSeenAt: string;
  contentType: string | null;
  contentTypeLabel: string | null;
  status: "published" | "hidden";
  themes: TermRef[];
  apsas: TermRef[];
  levels: TermRef[];
  tags: TermRef[];
  categories: string[];
  classificationLocked: boolean;
  isDemo: boolean;
};

export type SourceRecord = {
  id: string;
  slug: string;
  name: string;
  kind: "academie" | "national";
  regionGroup: "metropole" | "outremer" | "national";
  homepageUrl: string | null;
  feedUrl: string | null;
  method: "rss" | "html" | "sitemap";
  config: Record<string, unknown>;
  enabled: boolean;
  customized: boolean;
  status: string;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  publicationCount?: number;
};

export type SyncRun = {
  id: string;
  sourceId: string | null;
  sourceName: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  newCount: number;
  updatedCount: number;
  errorCount: number;
  status: string;
  message: string | null;
  logs: string[];
};

export type CollectedItem = {
  title: string;
  originalUrl: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  modifiedAt: string | null;
  guid: string | null;
  categories: string[];
  section: string | null;
};

export type CatalogPublication = {
  sourceSlug: string;
  title: string;
  summary: string | null;
  originalUrl: string;
  canonicalUrl: string;
  imageUrl: string | null;
  publishedAt: string | null;
  modifiedAt: string | null;
  discoveredAt: string;
  lastSeenAt: string;
  contentType: string | null;
  status: "published" | "hidden";
  guid: string | null;
  categories: string[];
  classificationLocked: boolean;
  themes: string[];
  apsas: string[];
  levels: string[];
  tags: string[];
  isDemo?: boolean;
};

export type Catalog = {
  version: 1;
  origin: "collector";
  generatedAt: string;
  note: string;
  publications: CatalogPublication[];
};

export type HtmlCollectConfig = {
  listUrl?: string;
  itemSelector: string;
  titleSelector: string;
  linkSelector?: string;
  summarySelector?: string;
  dateSelector?: string;
  dateAttribute?: string;
  imageSelector?: string;
  section?: string;
  maxItems?: number;
  hrefInclude?: string;
};

export type SitemapCollectConfig = {
  sitemapUrl?: string;
  includePattern: string;
  excludePattern?: string;
  maxUrls?: number;
};

export type SourceDefinition = {
  slug: string;
  name: string;
  kind: "academie" | "national";
  regionGroup: "metropole" | "outremer" | "national";
  homepageUrl: string | null;
  feedUrl: string | null;
  method: "rss" | "html" | "sitemap";
  enabled: boolean;
  config: Record<string, unknown>;
};
