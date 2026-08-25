import { describe, expect, it } from "vitest";
import { joinShopTagline, splitShopTagline } from "@/lib/catalog/shop-extras";

describe("shop extras tagline packing", () => {
  it("round-trips instagram without changing visible tagline", () => {
    const packed = joinShopTagline("Soft nights", {
      instagram: "@velviera",
      telegram: "velviera_kg",
      categories: ["sets", "robes"],
    });
    const { tagline, extras } = splitShopTagline(packed);
    expect(tagline).toBe("Soft nights");
    expect(extras.instagram).toBe("@velviera");
    expect(extras.telegram).toBe("velviera_kg");
    expect(extras.categories).toEqual(["sets", "robes"]);
  });

  it("leaves plain taglines alone", () => {
    expect(splitShopTagline("Hello")).toEqual({ tagline: "Hello", extras: {} });
  });
});
