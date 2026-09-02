import type { Viewer } from "@/lib/catalog/access";
import type { Item } from "@/lib/catalog/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function isMissingColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";
  return /column .* does not exist|Could not find the '.+' column/i.test(message);
}

/**
 * Keep media.privacy aligned with product publish state so anonymous
 * catalog visitors can load photos (RLS + publicSafeUrl both require public).
 * No-ops when the privacy column has not been migrated yet.
 */
export async function syncPublishedMedia(
  viewer: Viewer,
  items: Item[],
): Promise<void> {
  if (items.length === 0) return;
  const client = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ? createAdminClient()
    : await createClient();

  for (const item of items) {
    const privacy = item.published ? "public" : "private";
    const { error } = await client
      .from("media")
      .update({ privacy })
      .eq("shop_id", viewer.shopId)
      .eq("product_id", item.id);
    if (!error) continue;
    if (isMissingColumnError(error)) return;
    throw error;
  }
}
