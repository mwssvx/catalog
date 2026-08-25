export type ShopExtras = {
  instagram?: string;
  telegram?: string;
  categories?: string[];
  logoUrl?: string;
  coverUrl?: string;
};

/** Packed into shops.tagline when DB columns for contacts/branding are missing. */
export const SHOP_EXTRAS_MARK = "\n@@VELVIERA_EXTRAS@@";

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
      },
    };
  } catch {
    return { tagline, extras: {} };
  }
}

export function joinShopTagline(tagline: string, extras: ShopExtras): string {
  const payload: Required<ShopExtras> = {
    instagram: (extras.instagram ?? "").trim(),
    telegram: (extras.telegram ?? "").trim(),
    categories: extras.categories ?? [],
    logoUrl: (extras.logoUrl ?? "").trim(),
    coverUrl: (extras.coverUrl ?? "").trim(),
  };
  const has =
    Boolean(payload.instagram) ||
    Boolean(payload.telegram) ||
    Boolean(payload.logoUrl) ||
    Boolean(payload.coverUrl) ||
    payload.categories.length > 0;
  if (!has) return tagline;
  return `${tagline}${SHOP_EXTRAS_MARK}${JSON.stringify(payload)}`;
}
