import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDb, purgeExpired } from "./db.js";
import { createMailer } from "./mailer.js";

async function main() {
  const config = loadConfig();
  const db = openDb(config.dataDir);
  purgeExpired(db);

  const app = await buildApp({ config, db, sendEmail: createMailer(config) });

  // Clean up expired sessions and codes once an hour.
  const timer = setInterval(() => purgeExpired(db), 3600 * 1000);
  timer.unref();

  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
