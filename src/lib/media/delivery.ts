import type { Viewer } from "@/lib/catalog/access";
import type { MediaRecord } from "@/lib/media/types";
import { isPublicObjectKey } from "@/lib/media/validation";

export function mediaRef(id: string): string {
  return `media:${id}`;
}

export function parseMediaRef(value: string): string | null {
  if (value.startsWith("media:")) return value.slice("media:".length);
  return null;
}

export function objectKeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url, "https://media.local");
    const path = parsed.pathname.replace(/^\//, "");
    if (path.startsWith("private/") || path.startsWith("public/")) return path;
  } catch {
    /* ignore */
  }
  return null;
}

/** Local/test CDN helper — production media uses direct HTTPS URLs. */
export function publicObjectUrl(publicKey: string): string {
  return `https://media.local/${publicKey.replace(/^\//, "")}`;
}

export function persistableUrl(url: string, mediaId?: string): string {
  if (mediaId) return mediaRef(mediaId);
  const id = parseMediaRef(url);
  if (id) return mediaRef(id);
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("X-Amz-Signature")) {
      return mediaId ? mediaRef(mediaId) : parsed.origin + parsed.pathname;
    }
  } catch {
    /* keep */
  }
  return url;
}

export async function deliveryUrl(
  record: MediaRecord,
  viewer: Viewer | null,
): Promise<string | null> {
  if (record.uploadStatus !== "complete") return null;
  if (record.url.startsWith("http")) {
    if (record.privacy === "public") return record.url;
    if (viewer && viewer.shopId === record.shopId) return record.url;
  }
  if (record.privacy === "public" && record.publicKey) {
    return publicObjectUrl(record.publicKey);
  }
  return null;
}

export function publicSafeUrl(record: MediaRecord): string | null {
  if (
    record.privacy === "public" &&
    record.uploadStatus === "complete" &&
    record.url.startsWith("http")
  ) {
    return record.url;
  }
  if (
    record.privacy === "public" &&
    record.uploadStatus === "complete" &&
    record.publicKey
  ) {
    return publicObjectUrl(record.publicKey);
  }
  return null;
}

export function isPrivateDelivery(url: string): boolean {
  return (
    url.includes("X-Amz-Signature") ||
    url.startsWith("media:") ||
    (isPublicObjectKey(url) === false && url.includes("/private/"))
  );
}
