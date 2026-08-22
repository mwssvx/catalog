/**
 * Apply pending SQL migrations when DATABASE_URL is set.
 *
 * In Supabase: Project Settings → Database → Connection string (URI)
 * Add to .env.local as DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres
 *
 * Usage: npx tsx --env-file=.env.local scripts/apply-migrations.ts
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Set DATABASE_URL in .env.local (Supabase → Settings → Database → URI).",
    );
  }

  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows } = await client.query<{ filename: string }>(
    "select filename from public.schema_migrations",
  );
  const done = new Set(rows.map((r) => r.filename));

  for (const file of files) {
    if (done.has(file)) {
      console.log("skip", file);
      continue;
    }
    const sql = await readFile(path.join(dir, file), "utf8");
    console.log("apply", file);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into public.schema_migrations (filename) values ($1)",
        [file],
      );
      await client.query("commit");
      console.log("ok", file);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  await client.end();
  console.log("done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
