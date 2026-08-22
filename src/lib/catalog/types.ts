export const CATEGORIES = [
  "tops",
  "bottoms",
  "outerwear",
  "dresses",
  "shoes",
  "accessories",
] as const;

export const CONDITIONS = ["new", "like-new", "good", "worn"] as const;

export const STATUSES = ["in_stock", "reserved", "sold", "hidden"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type Status = (typeof STATUSES)[number];

export type ProductVariant = {
  id: string;
  color: string | null;
  photos: string[];
  videos: string[];
};

export type Suggestion = {
  id: string;
  kind: "missing" | "maybe-same" | "unpublished" | "review";
  text: string;
  productIds: string[];
  elementIds?: string[];
};

export type Item = {
  id: string;
  shopId?: string;
  code: string;
  title: string;
  notes: string;
  description: string;
  price: number | null;
  wholesalePrice: number | null;
  minWholesaleQty: number | null;
  sizes: string[];
  quantity: number | null;
  material: string | null;
  origin: string | null;
  category: Category | null;
  subcategory: string | null;
  condition: Condition | null;
  status: Status;
  tags: string[];
  collections: string[];
  published: boolean;
  publishedAt: string | null;
  photos: string[];
  videos: string[];
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
};

export type Shop = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  location: string;
  whatsapp: string;
  currency: string;
  currencySymbol: string;
  logoUrl: string;
  coverUrl: string;
};

export type BoardElementType =
  | "media"
  | "product"
  | "note"
  | "section"
  | "label"
  | "collection"
  | "group";

export type BoardElement = {
  id: string;
  type: BoardElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  productId?: string;
  mediaId?: string;
  mediaUrl?: string;
  mediaKind?: "image" | "video";
  text?: string;
  title?: string;
  color?: string;
  sectionId?: string;
  groupId?: string;
  memberIds?: string[];
};

export type BoardCamera = {
  x: number;
  y: number;
  zoom: number;
};

export type BoardSnapshot = {
  camera: BoardCamera;
  elements: BoardElement[];
  /** Optimistic concurrency token from board_documents.version */
  version: number;
};

export type HistoryEntry = {
  id: string;
  label: string;
  at: string;
  board: BoardSnapshot;
  items: Item[];
};

export type CatalogData = {
  shop: Shop;
  items: Item[];
  board: BoardSnapshot;
  history: HistoryEntry[];
  suggestions: Suggestion[];
};

export type ItemInput = {
  title?: string;
  notes?: string;
  description?: string;
  price?: number | null;
  wholesalePrice?: number | null;
  minWholesaleQty?: number | null;
  sizes?: string[];
  quantity?: number | null;
  material?: string | null;
  origin?: string | null;
  category?: Category | null;
  subcategory?: string | null;
  condition?: Condition | null;
  status?: Status;
  tags?: string[];
  collections?: string[];
  published?: boolean;
  photos?: string[];
  videos?: string[];
  variants?: ProductVariant[];
  code?: string;
};

export type ItemFilters = {
  status?: Status | "available" | "all";
  category?: Category | "all";
  size?: string | "all";
  published?: boolean;
  missing?: boolean;
  q?: string;
  collection?: string;
};

export type ShopInput = {
  name?: string;
  tagline?: string;
  location?: string;
  whatsapp?: string;
  currency?: string;
  currencySymbol?: string;
  logoUrl?: string;
  coverUrl?: string;
};

export type BulkItemInput = {
  ids: string[];
  published?: boolean;
  status?: Status;
};
