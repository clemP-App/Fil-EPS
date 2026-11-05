import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { Pool } from "pg";
import { toSqlite, type Sql } from "@/lib/sql";

export function openSqlite(filename: string): Sql {
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys = ON");
  try {
    db.exec("PRAGMA journal_mode = WAL");
  } catch {
    // Le mode mémoire n'accepte pas toujours WAL.
  }
  return {
    dialect: "sqlite",
    async exec(sqlText) {
      db.exec(sqlText);
    },
    async all(sqlText, params = []) {
      const query = toSqlite(sqlText, params);
      return db.prepare(query.text).all(...(query.params as SQLInputValue[])) as never[];
    },
    async get(sqlText, params = []) {
      const query = toSqlite(sqlText, params);
      return db.prepare(query.text).get(...(query.params as SQLInputValue[])) as never;
    },
    async run(sqlText, params = []) {
      const query = toSqlite(sqlText, params);
      db.prepare(query.text).run(...(query.params as SQLInputValue[]));
    },
  };
}

export function openPostgres(connectionString: string): Sql {
  const needsSsl = process.env.DATABASE_SSL === "require" || /supabase\.(co|com)/i.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: 5,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  return {
    dialect: "postgres",
    async exec(sqlText) {
      await pool.query(sqlText);
    },
    async all(sqlText, params = []) {
      const result = await pool.query(sqlText, params);
      return result.rows as never[];
    },
    async get(sqlText, params = []) {
      const result = await pool.query(sqlText, params);
      return result.rows[0] as never;
    },
    async run(sqlText, params = []) {
      await pool.query(sqlText, params);
    },
  };
}

export function openDefaultSql(): Sql {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && /^postgres(ql)?:/i.test(databaseUrl)) return openPostgres(databaseUrl);
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  try {
    fs.mkdirSync(dir, { recursive: true });
    return openSqlite(path.join(dir, "veille.db"));
  } catch {
    return openSqlite(":memory:");
  }
}
