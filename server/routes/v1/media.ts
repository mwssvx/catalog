import type { Hono } from "hono";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { ValidationError } from "@/lib/http/errors";
import { jsonError, readJson } from "@/lib/http/respond";
import {
  createSignedMediaUpload,
  storeUploadedFile,
} from "@/lib/media/storage-upload";

const signSchema = z
  .object({
    filename: z.string().min(1).max(240),
    mime: z.string().max(80).optional().default(""),
    size: z.number().int().positive(),
  })
  .strict();

export function registerMediaRoutes(app: Hono) {
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
      const form = await c.req.raw.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size <= 0) {
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
