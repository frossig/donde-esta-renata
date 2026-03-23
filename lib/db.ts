import { createClient } from "@libsql/client";

function createDb() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    // Production: connect to Turso
    return createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
  }

  // Development: use local SQLite file
  return createClient({
    url: "file:local.db",
  });
}

export const db = createDb();
