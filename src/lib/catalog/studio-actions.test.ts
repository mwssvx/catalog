import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/catalog/types";
import {
  adjustItemPrice,
  filterStudioItems,
  weekStudioStats,
} from "@/lib/catalog/studio-actions";

function item(partial: Partial<Item> & Pick<Item, "id" | "code" | "title">): Item {
  return {
    notes: "",
    description: "",
    price: null,
    wholesalePrice: null,
    minWholesaleQty: null,
    sizes: [],
    quantity: null,
    material: null,
    origin: null,
    category: null,
    subcategory: null,
    condition: null,
    status: "in_stock",
    tags: [],
    collections: [],
    published: false,
    publishedAt: null,
    photos: [],
    videos: [],
    variants: [],
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
    ...partial,
  };
}

describe("studio admin helpers", () => {
  it("computes week stats from timestamps", () => {
    const now = Date.parse("2026-08-20T12:00:00.000Z");
    const stats = weekStudioStats(
      [
        item({
          id: "1",
          code: "A1",
          title: "a",
          published: true,
          publishedAt: "2026-08-19T00:00:00.000Z",
        }),
        item({
          id: "2",
          code: "A2",
          title: "b",
          status: "sold",
          published: true,
          publishedAt: "2026-08-10T00:00:00.000Z",
          updatedAt: "2026-08-19T00:00:00.000Z",
        }),
        item({
          id: "3",
          code: "A3",
          title: "c",
          createdAt: "2026-08-01T00:00:00.000Z",
        }),
        item({
          id: "4",
          code: "A4",
          title: "d",
          createdAt: "2026-08-19T00:00:00.000Z",
        }),
      ],
      now,
    );
    expect(stats.publishedThisWeek).toBe(1);
    expect(stats.soldThisWeek).toBe(1);
    expect(stats.draftsThisWeek).toBe(1);
  });

  it("sorts no-photo first", () => {
    const sorted = filterStudioItems(
      [
        item({
          id: "1",
          code: "B",
          title: "with",
          photos: ["https://x"],
          updatedAt: "2026-08-20T00:00:00.000Z",
        }),
        item({
          id: "2",
          code: "A",
          title: "without",
          updatedAt: "2026-08-10T00:00:00.000Z",
        }),
      ],
      {
        publication: "all",
        missing: false,
        status: "all",
        sort: "no_photo",
      },
    );
    expect(sorted.map((entry) => entry.id)).toEqual(["2", "1"]);
  });

  it("adjusts prices by percent and delta", () => {
    expect(adjustItemPrice(1000, { pricePercent: 10 })).toBe(1100);
    expect(adjustItemPrice(1000, { priceDelta: -150 })).toBe(850);
    expect(adjustItemPrice(null, { pricePercent: 10 })).toBeNull();
  });
});
