import type { BoardSnapshot, Item } from "@/lib/catalog/types";

export type BoardHistoryEntry = {
  board: BoardSnapshot;
  items: Item[];
  label: string;
};

export type BoardHistory = {
  past: BoardHistoryEntry[];
  future: BoardHistoryEntry[];
};

export function emptyHistory(): BoardHistory {
  return { past: [], future: [] };
}

export function pushHistory(
  history: BoardHistory,
  entry: BoardHistoryEntry,
  limit = 40,
): BoardHistory {
  return {
    past: [...history.past, entry].slice(-limit),
    future: [],
  };
}

export function undoHistory(
  history: BoardHistory,
  current: BoardHistoryEntry,
): { history: BoardHistory; restored: BoardHistoryEntry } | null {
  if (!history.past.length) return null;
  const past = [...history.past];
  const restored = past.pop()!;
  return {
    restored,
    history: {
      past,
      future: [current, ...history.future].slice(0, 40),
    },
  };
}

export function redoHistory(
  history: BoardHistory,
  current: BoardHistoryEntry,
): { history: BoardHistory; restored: BoardHistoryEntry } | null {
  if (!history.future.length) return null;
  const [restored, ...future] = history.future;
  return {
    restored,
    history: {
      past: [...history.past, current].slice(-40),
      future,
    },
  };
}
