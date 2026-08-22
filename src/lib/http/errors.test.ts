import { describe, expect, it } from "vitest";
import { publicErrorMessage } from "@/lib/http/errors";
import { AuthError } from "@/lib/http/errors";
import { loginSchema } from "@/lib/catalog/schemas";
import { stableUuid } from "@/lib/catalog/ids";

describe("safe API errors", () => {
  it("does not leak internal messages for auth failures", () => {
    expect(publicErrorMessage(new AuthError("secret stack"))).toEqual({
      status: 401,
      error: "Unauthorized",
    });
  });

  it("maps invalid login JSON to a generic 400", () => {
    const parsed = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(publicErrorMessage(parsed.error)).toEqual({
        status: 400,
        error: "Invalid input",
      });
    }
  });
});

describe("stableUuid", () => {
  it("is idempotent and preserves real UUIDs", () => {
    const id = "c0a1d0ce-0000-4000-8000-000000000001";
    expect(stableUuid(id)).toBe(id);
    expect(stableUuid("seed-cotton-shirt")).toBe(
      stableUuid("seed-cotton-shirt"),
    );
    expect(stableUuid("seed-cotton-shirt")).not.toBe(
      stableUuid("seed-jeans"),
    );
  });
});
