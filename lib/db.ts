import { createClient } from "@libsql/client";

async function createDb() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  let client;
  if (tursoUrl) {
    // Production: connect to Turso
    client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
  } else {
    // Development: use local SQLite file
    client = createClient({
      url: "file:local.db",
    });
  }

  await client.execute("PRAGMA foreign_keys = ON");
  return client;
}

let _db: Awaited<ReturnType<typeof createDb>> | null = null;
export async function getDb() {
  if (!_db) _db = await createDb();
  return _db;
}
