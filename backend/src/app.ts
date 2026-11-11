import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import type { Env } from "./env";
import { allowedOriginsFor, ConfigError, loadConfig, type Config } from "./config";
import { allow, Db } from "./db";
import { decrypt, encrypt, hmacHex, newCode, newToken, safeEqual, sha256Hex } from "./crypto";
import { mailerFor, type SendEmail } from "./mailer";

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

/** Lets tests swap out email delivery and Google token checks. */
export interface Overrides {
  sendEmail?: SendEmail | null;
  verifyGoogleToken?: (idToken: string) => Promise<GoogleIdentity>;
}

interface Services {
  config: Config;
  db: Db;
  sendEmail: SendEmail | null;
  verifyGoogle: ((idToken: string) => Promise<GoogleIdentity>) | null;
}

interface UserRow {
  id: number;
  email: string;
  name: string | null;
}

type AppEnv = { Bindings: Env; Variables: { svc: Services } };
type Ctx = Context<AppEnv>;

const CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 5;

const emailSchema = z.string().trim().toLowerCase().email().max(254);

const settingsSchema = z.object({
  // The assistant preferences: which Gemini model, which skill, and which tools are on.
  // (The field is still called "selection" so existing databases keep working.)
  selection: z
    .object({
      model: z.string().max(64).regex(/^[a-z0-9.\-]+$/),
      skill: z.string().max(32).regex(/^[a-z]+$/),
      search: z.boolean(),
      think: z.boolean(),
      code: z.boolean(),
    })
    .nullable()
    .optional(),
  apiKey: z.string().max(512).nullable().optional(),
  styleProfile: z
    .object({
      sample: z.string().max(20000),
      description: z.string().max(8000),
      updatedAt: z.number(),
    })
    .nullable()
    .optional(),
});

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("invalid_google_token");
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}

function safeJson(value: unknown): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function clientIp(c: Ctx): string {
  // Set by the server from the network connection, never from a request header.
  return c.env.CLIENT_IP ?? "unknown";
}

async function readBody(c: Ctx): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

function bearer(c: Ctx): string | null {
  const h = c.req.header("authorization");
  if (!h || !h.startsWith("Bearer ")) return null;
  const token = h.slice(7).trim();
  if (!token || token.length > 200) return null;
  return token;
}

async function authUser(c: Ctx): Promise<UserRow | null> {
  const token = bearer(c);
  if (!token) return null;
  const row = await c
    .get("svc")
    .db.first<UserRow & { expires_at: number }>(
      `SELECT u.id AS id, u.email AS email, u.name AS name, s.expires_at AS expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
      await sha256Hex(token)
    );
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, email: row.email, name: row.name };
}

async function createSession(db: Db, userId: number): Promise<string> {
  const token = newToken();
  const now = Date.now();
  await db.run(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    await sha256Hex(token),
    userId,
    now + SESSION_TTL_MS,
    now
  );
  return token;
}

async function upsertEmailUser(db: Db, email: string): Promise<UserRow> {
  const existing = await db.first<UserRow>(
    "SELECT id, email, name FROM users WHERE email = ?",
    email
  );
  if (existing) return { id: existing.id, email: existing.email, name: existing.name };
  const r = await db.run(
    "INSERT INTO users (email, name, created_at) VALUES (?, NULL, ?)",
    email,
    Date.now()
  );
  return { id: r.lastId, email, name: null };
}

async function upsertGoogleUser(db: Db, g: GoogleIdentity): Promise<UserRow> {
  const bySub = await db.first<UserRow>(
    "SELECT id, email, name FROM users WHERE google_sub = ?",
    g.sub
  );
  if (bySub) return { id: bySub.id, email: bySub.email, name: bySub.name };

  // Same verified email as an existing account: link them together.
  const byEmail = await db.first<UserRow>(
    "SELECT id, email, name FROM users WHERE email = ?",
    g.email
  );
  if (byEmail) {
    await db.run(
      "UPDATE users SET google_sub = ?, name = COALESCE(name, ?) WHERE id = ?",
      g.sub,
      g.name ?? null,
      byEmail.id
    );
    return { id: byEmail.id, email: byEmail.email, name: byEmail.name ?? g.name ?? null };
  }

  const r = await db.run(
    "INSERT INTO users (email, name, google_sub, created_at) VALUES (?, ?, ?, ?)",
    g.email,
    g.name ?? null,
    g.sub,
    Date.now()
  );
  return { id: r.lastId, email: g.email, name: g.name ?? null };
}

async function readSettings(svc: Services, userId: number) {
  const row = await svc.db.first<{
    selection: string | null;
    api_key_enc: string | null;
    style_profile: string | null;
    updated_at: number;
  }>(
    "SELECT selection, api_key_enc, style_profile, updated_at FROM user_settings WHERE user_id = ?",
    userId
  );

  if (!row) return { selection: null, apiKey: null, styleProfile: null, updatedAt: 0 };

  let apiKey: string | null = null;
  if (row.api_key_enc) {
    try {
      apiKey = await decrypt(row.api_key_enc, svc.config.encryptionKey);
    } catch {
      apiKey = null;
    }
  }

  return {
    selection: safeJson(row.selection),
    apiKey,
    styleProfile: safeJson(row.style_profile),
    updatedAt: row.updated_at,
  };
}

const publicUser = (u: UserRow) => ({ id: u.id, email: u.email, name: u.name });

export function createApp(overrides: Overrides = {}) {
  const app = new Hono<AppEnv>();

  // Only the app's own web addresses may call the API from a browser.
  app.use("*", (c, next) =>
    cors({
      origin: (origin) => (allowedOriginsFor(c.env).includes(origin) ? origin : null),
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    })(c, next)
  );

  // Responses can contain secrets, so never let anything cache them.
  app.use("*", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  });

  app.use(
    "*",
    bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: "payload_too_large" }, 413) })
  );

  // Build the settings and services for this request.
  app.use("*", async (c, next) => {
    if (c.req.path === "/health") return next();

    let config: Config;
    try {
      config = loadConfig(c.env);
    } catch (err) {
      if (err instanceof ConfigError) return c.json({ error: "server_not_configured" }, 503);
      throw err;
    }

    const clientId = config.googleClientId;
    c.set("svc", {
      config,
      db: new Db(c.env.DB),
      sendEmail:
        overrides.sendEmail !== undefined ? overrides.sendEmail : mailerFor(c.env, config),
      verifyGoogle:
        overrides.verifyGoogleToken ??
        (clientId ? (token: string) => verifyGoogleIdToken(token, clientId) : null),
    });
    return next();
  });

  app.onError((err, c) => {
    console.error("unhandled error:", err.message);
    return c.json({ error: "server_error" }, 500);
  });

  // ----------------------------------------------------------------- routes

  app.get("/health", (c) => c.json({ ok: true }));

  // Tells the app which sign-in options to show.
  app.get("/auth/config", (c) => {
    const { sendEmail, verifyGoogle } = c.get("svc");
    return c.json({ email: !!sendEmail, google: !!verifyGoogle });
  });

  app.post("/auth/email/start", async (c) => {
    const { db, config, sendEmail } = c.get("svc");
    if (!(await allow(db, `start:${clientIp(c)}`, 5, 60_000))) {
      return c.json({ error: "rate_limited" }, 429);
    }
    if (!sendEmail) return c.json({ error: "email_not_configured" }, 503);

    const parsed = z.object({ email: emailSchema }).safeParse(await readBody(c));
    if (!parsed.success) return c.json({ error: "invalid_email" }, 400);
    const email = parsed.data.email;
    const now = Date.now();

    const recent = await db.first<{ c: number }>(
      "SELECT COUNT(*) AS c FROM login_codes WHERE email = ? AND created_at > ?",
      email,
      now - 3600 * 1000
    );
    if ((recent?.c ?? 0) >= MAX_CODES_PER_HOUR) {
      return c.json({ error: "too_many_codes" }, 429);
    }

    // Only the newest code is ever valid.
    await db.run("UPDATE login_codes SET consumed = 1 WHERE email = ? AND consumed = 0", email);

    const code = newCode();
    const ins = await db.run(
      "INSERT INTO login_codes (email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
      email,
      await hmacHex(`${email}:${code}`, config.serverSecret),
      now + CODE_TTL_MS,
      now
    );

    try {
      await sendEmail(email, code);
    } catch (err) {
      await db.run("UPDATE login_codes SET consumed = 1 WHERE id = ?", ins.lastId);
      console.error("failed to send login email:", (err as Error).message);
      return c.json({ error: "email_failed" }, 502);
    }

    return c.json({ ok: true, expiresInSeconds: CODE_TTL_MS / 1000 });
  });

  app.post("/auth/email/verify", async (c) => {
    const { db, config } = c.get("svc");
    if (!(await allow(db, `verify:${clientIp(c)}`, 10, 60_000))) {
      return c.json({ error: "rate_limited" }, 429);
    }

    const parsed = z
      .object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) })
      .safeParse(await readBody(c));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);
    const { email, code } = parsed.data;
    const now = Date.now();

    const row = await db.first<{
      id: number;
      code_hash: string;
      expires_at: number;
      attempts: number;
    }>(
      `SELECT id, code_hash, expires_at, attempts FROM login_codes
       WHERE email = ? AND consumed = 0 ORDER BY created_at DESC, id DESC LIMIT 1`,
      email
    );

    if (!row || row.expires_at < now) return c.json({ error: "code_expired" }, 400);

    if (row.attempts >= MAX_ATTEMPTS) {
      await db.run("UPDATE login_codes SET consumed = 1 WHERE id = ?", row.id);
      return c.json({ error: "too_many_attempts" }, 429);
    }

    // Count this try before checking it, so guesses can never be free.
    const bumped = await db.first<{ attempts: number }>(
      "UPDATE login_codes SET attempts = attempts + 1 WHERE id = ? AND consumed = 0 RETURNING attempts",
      row.id
    );
    if (!bumped) return c.json({ error: "code_expired" }, 400);

    const expected = await hmacHex(`${email}:${code}`, config.serverSecret);
    if (!safeEqual(expected, row.code_hash)) return c.json({ error: "wrong_code" }, 400);

    // Claim the code. If two requests race, only one of them wins.
    const claim = await db.run(
      "UPDATE login_codes SET consumed = 1 WHERE id = ? AND consumed = 0",
      row.id
    );
    if (claim.changes !== 1) return c.json({ error: "code_expired" }, 400);

    const user = await upsertEmailUser(db, email);
    const token = await createSession(db, user.id);
    return c.json({ token, user: publicUser(user) });
  });

  app.post("/auth/google", async (c) => {
    const { db, verifyGoogle } = c.get("svc");
    if (!(await allow(db, `google:${clientIp(c)}`, 10, 60_000))) {
      return c.json({ error: "rate_limited" }, 429);
    }
    if (!verifyGoogle) return c.json({ error: "google_not_configured" }, 501);

    const parsed = z
      .object({ idToken: z.string().min(20).max(4096) })
      .safeParse(await readBody(c));
    if (!parsed.success) return c.json({ error: "invalid_request" }, 400);

    let identity: GoogleIdentity;
    try {
      identity = await verifyGoogle(parsed.data.idToken);
    } catch {
      return c.json({ error: "invalid_google_token" }, 401);
    }
    if (!identity.emailVerified) return c.json({ error: "email_not_verified" }, 401);

    const user = await upsertGoogleUser(db, identity);
    const token = await createSession(db, user.id);
    return c.json({ token, user: publicUser(user) });
  });

  app.post("/auth/logout", async (c) => {
    const token = bearer(c);
    if (token) {
      await c.get("svc").db.run("DELETE FROM sessions WHERE token_hash = ?", await sha256Hex(token));
    }
    return c.json({ ok: true });
  });

  app.get("/me", async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    return c.json({ user: publicUser(user) });
  });

  // Deletes the account and everything stored for it.
  app.delete("/me", async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const { db } = c.get("svc");
    await db.run("DELETE FROM sessions WHERE user_id = ?", user.id);
    await db.run("DELETE FROM user_settings WHERE user_id = ?", user.id);
    await db.run("DELETE FROM users WHERE id = ?", user.id);
    return c.json({ ok: true });
  });

  app.get("/settings", async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    return c.json(await readSettings(c.get("svc"), user.id));
  });

  app.put("/settings", async (c) => {
    const user = await authUser(c);
    if (!user) return c.json({ error: "unauthorized" }, 401);
    const svc = c.get("svc");

    const parsed = settingsSchema.safeParse(await readBody(c));
    if (!parsed.success) return c.json({ error: "invalid_settings" }, 400);
    const body = parsed.data;

    const current = await svc.db.first<{
      selection: string | null;
      api_key_enc: string | null;
      style_profile: string | null;
    }>(
      "SELECT selection, api_key_enc, style_profile FROM user_settings WHERE user_id = ?",
      user.id
    );

    // undefined means "leave as is", null means "clear".
    const selection =
      body.selection === undefined
        ? current?.selection ?? null
        : body.selection === null
          ? null
          : JSON.stringify(body.selection);

    const apiKeyEnc =
      body.apiKey === undefined
        ? current?.api_key_enc ?? null
        : body.apiKey
          ? await encrypt(body.apiKey, svc.config.encryptionKey)
          : null;

    const styleProfile =
      body.styleProfile === undefined
        ? current?.style_profile ?? null
        : body.styleProfile === null
          ? null
          : JSON.stringify(body.styleProfile);

    await svc.db.run(
      `INSERT INTO user_settings (user_id, selection, api_key_enc, style_profile, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         selection = excluded.selection,
         api_key_enc = excluded.api_key_enc,
         style_profile = excluded.style_profile,
         updated_at = excluded.updated_at`,
      user.id,
      selection,
      apiKeyEnc,
      styleProfile,
      Date.now()
    );

    return c.json(await readSettings(svc, user.id));
  });

  return app;
}
