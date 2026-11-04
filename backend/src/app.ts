import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import type { Config } from "./config.js";
import type { Db } from "./db.js";
import type { SendEmail } from "./mailer.js";
import {
  decrypt,
  encrypt,
  hmacHex,
  newCode,
  newToken,
  safeEqualHex,
  sha256Hex,
} from "./crypto.js";

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface Deps {
  config: Config;
  db: Db;
  sendEmail: SendEmail;
  /** Override for tests. Defaults to real Google ID token verification. */
  verifyGoogleToken?: (idToken: string) => Promise<GoogleIdentity>;
}

interface UserRow {
  id: number;
  email: string;
  name: string | null;
}

const CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 5;

const emailSchema = z.string().trim().toLowerCase().email().max(254);

const settingsSchema = z.object({
  selection: z
    .object({
      kind: z.enum(["quad", "single"]),
      variantId: z.string().max(64).optional(),
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

function safeJson(value: unknown): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function buildApp(deps: Deps): Promise<FastifyInstance> {
  const { config, db, sendEmail } = deps;

  const app = Fastify({
    logger: config.logger,
    trustProxy: config.trustProxy,
    bodyLimit: 64 * 1024,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || config.allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "rate_limited",
      message: `Too many requests. Try again in ${Math.ceil(
        context.ttl / 1000
      )} seconds.`,
    }),
  });

  // Responses can contain secrets, so never let anything cache them.
  app.addHook("onSend", async (_req, reply) => {
    reply.header("Cache-Control", "no-store");
  });

  // ---------------------------------------------------------------- helpers

  const googleClient = config.googleClientId
    ? new OAuth2Client(config.googleClientId)
    : null;

  const verifyGoogle =
    deps.verifyGoogleToken ??
    (async (idToken: string): Promise<GoogleIdentity> => {
      if (!googleClient || !config.googleClientId) {
        throw new Error("google_not_configured");
      }
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.googleClientId,
      });
      const p = ticket.getPayload();
      if (!p || !p.sub || !p.email) throw new Error("invalid_google_token");
      return {
        sub: p.sub,
        email: p.email.toLowerCase(),
        emailVerified: !!p.email_verified,
        name: p.name,
      };
    });

  const googleEnabled = !!config.googleClientId || !!deps.verifyGoogleToken;

  function createSession(userId: number): string {
    const token = newToken();
    const now = Date.now();
    db.prepare(
      "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
    ).run(sha256Hex(token), userId, now + SESSION_TTL_MS, now);
    return token;
  }

  function bearerToken(req: FastifyRequest): string | null {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer ")) return null;
    const token = h.slice(7).trim();
    if (!token || token.length > 200) return null;
    return token;
  }

  function authUser(req: FastifyRequest): UserRow | null {
    const token = bearerToken(req);
    if (!token) return null;
    const row = db
      .prepare(
        `SELECT u.id AS id, u.email AS email, u.name AS name, s.expires_at AS expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`
      )
      .get(sha256Hex(token)) as unknown as
      | (UserRow & { expires_at: number })
      | undefined;
    if (!row || row.expires_at < Date.now()) return null;
    return { id: row.id, email: row.email, name: row.name };
  }

  function upsertEmailUser(email: string): UserRow {
    const existing = db
      .prepare("SELECT id, email, name FROM users WHERE email = ?")
      .get(email) as unknown as UserRow | undefined;
    if (existing) return { id: existing.id, email: existing.email, name: existing.name };
    const r = db
      .prepare("INSERT INTO users (email, name, created_at) VALUES (?, NULL, ?)")
      .run(email, Date.now());
    return { id: Number(r.lastInsertRowid), email, name: null };
  }

  function upsertGoogleUser(identity: GoogleIdentity): UserRow {
    const bySub = db
      .prepare("SELECT id, email, name FROM users WHERE google_sub = ?")
      .get(identity.sub) as unknown as UserRow | undefined;
    if (bySub) return { id: bySub.id, email: bySub.email, name: bySub.name };

    const byEmail = db
      .prepare("SELECT id, email, name FROM users WHERE email = ?")
      .get(identity.email) as unknown as UserRow | undefined;
    if (byEmail) {
      db.prepare(
        "UPDATE users SET google_sub = ?, name = COALESCE(name, ?) WHERE id = ?"
      ).run(identity.sub, identity.name ?? null, byEmail.id);
      return {
        id: byEmail.id,
        email: byEmail.email,
        name: byEmail.name ?? identity.name ?? null,
      };
    }

    const r = db
      .prepare(
        "INSERT INTO users (email, name, google_sub, created_at) VALUES (?, ?, ?, ?)"
      )
      .run(identity.email, identity.name ?? null, identity.sub, Date.now());
    return {
      id: Number(r.lastInsertRowid),
      email: identity.email,
      name: identity.name ?? null,
    };
  }

  function readSettings(userId: number) {
    const row = db
      .prepare(
        "SELECT selection, api_key_enc, style_profile, updated_at FROM user_settings WHERE user_id = ?"
      )
      .get(userId) as unknown as
      | {
          selection: string | null;
          api_key_enc: string | null;
          style_profile: string | null;
          updated_at: number;
        }
      | undefined;

    if (!row) {
      return { selection: null, apiKey: null, styleProfile: null, updatedAt: 0 };
    }

    let apiKey: string | null = null;
    if (row.api_key_enc) {
      try {
        apiKey = decrypt(row.api_key_enc, config.encryptionKey);
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

  // ----------------------------------------------------------------- routes

  app.get("/health", async () => ({ ok: true }));

  app.get("/auth/config", async () => ({ google: googleEnabled }));

  app.post(
    "/auth/email/start",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = z.object({ email: emailSchema }).safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_email" });
      const email = parsed.data.email;
      const now = Date.now();

      const recent = db
        .prepare(
          "SELECT COUNT(*) AS c FROM login_codes WHERE email = ? AND created_at > ?"
        )
        .get(email, now - 3600 * 1000) as unknown as { c: number };
      if (recent.c >= MAX_CODES_PER_HOUR) {
        return reply.code(429).send({ error: "too_many_codes" });
      }

      // Only the newest code is ever valid.
      db.prepare(
        "UPDATE login_codes SET consumed = 1 WHERE email = ? AND consumed = 0"
      ).run(email);

      const code = newCode();
      const ins = db
        .prepare(
          "INSERT INTO login_codes (email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)"
        )
        .run(email, hmacHex(`${email}:${code}`, config.serverSecret), now + CODE_TTL_MS, now);

      try {
        await sendEmail(email, code);
      } catch (err) {
        db.prepare("UPDATE login_codes SET consumed = 1 WHERE id = ?").run(
          Number(ins.lastInsertRowid)
        );
        req.log.error({ err: (err as Error).message }, "failed to send login email");
        return reply.code(502).send({ error: "email_failed" });
      }

      return { ok: true, expiresInSeconds: CODE_TTL_MS / 1000 };
    }
  );

  app.post(
    "/auth/email/verify",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = z
        .object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) })
        .safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_request" });
      const { email, code } = parsed.data;
      const now = Date.now();

      const row = db
        .prepare(
          `SELECT id, code_hash, expires_at, attempts FROM login_codes
           WHERE email = ? AND consumed = 0 ORDER BY created_at DESC, id DESC LIMIT 1`
        )
        .get(email) as unknown as
        | { id: number; code_hash: string; expires_at: number; attempts: number }
        | undefined;

      if (!row || row.expires_at < now) {
        return reply.code(400).send({ error: "code_expired" });
      }
      if (row.attempts >= MAX_ATTEMPTS) {
        db.prepare("UPDATE login_codes SET consumed = 1 WHERE id = ?").run(row.id);
        return reply.code(429).send({ error: "too_many_attempts" });
      }

      db.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);

      const expected = hmacHex(`${email}:${code}`, config.serverSecret);
      if (!safeEqualHex(expected, row.code_hash)) {
        return reply.code(400).send({ error: "wrong_code" });
      }

      db.prepare("UPDATE login_codes SET consumed = 1 WHERE id = ?").run(row.id);

      const user = upsertEmailUser(email);
      const token = createSession(user.id);
      return { token, user: publicUser(user) };
    }
  );

  app.post(
    "/auth/google",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!googleEnabled) return reply.code(501).send({ error: "google_not_configured" });
      const parsed = z.object({ idToken: z.string().min(20).max(4096) }).safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_request" });

      let identity: GoogleIdentity;
      try {
        identity = await verifyGoogle(parsed.data.idToken);
      } catch {
        return reply.code(401).send({ error: "invalid_google_token" });
      }
      if (!identity.emailVerified) {
        return reply.code(401).send({ error: "email_not_verified" });
      }

      const user = upsertGoogleUser(identity);
      const token = createSession(user.id);
      return { token, user: publicUser(user) };
    }
  );

  app.post("/auth/logout", async (req, reply) => {
    const token = bearerToken(req);
    if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256Hex(token));
    return reply.send({ ok: true });
  });

  app.get("/me", async (req, reply) => {
    const user = authUser(req);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return { user: publicUser(user) };
  });

  // Deletes the account and everything stored for it.
  app.delete("/me", async (req, reply) => {
    const user = authUser(req);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
    return { ok: true };
  });

  app.get("/settings", async (req, reply) => {
    const user = authUser(req);
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    return readSettings(user.id);
  });

  app.put("/settings", async (req, reply) => {
    const user = authUser(req);
    if (!user) return reply.code(401).send({ error: "unauthorized" });

    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_settings" });
    const body = parsed.data;

    const current = db
      .prepare(
        "SELECT selection, api_key_enc, style_profile FROM user_settings WHERE user_id = ?"
      )
      .get(user.id) as unknown as
      | {
          selection: string | null;
          api_key_enc: string | null;
          style_profile: string | null;
        }
      | undefined;

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
          ? encrypt(body.apiKey, config.encryptionKey)
          : null;

    const styleProfile =
      body.styleProfile === undefined
        ? current?.style_profile ?? null
        : body.styleProfile === null
          ? null
          : JSON.stringify(body.styleProfile);

    db.prepare(
      `INSERT INTO user_settings (user_id, selection, api_key_enc, style_profile, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         selection = excluded.selection,
         api_key_enc = excluded.api_key_enc,
         style_profile = excluded.style_profile,
         updated_at = excluded.updated_at`
    ).run(user.id, selection, apiKeyEnc, styleProfile, Date.now());

    return readSettings(user.id);
  });

  return app;
}
