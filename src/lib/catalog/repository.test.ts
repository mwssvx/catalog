import { describe, expect, it } from "vitest";
import { MemoryCatalog } from "@/lib/catalog/memory-repository";
import { itemInputSchema, loginSchema } from "@/lib/catalog/schemas";
import type { Item } from "@/lib/catalog/types";

const shopA = {
  id: "shop-a",
  slug: "dordoi",
  name: "Dordoi",
  tagline: "",
  location: "Бишкек",
  whatsapp: "996700000000",
  currency: "KGS",
  currencySymbol: "сом",
  logoUrl: "",
  coverUrl: "",
  instagram: "",
  telegram: "",
  categories: ["tops", "bottoms", "outerwear", "dresses", "shoes", "accessories"],
};

const shopB = { ...shopA, id: "shop-b", slug: "other", name: "Other" };

function seed() {
  const db = new MemoryCatalog();
  db.addShop(shopA);
  db.addShop(shopB);
  db.addOwner({ userId: "user-a", shopId: "shop-a", email: "a@example.com" });
  db.addOwner({ userId: "user-b", shopId: "shop-b", email: "b@example.com" });
  const draft: Item = {
    id: "draft-1",
    shopId: "shop-a",
    code: "T101",
    title: "Черновик",
    notes: "",
    description: "",
    price: 1000,
    wholesalePrice: null,
    minWholesaleQty: null,
    sizes: ["M"],
    quantity: 1,
    material: "хлопок",
    origin: null,
    category: "tops",
    subcategory: null,
    condition: "new",
    status: "in_stock",
    tags: [],
    collections: [],
    published: false,
    publishedAt: null,
    photos: ["https://example.com/draft.jpg"],
    videos: [],
    variants: [
      {
        id: "draft-1-v1",
        color: null,
        photos: ["https://example.com/draft.jpg"],
        videos: [],
      },
    ],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
  const live = {
    ...draft,
    id: "live-1",
    code: "T102",
    title: "В каталоге",
    published: true,
    publishedAt: "2026-08-01T00:00:00.000Z",
    photos: ["https://example.com/live.jpg"],
    variants: [
      {
        id: "live-1-v1",
        color: null,
        photos: ["https://example.com/live.jpg"],
        videos: [],
      },
    ],
  };
  db.addItem(draft);
  db.addItem(live);
  return db;
}

describe("owner authentication", () => {
  it("does not treat a logged-in user without a shop profile as an owner", () => {
    const db = seed();
    expect(db.viewerFor("stranger")).toBeNull();
    expect(db.viewerFor(null)).toBeNull();
    expect(db.viewerFor("user-a")?.shopId).toBe("shop-a");
  });
});

describe("anonymous access", () => {
  it("lists only published products", async () => {
    const db = seed();
    const items = await db.listItems(null);
    expect(items.map((item) => item.id)).toEqual(["live-1"]);
  });

  it("returns public shop fields", async () => {
    const db = seed();
    const shop = await db.getPublicShop("dordoi");
    expect(shop).toMatchObject({
      name: "Dordoi",
      whatsapp: "996700000000",
      currencySymbol: "сом",
    });
  });
});

describe("unpublished-product privacy", () => {
  it("hides drafts from anonymous getItem and lists", async () => {
    const db = seed();
    expect(await db.getItem(null, "draft-1")).toBeNull();
    expect(await db.getItem(null, "T101")).toBeNull();
    expect(await db.getItem(null, "live-1")).not.toBeNull();
  });

  it("lets the owner read their draft", async () => {
    const db = seed();
    const owner = db.viewerFor("user-a");
    expect(owner).not.toBeNull();
    expect((await db.getItem(owner, "draft-1"))?.title).toBe("Черновик");
  });
});

describe("cross-shop isolation", () => {
  it("keeps another owner from loading or editing this shop’s products", async () => {
    const db = seed();
    const other = db.viewerFor("user-b");
    expect(other).not.toBeNull();
    expect(await db.getItem(other, "draft-1")).toBeNull();
    expect(await db.updateItem(other!, "live-1", { title: "Stolen" })).toBeNull();
    expect(await db.deleteItem(other!, "live-1")).toBe(false);
    const listed = await db.listItems(other, { status: "all" });
    expect(listed).toEqual([]);
  });
});

describe("product CRUD", () => {
  it("creates, updates, and deletes for the owner", async () => {
    const db = seed();
    const owner = db.viewerFor("user-a")!;
    const created = await db.createItem(owner, {
      title: "Новая куртка",
      price: 3000,
      sizes: ["L"],
      published: false,
    });
    expect(created.shopId).toBe("shop-a");
    expect(created.published).toBe(false);
    expect(created.code).toMatch(/^P\d+/);

    const updated = await db.updateItem(owner, created.id, {
      published: true,
      title: "Куртка",
    });
    expect(updated?.published).toBe(true);
    expect(updated?.title).toBe("Куртка");

    expect(await db.deleteItem(owner, created.id)).toBe(true);
    expect(await db.getItem(owner, created.id)).toBeNull();
  });
});

describe("invalid input", () => {
  it("rejects login payloads without an email", () => {
    const result = loginSchema.safeParse({ password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown product fields and bad prices", () => {
    expect(itemInputSchema.safeParse({ price: -1 }).success).toBe(false);
    expect(itemInputSchema.safeParse({ title: "ok", extra: true }).success).toBe(
      false,
    );
    expect(itemInputSchema.safeParse({ title: "ok", price: 10 }).success).toBe(
      true,
    );
  });
});
