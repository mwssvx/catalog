import type { Hono } from "hono";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { ValidationError } from "@/lib/http/errors";
import { jsonError, readJson } from "@/lib/http/respond";
import {
  createSignedMediaUpload,
  MEDIA_BUCKET,
  storeUploadedFile,
} from "@/lib/media/storage-upload";

const signSchema = z
  .object({
    filename: z.string().min(1).max(240),
    mime: z.string().max(80).optional().default(""),
    size: z.number().int().positive(),
  })
  .strict();

function asUploadFile(value: unknown): File | null {
  if (value instanceof File && value.size > 0) return value;
  if (Array.isArray(value)) {
    const first = value.find((entry) => entry instanceof File && entry.size > 0);
    return first instanceof File ? first : null;
  }
  return null;
}

export function registerMediaRoutes(app: Hono) {
  app.get("/api/v1/media/status", async (c) => {
    try {
      await requireOwner();
      return Response.json({
        ok: true,
        bucket: MEDIA_BUCKET,
        serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.post("/api/v1/media/sign", async (c) => {
    try {
      const viewer = await requireOwner();
      const body = signSchema.parse(await readJson(c.req.raw));
      const signed = await createSignedMediaUpload({
        shopId: viewer.shopId,
        filename: body.filename,
        mime: body.mime,
        size: body.size,
      });
      return Response.json({
        path: signed.path,
        signedUrl: signed.signedUrl,
        token: signed.token,
        publicUrl: signed.publicUrl,
        kind: signed.kind,
      });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.post("/api/v1/media/upload", async (c) => {
    try {
      const viewer = await requireOwner();
      let file: File | null = null;
      try {
        const parsed = await c.req.parseBody({ all: true });
        file = asUploadFile(parsed.file);
      } catch {
        const form = await c.req.raw.formData();
        file = asUploadFile(form.get("file"));
      }
      if (!file) {
        throw new ValidationError("Choose a photo from the gallery");
      }
      const stored = await storeUploadedFile({
        shopId: viewer.shopId,
        filename: file.name || `photo-${Date.now()}.jpg`,
        mime: file.type || "",
        size: file.size,
        body: file,
      });
      return Response.json({
        path: stored.path,
        publicUrl: stored.publicUrl,
        kind: stored.kind,
      });
    } catch (error) {
      return jsonError(error);
    }
  });
}
