import { describe, expect, it } from "vitest";
import { normalizeUploadMeta } from "@/lib/media/storage-upload";
import { validateUploadInput } from "@/lib/media/validation";

describe("normalizeUploadMeta", () => {
  it("fills empty mime from extension", () => {
    const meta = normalizeUploadMeta({
      filename: "robe.JPG",
      mime: "",
      size: 1200,
    });
    expect(meta.mime).toBe("image/jpeg");
    expect(validateUploadInput(meta).ok).toBe(true);
  });

  it("maps image/jpg alias", () => {
    const meta = normalizeUploadMeta({
      filename: "a.jpg",
      mime: "image/jpg",
      size: 10,
    });
    expect(meta.mime).toBe("image/jpeg");
  });

  it("adds jpg extension when missing", () => {
    const meta = normalizeUploadMeta({
      filename: "photo",
      mime: "image/jpeg",
      size: 10,
    });
    expect(meta.filename.endsWith(".jpg")).toBe(true);
  });
});

describe("validateUploadInput leniency", () => {
  it("accepts empty mime when extension is clear", () => {
    const result = validateUploadInput({
      filename: "look.png",
      mime: "",
      size: 44,
    });
    expect(result).toMatchObject({ ok: true, mime: "image/png" });
  });

  it("accepts heic/heif mismatch", () => {
    const result = validateUploadInput({
      filename: "IMG_1.HEIC",
      mime: "image/heif",
      size: 100,
    });
    expect(result.ok).toBe(true);
  });
});
