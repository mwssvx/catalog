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

/** Built-in category keys; shops may also define custom labels. */
export type Category = (typeof CATEGORIES)[number] | (string & {});
export type Condition = (typeof CONDITIONS)[number];
export type Status = (typeof STATUSES)[number];

/** Default catalog facets for Velviera sleepwear (shops may customize). */
export const DEFAULT_SHOP_CATEGORIES: string[] = [
  "sets",
  "nightdresses",
  "robes",
  "loungewear",
  "accessories",
];

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
  instagram: string;
  telegram: string;
  currency: string;
  currencySymbol: string;
  logoUrl: string;
  coverUrl: string;
  /** Category keys/labels the owner offers in filters and item form. */
  categories: string[];
  /** Optional circle photo URL per category key/label. */
  categoryPhotos: Record<string, string>;
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
  category?: string | "all";
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
  instagram?: string;
  telegram?: string;
  currency?: string;
  currencySymbol?: string;
  logoUrl?: string;
  coverUrl?: string;
  categories?: string[];
  categoryPhotos?: Record<string, string>;
};

export type BulkItemInput = {
  ids: string[];
  published?: boolean;
  status?: Status;
};
