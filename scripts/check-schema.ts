import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const db = createAdminClient();

  async function check(label: string, run: () => PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await run();
    console.log(label, error ? `MISSING/ERR: ${error.message}` : "ok");
    return !error;
  }

  const logoOk = await check("shops.logo_url", () =>
    db.from("shops").select("id, logo_url, cover_url").limit(1),
  );
  const versionOk = await check("board_documents.version", () =>
    db.from("board_documents").select("shop_id, version").limit(1),
  );
  const aiOk = await check("ai_jobs.kind", () =>
    db.from("ai_jobs").select("id, kind").limit(1),
  );

  const { data: shop, error: shopError } = await db
    .from("shops")
    .select("id, slug, name, tagline, whatsapp, location")
    .eq("slug", "dordoi")
    .maybeSingle();
  console.log("shop", shop, shopError?.message ?? "");

  if (shop && !shop.tagline) {
    const { error } = await db
      .from("shops")
      .update({
        tagline: "Одежда с точки на Дордое — цена и размер в каталоге, покупка в WhatsApp",
      })
      .eq("id", shop.id);
    console.log("tagline update", error ? error.message : "ok");
  }

  if (!logoOk || !versionOk || !aiOk) {
    console.log(
      "\nApply pending SQL in Supabase SQL Editor (or set DATABASE_URL and npm run migrate:sql):",
    );
    console.log("  supabase/migrations/20260820120000_shop_branding.sql");
    console.log("  supabase/migrations/20260820140000_board_versioning.sql");
    console.log("  supabase/migrations/20260820160000_ai_jobs_queue.sql");
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
