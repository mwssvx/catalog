import { z } from "zod";

export const uploadIntentSchema = z
  .object({
    filename: z.string().min(1).max(240),
    mime: z.string().min(3).max(80),
    size: z.number().int().positive(),
    checksum: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  })
  .strict();

export const uploadCompleteSchema = z
  .object({
    mediaId: z.string().uuid(),
    parts: z
      .array(
        z
          .object({
            partNumber: z.number().int().positive(),
            etag: z.string().min(2).max(200),
          })
          .strict(),
      )
      .max(10000)
      .optional(),
  })
  .strict();

export const uploadAbortSchema = z
  .object({
    mediaId: z.string().uuid(),
  })
  .strict();

export const uploadPartsSchema = z
  .object({
    mediaId: z.string().uuid(),
    partNumbers: z.array(z.number().int().positive()).min(1).max(200),
  })
  .strict();
