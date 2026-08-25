/**
 * One-shot ops: check schema, brand shop as Velviera, report gaps.
 * Usage: npx tsx --env-file=.env.local scripts/ops-velviera-ship.ts
 */
import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const db = createAdminClient();

  async function probe(
    label: string,
    run: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ) {
    const { data, error } = await run();
    console.log(label, error ? `ERR: ${error.message}` : "ok");
    return { data, ok: !error };
  }

  const branding = await probe("shops.logo_url/cover_url", () =>
    db.from("shops").select("id, logo_url, cover_url").limit(1),
  );
  const contacts = await probe("shops.instagram/telegram/categories", () =>
    db.from("shops").select("id, instagram, telegram, categories").limit(1),
  );

  const { data: shop, error: shopError } = await db
    .from("shops")
    .select(
      "id, slug, name, tagline, location, whatsapp, instagram, telegram, categories, cover_url, logo_url",
    )
    .eq("slug", process.env.PUBLIC_SHOP_SLUG?.trim() || "dordoi")
    .maybeSingle();

  if (shopError) {
    console.error("shop load failed:", shopError.message);
    process.exitCode = 1;
    return;
  }
  if (!shop) {
    console.error("No shop row for PUBLIC_SHOP_SLUG");
    process.exitCode = 1;
    return;
  }

  console.log("before:", {
    slug: shop.slug,
    name: shop.name,
    tagline: shop.tagline,
    location: shop.location,
    categories: shop.categories,
  });

  const patch: Record<string, unknown> = {
    name: "Velviera",
    tagline: "Мягкие ночи. Лёгкая элегантность каждый день.",
    location: "Бишкек",
  };
  if (contacts.ok) {
    patch.categories = [
      "sets",
      "nightdresses",
      "robes",
      "loungewear",
      "accessories",
    ];
  }

  const { error: updateError } = await db
    .from("shops")
    .update(patch)
    .eq("id", shop.id);

  if (updateError) {
    console.error("shop update failed:", updateError.message);
    process.exitCode = 1;
    return;
  }

  console.log("shop branded as Velviera");

  if (!branding.ok || !contacts.ok) {
    console.log(
      "\nSchema incomplete. Set DATABASE_URL and run: npm run migrate:sql",
    );
    console.log("Or paste supabase/pending.sql in Supabase SQL Editor.");
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
