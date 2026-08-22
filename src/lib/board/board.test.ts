import { describe, expect, it } from "vitest";
import {
  emptyHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@/lib/board/history";
import { emptyBoard } from "@/lib/board/layout";
import {
  deleteElements,
  duplicateElements,
  elementsInBox,
  groupElements,
  looseMedia,
  ungroupElements,
} from "@/lib/board/ops";
import { MemoryCatalog } from "@/lib/catalog/memory-repository";
import type { BoardElement, Item } from "@/lib/catalog/types";

const shop = {
  id: "shop-a",
  slug: "dordoi",
  name: "Dordoi",
  tagline: "",
  location: "Бишкек",
  whatsapp: "996700000000",
  currency: "KGS",
  currencySymbol: "сом",
  logoUrl: "",
  coverUrl: "",
};

function media(id: string, x: number, y: number): BoardElement {
  return {
    id,
    type: "media",
    x,
    y,
    width: 100,
    height: 100,
    zIndex: 1,
    mediaUrl: `https://example.com/${id}.jpg`,
    mediaKind: "image",
  };
}

function seedCatalog() {
  const db = new MemoryCatalog();
  db.addShop(shop);
  db.addShop({ ...shop, id: "shop-b", slug: "other", name: "Other" });
  db.addOwner({ userId: "user-a", shopId: "shop-a", email: "a@example.com" });
  db.addOwner({ userId: "user-b", shopId: "shop-b", email: "b@example.com" });
  return db;
}

describe("board multi-select", () => {
  it("selects elements intersecting a selection box", () => {
    const elements = [media("a", 0, 0), media("b", 200, 0), media("c", 40, 40)];
    expect(elementsInBox(elements, { x: 20, y: 20, width: 80, height: 80 })).toEqual(
      ["a", "c"],
    );
  });
});

describe("board grouping", () => {
  it("groups and ungroups selected elements", () => {
    const elements = [media("a", 0, 0), media("b", 120, 0)];
    const grouped = groupElements(elements, ["a", "b"], "Set");
    const group = grouped.find((element) => element.type === "group");
    expect(group?.memberIds).toEqual(["a", "b"]);
    expect(grouped.find((element) => element.id === "a")?.groupId).toBe(group?.id);
    const ungrouped = ungroupElements(grouped, [group!.id]);
    expect(ungrouped.some((element) => element.type === "group")).toBe(false);
    expect(ungrouped.find((element) => element.id === "a")?.groupId).toBeUndefined();
  });
});

describe("board undo/redo history", () => {
  it("restores previous snapshots", () => {
    const first = {
      board: emptyBoard(),
      items: [] as Item[],
      label: "start",
    };
    const second = {
      board: {
        ...emptyBoard(),
        elements: [media("a", 10, 10)],
      },
      items: [] as Item[],
      label: "added",
    };
    let history = pushHistory(emptyHistory(), first);
    history = pushHistory(history, second);
    const undone = undoHistory(history, {
      board: emptyBoard(),
      items: [],
      label: "now",
    });
    expect(undone?.restored.label).toBe("added");
    const redone = redoHistory(undone!.history, undone!.restored);
    expect(redone?.restored.label).toBe("now");
  });
});

describe("board persistence and conflicts", () => {
  it("bumps version and rejects stale saves", async () => {
    const db = seedCatalog();
    const owner = db.viewerFor("user-a")!;
    const saved = await db.saveBoard(owner, emptyBoard(), 1);
    expect(saved.version).toBe(2);
    await expect(
      db.saveBoard(owner, { ...saved, elements: [media("x", 0, 0)] }, 1),
    ).rejects.toMatchObject({ name: "ConflictError" });
    const again = await db.saveBoard(
      owner,
      { ...saved, elements: [media("x", 0, 0)] },
      saved.version,
    );
    expect(again.version).toBe(3);
    expect(again.elements).toHaveLength(1);
  });

  it("restores a previous board version", async () => {
    const db = seedCatalog();
    const owner = db.viewerFor("user-a")!;
    await db.saveBoard(owner, emptyBoard(), 1);
    const withMedia = await db.saveBoard(
      owner,
      { ...emptyBoard(), version: 2, elements: [media("a", 0, 0)] },
      2,
    );
    expect(withMedia.elements).toHaveLength(1);
    const versions = await db.listBoardVersions(owner);
    expect(versions.length).toBeGreaterThan(0);
    const ok = await db.restoreBoardVersion(owner, versions[versions.length - 1].id);
    expect(ok).toBe(true);
    const catalog = await db.loadCatalog(owner);
    expect(catalog.board.elements).toEqual([]);
  });
});

describe("board permissions", () => {
  it("keeps board documents isolated per shop", async () => {
    const db = seedCatalog();
    const ownerA = db.viewerFor("user-a")!;
    const ownerB = db.viewerFor("user-b")!;
    await db.saveBoard(
      ownerA,
      { ...emptyBoard(), elements: [media("a", 0, 0)] },
      1,
    );
    const boardB = await db.loadCatalog(ownerB);
    expect(boardB.board.elements).toEqual([]);
    const boardA = await db.loadCatalog(ownerA);
    expect(boardA.board.elements).toHaveLength(1);
  });
});

describe("mobile review inbox data", () => {
  it("exposes loose media for inbox review", () => {
    const board = {
      ...emptyBoard(),
      elements: [
        media("loose", 0, 0),
        {
          id: "card",
          type: "product" as const,
          x: 200,
          y: 0,
          width: 250,
          height: 310,
          zIndex: 2,
          productId: "p1",
        },
        {
          id: "note",
          type: "note" as const,
          x: 400,
          y: 0,
          width: 200,
          height: 120,
          zIndex: 3,
          text: "hi",
        },
      ],
    };
    expect(looseMedia([], board).map((element) => element.id)).toEqual(["loose"]);
    const review = board.elements.filter(
      (element) =>
        element.type === "media" ||
        (element.type === "product" && element.productId),
    );
    expect(review.map((element) => element.id)).toEqual(["loose", "card"]);
  });
});

describe("board duplicate and delete", () => {
  it("duplicates then deletes without leaving stale group links", () => {
    const base = [media("a", 0, 0), media("b", 50, 50)];
    const grouped = groupElements(base, ["a", "b"]);
    const groupId = grouped.find((element) => element.type === "group")!.id;
    const copied = duplicateElements(grouped, ["a"]);
    expect(copied).toHaveLength(grouped.length + 1);
    const trimmed = deleteElements(copied, [groupId]);
    expect(trimmed.some((element) => element.id === groupId)).toBe(false);
    expect(trimmed.every((element) => element.groupId !== groupId)).toBe(true);
  });
});

describe("typed board commands", () => {
  it("exports a stable command list for UI and future AI", async () => {
    const { BOARD_COMMANDS } = await import("@/lib/board/commands");
    expect(BOARD_COMMANDS).toContain("cards");
    expect(BOARD_COMMANDS).toContain("attach_media");
    expect(BOARD_COMMANDS).toContain("group");
    expect(BOARD_COMMANDS).toContain("publish");
  });
});
