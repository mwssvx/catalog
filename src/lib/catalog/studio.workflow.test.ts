import { describe, expect, it } from "vitest";
import { MemoryCatalog } from "@/lib/catalog/memory-repository";
import { missingFields } from "@/lib/catalog/normalize";
import { shouldConfirmDestructive } from "@/lib/catalog/confirm";
import {
  applyBulkPatch,
  filterStudioItems,
} from "@/lib/catalog/studio-actions";
import { bulkItemsSchema, shopUpdateSchema } from "@/lib/catalog/schemas";
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
  categoryPhotos: {},
};

function baseItem(over: Partial<Item> & { id: string }): Item {
  return {
    shopId: "shop-a",
    code: "T100",
    title: "Рубашка",
    notes: "",
    description: "",
    price: 1500,
    wholesalePrice: 1200,
    minWholesaleQty: 3,
    sizes: ["M"],
    quantity: 2,
    material: "хлопок",
    origin: "Кыргызстан",
    category: "tops",
    subcategory: "рубашки",
    condition: "new",
    status: "in_stock",
    tags: ["лето"],
    collections: ["новинки"],
    published: false,
    publishedAt: null,
    photos: ["media:photo-1"],
    videos: [],
    variants: [
      {
        id: `${over.id}-red`,
        color: "красный",
        photos: ["media:photo-1"],
        videos: [],
      },
    ],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...over,
  };
}

function seed() {
  const db = new MemoryCatalog();
  db.addShop(shopA);
  db.addShop({ ...shopA, id: "shop-b", slug: "other", name: "Other" });
  db.addOwner({ userId: "user-a", shopId: "shop-a", email: "a@example.com" });
  db.addOwner({ userId: "user-b", shopId: "shop-b", email: "b@example.com" });
  db.addItem(baseItem({ id: "p1", published: false }));
  db.addItem(
    baseItem({
      id: "p2",
      code: "T102",
      title: "В каталоге",
      published: true,
      publishedAt: "2026-08-01T00:00:00.000Z",
    }),
  );
  return db;
}

describe("product creation and color variants", () => {
  it("creates one product with two colors, not two public products", async () => {
    const db = seed();
    const owner = db.viewerFor("user-a")!;
    const created = await db.createItem(owner, {
      title: "Платье",
      published: false,
      variants: [
        { id: "v-red", color: "красный", photos: ["media:a"], videos: [] },
        { id: "v-blue", color: "синий", photos: ["media:b"], videos: [] },
      ],
    });
    expect(created.variants).toHaveLength(2);
    expect(created.variants.map((variant) => variant.color)).toEqual([
      "красный",
      "синий",
    ]);
    expect(created.photos).toEqual(["media:a", "media:b"]);
    const listed = await db.listItems(null);
    expect(listed.find((item) => item.id === created.id)).toBeUndefined();
  });
});

describe("publication and bulk actions", () => {
  it("publishes and unpublishes in bulk for the owner only", async () => {
    const db = seed();
    const owner = db.viewerFor("user-a")!;
    const other = db.viewerFor("user-b")!;
    const published = await db.bulkUpdateItems(owner, ["p1"], { published: true });
    expect(published[0]?.published).toBe(true);
    expect(await db.getItem(null, "p1")).not.toBeNull();

    const blocked = await db.bulkUpdateItems(other, ["p1"], { status: "sold" });
    expect(blocked).toEqual([]);
    expect((await db.getItem(owner, "p1"))?.status).toBe("in_stock");

    await db.bulkUpdateItems(owner, ["p1"], { published: false, status: "reserved" });
    expect(await db.getItem(null, "p1")).toBeNull();
    expect((await db.getItem(owner, "p1"))?.status).toBe("reserved");
  });

  it("applies list filters for drafts, published, and missing info", () => {
    const complete = baseItem({ id: "ok", published: true });
    const draft = baseItem({
      id: "draft",
      published: false,
      price: null,
      photos: [],
      variants: [{ id: "x", color: "черный", photos: [], videos: [] }],
    });
    expect(missingFields(draft)).toContain("price");
    expect(missingFields(draft)).toContain("photo");
    const items = [complete, draft];
    expect(filterStudioItems(items, { publication: "draft", missing: false, status: "all" }).map((item) => item.id)).toEqual(["draft"]);
    expect(filterStudioItems(items, { publication: "published", missing: false, status: "all" }).map((item) => item.id)).toEqual(["ok"]);
    expect(filterStudioItems(items, { publication: "all", missing: true, status: "all" }).map((item) => item.id)).toEqual(["draft"]);
    const patched = applyBulkPatch(items, ["draft"], { published: true, status: "sold" });
    expect(patched.find((item) => item.id === "draft")?.published).toBe(true);
    expect(patched.find((item) => item.id === "draft")?.status).toBe("sold");
    expect(patched.find((item) => item.id === "ok")?.status).toBe("in_stock");
  });
});

describe("permissions and shop settings", () => {
  it("keeps shop writes inside the owner shop", async () => {
    const db = seed();
    const owner = db.viewerFor("user-a")!;
    const other = db.viewerFor("user-b")!;
    const updated = await db.updateShop(owner, {
      name: "Точка мамы",
      tagline: "Одежда с Дордоя",
      whatsapp: "+996 700 00 00 00",
    });
    expect(updated.name).toBe("Точка мамы");
    expect(updated.whatsapp).toBe("996700000000");
    const otherShop = await db.updateShop(other, { name: "Чужая" });
    expect(otherShop.id).toBe("shop-b");
    expect((await db.getPublicShop("dordoi"))?.name).toBe("Точка мамы");
  });
});

describe("studio UI helpers", () => {
  it("requires confirmation for destructive bulk and delete", () => {
    expect(shouldConfirmDestructive("delete")).toBe(true);
    expect(shouldConfirmDestructive("unpublish")).toBe(true);
    expect(shouldConfirmDestructive("sold")).toBe(true);
    expect(shouldConfirmDestructive("bulk")).toBe(true);
  });

  it("rejects bulk payloads without an action and shop payloads with extra fields", () => {
    expect(bulkItemsSchema.safeParse({ ids: ["a"] }).success).toBe(false);
    expect(
      bulkItemsSchema.safeParse({ ids: ["a"], published: true }).success,
    ).toBe(true);
    expect(shopUpdateSchema.safeParse({ name: "Ок", extra: 1 }).success).toBe(
      false,
    );
  });
});
