import { serve, type Http2Bindings, type HttpBindings } from "@hono/node-server";
import type { IncomingHttpHeaders } from "node:http";
import { createApp } from "./app";
import { ConfigError, loadConfig } from "./config";
import { Db, purgeExpired } from "./db";
import type { Env } from "./env";
import { mailerFor } from "./mailer";
import { openDatabase } from "./sqlite";

const port = Number(process.env.PORT ?? 8787);
const dataDir = process.env.DATA_DIR ?? "./data";
// Turn this on only when a trusted proxy (Caddy) sits in front of this server.
const trustProxy = process.env.TRUST_PROXY === "1";

const { db, close } = openDatabase(dataDir);

const baseEnv: Omit<Env, "CLIENT_IP"> = {
  DB: db,
  SERVER_SECRET: process.env.SERVER_SECRET ?? "",
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? "",
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  MAIL_FROM: process.env.MAIL_FROM,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  DEV_LOG_CODES: process.env.DEV_LOG_CODES,
};

// Refuse to start with missing or weak secrets, with a clear reason.
try {
  const config = loadConfig(baseEnv as Env);
  if (!mailerFor(baseEnv as Env, config)) {
    console.warn("Email sign-in is OFF (no RESEND_API_KEY). Google sign-in can still work.");
  }
  if (!config.googleClientId) {
    console.warn("Google sign-in is OFF (no GOOGLE_CLIENT_ID).");
  }
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`Cannot start: ${err.message}`);
    process.exit(1);
  }
  throw err;
}

/** Who is calling. Behind Caddy we trust the LAST address it appended. */
function clientIp(incoming: { headers: IncomingHttpHeaders; socket: { remoteAddress?: string } }): string {
  if (trustProxy) {
    const raw = incoming.headers["x-forwarded-for"];
    const joined = Array.isArray(raw) ? raw.join(",") : raw;
    const last = joined
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .pop();
    if (last) return last;
  }
  return incoming.socket.remoteAddress ?? "unknown";
}

const app = createApp();

const server = serve(
  {
    // Only listen on this machine. The public reaches us through Caddy.
    hostname: "127.0.0.1",
    port,
    fetch: async (request: Request, bindings: HttpBindings | Http2Bindings) => {
      const started = Date.now();
      const response = await app.fetch(request, {
        ...baseEnv,
        CLIENT_IP: clientIp(bindings.incoming),
      });
      // One line per request. Paths only, never bodies or tokens.
      console.log(
        `${request.method} ${new URL(request.url).pathname} ${response.status} ${Date.now() - started}ms`
      );
      return response;
    },
  },
  (info) => console.log(`OmniDesk API listening on http://127.0.0.1:${info.port}`)
);

// Clear out expired sessions and codes once an hour.
const cleanup = setInterval(() => void purgeExpired(new Db(db)), 3600 * 1000);
cleanup.unref();
void purgeExpired(new Db(db));

function shutdown() {
  clearInterval(cleanup);
  server.close(() => {
    close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
