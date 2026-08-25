import type { Hono } from "hono";
import { requireOwner } from "@/lib/auth";
import { getShop, updateShop } from "@/lib/catalog/store";
import { shopUpdateSchema } from "@/lib/catalog/schemas";
import { jsonError, readJson } from "@/lib/http/respond";

function publicShopPayload(shop: Awaited<ReturnType<typeof getShop>>) {
  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    tagline: shop.tagline,
    location: shop.location,
    whatsapp: shop.whatsapp,
    instagram: shop.instagram,
    telegram: shop.telegram,
    currency: shop.currency,
    currencySymbol: shop.currencySymbol,
    logoUrl: shop.logoUrl,
    coverUrl: shop.coverUrl,
    categories: shop.categories,
  };
}

export function registerShopRoutes(app: Hono) {
  app.get("/api/v1/shop", async (c) => {
    try {
      const shop = await getShop();
      return Response.json({ shop: publicShopPayload(shop) });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.patch("/api/v1/shop", async (c) => {
    try {
      await requireOwner();
      const input = shopUpdateSchema.parse(await readJson(c.req.raw));
      const shop = await updateShop(input);
      return Response.json({ shop: publicShopPayload(shop) });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.put("/api/v1/shop", async (c) => {
    try {
      await requireOwner();
      const input = shopUpdateSchema.parse(await readJson(c.req.raw));
      const shop = await updateShop(input);
      return Response.json({ shop: publicShopPayload(shop) });
    } catch (error) {
      return jsonError(error);
    }
  });
}
