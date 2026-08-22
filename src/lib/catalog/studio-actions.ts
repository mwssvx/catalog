import { missingFields } from "@/lib/catalog/normalize";
import type { Item, ItemInput, Status } from "@/lib/catalog/types";

export type StudioPublicationFilter = "all" | "draft" | "published";

export type StudioSort =
  | "updated"
  | "price_asc"
  | "price_desc"
  | "code"
  | "no_photo";

export type StudioListFilters = {
  publication: StudioPublicationFilter;
  missing: boolean;
  status: Status | "all";
  q?: string;
  sort?: StudioSort;
};

export type BulkItemPatch = {
  published?: boolean;
  status?: Status;
  pricePercent?: number;
  priceDelta?: number;
};

export type WeekStudioStats = {
  publishedThisWeek: number;
  soldThisWeek: number;
  draftsThisWeek: number;
  inStock: number;
  published: number;
  drafts: number;
  sold: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function matchesStudioFilters(item: Item, filters: StudioListFilters): boolean {
  if (filters.publication === "draft" && item.published) return false;
  if (filters.publication === "published" && !item.published) return false;
  if (filters.missing && missingFields(item).length === 0) return false;
  if (filters.status !== "all" && item.status !== filters.status) return false;
  if (filters.q) {
    const query = filters.q.trim().toLowerCase();
    if (!query) return true;
    const haystack = [item.title, item.code, item.notes, item.description]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

export function sortStudioItems(items: Item[], sort: StudioSort = "updated"): Item[] {
  const next = [...items];
  next.sort((a, b) => {
    switch (sort) {
      case "price_asc": {
        const ap = a.price ?? Number.POSITIVE_INFINITY;
        const bp = b.price ?? Number.POSITIVE_INFINITY;
        if (ap !== bp) return ap - bp;
        return a.code.localeCompare(b.code, "ru");
      }
      case "price_desc": {
        const ap = a.price ?? Number.NEGATIVE_INFINITY;
        const bp = b.price ?? Number.NEGATIVE_INFINITY;
        if (ap !== bp) return bp - ap;
        return a.code.localeCompare(b.code, "ru");
      }
      case "code":
        return a.code.localeCompare(b.code, "ru", { numeric: true });
      case "no_photo": {
        const aEmpty = a.photos.length === 0 ? 0 : 1;
        const bEmpty = b.photos.length === 0 ? 0 : 1;
        if (aEmpty !== bEmpty) return aEmpty - bEmpty;
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      case "updated":
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });
  return next;
}

export function filterStudioItems(items: Item[], filters: StudioListFilters): Item[] {
  const filtered = items.filter((item) => matchesStudioFilters(item, filters));
  return sortStudioItems(filtered, filters.sort ?? "updated");
}

export function weekStudioStats(
  items: Item[],
  nowMs: number = Date.now(),
): WeekStudioStats {
  const weekAgo = nowMs - WEEK_MS;
  const inWeek = (iso: string | null | undefined) =>
    Boolean(iso && Date.parse(iso) >= weekAgo);

  return {
    publishedThisWeek: items.filter(
      (item) => item.published && inWeek(item.publishedAt ?? item.updatedAt),
    ).length,
    soldThisWeek: items.filter(
      (item) => item.status === "sold" && inWeek(item.updatedAt),
    ).length,
    draftsThisWeek: items.filter(
      (item) => !item.published && inWeek(item.createdAt),
    ).length,
    inStock: items.filter((item) => item.status === "in_stock").length,
    published: items.filter((item) => item.published).length,
    drafts: items.filter((item) => !item.published).length,
    sold: items.filter((item) => item.status === "sold").length,
  };
}

export function adjustItemPrice(
  price: number | null,
  patch: Pick<BulkItemPatch, "pricePercent" | "priceDelta">,
): number | null {
  if (price == null) return null;
  let next = price;
  if (patch.pricePercent != null) {
    next = Math.round(next * (1 + patch.pricePercent / 100));
  }
  if (patch.priceDelta != null) {
    next = Math.round(next + patch.priceDelta);
  }
  return Math.max(0, next);
}

export function applyBulkPatch(items: Item[], ids: string[], patch: BulkItemPatch): Item[] {
  const selected = new Set(ids);
  const now = new Date().toISOString();
  return items.map((item) => {
    if (!selected.has(item.id)) return item;
    const published = patch.published ?? item.published;
    const price =
      patch.pricePercent != null || patch.priceDelta != null
        ? adjustItemPrice(item.price, patch)
        : item.price;
    return {
      ...item,
      published,
      publishedAt: published ? item.publishedAt ?? now : null,
      status: patch.status ?? item.status,
      price,
      updatedAt: now,
    };
  });
}

/** Build create payload for cloning a product (new id/code assigned by normalize). */
export function itemInputFromClone(item: Item): ItemInput {
  return {
    title: item.title,
    notes: item.notes,
    description: item.description,
    price: item.price,
    wholesalePrice: item.wholesalePrice,
    minWholesaleQty: item.minWholesaleQty,
    sizes: [...item.sizes],
    quantity: item.quantity,
    material: item.material,
    origin: item.origin,
    category: item.category,
    subcategory: item.subcategory,
    condition: item.condition,
    status: item.status === "sold" ? "in_stock" : item.status,
    tags: [...item.tags],
    collections: [...item.collections],
    published: false,
    photos: [...item.photos],
    videos: [...item.videos],
    variants: item.variants.map((variant) => ({
      id: crypto.randomUUID(),
      color: variant.color,
      photos: [...variant.photos],
      videos: [...variant.videos],
    })),
  };
}

export function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
