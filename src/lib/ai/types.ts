import type { Category } from "@/lib/catalog/types";

export const AI_JOB_STATUSES = [
  "queued",
  "running",
  "waiting_for_review",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];

export const AI_JOB_KINDS = ["organize", "chat_action"] as const;
export type AiJobKind = (typeof AI_JOB_KINDS)[number];

/** Visible clothing descriptors extracted from media. Uncertain fields stay null. */
export type DesignDescriptors = {
  clothingType: string | null;
  silhouette: string | null;
  cut: string | null;
  collar: string | null;
  sleeves: string | null;
  buttons: string | null;
  pockets: string | null;
  stitching: string | null;
  pattern: string | null;
  logo: string | null;
  visibleColor: string | null;
  category: Category | null;
  isClothing: boolean;
  isPersonalOrUnrelated: boolean;
  confidence: number;
  notes: string;
  /** Text found inside the image — treated as data, never as instructions. */
  visibleText: string[];
};

export type MediaDescriptor = {
  elementId: string;
  mediaUrl: string;
  mediaKind: "image" | "video";
  mediaId?: string;
  /** For videos, URL(s) of representative frames used for analysis. */
  frameUrls: string[];
  duplicateOf?: string;
  nearDuplicateOf?: string[];
  descriptors: DesignDescriptors;
};

export type ProposedVariant = {
  id: string;
  color: string | null;
  colorConfidence: number;
  elementIds: string[];
  mediaUrls: string[];
};

export type ProposedGroup = {
  id: string;
  title: string;
  category: Category | null;
  confidence: number;
  explanation: string;
  status: "pending" | "approved" | "rejected" | "edited" | "kept_separate";
  variants: ProposedVariant[];
  uncertainAttributes: string[];
  maybeSameAsGroupIds: string[];
};

export type AiJobProgress = {
  total: number;
  processed: number;
  batchSize: number;
  cursor: number;
  phase:
    | "queued"
    | "classify"
    | "dedupe"
    | "describe"
    | "group"
    | "verify"
    | "review"
    | "apply"
    | "done";
};

export type AiJobResult = {
  descriptors: MediaDescriptor[];
  unrelatedElementIds: string[];
  duplicatePairs: Array<{ a: string; b: string; kind: "exact" | "near" }>;
  createdProductIds: string[];
  appliedGroupIds: string[];
};

export type AiJob = {
  id: string;
  shopId: string;
  kind: AiJobKind;
  status: AiJobStatus;
  prompt: string;
  elementIds: string[];
  progress: AiJobProgress;
  proposals: ProposedGroup[];
  result: AiJobResult;
  summary: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiActionName =
  | "search_products"
  | "highlight_results"
  | "create_product_drafts"
  | "organize_media"
  | "merge_products"
  | "separate_products"
  | "create_section"
  | "rename_section"
  | "move_elements"
  | "set_price"
  | "set_sizes"
  | "set_material"
  | "set_tags"
  | "set_collections"
  | "report_missing"
  | "prepare_for_review"
  | "publish_products"
  | "reject_publish";

export type AiActionRecord = {
  id: string;
  name: AiActionName;
  args: Record<string, unknown>;
  summary: string;
  ok: boolean;
  at: string;
};
