import type { CatalogData, Item } from "@/lib/catalog/types";
import { flattenMedia, nextProductCode } from "@/lib/catalog/codes";
import { cascadePoint, nextZIndex } from "@/lib/board/layout";
import type { Category } from "@/lib/catalog/types";
import { persistableUrl } from "@/lib/media/delivery";
import { missingFields, normalizeItem } from "@/lib/catalog/normalize";

export type ToolResult = {
  ok: boolean;
  summary: string;
};

function itemById(data: CatalogData, id: string): Item | undefined {
  return data.items.find((item) => item.id === id || item.code === id);
}

export function applyPrice(
  data: CatalogData,
  ids: string[],
  price: number,
): ToolResult {
  let count = 0;
  for (const id of ids) {
    const item = itemById(data, id);
    if (!item) continue;
    item.price = price;
    item.updatedAt = new Date().toISOString();
    count += 1;
  }
  return { ok: true, summary: `Updated price on ${count} products.` };
}

export function applySizes(
  data: CatalogData,
  ids: string[],
  sizes: string[],
): ToolResult {
  let count = 0;
  for (const id of ids) {
    const item = itemById(data, id);
    if (!item) continue;
    item.sizes = sizes;
    item.updatedAt = new Date().toISOString();
    count += 1;
  }
  return { ok: true, summary: `Updated sizes on ${count} products.` };
}

export function applyMaterial(
  data: CatalogData,
  ids: string[],
  material: string,
): ToolResult {
  let count = 0;
  for (const id of ids) {
    const item = itemById(data, id);
    if (!item) continue;
    item.material = material;
    item.updatedAt = new Date().toISOString();
    count += 1;
  }
  return { ok: true, summary: `Updated material on ${count} products.` };
}

export function publishProducts(
  data: CatalogData,
  ids: string[],
  published: boolean,
  requireComplete = false,
): ToolResult {
  let count = 0;
  for (const id of ids) {
    const item = itemById(data, id);
    if (!item) continue;
    if (requireComplete && missingFields(item).length > 0) continue;
    item.published = published;
    item.updatedAt = new Date().toISOString();
    count += 1;
  }
  return {
    ok: true,
    summary: published
      ? `Published ${count} products.`
      : `Unpublished ${count} products.`,
  };
}

export function moveElements(
  data: CatalogData,
  elementIds: string[],
  x: number,
  y: number,
): ToolResult {
  const targets = data.board.elements.filter((element) =>
    elementIds.includes(element.id),
  );
  if (targets.length === 0) {
    return { ok: false, summary: "No matching board items to move." };
  }
  const originX = Math.min(...targets.map((element) => element.x));
  const originY = Math.min(...targets.map((element) => element.y));
  for (const element of targets) {
    element.x = x + (element.x - originX);
    element.y = y + (element.y - originY);
  }
  return { ok: true, summary: `Moved ${targets.length} items.` };
}

export function createSection(
  data: CatalogData,
  title: string,
  elementIds: string[],
): ToolResult {
  const members = data.board.elements.filter((element) =>
    elementIds.includes(element.id),
  );
  const padding = 36;
  const xs = members.map((element) => element.x);
  const ys = members.map((element) => element.y);
  const section = {
    id: crypto.randomUUID(),
    type: "section" as const,
    title,
    x: members.length ? Math.min(...xs) - padding : 80,
    y: members.length ? Math.min(...ys) - 64 : 80,
    width: members.length
      ? Math.max(...members.map((element) => element.x + element.width)) -
        Math.min(...xs) +
        padding * 2
      : 520,
    height: members.length
      ? Math.max(...members.map((element) => element.y + element.height)) -
        Math.min(...ys) +
        96
      : 360,
    zIndex: 0,
    color: "#dbe7ff",
  };
  for (const element of data.board.elements) {
    if (element.type === "section") continue;
    element.zIndex = Math.max(element.zIndex, 1);
  }
  data.board.elements.unshift(section);
  for (const member of members) {
    member.sectionId = section.id;
    const item = member.productId ? itemById(data, member.productId) : null;
    if (item && !item.collections.includes(title)) {
      item.collections.push(title);
    }
  }
  return { ok: true, summary: `Created section “${title}”.` };
}

export function cardsFromMedia(
  data: CatalogData,
  elementIds: string[],
): ToolResult {
  const media = data.board.elements.filter(
    (element) =>
      elementIds.includes(element.id) &&
      element.type === "media" &&
      element.mediaUrl,
  );
  if (media.length === 0) {
    return { ok: false, summary: "Select photos or videos first." };
  }
  let created = 0;
  for (const element of media) {
    const ref = persistableUrl(element.mediaUrl!, element.mediaId);
    const isVideo = element.mediaKind === "video";
    const item = normalizeItem(
      {
        id: crypto.randomUUID(),
        title: "Новая вещь",
        photos: isVideo ? [] : [ref],
        videos: isVideo ? [ref] : [],
        published: false,
        status: "in_stock",
      },
      data.items,
    );
    item.code = nextProductCode(data.items, item.category);
    data.items.unshift(item);
    element.type = "product";
    element.productId = item.id;
    element.width = 250;
    element.height = 310;
    created += 1;
  }
  return { ok: true, summary: `Created ${created} product cards.` };
}

export function layoutByCategory(data: CatalogData): ToolResult {
  const groups = new Map<string, Item[]>();
  for (const item of data.items) {
    const key = item.category || "unsorted";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  let column = 0;
  for (const [key, list] of groups) {
    const originX = 80 + column * 640;
    const originY = 80;
    createSection(
      data,
      key,
      data.board.elements
        .filter((element) => list.some((item) => item.id === element.productId))
        .map((element) => element.id),
    );
    list.forEach((item, index) => {
      const point = cascadePoint(index, originX + 24, originY + 56);
      const element = data.board.elements.find(
        (entry) => entry.productId === item.id,
      );
      if (element) {
        element.x = point.x;
        element.y = point.y;
      }
    });
    column += 1;
  }
  return { ok: true, summary: `Laid out ${data.items.length} products by kind.` };
}

export function mergeProducts(
  data: CatalogData,
  keepId: string,
  absorbIds: string[],
): ToolResult {
  const keep = itemById(data, keepId);
  if (!keep) return { ok: false, summary: "Could not find the product to keep." };
  for (const absorbId of absorbIds) {
    if (absorbId === keep.id) continue;
    const absorb = itemById(data, absorbId);
    if (!absorb) continue;
    for (const variant of absorb.variants) keep.variants.push(variant);
    keep.photos = flattenMedia(keep).photos;
    keep.videos = flattenMedia(keep).videos;
    keep.sizes = [...new Set([...keep.sizes, ...absorb.sizes])];
    keep.tags = [...new Set([...keep.tags, ...absorb.tags])];
    data.items = data.items.filter((item) => item.id !== absorb.id);
    for (const element of data.board.elements) {
      if (element.productId === absorb.id) {
        element.productId = keep.id;
        element.type = "media";
        element.mediaUrl = absorb.photos[0] ?? absorb.videos[0];
        element.mediaKind = absorb.photos[0] ? "image" : "video";
      }
    }
  }
  keep.updatedAt = new Date().toISOString();
  return { ok: true, summary: `Merged into ${keep.code}.` };
}

export function searchItems(data: CatalogData, query: string): Item[] {
  const q = query.toLowerCase();
  return data.items.filter((item) => {
    const hay = [
      item.title,
      item.code,
      item.material,
      item.notes,
      item.tags.join(" "),
      item.category,
      ...item.variants.map((variant) => variant.color ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    if (hay.includes(q)) return true;
    if (q.includes("без цены") || q.includes("without price") || q.includes("баасы жок")) {
      return item.price == null;
    }
    if (q.includes("без размера") || q.includes("without size")) {
      return item.sizes.length === 0;
    }
    if (q.includes("не опубликован") || q.includes("unpublished")) {
      return !item.published;
    }
    return false;
  });
}

export function highlightProducts(data: CatalogData, productIds: string[]): string[] {
  const z = nextZIndex(data.board.elements);
  const ids: string[] = [];
  data.board.elements.forEach((element, index) => {
    if (element.productId && productIds.includes(element.productId)) {
      element.zIndex = z + index;
      ids.push(element.id);
    }
  });
  return ids;
}

export function missingReport(data: CatalogData): string {
  const noPrice = data.items.filter((item) => item.price == null).length;
  const noSize = data.items.filter((item) => item.sizes.length === 0).length;
  const noMaterial = data.items.filter((item) => !item.material).length;
  const unpublished = data.items.filter((item) => !item.published).length;
  return [
    `${data.items.length} products.`,
    `Missing prices: ${noPrice}.`,
    `Missing sizes: ${noSize}.`,
    `Missing material: ${noMaterial}.`,
    `Unpublished: ${unpublished}.`,
  ].join(" ");
}

export type OrganizeGroup = {
  title: string;
  category?: Category | null;
  confidence: "high" | "low";
  maybeSameAs?: number;
  variants: Array<{
    color: string | null;
    mediaUrls: string[];
  }>;
};

export function applyOrganize(data: CatalogData, groups: OrganizeGroup[]): ToolResult {
  const media = data.board.elements.filter((element) => element.type === "media");
  const used = new Set<string>();
  let created = 0;
  const low: string[] = [];

  groups.forEach((group, groupIndex) => {
    const allUrls = group.variants.flatMap((variant) => variant.mediaUrls);
    const variants = group.variants.map((variant) => ({
      id: crypto.randomUUID(),
      color: variant.color,
      photos: variant.mediaUrls.flatMap((url) => {
        const element = media.find(
          (entry) => entry.mediaUrl === url && entry.mediaKind !== "video",
        );
        return element ? [persistableUrl(url, element.mediaId)] : [];
      }),
      videos: variant.mediaUrls.flatMap((url) => {
        const element = media.find(
          (entry) => entry.mediaUrl === url && entry.mediaKind === "video",
        );
        return element ? [persistableUrl(url, element.mediaId)] : [];
      }),
    }));

    const item = normalizeItem(
      {
        id: crypto.randomUUID(),
        title: group.title || "Вещь",
        category: group.category ?? null,
        variants,
        published: false,
        status: "in_stock",
      },
      data.items,
    );
    item.code = nextProductCode(data.items, item.category);
    data.items.unshift(item);
    created += 1;

    const origin = cascadePoint(groupIndex, 80, 80);
    const card = {
      id: crypto.randomUUID(),
      type: "product" as const,
      x: origin.x,
      y: origin.y,
      width: 250,
      height: 310,
      zIndex: nextZIndex(data.board.elements),
      productId: item.id,
    };
    data.board.elements.push(card);

    for (const url of allUrls) {
      used.add(url);
      const element = media.find((entry) => entry.mediaUrl === url);
      if (!element) continue;
      element.x = origin.x + 270 + (element.x % 40);
      element.y = origin.y + 20;
      element.sectionId = card.id;
      element.productId = item.id;
    }

    if (group.confidence === "low") {
      low.push(item.id);
      data.suggestions.push({
        id: crypto.randomUUID(),
        kind: "maybe-same",
        text: `These may be the same product as another group: ${item.title}.`,
        productIds: [item.id],
        elementIds: allUrls
          .map((url) => media.find((entry) => entry.mediaUrl === url)?.id)
          .filter((id): id is string => Boolean(id)),
      });
    }
  });

  return {
    ok: true,
    summary: `Organized into ${created} draft products (not published).${low.length ? ` ${low.length} need review.` : ""}`,
  };
}

export function separateProducts(
  data: CatalogData,
  productId: string,
  variantIds: string[],
): ToolResult {
  const item = itemById(data, productId);
  if (!item) return { ok: false, summary: "Product not found." };
  const moving = item.variants.filter((variant) => variantIds.includes(variant.id));
  if (!moving.length) return { ok: false, summary: "No variants to separate." };
  item.variants = item.variants.filter((variant) => !variantIds.includes(variant.id));
  const media = flattenMedia({ ...item, variants: moving });
  const created = normalizeItem(
    {
      id: crypto.randomUUID(),
      title: item.title,
      category: item.category,
      variants: moving,
      photos: media.photos,
      videos: media.videos,
      published: false,
      status: "in_stock",
    },
    data.items,
  );
  created.code = nextProductCode(data.items, created.category);
  data.items.unshift(created);
  item.photos = flattenMedia(item).photos;
  item.videos = flattenMedia(item).videos;
  item.updatedAt = new Date().toISOString();
  const origin = cascadePoint(0, 120, 120);
  data.board.elements.push({
    id: crypto.randomUUID(),
    type: "product",
    x: origin.x,
    y: origin.y,
    width: 250,
    height: 310,
    zIndex: nextZIndex(data.board.elements),
    productId: created.id,
  });
  return {
    ok: true,
    summary: `Separated ${moving.length} variants into draft ${created.code}.`,
  };
}

export function renameSection(
  data: CatalogData,
  sectionId: string,
  title: string,
): ToolResult {
  const section = data.board.elements.find(
    (element) => element.id === sectionId && element.type === "section",
  );
  if (!section) return { ok: false, summary: "Section not found." };
  const previous = section.title;
  section.title = title;
  for (const element of data.board.elements) {
    if (element.sectionId !== sectionId || !element.productId) continue;
    const item = itemById(data, element.productId);
    if (!item) continue;
    item.collections = item.collections
      .map((entry) => (entry === previous ? title : entry))
      .filter((entry, index, list) => list.indexOf(entry) === index);
    if (!item.collections.includes(title)) item.collections.push(title);
  }
  return { ok: true, summary: `Renamed section to “${title}”.` };
}

export function applyTags(
  data: CatalogData,
  ids: string[],
  tags: string[],
): ToolResult {
  let count = 0;
  for (const id of ids) {
    const item = itemById(data, id);
    if (!item) continue;
    item.tags = [...new Set([...item.tags, ...tags.map((tag) => tag.trim()).filter(Boolean)])];
    item.updatedAt = new Date().toISOString();
    count += 1;
  }
  return { ok: true, summary: `Updated tags on ${count} products.` };
}

export function applyCollections(
  data: CatalogData,
  ids: string[],
  collections: string[],
): ToolResult {
  let count = 0;
  for (const id of ids) {
    const item = itemById(data, id);
    if (!item) continue;
    item.collections = [
      ...new Set([
        ...item.collections,
        ...collections.map((entry) => entry.trim()).filter(Boolean),
      ]),
    ];
    item.updatedAt = new Date().toISOString();
    count += 1;
  }
  return { ok: true, summary: `Updated collections on ${count} products.` };
}

export function prepareForReview(
  data: CatalogData,
  productIds: string[],
): ToolResult {
  const ids = productIds.length
    ? productIds
    : data.items.filter((item) => !item.published).map((item) => item.id);
  let count = 0;
  for (const id of ids) {
    const item = itemById(data, id);
    if (!item) continue;
    const missing = missingFields(item);
    data.suggestions.push({
      id: crypto.randomUUID(),
      kind: "review",
      text: missing.length
        ? `${item.code}: needs ${missing.join(", ")} before publish.`
        : `${item.code}: ready for your publish confirmation.`,
      productIds: [item.id],
    });
    count += 1;
  }
  highlightProducts(data, ids);
  return {
    ok: true,
    summary: `Prepared ${count} products for seller review. Nothing published.`,
  };
}

