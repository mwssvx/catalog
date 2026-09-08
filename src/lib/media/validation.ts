export const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 256 * 1024 * 1024;
export const MULTIPART_THRESHOLD = 8 * 1024 * 1024;
export const PART_SIZE = 8 * 1024 * 1024;
export const MAX_BATCH_FILES = 200;
export const SIGN_PUT_EXPIRES = 60 * 15;
export const SIGN_GET_EXPIRES = 60 * 60;
export const ORPHAN_AFTER_MS = 24 * 60 * 60 * 1000;

export type MediaKind = "image" | "video";

export type FileValidation = {
  ok: true;
  kind: MediaKind;
  mime: string;
  ext: string;
  size: number;
} | {
  ok: false;
  error: string;
};

export function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 1) return "";
  return base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function kindFromMime(mime: string): MediaKind | null {
  if (IMAGE_MIMES.has(mime)) return "image";
  if (VIDEO_MIMES.has(mime)) return "video";
  return null;
}

export function validateUploadInput(input: {
  filename: string;
  mime: string;
  size: number;
}): FileValidation {
  const ext = extensionOf(input.filename);
  let mime = input.mime.toLowerCase().trim();
  if (mime === "image/jpg" || mime === "image/pjpeg") mime = "image/jpeg";
  if (mime === "application/octet-stream") mime = "";
  const expectedMime = MIME_BY_EXT[ext];
  if (!ext || !expectedMime) {
    return { ok: false, error: "Use JPG, PNG, WebP, GIF, MP4, WebM or MOV" };
  }
  if (!mime) mime = expectedMime;
  if (!IMAGE_MIMES.has(mime) && !VIDEO_MIMES.has(mime)) {
    return { ok: false, error: "Use JPG, PNG, WebP, GIF, MP4, WebM or MOV" };
  }
  const mimeMatchesExt =
    expectedMime === mime ||
    (ext === "jpg" && mime === "image/jpeg") ||
    (ext === "jpeg" && mime === "image/jpeg") ||
    (ext === "heic" && (mime === "image/heic" || mime === "image/heif")) ||
    (ext === "heif" && (mime === "image/heic" || mime === "image/heif"));
  if (!mimeMatchesExt) {
    // Prefer extension when the browser reports a generic/wrong type.
    if (IMAGE_MIMES.has(expectedMime) || VIDEO_MIMES.has(expectedMime)) {
      mime = expectedMime;
    } else {
      return { ok: false, error: "File type does not match the filename" };
    }
  }
  const kind = kindFromMime(mime);
  if (!kind) return { ok: false, error: "Unsupported file type" };
  if (input.size <= 0) return { ok: false, error: "Empty file" };
  const max = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (input.size > max) {
    return {
      ok: false,
      error: kind === "video" ? "Video must be under 256MB" : "Photo must be under 20MB",
    };
  }
  return { ok: true, kind, mime, ext, size: input.size };
}

export function sanitizeOriginalFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 180) || "file";
}

export function privateObjectKey(input: {
  shopId: string;
  mediaId: string;
  ext: string;
  preview?: boolean;
}): string {
  const leaf = input.preview ? `preview.jpg` : `original.${input.ext}`;
  return `private/${input.shopId}/${input.mediaId}/${leaf}`;
}

export function publicObjectKey(storageKey: string): string {
  if (storageKey.startsWith("private/")) {
    return `public/${storageKey.slice("private/".length)}`;
  }
  return `public/${storageKey}`;
}

export function isPublicObjectKey(key: string): boolean {
  return key.startsWith("public/");
}

export function isPrivateObjectKey(key: string): boolean {
  return key.startsWith("private/");
}

export function partCount(size: number, partSize = PART_SIZE): number {
  return Math.max(1, Math.ceil(size / partSize));
}

export function needsMultipart(size: number): boolean {
  return size >= MULTIPART_THRESHOLD;
}
