export type Viewer = {
  userId: string;
  shopId: string;
  email: string;
};

export type PublicShop = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  location: string;
  whatsapp: string;
  instagram: string;
  telegram: string;
  currency: string;
  currencySymbol: string;
  logoUrl: string;
  coverUrl: string;
  categories: string[];
};

export function isOwnerOf(viewer: Viewer | null, shopId: string): boolean {
  return Boolean(viewer && viewer.shopId === shopId);
}

export function isPublicProduct(product: {
  published: boolean;
  status: string;
}): boolean {
  return product.published === true && product.status !== "hidden";
}

export function canReadProduct(
  viewer: Viewer | null,
  product: { shopId: string; published: boolean; status: string },
): boolean {
  if (isOwnerOf(viewer, product.shopId)) return true;
  return isPublicProduct(product);
}

export function canWriteShop(viewer: Viewer | null, shopId: string): boolean {
  return isOwnerOf(viewer, shopId);
}

export function publicShopFields(shop: PublicShop): PublicShop {
  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    tagline: shop.tagline,
    location: shop.location,
    whatsapp: shop.whatsapp,
    instagram: shop.instagram ?? "",
    telegram: shop.telegram ?? "",
    currency: shop.currency,
    currencySymbol: shop.currencySymbol,
    logoUrl: shop.logoUrl ?? "",
    coverUrl: shop.coverUrl ?? "",
    categories: shop.categories?.length
      ? shop.categories
      : ["tops", "bottoms", "outerwear", "dresses", "shoes", "accessories"],
  };
}
