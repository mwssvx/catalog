import { emptyBoard } from "@/lib/board/layout";
import {
  canReadProduct,
  canWriteShop,
  publicShopFields,
  type Viewer,
} from "@/lib/catalog/access";
import {
  applyItemInput,
  applyShopInput,
  matchesFilters,
  normalizeItem,
  normalizeShop,
} from "@/lib/catalog/normalize";
import {
  adjustItemPrice,
  itemInputFromClone,
  type BulkItemPatch,
} from "@/lib/catalog/studio-actions";
import { ConflictError } from "@/lib/http/errors";
import type {
  BoardSnapshot,
  CatalogData,
  HistoryEntry,
  Item,
  ItemFilters,
  ItemInput,
  Shop,
  ShopInput,
  Suggestion,
} from "@/lib/catalog/types";

export type CatalogRepository = {
  getPublicShop(slug: string): Promise<Shop | null>;
  listItems(viewer: Viewer | null, filters?: ItemFilters): Promise<Item[]>;
  getItem(viewer: Viewer | null, id: string): Promise<Item | null>;
  createItem(viewer: Viewer, input: ItemInput): Promise<Item>;
  updateItem(
    viewer: Viewer,
    id: string,
    input: ItemInput,
  ): Promise<Item | null>;
  deleteItem(viewer: Viewer, id: string): Promise<boolean>;
  loadCatalog(viewer: Viewer): Promise<CatalogData>;
  saveCatalog(
    viewer: Viewer,
    data: CatalogData,
    historyLabel?: string,
  ): Promise<void>;
  saveBoard(
    viewer: Viewer,
    board: BoardSnapshot,
    expectedVersion: number | "force",
  ): Promise<BoardSnapshot>;
  undoLast(viewer: Viewer): Promise<boolean>;
  listBoardVersions(
    viewer: Viewer,
  ): Promise<Array<{ id: string; label: string; at: string }>>;
  restoreBoardVersion(viewer: Viewer, versionId: string): Promise<boolean>;
  updateShop(viewer: Viewer, input: ShopInput): Promise<Shop>;
  bulkUpdateItems(
    viewer: Viewer,
    ids: string[],
    patch: BulkItemPatch,
  ): Promise<Item[]>;
  duplicateItem(viewer: Viewer, id: string): Promise<Item | null>;
};

type MemoryProfile = { userId: string; shopId: string; email: string };

export class MemoryCatalog implements CatalogRepository {
  shops = new Map<string, Shop>();
  profiles = new Map<string, MemoryProfile>();
  items = new Map<string, Item>();
  boards = new Map<string, BoardSnapshot>();
  history = new Map<string, HistoryEntry[]>();
  suggestions = new Map<string, Suggestion[]>();

  addShop(shop: Shop) {
    this.shops.set(shop.id, normalizeShop(shop));
  }

  addOwner(profile: MemoryProfile) {
    this.profiles.set(profile.userId, profile);
  }

  addItem(item: Item) {
    this.items.set(item.id, normalizeItem(item, []));
  }

  viewerFor(userId: string | null): Viewer | null {
    if (!userId) return null;
    const profile = this.profiles.get(userId);
    if (!profile) return null;
    return {
      userId: profile.userId,
      shopId: profile.shopId,
      email: profile.email,
    };
  }

  async getPublicShop(slug: string): Promise<Shop | null> {
    const shop =
      [...this.shops.values()].find((entry) => entry.slug === slug) ?? null;
    return shop ? publicShopFields(shop) : null;
  }

  private visibleItems(viewer: Viewer | null): Item[] {
    return [...this.items.values()].filter((item) =>
      canReadProduct(viewer, {
        shopId: item.shopId || "",
        published: item.published,
        status: item.status,
      }),
    );
  }

  async listItems(
    viewer: Viewer | null,
    filters: ItemFilters = {},
  ): Promise<Item[]> {
    return this.visibleItems(viewer)
      .filter((item) => {
        if (viewer && item.shopId !== viewer.shopId) return false;
        return matchesFilters(item, {
          ...filters,
          published: viewer ? filters.published : true,
        });
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }

  async getItem(viewer: Viewer | null, id: string): Promise<Item | null> {
    const item =
      this.items.get(id) ??
      [...this.items.values()].find((entry) => entry.code === id) ??
      null;
    if (!item) return null;
    if (
      !canReadProduct(viewer, {
        shopId: item.shopId || "",
        published: item.published,
        status: item.status,
      })
    ) {
      return null;
    }
    if (viewer && item.shopId !== viewer.shopId) return null;
    return item;
  }

  async createItem(viewer: Viewer, input: ItemInput): Promise<Item> {
    const siblings = [...this.items.values()].filter(
      (item) => item.shopId === viewer.shopId,
    );
    const now = new Date().toISOString();
    const item = normalizeItem(
      {
        id: crypto.randomUUID(),
        shopId: viewer.shopId,
        ...input,
        published: input.published === true,
        createdAt: now,
        updatedAt: now,
      },
      siblings,
    );
    this.items.set(item.id, item);
    return item;
  }

  async updateItem(
    viewer: Viewer,
    id: string,
    input: ItemInput,
  ): Promise<Item | null> {
    const current = this.items.get(id);
    if (!current || !canWriteShop(viewer, current.shopId || "")) return null;
    const siblings = [...this.items.values()].filter(
      (item) => item.shopId === viewer.shopId,
    );
    const next = applyItemInput(current, input, siblings);
    this.items.set(id, next);
    return next;
  }

  async deleteItem(viewer: Viewer, id: string): Promise<boolean> {
    const current = this.items.get(id);
    if (!current || !canWriteShop(viewer, current.shopId || "")) return false;
    this.items.delete(id);
    const board = this.boards.get(viewer.shopId);
    if (board) {
      this.boards.set(viewer.shopId, {
        ...board,
        elements: board.elements.filter((element) => element.productId !== id),
      });
    }
    return true;
  }

  async loadCatalog(viewer: Viewer): Promise<CatalogData> {
    const shop = this.shops.get(viewer.shopId);
    if (!shop) {
      return {
        shop: normalizeShop({ id: viewer.shopId, slug: "shop" }),
        items: [],
        board: emptyBoard(),
        history: [],
        suggestions: [],
      };
    }
    return {
      shop: publicShopFields(shop),
      items: [...this.items.values()].filter(
        (item) => item.shopId === viewer.shopId,
      ),
      board: this.boards.get(viewer.shopId) ?? emptyBoard(),
      history: this.history.get(viewer.shopId) ?? [],
      suggestions: this.suggestions.get(viewer.shopId) ?? [],
    };
  }

  async saveCatalog(
    viewer: Viewer,
    data: CatalogData,
    historyLabel?: string,
  ): Promise<void> {
    const existing = this.shops.get(viewer.shopId);
    this.shops.set(
      viewer.shopId,
      normalizeShop({ ...data.shop, id: viewer.shopId, slug: existing?.slug }),
    );
    if (historyLabel) {
      const current = await this.loadCatalog(viewer);
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        label: historyLabel,
        at: new Date().toISOString(),
        board: structuredClone(current.board),
        items: structuredClone(current.items),
      };
      this.history.set(viewer.shopId, [
        ...(this.history.get(viewer.shopId) ?? []),
        entry,
      ].slice(-40));
    }
    for (const [id, item] of this.items) {
      if (item.shopId === viewer.shopId) this.items.delete(id);
    }
    for (const item of data.items) {
      this.items.set(
        item.id,
        normalizeItem({ ...item, shopId: viewer.shopId }, data.items),
      );
    }
    await this.saveBoard(viewer, data.board, "force");
    this.suggestions.set(viewer.shopId, data.suggestions);
  }

  async saveBoard(
    viewer: Viewer,
    board: BoardSnapshot,
    expectedVersion: number | "force",
  ): Promise<BoardSnapshot> {
    const current = this.boards.get(viewer.shopId) ?? emptyBoard();
    const expected = expectedVersion === "force" ? current.version : expectedVersion;
    if (current.version !== expected) {
      throw new ConflictError();
    }
    const next = {
      ...board,
      version: expected + 1,
    };
    this.boards.set(viewer.shopId, next);
    const list = this.history.get(viewer.shopId) ?? [];
    list.push({
      id: crypto.randomUUID(),
      label: "Board save",
      at: new Date().toISOString(),
      board: structuredClone(current),
      items: [...this.items.values()].filter((item) => item.shopId === viewer.shopId),
    });
    this.history.set(viewer.shopId, list.slice(-40));
    return next;
  }

  async undoLast(viewer: Viewer): Promise<boolean> {
    const list = this.history.get(viewer.shopId) ?? [];
    const entry = list.pop();
    if (!entry) return false;
    this.history.set(viewer.shopId, list);
    const currentVersion = this.boards.get(viewer.shopId)?.version ?? 1;
    this.boards.set(viewer.shopId, {
      ...entry.board,
      version: currentVersion + 1,
    });
    for (const [id, item] of this.items) {
      if (item.shopId === viewer.shopId) this.items.delete(id);
    }
    for (const item of entry.items) {
      this.items.set(item.id, { ...item, shopId: viewer.shopId });
    }
    return true;
  }

  async listBoardVersions(viewer: Viewer) {
    return (this.history.get(viewer.shopId) ?? [])
      .slice()
      .reverse()
      .map((entry) => ({ id: entry.id, label: entry.label, at: entry.at }));
  }

  async restoreBoardVersion(viewer: Viewer, versionId: string): Promise<boolean> {
    const list = this.history.get(viewer.shopId) ?? [];
    const entry = list.find((row) => row.id === versionId);
    if (!entry) return false;
    const currentVersion = this.boards.get(viewer.shopId)?.version ?? 1;
    this.boards.set(viewer.shopId, {
      ...structuredClone(entry.board),
      version: currentVersion + 1,
    });
    for (const [id, item] of this.items) {
      if (item.shopId === viewer.shopId) this.items.delete(id);
    }
    for (const item of entry.items) {
      this.items.set(item.id, { ...item, shopId: viewer.shopId });
    }
    return true;
  }

  async updateShop(viewer: Viewer, input: ShopInput): Promise<Shop> {
    const current = this.shops.get(viewer.shopId) ?? normalizeShop({ id: viewer.shopId });
    const next = applyShopInput(current, input);
    this.shops.set(viewer.shopId, next);
    return publicShopFields(next);
  }

  async bulkUpdateItems(
    viewer: Viewer,
    ids: string[],
    patch: BulkItemPatch,
  ): Promise<Item[]> {
    const updated: Item[] = [];
    for (const id of ids) {
      const current = this.items.get(id);
      if (!current || !canWriteShop(viewer, current.shopId || "")) continue;
      const input: ItemInput = {
        published: patch.published,
        status: patch.status,
      };
      if (patch.pricePercent != null || patch.priceDelta != null) {
        input.price = adjustItemPrice(current.price, patch);
      }
      const item = await this.updateItem(viewer, id, input);
      if (item) updated.push(item);
    }
    return updated;
  }

  async duplicateItem(viewer: Viewer, id: string): Promise<Item | null> {
    const current = await this.getItem(viewer, id);
    if (!current || !canWriteShop(viewer, current.shopId || "")) return null;
    return this.createItem(viewer, itemInputFromClone(current));
  }
}
