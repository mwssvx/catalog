import type { BoardElement, BoardSnapshot, Item } from "@/lib/catalog/types";

export function emptyBoard(): BoardSnapshot {
  return {
    camera: { x: 0, y: 0, zoom: 1 },
    elements: [],
  };
}

export function boardFromItems(items: Item[]): BoardSnapshot {
  return {
    camera: { x: 0, y: 0, zoom: 1 },
    elements: items.map((item, index) => ({
      id: `el-${item.id}`,
      type: "product" as const,
      x: 72 + (index % 4) * 280,
      y: 72 + Math.floor(index / 4) * 340,
      width: 250,
      height: 310,
      zIndex: index + 1,
      productId: item.id,
    })),
  };
}

export function nextZIndex(elements: BoardElement[]): number {
  return elements.reduce((max, element) => Math.max(max, element.zIndex), 0) + 1;
}

export function cascadePoint(index: number, originX = 80, originY = 80) {
  const col = index % 6;
  const row = Math.floor(index / 6);
  return { x: originX + col * 180, y: originY + row * 200 };
}
