export type ShopExtras = {
  instagram?: string;
  telegram?: string;
  categories?: string[];
  logoUrl?: string;
  coverUrl?: string;
  /** Map of category key/label → public image URL for home circles. */
  categoryPhotos?: Record<string, string>;
};

/** Packed into shops.tagline when DB columns for contacts/branding are missing. */
export const SHOP_EXTRAS_MARK = "\n@@VELVIERA_EXTRAS@@";

function parseCategoryPhotos(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, url] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key === "string" && key.trim() && typeof url === "string" && url.trim()) {
      out[key.trim()] = url.trim();
    }
  }
  return out;
}

export function splitShopTagline(raw: string): {
  tagline: string;
  extras: ShopExtras;
} {
  const idx = raw.indexOf(SHOP_EXTRAS_MARK);
  if (idx === -1) return { tagline: raw, extras: {} };
  const tagline = raw.slice(0, idx);
  try {
    const parsed = JSON.parse(raw.slice(idx + SHOP_EXTRAS_MARK.length)) as ShopExtras;
    return {
      tagline,
      extras: {
        instagram: typeof parsed.instagram === "string" ? parsed.instagram : "",
        telegram: typeof parsed.telegram === "string" ? parsed.telegram : "",
        categories: Array.isArray(parsed.categories)
          ? parsed.categories.filter((value): value is string => typeof value === "string")
          : undefined,
        logoUrl: typeof parsed.logoUrl === "string" ? parsed.logoUrl : "",
        coverUrl: typeof parsed.coverUrl === "string" ? parsed.coverUrl : "",
        categoryPhotos: parseCategoryPhotos(parsed.categoryPhotos),
      },
    };
  } catch {
    return { tagline, extras: {} };
  }
}

export function joinShopTagline(tagline: string, extras: ShopExtras): string {
  const categoryPhotos = parseCategoryPhotos(extras.categoryPhotos) ?? {};
  const payload = {
    instagram: (extras.instagram ?? "").trim(),
    telegram: (extras.telegram ?? "").trim(),
    categories: extras.categories ?? [],
    logoUrl: (extras.logoUrl ?? "").trim(),
    coverUrl: (extras.coverUrl ?? "").trim(),
    categoryPhotos,
  };
  const has =
    Boolean(payload.instagram) ||
    Boolean(payload.telegram) ||
    Boolean(payload.logoUrl) ||
    Boolean(payload.coverUrl) ||
    payload.categories.length > 0 ||
    Object.keys(payload.categoryPhotos).length > 0;
  if (!has) return tagline;
  return `${tagline}${SHOP_EXTRAS_MARK}${JSON.stringify(payload)}`;
}
