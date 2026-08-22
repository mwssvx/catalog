import type { BoardElement, BoardSnapshot, CatalogData, Item } from "@/lib/catalog/types";
import { nextZIndex } from "@/lib/board/layout";

export type ToolResult = { ok: boolean; summary: string };

function cloneElements(elements: BoardElement[]): BoardElement[] {
  return elements.map((element) => ({
    ...element,
    memberIds: element.memberIds ? [...element.memberIds] : undefined,
  }));
}

export function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function elementsInBox(
  elements: BoardElement[],
  box: { x: number; y: number; width: number; height: number },
): string[] {
  const normalized = {
    x: Math.min(box.x, box.x + box.width),
    y: Math.min(box.y, box.y + box.height),
    width: Math.abs(box.width),
    height: Math.abs(box.height),
  };
  return elements
    .filter((element) =>
      rectsIntersect(normalized, {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      }),
    )
    .map((element) => element.id);
}

export function duplicateElements(
  elements: BoardElement[],
  ids: string[],
  offset = 24,
): BoardElement[] {
  const selected = new Set(ids);
  const copies: BoardElement[] = [];
  let z = nextZIndex(elements);
  for (const element of elements) {
    if (!selected.has(element.id)) continue;
    copies.push({
      ...element,
      id: crypto.randomUUID(),
      x: element.x + offset,
      y: element.y + offset,
      zIndex: z,
      memberIds: element.memberIds ? [...element.memberIds] : undefined,
    });
    z += 1;
  }
  return [...elements, ...copies];
}

export function deleteElements(
  elements: BoardElement[],
  ids: string[],
): BoardElement[] {
  const remove = new Set(ids);
  return elements
    .filter((element) => !remove.has(element.id))
    .map((element) => ({
      ...element,
      memberIds: element.memberIds?.filter((id) => !remove.has(id)),
      sectionId: element.sectionId && remove.has(element.sectionId)
        ? undefined
        : element.sectionId,
      groupId: element.groupId && remove.has(element.groupId)
        ? undefined
        : element.groupId,
    }));
}

export function bringForward(elements: BoardElement[], ids: string[]): BoardElement[] {
  const selected = new Set(ids);
  const max = elements.reduce((value, element) => Math.max(value, element.zIndex), 0);
  return elements.map((element) =>
    selected.has(element.id) ? { ...element, zIndex: max + 1 } : element,
  );
}

export function sendBackward(elements: BoardElement[], ids: string[]): BoardElement[] {
  const selected = new Set(ids);
  const min = elements.reduce(
    (value, element) => Math.min(value, element.zIndex),
    Number.POSITIVE_INFINITY,
  );
  const floor = Number.isFinite(min) ? min - 1 : 0;
  return elements.map((element) =>
    selected.has(element.id) ? { ...element, zIndex: floor } : element,
  );
}

export function groupElements(
  elements: BoardElement[],
  ids: string[],
  title = "Группа",
): BoardElement[] {
  const selected = elements.filter((element) => ids.includes(element.id));
  if (selected.length < 2) return elements;
  const xs = selected.map((element) => element.x);
  const ys = selected.map((element) => element.y);
  const rights = selected.map((element) => element.x + element.width);
  const bottoms = selected.map((element) => element.y + element.height);
  const x = Math.min(...xs) - 12;
  const y = Math.min(...ys) - 36;
  const width = Math.max(...rights) - x + 12;
  const height = Math.max(...bottoms) - y + 12;
  const groupId = crypto.randomUUID();
  const group: BoardElement = {
    id: groupId,
    type: "group",
    x,
    y,
    width,
    height,
    zIndex: nextZIndex(elements),
    title,
    memberIds: selected.map((element) => element.id),
  };
  return [
    ...elements.map((element) =>
      ids.includes(element.id) ? { ...element, groupId } : element,
    ),
    group,
  ];
}

export function ungroupElements(
  elements: BoardElement[],
  groupIds: string[],
): BoardElement[] {
  const remove = new Set(groupIds);
  return elements
    .filter((element) => !(element.type === "group" && remove.has(element.id)))
    .map((element) =>
      element.groupId && remove.has(element.groupId)
        ? { ...element, groupId: undefined }
        : element,
    );
}

export function createCollectionFrame(
  elements: BoardElement[],
  ids: string[],
  title: string,
): BoardElement[] {
  const selected = elements.filter((element) => ids.includes(element.id));
  if (!selected.length) {
    const id = crypto.randomUUID();
    return [
      ...elements,
      {
        id,
        type: "collection",
        x: 80,
        y: 80,
        width: 420,
        height: 320,
        zIndex: nextZIndex(elements),
        title,
        memberIds: [],
      },
    ];
  }
  const xs = selected.map((element) => element.x);
  const ys = selected.map((element) => element.y);
  const rights = selected.map((element) => element.x + element.width);
  const bottoms = selected.map((element) => element.y + element.height);
  const id = crypto.randomUUID();
  const frame: BoardElement = {
    id,
    type: "collection",
    x: Math.min(...xs) - 16,
    y: Math.min(...ys) - 40,
    width: Math.max(...rights) - Math.min(...xs) + 32,
    height: Math.max(...bottoms) - Math.min(...ys) + 56,
    zIndex: 0,
    title,
    memberIds: selected.map((element) => element.id),
  };
  return [
    frame,
    ...elements.map((element) =>
      ids.includes(element.id) ? { ...element, sectionId: id } : element,
    ),
  ];
}

export function moveMembersWithParent(
  elements: BoardElement[],
  parentId: string,
  dx: number,
  dy: number,
): BoardElement[] {
  const parent = elements.find((element) => element.id === parentId);
  if (!parent?.memberIds?.length) {
    return elements.map((element) =>
      element.id === parentId
        ? { ...element, x: element.x + dx, y: element.y + dy }
        : element,
    );
  }
  const members = new Set(parent.memberIds);
  return elements.map((element) => {
    if (element.id === parentId || members.has(element.id)) {
      return { ...element, x: element.x + dx, y: element.y + dy };
    }
    return element;
  });
}

export function updateElementText(
  elements: BoardElement[],
  id: string,
  patch: { text?: string; title?: string },
): BoardElement[] {
  return elements.map((element) =>
    element.id === id ? { ...element, ...patch } : element,
  );
}

export function withBoardVersion(
  board: BoardSnapshot,
  version: number,
): BoardSnapshot {
  return { ...board, version, elements: cloneElements(board.elements) };
}

export function attachMediaToProduct(
  data: CatalogData,
  elementIds: string[],
  productId: string,
): ToolResult {
  const item = data.items.find((entry) => entry.id === productId);
  if (!item) return { ok: false, summary: "Product not found." };
  const media = data.board.elements.filter(
    (element) =>
      elementIds.includes(element.id) &&
      element.type === "media" &&
      element.mediaUrl,
  );
  if (!media.length) return { ok: false, summary: "Select photos or videos." };
  for (const element of media) {
    const url = element.mediaUrl!;
    if (element.mediaKind === "video") {
      if (!item.videos.includes(url)) item.videos.push(url);
      const variant = item.variants[0];
      if (variant && !variant.videos.includes(url)) variant.videos.push(url);
    } else {
      if (!item.photos.includes(url)) item.photos.push(url);
      const variant = item.variants[0];
      if (variant && !variant.photos.includes(url)) variant.photos.push(url);
    }
    element.type = "product";
    element.productId = item.id;
    element.width = 250;
    element.height = 310;
  }
  item.updatedAt = new Date().toISOString();
  return { ok: true, summary: `Attached ${media.length} media to ${item.code}.` };
}

export function applyBoardMutation(
  board: BoardSnapshot,
  mutate: (elements: BoardElement[]) => BoardElement[],
): BoardSnapshot {
  return {
    ...board,
    elements: mutate(cloneElements(board.elements)),
  };
}

export function looseMedia(items: Item[], board: BoardSnapshot): BoardElement[] {
  return board.elements.filter((element) => element.type === "media");
}
