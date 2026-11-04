import type { Env } from "./env";
import { parseKey } from "./crypto";

export const DEFAULT_ORIGINS = [
  "https://akilanvadivelan1.github.io",
  "tauri://localhost",
  "http://tauri.localhost",
  "http://localhost:5173",
  "http://localhost:4173",
];

export class ConfigError extends Error {}

export interface Config {
  serverSecret: string;
  encryptionKey: Uint8Array;
  googleClientId: string | null;
  mailFrom: string;
}

export function allowedOriginsFor(env: Env): string[] {
  const extra = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

/** Reads the settings the Worker was given. Throws ConfigError if they are unsafe or missing. */
export function loadConfig(env: Env): Config {
  const serverSecret = env.SERVER_SECRET?.trim() ?? "";
  if (serverSecret.length < 32) {
    throw new ConfigError("SERVER_SECRET must be at least 32 characters.");
  }

  let encryptionKey: Uint8Array;
  try {
    encryptionKey = parseKey(env.ENCRYPTION_KEY?.trim() ?? "");
  } catch {
    throw new ConfigError("ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64).");
  }

  return {
    serverSecret,
    encryptionKey,
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() || null,
    mailFrom: env.MAIL_FROM?.trim() || "OmniDesk <onboarding@resend.dev>",
  };
}
