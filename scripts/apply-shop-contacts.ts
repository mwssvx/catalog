/**
 * Apply shops contact/branding columns when DATABASE_URL is set.
 * Usage: npx tsx --env-file=.env.local scripts/apply-shop-contacts.ts
 */
import pg from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Set DATABASE_URL in .env.local (Supabase → Project Settings → Database → URI).",
    );
  }

  const sqlPath = path.join(
    process.cwd(),
    "supabase/migrations/20260822180000_shop_contacts_categories.sql",
  );
  const brandingPath = path.join(
    process.cwd(),
    "supabase/migrations/20260820120000_shop_branding.sql",
  );
  const sql = [
    await readFile(brandingPath, "utf8"),
    await readFile(sqlPath, "utf8"),
  ].join("\n\n");

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log("ok: logo_url, cover_url, instagram, telegram, categories");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
