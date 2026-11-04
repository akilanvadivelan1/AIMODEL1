import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export type Db = DatabaseSync;

export function openDb(dataDir: string): Db {
  let file = ":memory:";
  if (dataDir !== ":memory:") {
    mkdirSync(dataDir, { recursive: true });
    file = join(dataDir, "omnidesk.db");
  }

  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON;");
  if (file !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      google_sub TEXT UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      consumed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_codes_email
      ON login_codes(email, created_at);

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      selection TEXT,
      api_key_enc TEXT,
      style_profile TEXT,
      updated_at INTEGER NOT NULL
    );
  `);

  return db;
}

/** Remove expired sessions and old login codes. */
export function purgeExpired(db: Db, now = Date.now()): void {
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  db.prepare("DELETE FROM login_codes WHERE created_at < ?").run(
    now - 24 * 3600 * 1000
  );
}
