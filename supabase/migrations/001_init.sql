-- Schéma VEILLE EPS pour PostgreSQL / Supabase.
-- Les visiteurs n'utilisent pas la clé anon : l'application lit et écrit uniquement
-- via la connexion serveur. RLS est activé sans politique publique.

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  region_group TEXT NOT NULL,
  homepage_url TEXT,
  feed_url TEXT,
  collect_method TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 0,
  customized INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unconfigured',
  last_sync_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS themes (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS apsas (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS levels (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_types (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  title TEXT NOT NULL,
  title_folded TEXT NOT NULL DEFAULT '',
  summary TEXT,
  original_url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  image_url TEXT,
  published_at TEXT,
  modified_at TEXT,
  discovered_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  content_type TEXT REFERENCES content_types(slug),
  status TEXT NOT NULL DEFAULT 'published',
  guid TEXT,
  raw_categories TEXT NOT NULL DEFAULT '[]',
  search_text TEXT NOT NULL DEFAULT '',
  classification_locked INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS publications_canonical_idx ON publications(canonical_url);
CREATE UNIQUE INDEX IF NOT EXISTS publications_source_guid_idx ON publications(source_id, guid) WHERE guid IS NOT NULL AND guid <> '';
CREATE INDEX IF NOT EXISTS publications_published_idx ON publications(published_at);
CREATE INDEX IF NOT EXISTS publications_discovered_idx ON publications(discovered_at);
CREATE INDEX IF NOT EXISTS publications_source_idx ON publications(source_id);
CREATE INDEX IF NOT EXISTS publications_status_idx ON publications(status);

CREATE TABLE IF NOT EXISTS publication_themes (
  publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  theme_slug TEXT NOT NULL REFERENCES themes(slug),
  PRIMARY KEY (publication_id, theme_slug)
);
CREATE INDEX IF NOT EXISTS publication_themes_slug_idx ON publication_themes(theme_slug);

CREATE TABLE IF NOT EXISTS publication_apsas (
  publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  apsa_slug TEXT NOT NULL REFERENCES apsas(slug),
  PRIMARY KEY (publication_id, apsa_slug)
);
CREATE INDEX IF NOT EXISTS publication_apsas_slug_idx ON publication_apsas(apsa_slug);

CREATE TABLE IF NOT EXISTS publication_levels (
  publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  level_slug TEXT NOT NULL REFERENCES levels(slug),
  PRIMARY KEY (publication_id, level_slug)
);
CREATE INDEX IF NOT EXISTS publication_levels_slug_idx ON publication_levels(level_slug);

CREATE TABLE IF NOT EXISTS publication_tags (
  publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  tag_slug TEXT NOT NULL REFERENCES tags(slug),
  PRIMARY KEY (publication_id, tag_slug)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES sources(id),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  duration_ms INTEGER,
  new_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  message TEXT,
  log_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS sync_runs_started_idx ON sync_runs(started_at);

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE apsas ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_apsas ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_meta ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  role_name text;
  table_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      FOREACH table_name IN ARRAY ARRAY[
        'sources', 'publications', 'themes', 'apsas', 'levels', 'content_types', 'tags',
        'publication_themes', 'publication_apsas', 'publication_levels', 'publication_tags',
        'sync_runs', 'schema_meta'
      ]
      LOOP
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', table_name, role_name);
      END LOOP;
    END IF;
  END LOOP;
END $$;
