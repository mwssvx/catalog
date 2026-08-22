import type { MediaKind } from "@/lib/media/validation";

export type UploadStatus =
  | "pending"
  | "uploading"
  | "complete"
  | "failed"
  | "aborted";

export type MediaPrivacy = "private" | "public";

export type MediaRecord = {
  id: string;
  shopId: string;
  ownerId: string;
  productId: string | null;
  variantId: string | null;
  originalFilename: string;
  storageKey: string | null;
  publicKey: string | null;
  previewKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  checksum: string | null;
  kind: MediaKind;
  uploadStatus: UploadStatus;
  privacy: MediaPrivacy;
  multipartUploadId: string | null;
  url: string;
  sortOrder: number;
  createdAt: string;
};

export type MediaTable = {
  insert(row: MediaRecord): Promise<MediaRecord>;
  update(
    id: string,
    shopId: string,
    patch: Partial<MediaRecord>,
  ): Promise<MediaRecord | null>;
  get(id: string, shopId: string): Promise<MediaRecord | null>;
  listOrphans(shopId: string, beforeIso: string): Promise<MediaRecord[]>;
  listForProduct(shopId: string, productId: string): Promise<MediaRecord[]>;
  listInProgress(shopId: string): Promise<MediaRecord[]>;
  findByUrl(shopId: string, url: string): Promise<MediaRecord | null>;
  listByIds(shopId: string, ids: string[]): Promise<MediaRecord[]>;
  delete(id: string, shopId: string): Promise<void>;
};

export class MemoryMediaTable implements MediaTable {
  rows = new Map<string, MediaRecord>();

  async insert(row: MediaRecord): Promise<MediaRecord> {
    this.rows.set(row.id, row);
    return row;
  }

  async update(
    id: string,
    shopId: string,
    patch: Partial<MediaRecord>,
  ): Promise<MediaRecord | null> {
    const current = this.rows.get(id);
    if (!current || current.shopId !== shopId) return null;
    const next = { ...current, ...patch, id: current.id, shopId: current.shopId };
    this.rows.set(id, next);
    return next;
  }

  async get(id: string, shopId: string): Promise<MediaRecord | null> {
    const row = this.rows.get(id);
    if (!row || row.shopId !== shopId) return null;
    return row;
  }

  async listOrphans(shopId: string, beforeIso: string): Promise<MediaRecord[]> {
    return [...this.rows.values()].filter(
      (row) =>
        row.shopId === shopId &&
        row.createdAt < beforeIso &&
        row.uploadStatus !== "complete" &&
        !row.productId,
    );
  }

  async listForProduct(shopId: string, productId: string): Promise<MediaRecord[]> {
    return [...this.rows.values()].filter(
      (row) => row.shopId === shopId && row.productId === productId,
    );
  }

  async listInProgress(shopId: string): Promise<MediaRecord[]> {
    return [...this.rows.values()].filter(
      (row) =>
        row.shopId === shopId &&
        (row.uploadStatus === "pending" || row.uploadStatus === "uploading"),
    );
  }

  async findByUrl(shopId: string, url: string): Promise<MediaRecord | null> {
    return (
      [...this.rows.values()].find((row) => {
        if (row.shopId !== shopId) return false;
        if (row.id === url || row.url === url) return true;
        if (url.startsWith(`media:${row.id}`)) return true;
        if (row.storageKey && url.includes(row.storageKey)) return true;
        if (row.publicKey && url.includes(row.publicKey)) return true;
        return false;
      }) ?? null
    );
  }

  async listByIds(shopId: string, ids: string[]): Promise<MediaRecord[]> {
    const set = new Set(ids);
    return [...this.rows.values()].filter(
      (row) => row.shopId === shopId && set.has(row.id),
    );
  }

  async delete(id: string, shopId: string): Promise<void> {
    const row = this.rows.get(id);
    if (row && row.shopId === shopId) this.rows.delete(id);
  }
}
