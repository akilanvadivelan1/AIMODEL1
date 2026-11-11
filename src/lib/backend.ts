import type { Prefs } from "../models/skills";
import type { StyleProfile } from "../models/styleProfile";

const BASE = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");

/** False when no backend URL was configured at build time. */
export const backendEnabled = BASE.length > 0;

export const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();

/** True inside the Mac app. */
export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const TOKEN_KEY = "omnidesk.session.v1";

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export interface BackendUser {
  id: number;
  email: string;
  name: string | null;
}

export interface SyncedSettings {
  /** Skill, model and tools. Checked with normalizePrefs before use. */
  selection: Prefs | null;
  apiKey: string | null;
  styleProfile: StyleProfile | null;
  updatedAt: number;
}

export class BackendError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new BackendError(0, "network");
  }

  if (!res.ok) {
    let code = "request_failed";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) code = data.error;
    } catch {
      /* ignore */
    }
    throw new BackendError(res.status, code);
  }
  return (await res.json()) as T;
}

/** Plain-language text for an error, safe to show to the user. */
export function describeError(err: unknown): string {
  if (!(err instanceof BackendError)) return "Something went wrong. Please try again.";
  switch (err.code) {
    case "network":
      return "Could not reach the OmniDesk server. Check your connection and try again.";
    case "invalid_email":
      return "That email address does not look right.";
    case "wrong_code":
      return "That code is not correct. Check the email and try again.";
    case "code_expired":
      return "That code has expired. Go back and request a new one.";
    case "too_many_attempts":
      return "Too many wrong tries. Go back and request a new code.";
    case "too_many_codes":
      return "You have asked for too many codes. Please wait an hour and try again.";
    case "rate_limited":
      return "Too many requests. Please wait a minute and try again.";
    case "email_failed":
      return "We could not send the email. Please try again in a moment.";
    case "invalid_google_token":
    case "email_not_verified":
      return "Google sign-in did not work. Please try again.";
    case "google_not_configured":
      return "Google sign-in is not turned on yet.";
    case "email_not_configured":
      return "Emailed codes are not turned on yet. Try signing in with Google.";
    case "server_not_configured":
      return "The sign-in server is not set up correctly yet. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export const api = {
  /** Which sign-in options the server has turned on. */
  config: () =>
    call<{ email: boolean; google: boolean }>("/auth/config", { auth: false }),

  startEmail: (email: string) =>
    call<{ ok: true }>("/auth/email/start", { method: "POST", body: { email }, auth: false }),

  verifyEmail: (email: string, code: string) =>
    call<{ token: string; user: BackendUser }>("/auth/email/verify", {
      method: "POST",
      body: { email, code },
      auth: false,
    }),

  google: (idToken: string) =>
    call<{ token: string; user: BackendUser }>("/auth/google", {
      method: "POST",
      body: { idToken },
      auth: false,
    }),

  me: () => call<{ user: BackendUser }>("/me"),

  logout: () => call<{ ok: true }>("/auth/logout", { method: "POST" }),

  deleteAccount: () => call<{ ok: true }>("/me", { method: "DELETE" }),

  getSettings: () => call<SyncedSettings>("/settings"),

  putSettings: (body: Partial<Omit<SyncedSettings, "updatedAt">>) =>
    call<SyncedSettings>("/settings", { method: "PUT", body }),
};
