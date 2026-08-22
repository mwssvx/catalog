import { describe, expect, it } from "vitest";
import { AuthError, ValidationError } from "@/lib/http/errors";
import { persistableUrl, publicSafeUrl } from "@/lib/media/delivery";
import { MemoryObjectStore } from "@/lib/media/object-store";
import { withRetries } from "@/lib/media/retry";
import { MediaPipeline } from "@/lib/media/service";
import { MemoryMediaTable } from "@/lib/media/types";
import {
  MAX_BATCH_FILES,
  validateUploadInput,
} from "@/lib/media/validation";

const owner = {
  userId: "11111111-1111-4111-8111-111111111111",
  shopId: "22222222-2222-4222-8222-222222222222",
  email: "owner@example.com",
};

describe("upload validation", () => {
  it("rejects mismatched extension and MIME type", () => {
    expect(
      validateUploadInput({
        filename: "look.exe",
        mime: "application/octet-stream",
        size: 12,
      }).ok,
    ).toBe(false);
    expect(
      validateUploadInput({
        filename: "look.jpg",
        mime: "video/mp4",
        size: 12,
      }).ok,
    ).toBe(false);
  });

  it("accepts phone photo and video types within size limits", () => {
    expect(
      validateUploadInput({
        filename: "IMG_001.jpg",
        mime: "image/jpeg",
        size: 2_000_000,
      }),
    ).toMatchObject({ ok: true, kind: "image" });
    expect(
      validateUploadInput({
        filename: "clip.mp4",
        mime: "video/mp4",
        size: 40_000_000,
      }),
    ).toMatchObject({ ok: true, kind: "video" });
  });

  it("caps a phone batch at 200 files", () => {
    expect(MAX_BATCH_FILES).toBe(200);
  });
});

describe("media pipeline", () => {
  it("refuses unsigned upload intents", async () => {
    const pipeline = new MediaPipeline(new MemoryMediaTable(), new MemoryObjectStore());
    await expect(
      pipeline.createIntent(null, {
        filename: "a.jpg",
        mime: "image/jpeg",
        size: 10,
      }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("marks a missing object as a failed upload", async () => {
    const table = new MemoryMediaTable();
    const store = new MemoryObjectStore();
    const pipeline = new MediaPipeline(table, store);
    const intent = await pipeline.createIntent(owner, {
      filename: "a.jpg",
      mime: "image/jpeg",
      size: 10,
    });
    await expect(pipeline.complete(owner, intent.mediaId)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(table.rows.get(intent.mediaId)?.uploadStatus).toBe("failed");
  });

  it("retries a failed complete after the object lands", async () => {
    const table = new MemoryMediaTable();
    const store = new MemoryObjectStore();
    const pipeline = new MediaPipeline(table, store);
    const intent = await pipeline.createIntent(owner, {
      filename: "a.jpg",
      mime: "image/jpeg",
      size: 8,
    });
    const record = table.rows.get(intent.mediaId)!;
    let attempts = 0;
    const result = await withRetries(async () => {
      attempts += 1;
      if (attempts === 1) {
        return pipeline.complete(owner, intent.mediaId);
      }
      store.putObject(record.storageKey!, Buffer.alloc(8), "image/jpeg");
      return pipeline.complete(owner, intent.mediaId);
    }, 2);
    expect(attempts).toBe(2);
    expect(result.uploadStatus).toBe("complete");
    expect(result.url).toBe(`media:${intent.mediaId}`);
  });

  it("keeps draft objects private and only publishes public object URLs", async () => {
    const table = new MemoryMediaTable();
    const store = new MemoryObjectStore();
    const pipeline = new MediaPipeline(table, store);
    const intent = await pipeline.createIntent(owner, {
      filename: "a.jpg",
      mime: "image/jpeg",
      size: 8,
    });
    const record = table.rows.get(intent.mediaId)!;
    store.putObject(record.storageKey!, Buffer.alloc(8), "image/jpeg");
    await pipeline.complete(owner, intent.mediaId);
    const productId = "33333333-3333-4333-8333-333333333333";
    await table.update(intent.mediaId, owner.shopId, { productId });

    const draft = table.rows.get(intent.mediaId)!;
    expect(draft.privacy).toBe("private");
    expect(publicSafeUrl(draft)).toBeNull();
    expect(draft.storageKey?.startsWith("private/")).toBe(true);

    await pipeline.promoteProduct(owner, productId);
    const live = table.rows.get(intent.mediaId)!;
    expect(live.privacy).toBe("public");
    expect(live.publicKey?.startsWith("public/")).toBe(true);
    expect(publicSafeUrl(live)).toBe(
      `https://media.local/${live.publicKey}`,
    );
    expect(publicSafeUrl(live)?.includes("/private/")).toBe(false);
    expect(store.copies[0]).toEqual({
      from: record.storageKey,
      to: live.publicKey,
    });

    await pipeline.demoteProduct(owner, productId);
    const hidden = table.rows.get(intent.mediaId)!;
    expect(hidden.privacy).toBe("private");
    expect(publicSafeUrl(hidden)).toBeNull();
    expect(hidden.url).toBe(`media:${intent.mediaId}`);
  });

  it("does not persist presigned query strings", () => {
    expect(
      persistableUrl(
        "https://s3.test/private/shop/id/original.jpg?X-Amz-Signature=secret",
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ),
    ).toBe("media:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("removes orphaned failed uploads", async () => {
    const table = new MemoryMediaTable();
    const store = new MemoryObjectStore();
    const pipeline = new MediaPipeline(table, store);
    const oldId = "44444444-4444-4444-8444-444444444444";
    const key = `private/${owner.shopId}/${oldId}/original.jpg`;
    store.putObject(key, Buffer.alloc(4), "image/jpeg");
    await table.insert({
      id: oldId,
      shopId: owner.shopId,
      ownerId: owner.userId,
      productId: null,
      variantId: null,
      originalFilename: "lost.jpg",
      storageKey: key,
      publicKey: null,
      previewKey: null,
      mimeType: "image/jpeg",
      sizeBytes: 4,
      checksum: null,
      kind: "image",
      uploadStatus: "failed",
      privacy: "private",
      multipartUploadId: null,
      url: `media:${oldId}`,
      sortOrder: 0,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    });
    expect(await pipeline.cleanup(owner)).toBe(1);
    expect(table.rows.has(oldId)).toBe(false);
    expect(store.deleted).toContain(key);
  });
});

describe("retry helper", () => {
  it("retries a transient failure then succeeds", async () => {
    let n = 0;
    const value = await withRetries(async () => {
      n += 1;
      if (n < 3) throw new Error("network");
      return "ok";
    }, 4);
    expect(value).toBe("ok");
    expect(n).toBe(3);
  });
});
