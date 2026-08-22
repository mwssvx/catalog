import { z } from "zod";
import {
  applyCollections,
  applyMaterial,
  applyOrganize,
  applyPrice,
  applySizes,
  applyTags,
  cardsFromMedia,
  createSection,
  highlightProducts,
  mergeProducts,
  missingReport,
  moveElements,
  prepareForReview,
  publishProducts,
  renameSection,
  searchItems,
  separateProducts,
  type OrganizeGroup,
  type ToolResult,
} from "@/lib/ai/actions";
import type { AiActionName, AiActionRecord } from "@/lib/ai/types";
import type { CatalogData } from "@/lib/catalog/types";

const categorySchema = z
  .enum(["tops", "bottoms", "outerwear", "dresses", "shoes", "accessories"])
  .nullable()
  .optional();

const organizeGroupSchema = z.object({
  title: z.string().max(200),
  category: categorySchema,
  confidence: z.enum(["high", "low"]),
  variants: z
    .array(
      z.object({
        color: z.string().max(80).nullable().optional(),
        mediaUrls: z.array(z.string().max(2000)).max(40),
      }),
    )
    .max(30),
});

export const aiActionSchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("search_products"),
    args: z.object({ query: z.string().max(200) }),
  }),
  z.object({
    name: z.literal("highlight_results"),
    args: z.object({ productIds: z.array(z.string().max(80)).max(200) }),
  }),
  z.object({
    name: z.literal("create_product_drafts"),
    args: z.object({ elementIds: z.array(z.string().max(80)).max(200) }),
  }),
  z.object({
    name: z.literal("organize_media"),
    args: z.object({ groups: z.array(organizeGroupSchema).max(100) }),
  }),
  z.object({
    name: z.literal("merge_products"),
    args: z.object({
      keepId: z.string().max(80),
      absorbIds: z.array(z.string().max(80)).max(40),
    }),
  }),
  z.object({
    name: z.literal("separate_products"),
    args: z.object({
      productId: z.string().max(80),
      variantIds: z.array(z.string().max(80)).max(40),
    }),
  }),
  z.object({
    name: z.literal("create_section"),
    args: z.object({
      title: z.string().max(120),
      elementIds: z.array(z.string().max(80)).max(200).optional(),
    }),
  }),
  z.object({
    name: z.literal("rename_section"),
    args: z.object({
      sectionId: z.string().max(80),
      title: z.string().max(120),
    }),
  }),
  z.object({
    name: z.literal("move_elements"),
    args: z.object({
      elementIds: z.array(z.string().max(80)).max(200),
      x: z.number().finite(),
      y: z.number().finite(),
    }),
  }),
  z.object({
    name: z.literal("set_price"),
    args: z.object({
      productIds: z.array(z.string().max(80)).max(200),
      price: z.number().finite().nonnegative(),
    }),
  }),
  z.object({
    name: z.literal("set_sizes"),
    args: z.object({
      productIds: z.array(z.string().max(80)).max(200),
      sizes: z.array(z.string().max(32)).max(40),
    }),
  }),
  z.object({
    name: z.literal("set_material"),
    args: z.object({
      productIds: z.array(z.string().max(80)).max(200),
      material: z.string().max(120),
    }),
  }),
  z.object({
    name: z.literal("set_tags"),
    args: z.object({
      productIds: z.array(z.string().max(80)).max(200),
      tags: z.array(z.string().max(40)).max(40),
    }),
  }),
  z.object({
    name: z.literal("set_collections"),
    args: z.object({
      productIds: z.array(z.string().max(80)).max(200),
      collections: z.array(z.string().max(80)).max(40),
    }),
  }),
  z.object({
    name: z.literal("report_missing"),
    args: z.object({}).default({}),
  }),
  z.object({
    name: z.literal("prepare_for_review"),
    args: z.object({
      productIds: z.array(z.string().max(80)).max(200).optional(),
    }),
  }),
  z.object({
    name: z.literal("publish_products"),
    args: z.object({
      productIds: z.array(z.string().max(80)).max(200),
      published: z.boolean(),
      confirmPublish: z.boolean(),
      requireComplete: z.boolean().optional(),
    }),
  }),
  z.object({
    name: z.literal("reject_publish"),
    args: z.object({ reason: z.string().max(400).optional() }),
  }),
]);

export type ValidatedAiAction = z.infer<typeof aiActionSchema>;

function asResult(summary: string, ok = true): ToolResult {
  return { ok, summary };
}

/**
 * Server-side validated AI action runner.
 * Every mutation goes through this — scoped by caller to authenticated shop catalog.
 */
export function executeAiAction(
  data: CatalogData,
  raw: unknown,
  context?: { selectedElementIds?: string[]; allowPublish?: boolean },
): AiActionRecord {
  const action = aiActionSchema.parse(raw);
  const selected = context?.selectedElementIds ?? [];
  let result: ToolResult;
  let highlighted: string[] = [];

  switch (action.name) {
    case "search_products": {
      const found = searchItems(data, action.args.query);
      highlighted = highlightProducts(
        data,
        found.map((item) => item.id),
      );
      result = asResult(
        `Found ${found.length}: ${found.map((item) => item.code).join(", ") || "none"}.`,
      );
      break;
    }
    case "highlight_results":
      highlighted = highlightProducts(data, action.args.productIds);
      result = asResult(`Highlighted ${highlighted.length} board cards.`);
      break;
    case "create_product_drafts":
      result = cardsFromMedia(
        data,
        action.args.elementIds.length ? action.args.elementIds : selected,
      );
      break;
    case "organize_media":
      result = applyOrganize(
        data,
        action.args.groups.map((group) => ({
          ...group,
          category: group.category ?? null,
          variants: group.variants.map((variant) => ({
            color: variant.color ?? null,
            mediaUrls: variant.mediaUrls,
          })),
        })) as OrganizeGroup[],
      );
      break;
    case "merge_products":
      result = mergeProducts(data, action.args.keepId, action.args.absorbIds);
      break;
    case "separate_products":
      result = separateProducts(
        data,
        action.args.productId,
        action.args.variantIds,
      );
      break;
    case "create_section":
      result = createSection(
        data,
        action.args.title,
        action.args.elementIds ?? selected,
      );
      break;
    case "rename_section":
      result = renameSection(data, action.args.sectionId, action.args.title);
      break;
    case "move_elements":
      result = moveElements(
        data,
        action.args.elementIds,
        action.args.x,
        action.args.y,
      );
      break;
    case "set_price":
      result = applyPrice(data, action.args.productIds, action.args.price);
      break;
    case "set_sizes":
      result = applySizes(data, action.args.productIds, action.args.sizes);
      break;
    case "set_material":
      result = applyMaterial(data, action.args.productIds, action.args.material);
      break;
    case "set_tags":
      result = applyTags(data, action.args.productIds, action.args.tags);
      break;
    case "set_collections":
      result = applyCollections(
        data,
        action.args.productIds,
        action.args.collections,
      );
      break;
    case "report_missing":
      result = asResult(missingReport(data));
      break;
    case "prepare_for_review":
      result = prepareForReview(data, action.args.productIds ?? []);
      break;
    case "publish_products":
      if (!action.args.confirmPublish || !context?.allowPublish) {
        result = asResult(
          "Publish blocked. Seller must explicitly confirm publish in a separate step.",
          false,
        );
      } else {
        result = publishProducts(
          data,
          action.args.productIds,
          action.args.published,
          Boolean(action.args.requireComplete),
        );
      }
      break;
    case "reject_publish":
      result = asResult(
        action.args.reason || "Publish cancelled. Nothing was published.",
      );
      break;
    default: {
      const _exhaustive: never = action;
      result = asResult(`Unknown action ${String(_exhaustive)}`, false);
    }
  }

  return {
    id: crypto.randomUUID(),
    name: action.name as AiActionName,
    args: action.args as Record<string, unknown>,
    summary: result.summary,
    ok: result.ok,
    at: new Date().toISOString(),
  };
}

export function toolNameToActionName(tool: string): AiActionName | null {
  const map: Record<string, AiActionName> = {
    search_products: "search_products",
    highlight_results: "highlight_results",
    create_cards_from_media: "create_product_drafts",
    create_product_drafts: "create_product_drafts",
    organize_media: "organize_media",
    merge_products: "merge_products",
    separate_products: "separate_products",
    create_section: "create_section",
    rename_section: "rename_section",
    move_elements: "move_elements",
    set_price: "set_price",
    set_sizes: "set_sizes",
    set_material: "set_material",
    set_tags: "set_tags",
    set_collections: "set_collections",
    missing_report: "report_missing",
    report_missing: "report_missing",
    prepare_for_review: "prepare_for_review",
    publish_products: "publish_products",
    reject_publish: "reject_publish",
  };
  return map[tool] ?? null;
}
