import { promises as fs } from "node:fs";
import path from "node:path";
import { boardFromItems, emptyBoard } from "@/lib/board/layout";
import { flattenMedia, nextProductCode } from "@/lib/catalog/codes";
import type {
  BoardSnapshot,
  CatalogData,
  HistoryEntry,
  Item,
  ItemFilters,
  ItemInput,
  Shop,
  Suggestion,
} from "@/lib/catalog/types";

const DATA_PATH = path.join(process.cwd(), "data", "catalog.json");
const MAX_HISTORY = 40;

const seedItems: Array<Partial<Item> & { id: string; title: string }> = [
  {
    id: "seed-cotton-shirt",
    title: "Хлопковая рубашка",
    notes: "хлопковая рубашка M/L, 1500 сом, осталось 4, почти новая",
    price: 1500,
    sizes: ["M", "L"],
    quantity: 4,
    material: "хлопок",
    category: "tops",
    condition: "like-new",
    status: "in_stock",
    photos: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b85?auto=format&fit=crop&w=1200&q=80",
    ],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "seed-jeans",
    title: "Широкие джинсы",
    notes: "джинсы 32, 1800 сом, 2 шт, хлопок, хорошее",
    price: 1800,
    sizes: ["32"],
    quantity: 2,
    material: "хлопок",
    category: "bottoms",
    condition: "good",
    status: "in_stock",
    photos: [
      "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1200&q=80",
    ],
    createdAt: "2026-08-02T10:00:00.000Z",
    updatedAt: "2026-08-02T10:00:00.000Z",
  },
  {
    id: "seed-coat",
    title: "Шерстяное пальто",
    notes: "пальто M, 4500 сом, шерсть, новое, осталось 1",
    price: 4500,
    sizes: ["M"],
    quantity: 1,
    material: "шерсть",
    category: "outerwear",
    condition: "new",
    status: "in_stock",
    photos: [
      "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1200&q=80",
    ],
    createdAt: "2026-08-03T10:00:00.000Z",
    updatedAt: "2026-08-03T10:00:00.000Z",
  },
  {
    id: "seed-dress",
    title: "Чёрное платье",
    notes: "платье S/M, 2200 сом, вискоза, новое, отложено",
    price: 2200,
    sizes: ["S", "M"],
    quantity: 1,
    material: "вискоза",
    category: "dresses",
    condition: "new",
    status: "reserved",
    photos: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1200&q=80",
    ],
    createdAt: "2026-08-04T10:00:00.000Z",
    updatedAt: "2026-08-04T10:00:00.000Z",
  },
  {
    id: "seed-sneakers",
    title: "Белые кроссовки",
    notes: "кроссовки 42, 1200 сом, продано",
    price: 1200,
    sizes: ["42"],
    quantity: 0,
    material: null,
    category: "shoes",
    condition: "worn",
    status: "sold",
    photos: [
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80",
    ],
    createdAt: "2026-08-05T10:00:00.000Z",
    updatedAt: "2026-08-05T10:00:00.000Z",
  },
  {
    id: "seed-belt",
    title: "Кожаный ремень",
    notes: "ремень M, 700 сом, кожа, почти новый, 3 шт",
    price: 700,
    sizes: ["M"],
    quantity: 3,
    material: "кожа",
    category: "accessories",
    condition: "like-new",
    status: "in_stock",
    photos: [
      "https://images.unsplash.com/photo-1624222247344-550fb60583c2?auto=format&fit=crop&w=1200&q=80",
    ],
    createdAt: "2026-08-06T10:00:00.000Z",
    updatedAt: "2026-08-06T10:00:00.000Z",
  },
];

function normalizeShop(shop: Partial<Shop> | undefined): Shop {
  return {
    name: shop?.name || "Dordoi",
    tagline: shop?.tagline ?? "",
    location: shop?.location || "Дордой базар, Бишкек",
    whatsapp: shop?.whatsapp || process.env.SHOP_WHATSAPP || "",
    currency: shop?.currency || "KGS",
    currencySymbol: shop?.currencySymbol || "сом",
  };
}

export function normalizeItem(
  raw: Partial<Item> & { id: string; title?: string },
  siblings: Item[] = [],
): Item {
  const photos = raw.photos ?? [];
  const videos = raw.videos ?? [];
  const variants =
    raw.variants && raw.variants.length > 0
      ? raw.variants
      : [
          {
            id: `${raw.id}-v1`,
            color: null,
            photos,
            videos,
          },
        ];
  const now = new Date().toISOString();
  const item: Item = {
    id: raw.id,
    code: raw.code || nextProductCode(siblings, raw.category ?? null),
    title: raw.title?.trim() || "Без названия",
    notes: raw.notes ?? "",
    description: raw.description ?? "",
    price: raw.price ?? null,
    wholesalePrice: raw.wholesalePrice ?? null,
    minWholesaleQty: raw.minWholesaleQty ?? null,
    sizes: raw.sizes ?? [],
    quantity: raw.quantity ?? null,
    material: raw.material ?? null,
    origin: raw.origin ?? null,
    category: raw.category ?? null,
    subcategory: raw.subcategory ?? null,
    condition: raw.condition ?? null,
    status: raw.status ?? "in_stock",
    tags: raw.tags ?? [],
    collections: raw.collections ?? [],
    published: raw.published !== false,
    photos,
    videos,
    variants,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
  };
  const media = flattenMedia(item);
  item.photos = media.photos;
  item.videos = media.videos;
  return item;
}

function normalizeData(raw: {
  shop?: Partial<Shop>;
  items?: Array<Partial<Item> & { id: string }>;
  board?: BoardSnapshot;
  history?: HistoryEntry[];
  suggestions?: Suggestion[];
}): CatalogData {
  const items: Item[] = [];
  for (const entry of raw.items ?? []) {
    items.push(normalizeItem(entry, items));
  }
  const board =
    raw.board && Array.isArray(raw.board.elements)
      ? raw.board
      : items.length > 0
        ? boardFromItems(items)
        : emptyBoard();
  return {
    shop: normalizeShop(raw.shop),
    items,
    board: {
      camera: raw.board?.camera ?? { x: 0, y: 0, zoom: 1 },
      elements: board.elements,
    },
    history: raw.history ?? [],
    suggestions: raw.suggestions ?? [],
  };
}

function seedData(): CatalogData {
  return normalizeData({
    shop: {
      name: "Dordoi",
      tagline: "",
      location: "Дордой базар, Бишкек",
      whatsapp: "996700000000",
      currency: "KGS",
      currencySymbol: "сом",
    },
    items: seedItems as Array<Partial<Item> & { id: string }>,
  });
}

function pushHistory(data: CatalogData, label: string) {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    label,
    at: new Date().toISOString(),
    board: structuredClone(data.board),
    items: structuredClone(data.items),
  };
  data.history = [...(data.history ?? []), entry].slice(-MAX_HISTORY);
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readData(): Promise<CatalogData> {
  const raw = await fs.readFile(DATA_PATH, "utf8");
  return normalizeData(JSON.parse(raw) as {
    shop?: Partial<Shop>;
    items?: Array<Partial<Item> & { id: string }>;
    board?: BoardSnapshot;
    history?: HistoryEntry[];
    suggestions?: Suggestion[];
  });
}

async function writeData(data: CatalogData) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
}

async function loadData(): Promise<CatalogData> {
  try {
    return await readData();
  } catch {
    const data = seedData();
    await writeData(data);
    return data;
  }
}

async function ensureData(): Promise<CatalogData> {
  return enqueue(loadData);
}

async function mutate<T>(fn: (data: CatalogData) => T): Promise<T> {
  return enqueue(async () => {
    const data = await loadData();
    const result = fn(data);
    await writeData(data);
    return result;
  });
}

export async function mutateAsync<T>(
  fn: (data: CatalogData) => Promise<T> | T,
  historyLabel?: string,
): Promise<T> {
  return enqueue(async () => {
    const data = await loadData();
    if (historyLabel) pushHistory(data, historyLabel);
    const result = await fn(data);
    await writeData(data);
    return result;
  });
}

export async function getCatalog(): Promise<CatalogData> {
  return ensureData();
}

export async function getShop(): Promise<Shop> {
  const data = await ensureData();
  return data.shop;
}

export async function getBoard(): Promise<BoardSnapshot> {
  const data = await ensureData();
  return data.board;
}

export async function getSuggestions(): Promise<Suggestion[]> {
  const data = await ensureData();
  return data.suggestions;
}

export async function listItems(filters: ItemFilters = {}): Promise<Item[]> {
  const data = await ensureData();
  const query = filters.q?.trim().toLowerCase();
  return data.items
    .filter((item) => {
      if (item.status === "hidden" && filters.status !== "all") return false;
      if (filters.published === true && !item.published) return false;

      if (filters.status === "available") {
        if (item.status !== "in_stock" && item.status !== "reserved") {
          return false;
        }
      } else if (
        filters.status &&
        filters.status !== "all" &&
        item.status !== filters.status
      ) {
        return false;
      }

      if (
        filters.category &&
        filters.category !== "all" &&
        item.category !== filters.category
      ) {
        return false;
      }

      if (
        filters.size &&
        filters.size !== "all" &&
        !item.sizes.includes(filters.size)
      ) {
        return false;
      }

      if (filters.collection && !item.collections.includes(filters.collection)) {
        return false;
      }

      if (query) {
        const haystack = [
          item.title,
          item.code,
          item.notes,
          item.description,
          item.material,
          item.tags.join(" "),
          item.collections.join(" "),
          ...item.variants.map((variant) => variant.color ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export async function getItem(id: string): Promise<Item | null> {
  const data = await ensureData();
  return (
    data.items.find((item) => item.id === id || item.code === id) ?? null
  );
}

function applyInput(current: Item, input: ItemInput, siblings: Item[]): Item {
  const next: Item = {
    ...current,
    title: input.title?.trim() || current.title,
    notes: input.notes ?? current.notes,
    description:
      input.description === undefined ? current.description : input.description,
    price: input.price === undefined ? current.price : input.price,
    wholesalePrice:
      input.wholesalePrice === undefined
        ? current.wholesalePrice
        : input.wholesalePrice,
    minWholesaleQty:
      input.minWholesaleQty === undefined
        ? current.minWholesaleQty
        : input.minWholesaleQty,
    sizes: input.sizes ?? current.sizes,
    quantity: input.quantity === undefined ? current.quantity : input.quantity,
    material:
      input.material === undefined
        ? current.material
        : input.material?.trim() || null,
    origin: input.origin === undefined ? current.origin : input.origin,
    category: input.category === undefined ? current.category : input.category,
    subcategory:
      input.subcategory === undefined ? current.subcategory : input.subcategory,
    condition:
      input.condition === undefined ? current.condition : input.condition,
    status: input.status ?? current.status,
    tags: input.tags ?? current.tags,
    collections: input.collections ?? current.collections,
    published: input.published ?? current.published,
    photos: input.photos ?? current.photos,
    videos: input.videos ?? current.videos,
    variants: input.variants ?? current.variants,
    updatedAt: new Date().toISOString(),
  };
  if (!next.code) next.code = nextProductCode(siblings, next.category);
  const media = flattenMedia(next);
  next.photos = media.photos;
  next.videos = media.videos;
  return next;
}

export async function createItem(input: ItemInput): Promise<Item> {
  const now = new Date().toISOString();
  return mutate((data) => {
    const item = normalizeItem(
      {
        id: crypto.randomUUID(),
        title: input.title,
        notes: input.notes,
        description: input.description,
        price: input.price,
        wholesalePrice: input.wholesalePrice,
        minWholesaleQty: input.minWholesaleQty,
        sizes: input.sizes,
        quantity: input.quantity,
        material: input.material,
        origin: input.origin,
        category: input.category,
        subcategory: input.subcategory,
        condition: input.condition,
        status: input.status,
        tags: input.tags,
        collections: input.collections,
        published: input.published,
        photos: input.photos,
        videos: input.videos,
        variants: input.variants,
        code: input.code,
        createdAt: now,
        updatedAt: now,
      },
      data.items,
    );
    data.items.unshift(item);
    return item;
  });
}

export async function updateItem(
  id: string,
  input: ItemInput,
): Promise<Item | null> {
  return mutate((data) => {
    const index = data.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const next = applyInput(data.items[index], input, data.items);
    data.items[index] = next;
    return next;
  });
}

export async function deleteItem(id: string): Promise<boolean> {
  return mutate((data) => {
    const nextItems = data.items.filter((item) => item.id !== id);
    if (nextItems.length === data.items.length) return false;
    data.items = nextItems;
    data.board.elements = data.board.elements.filter(
      (element) => element.productId !== id,
    );
    return true;
  });
}

export async function saveBoard(board: BoardSnapshot): Promise<BoardSnapshot> {
  return mutate((data) => {
    data.board = board;
    return data.board;
  });
}

export async function undoLast(): Promise<boolean> {
  return mutate((data) => {
    const entry = data.history.pop();
    if (!entry) return false;
    data.board = entry.board;
    data.items = entry.items;
    return true;
  });
}

export async function availableSizes(): Promise<string[]> {
  const items = await listItems({ status: "all", published: true });
  return [...new Set(items.flatMap((item) => item.sizes))].sort();
}

export async function availableCollections(): Promise<string[]> {
  const items = await listItems({ status: "all", published: true });
  return [...new Set(items.flatMap((item) => item.collections))].sort();
}

export function missingFields(item: Item): string[] {
  const missing: string[] = [];
  if (item.price == null) missing.push("price");
  if (item.sizes.length === 0) missing.push("sizes");
  if (!item.material) missing.push("material");
  if (item.photos.length === 0) missing.push("photo");
  return missing;
}
