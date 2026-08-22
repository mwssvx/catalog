import type { Viewer } from "@/lib/catalog/access";
import {
  deliveryUrl,
  mediaRef,
  parseMediaRef,
  persistableUrl,
  publicObjectUrl,
} from "@/lib/media/delivery";
import type { CompletedPart, ObjectStore } from "@/lib/media/object-store";
import type { MediaRecord, MediaTable } from "@/lib/media/types";
import {
  ORPHAN_AFTER_MS,
  PART_SIZE,
  SIGN_PUT_EXPIRES,
  needsMultipart,
  partCount,
  privateObjectKey,
  publicObjectKey,
  sanitizeOriginalFilename,
  validateUploadInput,
} from "@/lib/media/validation";
import {
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";

export type UploadIntent = {
  mediaId: string;
  kind: "image" | "video";
  strategy: "put" | "multipart";
  putUrl?: string;
  previewPutUrl?: string;
  multipart?: {
    uploadId: string;
    partSize: number;
    partCount: number;
    partUrls: Array<{ partNumber: number; url: string }>;
  };
};

function requireViewer(viewer: Viewer | null): Viewer {
  if (!viewer) throw new AuthError();
  return viewer;
}

export class MediaPipeline {
  constructor(
    private readonly table: MediaTable,
    private readonly store: ObjectStore,
  ) {}

  async createIntent(
    viewer: Viewer | null,
    input: { filename: string; mime: string; size: number; checksum?: string },
  ): Promise<UploadIntent> {
    const owner = requireViewer(viewer);
    const check = validateUploadInput(input);
    if (!check.ok) throw new ValidationError(check.error);
    await this.cleanup(owner);

    const id = crypto.randomUUID();
    const storageKey = privateObjectKey({
      shopId: owner.shopId,
      mediaId: id,
      ext: check.ext,
    });
    const previewKey = check.kind === "video" || check.kind === "image"
      ? privateObjectKey({
          shopId: owner.shopId,
          mediaId: id,
          ext: "jpg",
          preview: true,
        })
      : null;
    const multipart = needsMultipart(check.size);
    let uploadId: string | null = null;
    if (multipart) {
      uploadId = (await this.store.createMultipart(storageKey, check.mime)).uploadId;
    }

    const now = new Date().toISOString();
    await this.table.insert({
      id,
      shopId: owner.shopId,
      ownerId: owner.userId,
      productId: null,
      variantId: null,
      originalFilename: sanitizeOriginalFilename(input.filename),
      storageKey,
      publicKey: null,
      previewKey,
      mimeType: check.mime,
      sizeBytes: check.size,
      checksum: input.checksum ?? null,
      kind: check.kind,
      uploadStatus: "uploading",
      privacy: "private",
      multipartUploadId: uploadId,
      url: mediaRef(id),
      sortOrder: 0,
      createdAt: now,
    });

    const previewPutUrl = previewKey
      ? await this.store.presignPut(previewKey, "image/jpeg", SIGN_PUT_EXPIRES)
      : undefined;

    if (!multipart) {
      return {
        mediaId: id,
        kind: check.kind,
        strategy: "put",
        putUrl: await this.store.presignPut(storageKey, check.mime, SIGN_PUT_EXPIRES),
        previewPutUrl,
      };
    }

    const count = partCount(check.size);
    const partUrls = [];
    for (let partNumber = 1; partNumber <= count; partNumber += 1) {
      partUrls.push({
        partNumber,
        url: await this.store.presignPart(
          storageKey,
          uploadId!,
          partNumber,
          SIGN_PUT_EXPIRES,
        ),
      });
    }

    return {
      mediaId: id,
      kind: check.kind,
      strategy: "multipart",
      previewPutUrl,
      multipart: {
        uploadId: uploadId!,
        partSize: PART_SIZE,
        partCount: count,
        partUrls,
      },
    };
  }

  async signParts(
    viewer: Viewer | null,
    mediaId: string,
    partNumbers: number[],
  ): Promise<Array<{ partNumber: number; url: string }>> {
    const record = await this.owned(viewer, mediaId);
    if (!record.storageKey || !record.multipartUploadId) {
      throw new Error("Not a multipart upload");
    }
    const urls = [];
    for (const partNumber of partNumbers) {
      urls.push({
        partNumber,
        url: await this.store.presignPart(
          record.storageKey,
          record.multipartUploadId,
          partNumber,
          SIGN_PUT_EXPIRES,
        ),
      });
    }
    return urls;
  }

  async complete(
    viewer: Viewer | null,
    mediaId: string,
    parts?: CompletedPart[],
  ): Promise<MediaRecord> {
    const record = await this.owned(viewer, mediaId);
    if (!record.storageKey) throw new Error("Missing storage key");
    if (record.multipartUploadId) {
      if (!parts?.length) throw new ValidationError("Missing multipart parts");
      await this.store.completeMultipart(
        record.storageKey,
        record.multipartUploadId,
        parts,
      );
    }
    const head = await this.store.head(record.storageKey);
    if (!head) {
      await this.table.update(record.id, record.shopId, { uploadStatus: "failed" });
      throw new ValidationError("Upload did not land in storage");
    }
    if (record.sizeBytes && head.size !== record.sizeBytes) {
      await this.table.update(record.id, record.shopId, { uploadStatus: "failed" });
      throw new ValidationError("Uploaded size does not match");
    }
    const next = await this.table.update(record.id, record.shopId, {
      uploadStatus: "complete",
      multipartUploadId: null,
      url: mediaRef(record.id),
    });
    if (!next) throw new NotFoundError();
    return next;
  }

  async abort(viewer: Viewer | null, mediaId: string): Promise<void> {
    const record = await this.owned(viewer, mediaId);
    if (record.storageKey && record.multipartUploadId) {
      await this.store.abortMultipart(record.storageKey, record.multipartUploadId);
    }
    if (record.storageKey) await this.store.delete(record.storageKey);
    if (record.previewKey) await this.store.delete(record.previewKey);
    await this.table.update(record.id, record.shopId, {
      uploadStatus: "aborted",
      multipartUploadId: null,
    });
  }

  async cleanup(viewer: Viewer | null): Promise<number> {
    const owner = requireViewer(viewer);
    const cutoff = new Date(Date.now() - ORPHAN_AFTER_MS).toISOString();
    const orphans = await this.table.listOrphans(owner.shopId, cutoff);
    for (const row of orphans) {
      if (row.storageKey && row.multipartUploadId) {
        await this.store.abortMultipart(row.storageKey, row.multipartUploadId);
      }
      if (row.storageKey) await this.store.delete(row.storageKey);
      if (row.previewKey) await this.store.delete(row.previewKey);
      await this.table.delete(row.id, owner.shopId);
    }
    return orphans.length;
  }

  async inProgress(viewer: Viewer | null): Promise<MediaRecord[]> {
    const owner = requireViewer(viewer);
    return this.table.listInProgress(owner.shopId);
  }

  async promoteProduct(viewer: Viewer | null, productId: string): Promise<void> {
    const owner = requireViewer(viewer);
    const rows = await this.table.listForProduct(owner.shopId, productId);
    for (const row of rows) {
      if (row.uploadStatus !== "complete" || !row.storageKey) continue;
      if (row.privacy === "public" && row.publicKey) continue;
      const publicKey = publicObjectKey(row.storageKey);
      await this.store.copy(row.storageKey, publicKey);
      if (row.previewKey && (await this.store.head(row.previewKey))) {
        await this.store.copy(row.previewKey, publicObjectKey(row.previewKey));
      }
      await this.table.update(row.id, owner.shopId, {
        privacy: "public",
        publicKey,
        url: publicObjectUrl(publicKey),
      });
    }
  }

  async demoteProduct(viewer: Viewer | null, productId: string): Promise<void> {
    const owner = requireViewer(viewer);
    const rows = await this.table.listForProduct(owner.shopId, productId);
    for (const row of rows) {
      if (row.publicKey) await this.store.delete(row.publicKey);
      if (row.previewKey) {
        const publicPreview = publicObjectKey(row.previewKey);
        await this.store.delete(publicPreview);
      }
      await this.table.update(row.id, owner.shopId, {
        privacy: "private",
        publicKey: null,
        url: mediaRef(row.id),
      });
    }
  }

  async resolveForViewer(
    record: MediaRecord,
    viewer: Viewer | null,
  ): Promise<string | null> {
    return deliveryUrl(record, viewer);
  }

  async promoteUrls(viewer: Viewer | null, urls: string[]): Promise<string[]> {
    const owner = requireViewer(viewer);
    const delivered: string[] = [];
    for (const url of urls) {
      if (!url) {
        delivered.push("");
        continue;
      }
      const id = parseMediaRef(url);
      const found = id
        ? await this.table.get(id, owner.shopId)
        : await this.table.findByUrl(owner.shopId, persistableUrl(url));
      if (!found || found.uploadStatus !== "complete" || !found.storageKey) {
        delivered.push(url);
        continue;
      }
      if (found.privacy === "public" && found.publicKey) {
        delivered.push(publicObjectUrl(found.publicKey));
        continue;
      }
      const publicKey = publicObjectKey(found.storageKey);
      await this.store.copy(found.storageKey, publicKey);
      if (found.previewKey && (await this.store.head(found.previewKey))) {
        await this.store.copy(found.previewKey, publicObjectKey(found.previewKey));
      }
      const next = await this.table.update(found.id, owner.shopId, {
        privacy: "public",
        publicKey,
        url: publicObjectUrl(publicKey),
      });
      delivered.push(next?.url ?? publicObjectUrl(publicKey));
    }
    return delivered;
  }

  async attachToProduct(
    viewer: Viewer | null,
    productId: string,
    urls: string[],
  ): Promise<void> {
    const owner = requireViewer(viewer);
    let order = 0;
    for (const url of urls) {
      const id = parseMediaRef(url);
      const found = id
        ? await this.table.get(id, owner.shopId)
        : await this.table.findByUrl(owner.shopId, persistableUrl(url));
      if (!found) continue;
      await this.table.update(found.id, owner.shopId, {
        productId,
        sortOrder: order,
      });
      order += 1;
    }
  }

  private async owned(viewer: Viewer | null, mediaId: string): Promise<MediaRecord> {
    const owner = requireViewer(viewer);
    const record = await this.table.get(mediaId, owner.shopId);
    if (!record) throw new NotFoundError();
    if (record.shopId !== owner.shopId) throw new ForbiddenError();
    return record;
  }
}

export { PART_SIZE };
