export type SqlDialect = "sqlite" | "postgres";

export type Sql = {
  dialect: SqlDialect;
  exec(sql: string): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<void>;
};

export function toSqlite(sql: string, params: unknown[] = []): { text: string; params: unknown[] } {
  const ordered: unknown[] = [];
  const text = sql.replace(/\$(\d+)/g, (_, index: string) => {
    ordered.push(params[Number(index) - 1] ?? null);
    return "?";
  });
  return { text, params: ordered };
}

export function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let dollar = false;
  for (const line of sql.split("\n")) {
    const trimmed = line.trim();
    if (!dollar && trimmed.startsWith("--")) continue;
    if (line.includes("$$")) dollar = !dollar;
    current += `${line}\n`;
    if (!dollar && trimmed.endsWith(";")) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
    }
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: string }).code) : "";
  if (code === "23505") return true;
  const message = error instanceof Error ? error.message : "";
  return /UNIQUE constraint failed/i.test(message);
}

export class Binder {
  values: unknown[] = [];

  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }

  list(values: unknown[]): string {
    return values.map((value) => this.add(value)).join(", ");
  }
}
