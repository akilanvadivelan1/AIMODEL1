import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SqlDatabase, SqlParam, SqlStatement } from "./env";

function statement(sqlite: DatabaseSync, sql: string, params: SqlParam[]): SqlStatement {
  return {
    bind: (...next) => statement(sqlite, sql, next),
    async first<T>() {
      return ((sqlite.prepare(sql).get(...params) as T | undefined) ?? null) as T | null;
    },
    async all<T>() {
      return { results: sqlite.prepare(sql).all(...params) as T[] };
    },
    async run() {
      const r = sqlite.prepare(sql).run(...params);
      return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } };
    },
  };
}

/**
 * Opens (or creates) the SQLite file and makes sure the tables exist.
 * Pass ":memory:" for a throwaway database.
 */
export function openDatabase(dataDir: string): { db: SqlDatabase; close: () => void } {
  let file = ":memory:";
  if (dataDir !== ":memory:") {
    mkdirSync(dataDir, { recursive: true });
    file = join(dataDir, "omnidesk.db");
  }

  const sqlite = new DatabaseSync(file);
  sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  if (file !== ":memory:") sqlite.exec("PRAGMA journal_mode = WAL;");

  // schema.sql sits one folder above both src/ and dist/.
  sqlite.exec(readFileSync(fileURLToPath(new URL("../schema.sql", import.meta.url)), "utf8"));

  return {
    db: { prepare: (sql: string) => statement(sqlite, sql, []) },
    close: () => sqlite.close(),
  };
}
