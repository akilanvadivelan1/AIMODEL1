import { randomBytes } from "node:crypto";

export interface Config {
  isProd: boolean;
  logger: boolean;
  port: number;
  host: string;
  trustProxy: boolean;
  /** Folder for the SQLite file, or ":memory:" for tests. */
  dataDir: string;
  /** Used to hash login codes. */
  serverSecret: string;
  /** 32-byte key used to encrypt stored API keys (AES-256-GCM). */
  encryptionKey: Buffer;
  googleClientId: string | null;
  resendApiKey: string | null;
  mailFrom: string;
  allowedOrigins: string[];
}

const DEFAULT_ORIGINS = [
  "https://akilanvadivelan1.github.io",
  "tauri://localhost",
  "http://tauri.localhost",
  "http://localhost:5173",
  "http://localhost:4173",
];

function parseKey(raw: string): Buffer {
  const isHex = /^[0-9a-fA-F]{64}$/.test(raw);
  const buf = isHex ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64)."
    );
  }
  return buf;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const isProd = env.NODE_ENV === "production";

  const need = (name: string): string => {
    const v = env[name]?.trim();
    if (!v) throw new Error(`Missing required environment variable ${name}`);
    return v;
  };

  let serverSecret = env.SERVER_SECRET?.trim() ?? "";
  let encryptionKey: Buffer;

  if (isProd) {
    serverSecret = need("SERVER_SECRET");
    encryptionKey = parseKey(need("ENCRYPTION_KEY"));
    need("RESEND_API_KEY");
  } else {
    if (!serverSecret) {
      serverSecret = randomBytes(32).toString("hex");
      console.warn(
        "[config] SERVER_SECRET not set. Using a temporary one for this run."
      );
    }
    if (env.ENCRYPTION_KEY?.trim()) {
      encryptionKey = parseKey(env.ENCRYPTION_KEY.trim());
    } else {
      encryptionKey = randomBytes(32);
      console.warn(
        "[config] ENCRYPTION_KEY not set. Stored API keys will not survive a restart."
      );
    }
  }

  if (serverSecret.length < 32) {
    throw new Error("SERVER_SECRET must be at least 32 characters.");
  }

  const extraOrigins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    isProd,
    logger: true,
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? "0.0.0.0",
    trustProxy: env.TRUST_PROXY === "1",
    dataDir: env.DATA_DIR ?? "./data",
    serverSecret,
    encryptionKey,
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() || null,
    resendApiKey: env.RESEND_API_KEY?.trim() || null,
    mailFrom: env.MAIL_FROM?.trim() || "OmniDesk <onboarding@resend.dev>",
    allowedOrigins: [...DEFAULT_ORIGINS, ...extraOrigins],
  };
}
