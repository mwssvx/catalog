import { flattenMedia, nextProductCode } from "@/lib/catalog/codes";
import {
  DEFAULT_SHOP_CATEGORIES,
  type Item,
  type ItemInput,
  type Shop,
  type ShopInput,
} from "@/lib/catalog/types";

function cleanCategories(list: string[] | undefined): string[] {
  const cleaned = (list ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 40);
  return cleaned.length > 0 ? [...new Set(cleaned)] : [...DEFAULT_SHOP_CATEGORIES];
}

function cleanCategoryPhotos(
  photos: Record<string, string> | undefined,
  categories: string[],
): Record<string, string> {
  const allowed = new Set(categories);
  const out: Record<string, string> = {};
  for (const [key, url] of Object.entries(photos ?? {})) {
    const trimmedKey = key.trim();
    const trimmedUrl = url.trim();
    if (!trimmedKey || !trimmedUrl || !allowed.has(trimmedKey)) continue;
    out[trimmedKey] = trimmedUrl.slice(0, 2000);
  }
  return out;
}

export function emptyShop(): Shop {
  return {
    id: "",
    slug: "velviera",
    name: "Velviera",
    tagline: "",
    location: "Бишкек",
    whatsapp: process.env.SHOP_WHATSAPP || "",
    instagram: "",
    telegram: "",
    currency: "KGS",
    currencySymbol: "сом",
    logoUrl: "",
    coverUrl: "",
    categories: [...DEFAULT_SHOP_CATEGORIES],
    categoryPhotos: {},
  };
}

export function normalizeShop(shop: Partial<Shop> | undefined): Shop {
  const base = emptyShop();
  const categories = cleanCategories(shop?.categories);
  return {
    id: shop?.id || base.id,
    slug: shop?.slug || base.slug,
    name: shop?.name || base.name,
    tagline: shop?.tagline ?? "",
    location: shop?.location || base.location,
    whatsapp: shop?.whatsapp || process.env.SHOP_WHATSAPP || "",
    instagram: shop?.instagram ?? "",
    telegram: shop?.telegram ?? "",
    currency: shop?.currency || base.currency,
    currencySymbol: shop?.currencySymbol || base.currencySymbol,
    logoUrl: shop?.logoUrl ?? "",
    coverUrl: shop?.coverUrl ?? "",
    categories,
    categoryPhotos: cleanCategoryPhotos(shop?.categoryPhotos, categories),
  };
}

export function applyShopInput(current: Shop, input: ShopInput): Shop {
  const categories =
    input.categories === undefined
      ? current.categories
      : cleanCategories(input.categories);
  const categoryPhotos =
    input.categoryPhotos === undefined
      ? cleanCategoryPhotos(current.categoryPhotos, categories)
      : cleanCategoryPhotos(input.categoryPhotos, categories);
  return normalizeShop({
    ...current,
    name: input.name?.trim() || current.name,
    tagline: input.tagline === undefined ? current.tagline : input.tagline.trim(),
    location:
      input.location === undefined ? current.location : input.location.trim(),
    whatsapp:
      input.whatsapp === undefined
        ? current.whatsapp
        : input.whatsapp.replace(/\D/g, ""),
    instagram:
      input.instagram === undefined
        ? current.instagram
        : input.instagram.trim().replace(/^@/, ""),
    telegram:
      input.telegram === undefined
        ? current.telegram
        : input.telegram.trim().replace(/^@/, ""),
    currency: input.currency?.trim() || current.currency,
    currencySymbol: input.currencySymbol?.trim() || current.currencySymbol,
    logoUrl: input.logoUrl === undefined ? current.logoUrl : input.logoUrl,
    coverUrl: input.coverUrl === undefined ? current.coverUrl : input.coverUrl,
    categories,
    categoryPhotos,
  });
}

export function normalizeItem(
  raw: Partial<Item> & { id: string; title?: string },
  siblings: Item[] = [],
): Item {
  const photos = raw.photos ?? [];
  const videos = raw.videos ?? [];
  const variants =
    raw.variants && raw.variants.length > 0
      ? raw.variants
      : [
          {
            id: `${raw.id}-v1`,
            color: null,
            photos,
            videos,
          },
        ];
  const now = new Date().toISOString();
  const published = raw.published === true;
  const item: Item = {
    id: raw.id,
    shopId: raw.shopId,
    code: raw.code || nextProductCode(siblings, raw.category ?? null),
    title: raw.title?.trim() || "Untitled",
    notes: raw.notes ?? "",
    description: raw.description ?? "",
    price: raw.price ?? null,
    wholesalePrice: raw.wholesalePrice ?? null,
    minWholesaleQty: raw.minWholesaleQty ?? null,
    sizes: raw.sizes ?? [],
    quantity: raw.quantity ?? null,
    material: raw.material ?? null,
    origin: raw.origin ?? null,
    category: raw.category ?? null,
    subcategory: raw.subcategory ?? null,
    condition: raw.condition ?? null,
    status: raw.status ?? "in_stock",
    tags: raw.tags ?? [],
    collections: raw.collections ?? [],
    published,
    publishedAt: raw.publishedAt ?? (published ? now : null),
    photos,
    videos,
    variants,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
  const media = flattenMedia(item);
  item.photos = media.photos;
  item.videos = media.videos;
  return item;
}

export function applyItemInput(
  current: Item,
  input: ItemInput,
  siblings: Item[],
): Item {
  const published = input.published ?? current.published;
  const next: Item = {
    ...current,
    title: input.title?.trim() || current.title,
    notes: input.notes ?? current.notes,
    description:
      input.description === undefined ? current.description : input.description,
    price: input.price === undefined ? current.price : input.price,
    wholesalePrice:
      input.wholesalePrice === undefined
        ? current.wholesalePrice
        : input.wholesalePrice,
    minWholesaleQty:
      input.minWholesaleQty === undefined
        ? current.minWholesaleQty
        : input.minWholesaleQty,
    sizes: input.sizes ?? current.sizes,
    quantity: input.quantity === undefined ? current.quantity : input.quantity,
    material:
      input.material === undefined
        ? current.material
        : input.material?.trim() || null,
    origin: input.origin === undefined ? current.origin : input.origin,
    category: input.category === undefined ? current.category : input.category,
    subcategory:
      input.subcategory === undefined ? current.subcategory : input.subcategory,
    condition:
      input.condition === undefined ? current.condition : input.condition,
    status: input.status ?? current.status,
    tags: input.tags ?? current.tags,
    collections: input.collections ?? current.collections,
    published,
    publishedAt: published
      ? current.publishedAt ?? new Date().toISOString()
      : null,
    photos: input.photos ?? current.photos,
    videos: input.videos ?? current.videos,
    variants: input.variants ?? current.variants,
    updatedAt: new Date().toISOString(),
  };
  if (!next.code) next.code = nextProductCode(siblings, next.category);
  const media = flattenMedia(next);
  next.photos = media.photos;
  next.videos = media.videos;
  return next;
}

export function missingFields(item: Item): string[] {
  const missing: string[] = [];
  if (item.price == null) missing.push("price");
  if (item.sizes.length === 0) missing.push("sizes");
  if (!item.material) missing.push("material");
  if (item.photos.length === 0) missing.push("photo");
  return missing;
}

export function matchesFilters(
  item: Item,
  filters: {
    status?: string;
    category?: string;
    size?: string;
    published?: boolean;
    missing?: boolean;
    q?: string;
    collection?: string;
  },
): boolean {
  if (item.status === "hidden" && filters.status !== "all") return false;
  if (filters.published === true && !item.published) return false;
  if (filters.published === false && item.published) return false;
  if (filters.missing && missingFields(item).length === 0) return false;

  if (filters.status === "available") {
    if (item.status !== "in_stock" && item.status !== "reserved") return false;
  } else if (
    filters.status &&
    filters.status !== "all" &&
    item.status !== filters.status
  ) {
    return false;
  }

  if (
    filters.category &&
    filters.category !== "all" &&
    item.category !== filters.category
  ) {
    return false;
  }

  if (
    filters.size &&
    filters.size !== "all" &&
    !item.sizes.includes(filters.size)
  ) {
    return false;
  }

  if (filters.collection && !item.collections.includes(filters.collection)) {
    return false;
  }

  if (filters.q) {
    const query = filters.q.trim().toLowerCase();
    const haystack = [
      item.title,
      item.code,
      item.notes,
      item.description,
      item.material,
      item.tags.join(" "),
      item.collections.join(" "),
      ...item.variants.map((variant) => variant.color ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  return true;
}
