import type { Hono } from "hono";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http/respond";
import { createSignedMediaUpload } from "@/lib/media/storage-upload";

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
}
