import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@libsql/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set (check your .env)");

  const client = createClient({ url, authToken });
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");

  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.execute(statement);
  }

  // Additive migration for existing Turso DBs created before `source` existed.
  try {
    await client.execute(
      "ALTER TABLE cards ADD COLUMN source TEXT NOT NULL DEFAULT 'playwright'"
    );
    console.log("Added cards.source column");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/duplicate column|already exists/i.test(message)) throw err;
  }

  await client.execute(
    "CREATE INDEX IF NOT EXISTS idx_cards_source ON cards(source)"
  );

  console.log(`Migration applied: ${statements.length} statements executed against ${url}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
