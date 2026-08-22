import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaKind } from "@/lib/media/validation";
import type { MediaRecord, MediaTable, MediaPrivacy, UploadStatus } from "@/lib/media/types";

type Row = {
  id: string;
  shop_id: string;
  owner_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  original_filename: string;
  storage_key: string | null;
  public_key: string | null;
  preview_key: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  checksum: string | null;
  kind: MediaKind;
  upload_status: UploadStatus;
  privacy: MediaPrivacy;
  multipart_upload_id: string | null;
  url: string;
  sort_order: number;
  created_at: string;
};

function fromRow(row: Row): MediaRecord {
  return {
    id: row.id,
    shopId: row.shop_id,
    ownerId: row.owner_id ?? "",
    productId: row.product_id,
    variantId: row.variant_id,
    originalFilename: row.original_filename,
    storageKey: row.storage_key,
    publicKey: row.public_key,
    previewKey: row.preview_key,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    checksum: row.checksum,
    kind: row.kind,
    uploadStatus: row.upload_status,
    privacy: row.privacy,
    multipartUploadId: row.multipart_upload_id,
    url: row.url,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function toPatch(patch: Partial<MediaRecord>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.ownerId !== undefined) row.owner_id = patch.ownerId;
  if (patch.productId !== undefined) row.product_id = patch.productId;
  if (patch.variantId !== undefined) row.variant_id = patch.variantId;
  if (patch.originalFilename !== undefined) {
    row.original_filename = patch.originalFilename;
  }
  if (patch.storageKey !== undefined) row.storage_key = patch.storageKey;
  if (patch.publicKey !== undefined) row.public_key = patch.publicKey;
  if (patch.previewKey !== undefined) row.preview_key = patch.previewKey;
  if (patch.mimeType !== undefined) row.mime_type = patch.mimeType;
  if (patch.sizeBytes !== undefined) row.size_bytes = patch.sizeBytes;
  if (patch.checksum !== undefined) row.checksum = patch.checksum;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.uploadStatus !== undefined) row.upload_status = patch.uploadStatus;
  if (patch.privacy !== undefined) row.privacy = patch.privacy;
  if (patch.multipartUploadId !== undefined) {
    row.multipart_upload_id = patch.multipartUploadId;
  }
  if (patch.url !== undefined) row.url = patch.url;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  return row;
}

export class SupabaseMediaTable implements MediaTable {
  constructor(private readonly client: SupabaseClient) {}

  async insert(row: MediaRecord): Promise<MediaRecord> {
    const { data, error } = await this.client
      .from("media")
      .insert({
        id: row.id,
        shop_id: row.shopId,
        owner_id: row.ownerId,
        product_id: row.productId,
        variant_id: row.variantId,
        original_filename: row.originalFilename,
        storage_key: row.storageKey,
        public_key: row.publicKey,
        preview_key: row.previewKey,
        mime_type: row.mimeType,
        size_bytes: row.sizeBytes,
        checksum: row.checksum,
        kind: row.kind,
        upload_status: row.uploadStatus,
        privacy: row.privacy,
        multipart_upload_id: row.multipartUploadId,
        url: row.url,
        sort_order: row.sortOrder,
        created_at: row.createdAt,
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Could not create media");
    return fromRow(data as Row);
  }

  async update(
    id: string,
    shopId: string,
    patch: Partial<MediaRecord>,
  ): Promise<MediaRecord | null> {
    const { data, error } = await this.client
      .from("media")
      .update(toPatch(patch))
      .eq("id", id)
      .eq("shop_id", shopId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as Row) : null;
  }

  async get(id: string, shopId: string): Promise<MediaRecord | null> {
    const { data, error } = await this.client
      .from("media")
      .select("*")
      .eq("id", id)
      .eq("shop_id", shopId)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as Row) : null;
  }

  async listOrphans(shopId: string, beforeIso: string): Promise<MediaRecord[]> {
    const { data, error } = await this.client
      .from("media")
      .select("*")
      .eq("shop_id", shopId)
      .lt("created_at", beforeIso)
      .in("upload_status", ["pending", "uploading", "failed", "aborted"])
      .is("product_id", null);
    if (error) throw error;
    return ((data ?? []) as Row[]).map(fromRow);
  }

  async listForProduct(shopId: string, productId: string): Promise<MediaRecord[]> {
    const { data, error } = await this.client
      .from("media")
      .select("*")
      .eq("shop_id", shopId)
      .eq("product_id", productId);
    if (error) throw error;
    return ((data ?? []) as Row[]).map(fromRow);
  }

  async listInProgress(shopId: string): Promise<MediaRecord[]> {
    const { data, error } = await this.client
      .from("media")
      .select("*")
      .eq("shop_id", shopId)
      .in("upload_status", ["pending", "uploading"]);
    if (error) throw error;
    return ((data ?? []) as Row[]).map(fromRow);
  }

  async findByUrl(shopId: string, url: string): Promise<MediaRecord | null> {
    const id = url.startsWith("media:") ? url.slice("media:".length) : null;
    if (id) return this.get(id, shopId);
    const key = url.match(/(private|public)\/[^\s?]+/)?.[0] ?? null;
    if (key) {
      const { data } = await this.client
        .from("media")
        .select("*")
        .eq("shop_id", shopId)
        .or(`storage_key.eq.${key},public_key.eq.${key}`)
        .maybeSingle();
      if (data) return fromRow(data as Row);
    }
    const { data, error } = await this.client
      .from("media")
      .select("*")
      .eq("shop_id", shopId)
      .eq("url", url)
      .maybeSingle();
    if (error) return null;
    return data ? fromRow(data as Row) : null;
  }

  async listByIds(shopId: string, ids: string[]): Promise<MediaRecord[]> {
    if (!ids.length) return [];
    const { data, error } = await this.client
      .from("media")
      .select("*")
      .eq("shop_id", shopId)
      .in("id", ids);
    if (error) throw error;
    return ((data ?? []) as Row[]).map(fromRow);
  }

  async delete(id: string, shopId: string): Promise<void> {
    const { error } = await this.client
      .from("media")
      .delete()
      .eq("id", id)
      .eq("shop_id", shopId);
    if (error) throw error;
  }
}
