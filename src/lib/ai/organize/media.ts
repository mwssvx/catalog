import type { DesignDescriptors, MediaDescriptor } from "@/lib/ai/types";
import type { BoardElement } from "@/lib/catalog/types";

export function emptyDescriptors(
  partial?: Partial<DesignDescriptors>,
): DesignDescriptors {
  return {
    clothingType: null,
    silhouette: null,
    cut: null,
    collar: null,
    sleeves: null,
    buttons: null,
    pockets: null,
    stitching: null,
    pattern: null,
    logo: null,
    visibleColor: null,
    category: null,
    isClothing: true,
    isPersonalOrUnrelated: false,
    confidence: 0.5,
    notes: "",
    visibleText: [],
    ...partial,
  };
}

/** Deterministic fingerprint for exact-duplicate detection without binary hashing. */
export function mediaFingerprint(url: string, mediaId?: string): string {
  if (mediaId) return `id:${mediaId}`;
  try {
    const parsed = new URL(url);
    return `path:${parsed.pathname}`;
  } catch {
    return `url:${url}`;
  }
}

export function detectDuplicates(
  descriptors: MediaDescriptor[],
): MediaDescriptor[] {
  const byExact = new Map<string, string>();
  return descriptors.map((entry) => {
    const key = mediaFingerprint(entry.mediaUrl, entry.mediaId);
    const first = byExact.get(key);
    if (first && first !== entry.elementId) {
      return { ...entry, duplicateOf: first };
    }
    byExact.set(key, entry.elementId);
    return entry;
  });
}

/**
 * Near-duplicate heuristic: same visible color + clothing type + silhouette
 * with overlapping pattern/logo signals. Prefer separate over unsafe merges.
 */
export function markNearDuplicates(
  descriptors: MediaDescriptor[],
): MediaDescriptor[] {
  return descriptors.map((entry) => {
    if (entry.duplicateOf || entry.descriptors.isPersonalOrUnrelated) {
      return entry;
    }
    const near: string[] = [];
    for (const other of descriptors) {
      if (other.elementId === entry.elementId) continue;
      if (other.duplicateOf) continue;
      if (!other.descriptors.isClothing || !entry.descriptors.isClothing) continue;
      const sameType =
        entry.descriptors.clothingType &&
        entry.descriptors.clothingType === other.descriptors.clothingType;
      const sameSilhouette =
        entry.descriptors.silhouette &&
        entry.descriptors.silhouette === other.descriptors.silhouette;
      const sameCut =
        entry.descriptors.cut && entry.descriptors.cut === other.descriptors.cut;
      const sameColor =
        entry.descriptors.visibleColor &&
        entry.descriptors.visibleColor === other.descriptors.visibleColor;
      if (sameType && sameSilhouette && sameCut && sameColor) {
        near.push(other.elementId);
      }
    }
    return near.length ? { ...entry, nearDuplicateOf: near } : entry;
  });
}

export function elementToDescriptorSeed(element: BoardElement): MediaDescriptor | null {
  if (element.type !== "media" || !element.mediaUrl) return null;
  return {
    elementId: element.id,
    mediaUrl: element.mediaUrl,
    mediaKind: element.mediaKind === "video" ? "video" : "image",
    mediaId: element.mediaId,
    frameUrls:
      element.mediaKind === "video"
        ? [] // Videos use poster/preview when available; frame extraction is optional.
        : [element.mediaUrl],
    descriptors: emptyDescriptors(),
  };
}
