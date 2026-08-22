import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { stableUuid } from "../src/lib/catalog/ids";
import { emptyBoard } from "../src/lib/board/layout";
import { normalizeItem, normalizeShop } from "../src/lib/catalog/normalize";
import type {
  BoardElement,
  BoardSnapshot,
  Item,
  Shop,
  Suggestion,
} from "../src/lib/catalog/types";

const DEFAULT_SHOP_ID = "c0a1d0ce-0000-4000-8000-000000000001";

type JsonCatalog = {
  shop?: Partial<Shop>;
  items?: Array<Partial<Item> & { id: string }>;
  board?: BoardSnapshot;
  suggestions?: Suggestion[];
};

function remapItem(item: Item, shopId: string): Item {
  return normalizeItem(
    {
      ...item,
      id: stableUuid(item.id),
      shopId,
      variants: item.variants.map((variant) => ({
        ...variant,
        id: stableUuid(variant.id),
      })),
      published: item.published === true,
      publishedAt: item.published ? item.publishedAt ?? item.updatedAt : null,
    },
    [],
  );
}

function remapBoard(board: BoardSnapshot | undefined): BoardSnapshot {
  const source = board ?? emptyBoard();
  return {
    camera: source.camera,
    elements: source.elements.map((element: BoardElement) => ({
      ...element,
      id: stableUuid(element.id),
      productId: element.productId ? stableUuid(element.productId) : undefined,
      sectionId: element.sectionId ? stableUuid(element.sectionId) : undefined,
    })),
  };
}

async function writeProduct(
  client: ReturnType<typeof createClient>,
  shopId: string,
  item: Item,
) {
  const { error } = await client.from("products").upsert(
    {
      id: item.id,
      shop_id: shopId,
      code: item.code,
      title: item.title,
      notes: item.notes,
      description: item.description,
      retail_price: item.price,
      wholesale_price: item.wholesalePrice,
      min_wholesale_qty: item.minWholesaleQty,
      sizes: item.sizes,
      quantity: item.quantity,
      material: item.material,
      origin: item.origin,
      category: item.category,
      subcategory: item.subcategory,
      condition: item.condition,
      status: item.status,
      tags: item.tags,
      collections: item.collections,
      published: item.published,
      published_at: item.published ? item.publishedAt : null,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    },
    { onConflict: "id" },
  );
  if (error) throw error;

  await client.from("media").delete().eq("product_id", item.id);
  await client.from("product_variants").delete().eq("product_id", item.id);

  const variants =
    item.variants.length > 0
      ? item.variants
      : [
          {
            id: stableUuid(`${item.id}-v1`),
            color: null,
            photos: item.photos,
            videos: item.videos,
          },
        ];

  const { error: variantError } = await client.from("product_variants").upsert(
    variants.map((variant, index) => ({
      id: variant.id,
      shop_id: shopId,
      product_id: item.id,
      color: variant.color,
      sort_order: index,
    })),
    { onConflict: "id" },
  );
  if (variantError) throw variantError;

  const media = variants.flatMap((variant) => [
    ...variant.photos.map((url, index) => ({
      shop_id: shopId,
      product_id: item.id,
      variant_id: variant.id,
      kind: "image" as const,
      url,
      sort_order: index,
    })),
    ...variant.videos.map((url, index) => ({
      shop_id: shopId,
      product_id: item.id,
      variant_id: variant.id,
      kind: "video" as const,
      url,
      sort_order: index,
    })),
  ]);
  if (media.length) {
    const { error: mediaError } = await client.from("media").insert(media);
    if (mediaError) throw mediaError;
  }
}

async function main() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!url || !serviceKey || !ownerEmail) {
    throw new Error(
      "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, and OWNER_EMAIL",
    );
  }

  const shopId = process.env.SHOP_ID?.trim() || DEFAULT_SHOP_ID;
  const jsonPath =
    process.env.CATALOG_JSON_PATH?.trim() ||
    path.join(process.cwd(), "data", "catalog.json");

  const raw = JSON.parse(await readFile(jsonPath, "utf8")) as JsonCatalog;
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: users, error: usersError } =
    await client.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) throw usersError;
  const owner = users.users.find(
    (user) => user.email?.toLowerCase() === ownerEmail,
  );
  if (!owner) {
    throw new Error(
      `No Auth user for ${ownerEmail}. Create the owner in the Supabase dashboard first.`,
    );
  }

  const shop = normalizeShop({
    ...raw.shop,
    id: shopId,
    slug: process.env.PUBLIC_SHOP_SLUG?.trim() || "dordoi",
  });

  const { error: shopError } = await client.from("shops").upsert(
    {
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      tagline: shop.tagline,
      location: shop.location,
      whatsapp: shop.whatsapp,
      currency: shop.currency,
      currency_symbol: shop.currencySymbol,
      logo_url: shop.logoUrl,
      cover_url: shop.coverUrl,
    },
    { onConflict: "id" },
  );
  if (shopError) throw shopError;

  const { error: profileError } = await client.from("profiles").upsert(
    {
      id: owner.id,
      shop_id: shop.id,
      role: "owner",
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const items = (raw.items ?? []).map((item) =>
    remapItem(normalizeItem(item, []), shop.id),
  );
  for (const item of items) {
    await writeProduct(client, shop.id, item);
  }

  const board = remapBoard(raw.board);
  const { data: existingBoard } = await client
    .from("board_documents")
    .select("id")
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (existingBoard?.id) {
    const { error } = await client
      .from("board_documents")
      .update({ camera: board.camera, elements: board.elements })
      .eq("id", existingBoard.id);
    if (error) throw error;
  } else {
    const { error } = await client.from("board_documents").insert({
      shop_id: shop.id,
      camera: board.camera,
      elements: board.elements,
    });
    if (error) throw error;
  }

  await client.from("ai_suggestions").delete().eq("shop_id", shop.id);
  const suggestions = (raw.suggestions ?? []).map((suggestion) => ({
    id: stableUuid(suggestion.id),
    shop_id: shop.id,
    kind: suggestion.kind,
    text: suggestion.text,
    product_ids: (suggestion.productIds ?? []).map((id) => stableUuid(id)),
    element_ids: suggestion.elementIds ?? [],
  }));
  if (suggestions.length) {
    const { error } = await client.from("ai_suggestions").insert(suggestions);
    if (error) throw error;
  }

  console.log(
    `Migrated ${items.length} products for ${ownerEmail} into shop ${shop.slug}. JSON file left in place: ${jsonPath}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
