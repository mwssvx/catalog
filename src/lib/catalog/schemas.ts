import { z } from "zod";
import { CATEGORIES, CONDITIONS, STATUSES } from "@/lib/catalog/types";

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: z.string().min(6).max(200),
  })
  .strict();

export const categorySchema = z.enum(CATEGORIES);
export const conditionSchema = z.enum(CONDITIONS);
export const statusSchema = z.enum(STATUSES);

const nullableString = z.string().max(2000).nullable();

export const productVariantSchema = z
  .object({
    id: z.string().min(1).max(80),
    color: z.string().max(80).nullable(),
    photos: z.array(z.string().max(2000)).max(40),
    videos: z.array(z.string().max(2000)).max(20),
  })
  .strict();

export const itemInputSchema = z
  .object({
    title: z.string().max(200).optional(),
    notes: z.string().max(8000).optional(),
    description: z.string().max(8000).optional(),
    price: z.number().finite().nonnegative().nullable().optional(),
    wholesalePrice: z.number().finite().nonnegative().nullable().optional(),
    minWholesaleQty: z.number().int().positive().nullable().optional(),
    sizes: z.array(z.string().max(32)).max(40).optional(),
    quantity: z.number().int().nonnegative().nullable().optional(),
    material: nullableString.optional(),
    origin: nullableString.optional(),
    category: categorySchema.nullable().optional(),
    subcategory: nullableString.optional(),
    condition: conditionSchema.nullable().optional(),
    status: statusSchema.optional(),
    tags: z.array(z.string().max(40)).max(40).optional(),
    collections: z.array(z.string().max(80)).max(40).optional(),
    published: z.boolean().optional(),
    photos: z.array(z.string().max(2000)).max(40).optional(),
    videos: z.array(z.string().max(2000)).max(20).optional(),
    variants: z.array(productVariantSchema).max(30).optional(),
    code: z.string().max(32).optional(),
  })
  .strict();

export const itemFiltersSchema = z
  .object({
    status: z
      .enum([...STATUSES, "available", "all"] as const)
      .optional(),
    category: z.union([categorySchema, z.literal("all")]).optional(),
    size: z.string().max(32).optional(),
    published: z.boolean().optional(),
    q: z.string().max(200).optional(),
    collection: z.string().max(80).optional(),
    missing: z.boolean().optional(),
  })
  .strict();

export const boardSnapshotSchema = z
  .object({
    camera: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        zoom: z.number().finite().positive().max(8),
      })
      .strict(),
    elements: z.array(z.record(z.string(), z.unknown())).max(2000),
    version: z.number().int().positive().optional(),
  })
  .strict();

export const parseNotesSchema = z
  .object({
    notes: z.string().max(8000).optional(),
  })
  .strict();

export const boardCommandSchema = z
  .object({
    command: z.enum([
      "cards",
      "attach_media",
      "section",
      "collection",
      "group",
      "ungroup",
      "duplicate",
      "delete",
      "bring_forward",
      "send_backward",
      "label",
      "note",
      "price",
      "sizes",
      "material",
      "publish",
    ]),
    elementIds: z.array(z.string().max(80)).max(200).optional(),
    productIds: z.array(z.string().max(80)).max(200).optional(),
    productId: z.string().max(80).optional(),
    title: z.string().max(120).optional(),
    text: z.string().max(4000).optional(),
    price: z.number().finite().nonnegative().optional(),
    sizes: z.array(z.string().max(32)).max(40).optional(),
    material: z.string().max(120).optional(),
    published: z.boolean().optional(),
    requireComplete: z.boolean().optional(),
  })
  .strict();

export const saveBoardBodySchema = z
  .object({
    board: boardSnapshotSchema,
    expectedVersion: z.number().int().nonnegative(),
  })
  .strict();

export const boardUndoSchema = z
  .object({
    action: z.enum(["undo", "restore"]),
    versionId: z.string().uuid().optional(),
  })
  .strict();

export const shopUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    tagline: z.string().max(400).optional(),
    location: z.string().max(200).optional(),
    whatsapp: z.string().max(32).optional(),
    currency: z.string().trim().min(1).max(8).optional(),
    currencySymbol: z.string().trim().min(1).max(12).optional(),
    logoUrl: z.string().max(2000).optional(),
    coverUrl: z.string().max(2000).optional(),
  })
  .strict();

export const bulkItemsSchema = z
  .object({
    ids: z.array(z.string().min(1).max(80)).min(1).max(200),
    published: z.boolean().optional(),
    status: statusSchema.optional(),
    pricePercent: z.number().min(-90).max(500).optional(),
    priceDelta: z.number().min(-1_000_000).max(1_000_000).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.published !== undefined ||
      value.status !== undefined ||
      value.pricePercent !== undefined ||
      value.priceDelta !== undefined,
    { message: "Nothing to update" },
  );

export const aiActSchema = z
  .object({
    message: z.string().min(1).max(4000),
    selectedElementIds: z.array(z.string().max(80)).max(200).optional(),
    locale: z.enum(["ru", "ky"]).optional(),
    confirmDelete: z.boolean().optional(),
  })
  .strict();
