/**
 * Typed board commands for studio UI and future AI tools.
 * Keep this list stable; AI should call these rather than inventing ad-hoc mutations.
 */
export const BOARD_COMMANDS = [
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
] as const;

export type BoardCommandName = (typeof BOARD_COMMANDS)[number];

export type BoardCommandInput = {
  command: BoardCommandName;
  elementIds?: string[];
  productIds?: string[];
  productId?: string;
  title?: string;
  text?: string;
  price?: number;
  sizes?: string[];
  material?: string;
  published?: boolean;
  requireComplete?: boolean;
};
