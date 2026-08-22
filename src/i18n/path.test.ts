import { describe, expect, it } from "vitest";
import { withLocale } from "@/i18n/path";
import { matchesFilters } from "@/lib/catalog/normalize";
import type { Item } from "@/lib/catalog/types";

describe("withLocale query strings", () => {
  it("keeps status=all on the default locale home link", () => {
    expect(withLocale("/?status=all", "ru")).toBe("/?status=all");
  });

  it("does not insert a trailing slash before query on ky home", () => {
    expect(withLocale("/?status=all", "ky")).toBe("/ky?status=all");
    expect(withLocale("/?status=all&category=tops", "ky")).toBe(
      "/ky?status=all&category=tops",
    );
  });

  it("localizes nested paths and keeps search", () => {
    expect(withLocale("/studio?tab=list", "ky")).toBe("/ky/studio?tab=list");
    expect(withLocale("/item/abc", "ky")).toBe("/ky/item/abc");
  });
});

describe("catalog status=all filter", () => {
  const base: Item = {
    id: "1",
    code: "A1",
    title: "Shirt",
    notes: "",
    description: "",
    price: 100,
    wholesalePrice: null,
    minWholesaleQty: null,
    sizes: ["M"],
    quantity: 1,
    material: "cotton",
    origin: "",
    category: "tops",
    subcategory: "",
    condition: "new",
    status: "sold",
    tags: [],
    collections: [],
    published: true,
    publishedAt: "2026-01-01T00:00:00.000Z",
    photos: ["https://example.com/a.jpg"],
    videos: [],
    variants: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("available hides sold; all includes sold", () => {
    expect(matchesFilters(base, { status: "available", published: true })).toBe(
      false,
    );
    expect(matchesFilters(base, { status: "all", published: true })).toBe(true);
    expect(
      matchesFilters(
        { ...base, status: "in_stock" },
        { status: "available", published: true },
      ),
    ).toBe(true);
  });
});
