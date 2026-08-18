import { describe, expect, it } from "vitest";
import { parseNotes } from "@/lib/catalog/parse";

describe("parseNotes", () => {
  it("returns empty fields for blank notes", () => {
    expect(parseNotes("   ")).toEqual({
      title: "",
      price: null,
      sizes: [],
      quantity: null,
      material: null,
      category: null,
      condition: null,
    });
  });

  it("parses a Russian stall note", () => {
    const parsed = parseNotes(
      "хлопковая рубашка M/L, 1500 сом, осталось 4, почти новая",
    );

    expect(parsed.title.toLowerCase()).toContain("рубашка");
    expect(parsed.price).toBe(1500);
    expect(parsed.sizes).toEqual(["M", "L"]);
    expect(parsed.quantity).toBe(4);
    expect(parsed.category).toBe("tops");
    expect(parsed.condition).toBe("like-new");
  });

  it("parses English material words and a som price", () => {
    const parsed = parseNotes("cotton viscose shirt M 1500 сом");

    expect(parsed.price).toBe(1500);
    expect(parsed.sizes).toEqual(["M"]);
    expect(parsed.material).toBe("хлопок");
    expect(parsed.category).toBe("tops");
  });

  it("parses Kyrgyz-script quantity with a labeled som price", () => {
    const parsed = parseNotes("платье M, 2200 сом, 2 шт");

    expect(parsed.price).toBe(2200);
    expect(parsed.sizes).toEqual(["M"]);
    expect(parsed.quantity).toBe(2);
    expect(parsed.category).toBe("dresses");
  });

  it("parses an English condition word", () => {
    expect(parseNotes("dress S, 2200 сом, brand new").condition).toBe("new");
  });

  it("reads a labeled som price without swallowing a nearby size number", () => {
    const parsed = parseNotes("джинсы, 1800 сом, 2 шт");

    expect(parsed.price).toBe(1800);
    expect(parsed.quantity).toBe(2);
    expect(parsed.category).toBe("bottoms");
  });
});
