import type { Viewer } from "@/lib/catalog/access";
import type { Item } from "@/lib/catalog/types";

/**
 * Media promotion used to copy objects to a public CDN (AWS).
 * With Supabase + HTTPS URLs only, this is intentionally a no-op.
 * Reintroduce object storage later without changing call sites.
 */
export async function syncPublishedMedia(
  _viewer: Viewer,
  _items: Item[],
): Promise<void> {
  return;
}
