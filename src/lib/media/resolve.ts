import type { Viewer } from "@/lib/catalog/access";
import type { BoardElement, BoardSnapshot } from "@/lib/catalog/types";
import {
  deliveryUrl,
  parseMediaRef,
  persistableUrl,
  publicSafeUrl,
} from "@/lib/media/delivery";
import type { MediaRecord } from "@/lib/media/types";
import type { MediaTable } from "@/lib/media/types";

export function persistBoard(board: BoardSnapshot): BoardSnapshot {
  return {
    ...board,
    elements: board.elements.map((element) => ({
      ...element,
      mediaUrl: element.mediaUrl
        ? persistableUrl(element.mediaUrl, element.mediaId)
        : element.mediaUrl,
    })),
  };
}

export async function resolveBoard(
  board: BoardSnapshot,
  viewer: Viewer,
  table: MediaTable,
): Promise<BoardSnapshot> {
  const ids = [
    ...new Set(
      board.elements
        .map((element) => element.mediaId ?? parseMediaRef(element.mediaUrl ?? ""))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (!ids.length) return persistBoard(board);
  const rows = await table.listByIds(viewer.shopId, ids);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const elements: BoardElement[] = [];
  for (const element of board.elements) {
    const id = element.mediaId ?? parseMediaRef(element.mediaUrl ?? "");
    const record = id ? byId.get(id) : undefined;
    if (!record) {
      elements.push(element);
      continue;
    }
    const url = await deliveryUrl(record, viewer);
    elements.push({
      ...element,
      mediaId: record.id,
      mediaKind: record.kind,
      mediaUrl: url ?? persistableUrl(element.mediaUrl ?? "", record.id),
    });
  }
  return { ...board, elements };
}

export async function displayUrlForRecord(
  record: MediaRecord,
  viewer: Viewer | null,
): Promise<string | null> {
  if (viewer && record.shopId === viewer.shopId) {
    return record.url.startsWith("http")
      ? record.url
      : deliveryUrl(record, viewer);
  }
  return publicSafeUrl(record);
}
