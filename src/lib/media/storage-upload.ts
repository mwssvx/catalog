import { ConfigError, ValidationError } from "@/lib/http/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseUrl } from "@/lib/supabase/env";
import {
  EXT_BY_MIME,
  MIME_BY_EXT,
  sanitizeOriginalFilename,
  validateUploadInput,
} from "@/lib/media/validation";

export const MEDIA_BUCKET =
  process.env.MEDIA_BUCKET?.trim() || "catalog-media";

let ensuredBucket: string | null = null;

export function publicStorageUrl(path: string): string {
  const clean = path.replace(/^\//, "");
  return `${supabaseUrl()}/storage/v1/object/public/${MEDIA_BUCKET}/${clean}`;
}

export function normalizeUploadMeta(input: {
  filename: string;
  mime: string;
  size: number;
}): { filename: string; mime: string; size: number } {
  let filename = sanitizeOriginalFilename(input.filename || "photo.jpg");
  let mime = (input.mime || "").toLowerCase().trim();
  if (mime === "image/jpg" || mime === "image/pjpeg") mime = "image/jpeg";
  if (mime === "application/octet-stream") mime = "";

  let ext = filename.includes(".")
    ? filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()
    : "";

  if (!mime && ext && MIME_BY_EXT[ext]) {
    mime = MIME_BY_EXT[ext];
  }
  if (!mime) {
    mime = "image/jpeg";
  }
  if (!ext) {
    ext = EXT_BY_MIME[mime] || "jpg";
    filename = `${filename}.${ext}`;
  }

  // iPhone sometimes sends HEIC bytes with a .jpg name or empty type.
  if (
    (ext === "heic" || ext === "heif") &&
    (mime === "image/jpeg" || mime === "image/png" || !mime)
  ) {
    mime = ext === "heif" ? "image/heif" : "image/heic";
  }
  if (
    (mime === "image/heic" || mime === "image/heif") &&
    (ext === "jpg" || ext === "jpeg")
  ) {
    filename = `${filename.replace(/\.(jpe?g)$/i, "")}.${
      mime === "image/heif" ? "heif" : "heic"
    }`;
  }

  return { filename, mime, size: input.size };
}

async function ensureMediaBucket() {
  if (ensuredBucket === MEDIA_BUCKET) return;
  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  const exists = (buckets ?? []).some((bucket) => bucket.name === MEDIA_BUCKET);
  if (!exists) {
    const { error } = await admin.storage.createBucket(MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: "20MB",
      allowedMimeTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/heic",
        "image/heif",
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ],
    });
    if (error && !/already exists/i.test(error.message ?? "")) {
      // Upload may still work if the bucket already exists but list failed.
      if (!/row-level security|permission|not allowed/i.test(error.message ?? "")) {
        throw error;
      }
    }
  }
  ensuredBucket = MEDIA_BUCKET;
}

function requireServiceRole() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new ConfigError("Missing SUPABASE_SERVICE_ROLE_KEY for photo uploads");
  }
}

export async function storeUploadedFile(input: {
  shopId: string;
  filename: string;
  mime: string;
  size: number;
  body: Blob | ArrayBuffer | Uint8Array | File;
}): Promise<{
  path: string;
  publicUrl: string;
  kind: "image" | "video";
}> {
  requireServiceRole();
  const normalized = normalizeUploadMeta(input);
  const check = validateUploadInput(normalized);
  if (!check.ok) throw new ValidationError(check.error);

  await ensureMediaBucket();

  const mediaId = crypto.randomUUID();
  const path = `shops/${input.shopId}/${mediaId}.${check.ext}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(MEDIA_BUCKET).upload(path, input.body, {
    contentType: check.mime,
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw error;

  return {
    path,
    publicUrl: publicStorageUrl(path),
    kind: check.kind,
  };
}

export async function createSignedMediaUpload(input: {
  shopId: string;
  filename: string;
  mime: string;
  size: number;
}): Promise<{
  path: string;
  signedUrl: string;
  token: string;
  publicUrl: string;
  kind: "image" | "video";
}> {
  requireServiceRole();

  const normalized = normalizeUploadMeta(input);
  const check = validateUploadInput(normalized);
  if (!check.ok) throw new ValidationError(check.error);

  await ensureMediaBucket();

  const mediaId = crypto.randomUUID();
  const path = `shops/${input.shopId}/${mediaId}.${check.ext}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) {
    throw error ?? new Error("Could not create upload URL");
  }

  return {
    path: data.path || path,
    signedUrl: data.signedUrl,
    token: data.token,
    publicUrl: publicStorageUrl(data.path || path),
    kind: check.kind,
  };
}
