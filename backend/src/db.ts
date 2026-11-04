import type { SqlDatabase, SqlParam } from "./env";

export type Param = SqlParam;

/** A thin wrapper that keeps the SQL calls short. */
export class Db {
  constructor(private readonly d1: SqlDatabase) {}

  async first<T>(sql: string, ...params: Param[]): Promise<T | null> {
    return (await this.d1.prepare(sql).bind(...params).first<T>()) ?? null;
  }

  async all<T>(sql: string, ...params: Param[]): Promise<T[]> {
    const res = await this.d1.prepare(sql).bind(...params).all<T>();
    return res.results;
  }

  async run(sql: string, ...params: Param[]): Promise<{ lastId: number; changes: number }> {
    const res = await this.d1.prepare(sql).bind(...params).run();
    return {
      lastId: Number(res.meta.last_row_id),
      changes: Number(res.meta.changes),
    };
  }
}

/**
 * Allow at most `max` hits per `windowMs` for a key.
 * Returns false once the limit is passed.
 */
export async function allow(
  db: Db,
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();
  const cutoff = now - windowMs;
  const row = await db.first<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start <= ? THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start <= ? THEN ? ELSE rate_limits.window_start END
     RETURNING count`,
    key,
    now,
    cutoff,
    cutoff,
    now
  );
  return (row?.count ?? 1) <= max;
}

/** Remove expired sessions, old login codes, and old rate limit counters. */
export async function purgeExpired(db: Db, now = Date.now()): Promise<void> {
  const dayAgo = now - 24 * 3600 * 1000;
  await db.run("DELETE FROM sessions WHERE expires_at < ?", now);
  await db.run("DELETE FROM login_codes WHERE created_at < ?", dayAgo);
  await db.run("DELETE FROM rate_limits WHERE window_start < ?", dayAgo);
}
