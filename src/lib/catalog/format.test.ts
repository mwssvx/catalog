import { describe, expect, it } from "vitest";
import {
  formatPrice,
  isPlaceholderWhatsapp,
  whatsappDigits,
  whatsappHref,
} from "@/lib/catalog/format";

describe("formatPrice", () => {
  it("returns the ask label when the price is missing", () => {
    expect(formatPrice(null, "сом", "Цена?")).toBe("Цена?");
  });

  it("formats a KGS amount with grouping separators", () => {
    expect(formatPrice(4500, "сом", "Цена?")).toMatch(/4[\s\u00A0\u202F]500 сом/);
  });
});

describe("whatsappHref", () => {
  it("strips non-digits from a Kyrgyz number", () => {
    expect(whatsappDigits("+996 700 123 456")).toBe("996700123456");
  });

  it("builds a wa.me link with a prefilled product line", () => {
    expect(whatsappHref("996700123456", "T101 — Рубашка")).toBe(
      "https://wa.me/996700123456?text=T101%20%E2%80%94%20%D0%A0%D1%83%D0%B1%D0%B0%D1%88%D0%BA%D0%B0",
    );
  });

  it("returns null when the number is too short", () => {
    expect(whatsappHref("123", "hello")).toBeNull();
  });

  it("rejects the demo placeholder number", () => {
    expect(isPlaceholderWhatsapp("996700000000")).toBe(true);
    expect(whatsappHref("996700000000", "hello")).toBeNull();
  });
});
