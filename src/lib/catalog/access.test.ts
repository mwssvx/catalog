import { describe, expect, it } from "vitest";
import {
  canReadProduct,
  canWriteShop,
  isPublicProduct,
} from "@/lib/catalog/access";
import type { Viewer } from "@/lib/catalog/access";

const ownerA: Viewer = {
  userId: "user-a",
  shopId: "shop-a",
  email: "a@example.com",
};

const ownerB: Viewer = {
  userId: "user-b",
  shopId: "shop-b",
  email: "b@example.com",
};

const draft = {
  shopId: "shop-a",
  published: false,
  status: "in_stock",
};

const live = {
  shopId: "shop-a",
  published: true,
  status: "in_stock",
};

const hidden = {
  shopId: "shop-a",
  published: true,
  status: "hidden",
};

describe("product visibility", () => {
  it("lets the owner read unpublished products in their shop", () => {
    expect(canReadProduct(ownerA, draft)).toBe(true);
  });

  it("hides unpublished products from anonymous visitors", () => {
    expect(canReadProduct(null, draft)).toBe(false);
    expect(isPublicProduct(draft)).toBe(false);
  });

  it("hides hidden products from the public catalog", () => {
    expect(canReadProduct(null, hidden)).toBe(false);
    expect(canReadProduct(ownerA, hidden)).toBe(true);
  });

  it("allows anonymous reads of published products", () => {
    expect(canReadProduct(null, live)).toBe(true);
  });

  it("blocks another shop owner from reading or writing this shop", () => {
    expect(canReadProduct(ownerB, live)).toBe(true);
    expect(canWriteShop(ownerB, "shop-a")).toBe(false);
    expect(canWriteShop(ownerA, "shop-a")).toBe(true);
    expect(canWriteShop(null, "shop-a")).toBe(false);
  });
});
