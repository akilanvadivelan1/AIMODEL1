/** The small slice of a SQL database the app needs. SQLite (via sqlite.ts) provides it. */
export type SqlParam = string | number | null;

export interface SqlStatement {
  bind(...params: SqlParam[]): SqlStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { last_row_id: number; changes: number } }>;
}

export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
}

/** Everything the app is given when it handles a request. */
export interface Env {
  DB: SqlDatabase;
  /** Hashes login codes. At least 32 characters. */
  SERVER_SECRET: string;
  /** Encrypts stored API keys. 32 bytes as 64 hex characters or base64. */
  ENCRYPTION_KEY: string;
  /** Sends sign-in emails (https://resend.com). */
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  /** Turns on Continue with Google. */
  GOOGLE_CLIENT_ID?: string;
  /** Extra web addresses allowed to call the API, separated by commas. */
  ALLOWED_ORIGINS?: string;
  /** Set to 1 to print codes in the log instead of emailing. For local testing only. */
  DEV_LOG_CODES?: string;
  /** The caller's address, set by the server itself (never taken from the request). */
  CLIENT_IP?: string;
}
