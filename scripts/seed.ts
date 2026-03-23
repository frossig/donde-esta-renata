import { readFileSync } from "fs";
import { join } from "path";
import { getDb } from "../lib/db";

async function seed() {
  const db = await getDb();

  // Run schema
  const schemaPath = join(process.cwd(), "lib", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  // Execute each statement individually
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }
  console.log("Schema created/verified.");

  // Seed stops
  const stops = [
    {
      id: "madrid-1",
      name: "Madrid",
      country: "España",
      flag: "🇪🇸",
      lat: 40.4168,
      lng: -3.7038,
      radius_km: 80,
      date_start: "2026-03-26",
      date_end: "2026-03-28",
      display_order: 1,
    },
    {
      id: "sevilla",
      name: "Sevilla",
      country: "España",
      flag: "🇪🇸",
      lat: 37.3891,
      lng: -5.9845,
      radius_km: 60,
      date_start: "2026-03-29",
      date_end: "2026-03-30",
      display_order: 2,
    },
    {
      id: "barcelona",
      name: "Barcelona",
      country: "España",
      flag: "🇪🇸",
      lat: 41.3851,
      lng: 2.1734,
      radius_km: 60,
      date_start: "2026-03-31",
      date_end: "2026-04-02",
      display_order: 3,
    },
    {
      id: "londres",
      name: "Londres",
      country: "Inglaterra",
      flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      lat: 51.5074,
      lng: -0.1278,
      radius_km: 80,
      date_start: "2026-04-03",
      date_end: "2026-04-06",
      display_order: 4,
    },
    {
      id: "amsterdam",
      name: "Amsterdam",
      country: "Países Bajos",
      flag: "🇳🇱",
      lat: 52.3676,
      lng: 4.9041,
      radius_km: 60,
      date_start: "2026-04-07",
      date_end: "2026-04-10",
      display_order: 5,
    },
    {
      id: "bruselas",
      name: "Bruselas",
      country: "Bélgica",
      flag: "🇧🇪",
      lat: 50.8503,
      lng: 4.3517,
      radius_km: 60,
      date_start: "2026-04-11",
      date_end: "2026-04-12",
      display_order: 6,
    },
    {
      id: "madrid-2",
      name: "Madrid",
      country: "España",
      flag: "🇪🇸",
      lat: 40.4168,
      lng: -3.7038,
      radius_km: 80,
      date_start: "2026-04-13",
      date_end: "2026-04-14",
      display_order: 7,
    },
  ];

  for (const stop of stops) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO stops
        (id, name, country, flag, lat, lng, radius_km, date_start, date_end, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        stop.id,
        stop.name,
        stop.country,
        stop.flag,
        stop.lat,
        stop.lng,
        stop.radius_km,
        stop.date_start,
        stop.date_end,
        stop.display_order,
      ],
    });
  }
  console.log(`Seeded ${stops.length} stops.`);

  // Seed initial trip_status
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT OR IGNORE INTO trip_status (id, state, current_stop_id, updated_at)
          VALUES (1, 'at_stop', 'madrid-1', ?)`,
    args: [now],
  });
  console.log("Seeded trip_status.");

  // Verify
  const stopsResult = await db.execute("SELECT id, name, display_order FROM stops ORDER BY display_order");
  console.log("\nStops in DB:");
  for (const row of stopsResult.rows) {
    console.log(`  ${row.display_order}. ${row.id} — ${row.name}`);
  }

  const statusResult = await db.execute("SELECT * FROM trip_status");
  console.log("\nTrip status:", statusResult.rows[0]);

  console.log("\nSeed complete.");
  db.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
