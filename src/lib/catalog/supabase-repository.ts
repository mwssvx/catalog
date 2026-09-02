import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyBoard } from "@/lib/board/layout";
import { flattenMedia } from "@/lib/catalog/codes";
import { publicShopFields } from "@/lib/catalog/access";
import type { Viewer } from "@/lib/catalog/access";
import type { CatalogRepository } from "@/lib/catalog/memory-repository";
import { publicShopSlug } from "@/lib/supabase/env";
import {
  applyItemInput,
  applyShopInput,
  matchesFilters,
  normalizeItem,
  normalizeShop,
} from "@/lib/catalog/normalize";
import type {
  BoardSnapshot,
  CatalogData,
  HistoryEntry,
  Item,
  ItemFilters,
  ItemInput,
  ProductVariant,
  Shop,
  ShopInput,
  Suggestion,
} from "@/lib/catalog/types";
import { ConflictError } from "@/lib/http/errors";
import {
  joinShopTagline,
  splitShopTagline,
} from "@/lib/catalog/shop-extras";
import { parseMediaRef, persistableUrl } from "@/lib/media/delivery";
import { displayUrlForRecord, persistBoard, resolveBoard } from "@/lib/media/resolve";
import { SupabaseMediaTable } from "@/lib/media/supabase-table";
import type { MediaRecord } from "@/lib/media/types";
import {
  adjustItemPrice,
  itemInputFromClone,
  type BulkItemPatch,
} from "@/lib/catalog/studio-actions";

const SHOP_SELECT_FULL =
  "id, slug, name, tagline, location, whatsapp, instagram, telegram, currency, currency_symbol, logo_url, cover_url, categories";
const SHOP_SELECT_BRAND =
  "id, slug, name, tagline, location, whatsapp, currency, currency_symbol, logo_url, cover_url";
const SHOP_SELECT_BASIC =
  "id, slug, name, tagline, location, whatsapp, currency, currency_symbol";

function isMissingColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";
  return /column .* does not exist|Could not find the '.+' column/i.test(message);
}

type ShopRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  location: string;
  whatsapp: string;
  instagram?: string | null;
  telegram?: string | null;
  currency: string;
  currency_symbol: string;
  logo_url?: string | null;
  cover_url?: string | null;
  categories?: string[] | null;
};

type ProductRow = {
  id: string;
  shop_id: string;
  code: string;
  title: string;
  notes: string;
  description: string;
  retail_price: number | string | null;
  wholesale_price: number | string | null;
  min_wholesale_qty: number | null;
  sizes: string[] | null;
  quantity: number | null;
  material: string | null;
  origin: string | null;
  category: string | null;
  subcategory: string | null;
  condition: string | null;
  status: string;
  tags: string[] | null;
  collections: string[] | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  color: string | null;
  sort_order: number;
};

type MediaRow = {
  id: string;
  shop_id: string;
  product_id: string | null;
  variant_id: string | null;
  kind: "image" | "video";
  url: string;
  sort_order: number;
  owner_id?: string | null;
  original_filename?: string | null;
  storage_key?: string | null;
  public_key?: string | null;
  preview_key?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  checksum?: string | null;
  upload_status?: string | null;
  privacy?: string | null;
  multipart_upload_id?: string | null;
  created_at?: string;
};

function mediaRecordFromRow(row: MediaRow): MediaRecord {
  return {
    id: row.id,
    shopId: row.shop_id,
    ownerId: row.owner_id ?? "",
    productId: row.product_id,
    variantId: row.variant_id,
    originalFilename: row.original_filename ?? "",
    storageKey: row.storage_key ?? null,
    publicKey: row.public_key ?? null,
    previewKey: row.preview_key ?? null,
    mimeType: row.mime_type ?? null,
    sizeBytes: row.size_bytes ?? null,
    checksum: row.checksum ?? null,
    kind: row.kind,
    uploadStatus: (row.upload_status as MediaRecord["uploadStatus"]) ?? "complete",
    privacy: (row.privacy as MediaRecord["privacy"]) ?? "public",
    multipartUploadId: row.multipart_upload_id ?? null,
    url: row.url,
    sortOrder: row.sort_order,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toNumber(value: number | string | null): number | null {
  if (value == null || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function shopFromRow(row: ShopRow): Shop {
  const { tagline, extras } = splitShopTagline(row.tagline ?? "");
  return publicShopFields(
    normalizeShop({
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline,
      location: row.location,
      whatsapp: row.whatsapp,
      instagram: row.instagram ?? extras.instagram ?? "",
      telegram: row.telegram ?? extras.telegram ?? "",
      currency: row.currency,
      currencySymbol: row.currency_symbol,
      logoUrl: row.logo_url ?? extras.logoUrl ?? "",
      coverUrl: row.cover_url ?? extras.coverUrl ?? "",
      categories: row.categories ?? extras.categories,
    }),
  );
}

function assembleItem(
  row: ProductRow,
  variants: VariantRow[],
  media: MediaRow[],
): Item {
  const variantModels: ProductVariant[] = variants
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((variant) => ({
      id: variant.id,
      color: variant.color,
      photos: media
        .filter((entry) => entry.variant_id === variant.id && entry.kind === "image")
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((entry) => entry.url),
      videos: media
        .filter((entry) => entry.variant_id === variant.id && entry.kind === "video")
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((entry) => entry.url),
    }));

  const photos = [
    ...media
      .filter((entry) => !entry.variant_id && entry.kind === "image")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((entry) => entry.url),
    ...variantModels.flatMap((variant) => variant.photos),
  ];
  const videos = [
    ...media
      .filter((entry) => !entry.variant_id && entry.kind === "video")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((entry) => entry.url),
    ...variantModels.flatMap((variant) => variant.videos),
  ];

  return normalizeItem({
    id: row.id,
    shopId: row.shop_id,
    code: row.code,
    title: row.title,
    notes: row.notes,
    description: row.description,
    price: toNumber(row.retail_price),
    wholesalePrice: toNumber(row.wholesale_price),
    minWholesaleQty: row.min_wholesale_qty,
    sizes: row.sizes ?? [],
    quantity: row.quantity,
    material: row.material,
    origin: row.origin,
    category: (row.category as Item["category"]) ?? null,
    subcategory: row.subcategory,
    condition: (row.condition as Item["condition"]) ?? null,
    status: (row.status as Item["status"]) ?? "in_stock",
    tags: row.tags ?? [],
    collections: row.collections ?? [],
    published: row.published,
    publishedAt: row.published_at,
    photos,
    videos,
    variants:
      variantModels.length > 0
        ? variantModels
        : [{ id: `${row.id}-v1`, color: null, photos, videos }],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async selectShop(
    filter: { column: "slug" | "id"; value: string },
  ): Promise<ShopRow | null> {
    const selects = [SHOP_SELECT_FULL, SHOP_SELECT_BRAND, SHOP_SELECT_BASIC];
    for (const select of selects) {
      let query = this.client.from("shops").select(select);
      query =
        filter.column === "slug"
          ? query.eq("slug", filter.value)
          : query.eq("id", filter.value);
      const result = await query.maybeSingle();
      if (!result.error) return (result.data as ShopRow | null) ?? null;
      if (!isMissingColumnError(result.error)) throw result.error;
    }
    return null;
  }

  async getPublicShop(slug: string): Promise<Shop | null> {
    const data = await this.selectShop({ column: "slug", value: slug });
    if (!data) return null;
    return shopFromRow(data);
  }

  private async hydrate(
    rows: ProductRow[],
    viewer: Viewer | null,
  ): Promise<Item[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [{ data: variants }, { data: media }] = await Promise.all([
      this.client.from("product_variants").select("*").in("product_id", ids),
      this.client.from("media").select("*").in("product_id", ids),
    ]);
    const variantRows = (variants ?? []) as VariantRow[];
    const mediaRows: MediaRow[] = [];
    for (const entry of (media ?? []) as MediaRow[]) {
      const url = await displayUrlForRecord(mediaRecordFromRow(entry), viewer);
      if (!url) continue;
      mediaRows.push({ ...entry, url });
    }
    return rows.map((row) =>
      assembleItem(
        row,
        variantRows.filter((variant) => variant.product_id === row.id),
        mediaRows.filter((entry) => entry.product_id === row.id),
      ),
    );
  }

  async listItems(
    viewer: Viewer | null,
    filters: ItemFilters = {},
  ): Promise<Item[]> {
    let query = this.client.from("products").select("*");
    if (viewer) {
      query = query.eq("shop_id", viewer.shopId);
    } else {
      const shop = await this.getPublicShop(publicShopSlug());
      if (!shop?.id) return [];
      query = query.eq("shop_id", shop.id);
    }
    const { data, error } = await query;
    if (error) throw error;
    const items = await this.hydrate((data ?? []) as ProductRow[], viewer);
    return items
      .filter((item) =>
        matchesFilters(item, {
          ...filters,
          published: viewer ? filters.published : true,
        }),
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }

  async getItem(viewer: Viewer | null, id: string): Promise<Item | null> {
    const byId = await this.client.from("products").select("*").eq("id", id).maybeSingle();
    let row = byId.data as ProductRow | null;
    if (!row) {
      const byCode = await this.client
        .from("products")
        .select("*")
        .eq("code", id)
        .maybeSingle();
      row = (byCode.data as ProductRow | null) ?? null;
    }
    if (!row) return null;
    if (viewer && row.shop_id !== viewer.shopId) return null;
    const [item] = await this.hydrate([row], viewer);
    return item ?? null;
  }

  async createItem(viewer: Viewer, input: ItemInput): Promise<Item> {
    const siblings = await this.listItems(viewer, { status: "all" });
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
    await this.writeProduct(viewer.shopId, item);
    return item;
  }

  async updateItem(
    viewer: Viewer,
    id: string,
    input: ItemInput,
  ): Promise<Item | null> {
    const current = await this.getItem(viewer, id);
    if (!current) return null;
    const siblings = await this.listItems(viewer, { status: "all" });
    const next = applyItemInput(current, input, siblings);
    await this.writeProduct(viewer.shopId, next);
    return next;
  }

  async deleteItem(viewer: Viewer, id: string): Promise<boolean> {
    const current = await this.getItem(viewer, id);
    if (!current) return false;
    const { error } = await this.client
      .from("products")
      .delete()
      .eq("id", id)
      .eq("shop_id", viewer.shopId);
    if (error) throw error;
    const catalog = await this.loadCatalog(viewer);
    catalog.board.elements = catalog.board.elements.filter(
      (element) => element.productId !== id,
    );
    await this.saveBoard(viewer, catalog.board, "force");
    return true;
  }

  async loadCatalog(viewer: Viewer): Promise<CatalogData> {
    const shopRow = await this.selectShop({ column: "id", value: viewer.shopId });
    const shop = shopRow
      ? shopFromRow(shopRow)
      : normalizeShop({ id: viewer.shopId });
    const items = await this.listItems(viewer, { status: "all" });

    type BoardDocRow = {
      camera: BoardSnapshot["camera"] | null;
      elements: BoardSnapshot["elements"] | null;
      version?: number | null;
    };
    let boardRow: BoardDocRow | null = null;
    {
      const withVersion = await this.client
        .from("board_documents")
        .select("camera, elements, version")
        .eq("shop_id", viewer.shopId)
        .maybeSingle();
      if (!withVersion.error) {
        boardRow = withVersion.data as BoardDocRow | null;
      } else if (isMissingColumnError(withVersion.error)) {
        const basic = await this.client
          .from("board_documents")
          .select("camera, elements")
          .eq("shop_id", viewer.shopId)
          .maybeSingle();
        if (basic.error) throw basic.error;
        boardRow = basic.data as BoardDocRow | null;
      } else {
        throw withVersion.error;
      }
    }

    const { data: suggestionRows } = await this.client
      .from("ai_suggestions")
      .select("id, kind, text, product_ids, element_ids")
      .eq("shop_id", viewer.shopId);
    const { data: versionRows } = await this.client
      .from("board_versions")
      .select("id, label, snapshot, created_at")
      .eq("shop_id", viewer.shopId)
      .order("created_at", { ascending: false })
      .limit(40);

    const rawBoard: BoardSnapshot = boardRow
      ? {
          camera: (boardRow.camera as BoardSnapshot["camera"]) ?? emptyBoard().camera,
          elements: (boardRow.elements as BoardSnapshot["elements"]) ?? [],
          version: Number(boardRow.version ?? 1) || 1,
        }
      : emptyBoard();
    const board = await resolveBoard(
      rawBoard,
      viewer,
      new SupabaseMediaTable(this.client),
    );

    const history: HistoryEntry[] = ((versionRows ?? []) as Array<{
      id: string;
      label: string;
      snapshot: { board?: BoardSnapshot; items?: Item[] };
      created_at: string;
    }>)
      .slice()
      .reverse()
      .map((row) => ({
        id: row.id,
        label: row.label,
        at: row.created_at,
        board: row.snapshot.board ?? emptyBoard(),
        items: row.snapshot.items ?? [],
      }));

    const suggestions: Suggestion[] = ((suggestionRows ?? []) as Array<{
      id: string;
      kind: Suggestion["kind"];
      text: string;
      product_ids: string[] | null;
      element_ids: string[] | null;
    }>).map((row) => ({
      id: row.id,
      kind: row.kind,
      text: row.text,
      productIds: row.product_ids ?? [],
      elementIds: row.element_ids ?? [],
    }));

    return { shop, items, board, history, suggestions };
  }

  async saveCatalog(
    viewer: Viewer,
    data: CatalogData,
    historyLabel?: string,
  ): Promise<void> {
    if (historyLabel) {
      const current = await this.loadCatalog(viewer);
      await this.client.from("board_versions").insert({
        shop_id: viewer.shopId,
        label: historyLabel,
        snapshot: { board: current.board, items: current.items },
      });
      await this.client.from("action_history").insert({
        shop_id: viewer.shopId,
        label: historyLabel,
        payload: { kind: "catalog" },
      });
      if (historyLabel.startsWith("AI:")) {
        await this.client.from("ai_jobs").insert({
          shop_id: viewer.shopId,
          status: "completed",
          prompt: historyLabel.slice(4),
          result: { ok: true },
        });
      }
      await this.trimHistory(viewer.shopId);
    }

    {
      const extras = {
        instagram: data.shop.instagram,
        telegram: data.shop.telegram,
        categories: data.shop.categories,
        logoUrl: data.shop.logoUrl,
        coverUrl: data.shop.coverUrl,
      };
      const withContacts = await this.client
        .from("shops")
        .update({
          name: data.shop.name,
          tagline: data.shop.tagline,
          location: data.shop.location,
          whatsapp: data.shop.whatsapp,
          instagram: data.shop.instagram,
          telegram: data.shop.telegram,
          currency: data.shop.currency,
          currency_symbol: data.shop.currencySymbol,
          logo_url: data.shop.logoUrl ?? "",
          cover_url: data.shop.coverUrl ?? "",
          categories: data.shop.categories,
        })
        .eq("id", viewer.shopId);
      if (!withContacts.error) {
        // full schema
      } else if (isMissingColumnError(withContacts.error)) {
        const withBrand = await this.client
          .from("shops")
          .update({
            name: data.shop.name,
            tagline: data.shop.tagline,
            location: data.shop.location,
            whatsapp: data.shop.whatsapp,
            currency: data.shop.currency,
            currency_symbol: data.shop.currencySymbol,
            logo_url: data.shop.logoUrl ?? "",
            cover_url: data.shop.coverUrl ?? "",
          })
          .eq("id", viewer.shopId);
        if (withBrand.error && isMissingColumnError(withBrand.error)) {
          const basic = await this.client
            .from("shops")
            .update({
              name: data.shop.name,
              tagline: joinShopTagline(data.shop.tagline, extras),
              location: data.shop.location,
              whatsapp: data.shop.whatsapp,
              currency: data.shop.currency,
              currency_symbol: data.shop.currencySymbol,
            })
            .eq("id", viewer.shopId);
          if (basic.error) throw basic.error;
        } else if (withBrand.error) {
          throw withBrand.error;
        }
      } else {
        throw withContacts.error;
      }
    }

    const { data: existing } = await this.client
      .from("products")
      .select("id")
      .eq("shop_id", viewer.shopId);
    const keep = new Set(data.items.map((item) => item.id));
    const stale = (existing ?? [])
      .map((row) => row.id as string)
      .filter((id) => !keep.has(id));
    if (stale.length) {
      await this.client
        .from("products")
        .delete()
        .eq("shop_id", viewer.shopId)
        .in("id", stale);
    }
    for (const item of data.items) {
      await this.writeProduct(viewer.shopId, {
        ...item,
        shopId: viewer.shopId,
      });
    }
    await this.saveBoard(viewer, data.board, "force");
    await this.client.from("ai_suggestions").delete().eq("shop_id", viewer.shopId);
    if (data.suggestions.length) {
      await this.client.from("ai_suggestions").insert(
        data.suggestions.map((suggestion) => ({
          id: suggestion.id,
          shop_id: viewer.shopId,
          kind: suggestion.kind,
          text: suggestion.text,
          product_ids: suggestion.productIds,
          element_ids: suggestion.elementIds ?? [],
        })),
      );
    }
  }

  async saveBoard(
    viewer: Viewer,
    board: BoardSnapshot,
    expectedVersion: number | "force",
  ): Promise<BoardSnapshot> {
    const existingQuery = await this.client
      .from("board_documents")
      .select("id, version")
      .eq("shop_id", viewer.shopId)
      .maybeSingle();

    type BoardDocMeta = { id: string; version?: number | null };
    let existing: BoardDocMeta | null = null;
    let versionColumn = true;
    if (!existingQuery.error) {
      existing = existingQuery.data as BoardDocMeta | null;
    } else if (isMissingColumnError(existingQuery.error)) {
      versionColumn = false;
      const basic = await this.client
        .from("board_documents")
        .select("id")
        .eq("shop_id", viewer.shopId)
        .maybeSingle();
      if (basic.error) throw basic.error;
      existing = basic.data as BoardDocMeta | null;
    } else {
      throw existingQuery.error;
    }

    const currentVersion = Number(existing?.version ?? (existing ? 1 : 0));
    const expected =
      expectedVersion === "force" ? currentVersion : expectedVersion;
    if (existing && versionColumn && currentVersion !== expected) {
      throw new ConflictError();
    }
    const nextVersion = (versionColumn ? expected : currentVersion) + 1;
    const persisted = persistBoard({ ...board, version: nextVersion });

    if (existing?.id) {
      const patch: Record<string, unknown> = {
        camera: persisted.camera,
        elements: persisted.elements,
      };
      if (versionColumn) patch.version = nextVersion;

      let update = this.client
        .from("board_documents")
        .update(patch)
        .eq("id", existing.id)
        .eq("shop_id", viewer.shopId);
      if (versionColumn) update = update.eq("version", expected);
      const { data, error } = await update.select("id").maybeSingle();
      if (error) throw error;
      if (versionColumn && !data) throw new ConflictError();
    } else {
      const row: Record<string, unknown> = {
        shop_id: viewer.shopId,
        camera: persisted.camera,
        elements: persisted.elements,
      };
      if (versionColumn) row.version = nextVersion;
      const { error } = await this.client.from("board_documents").insert(row);
      if (error) throw error;
    }

    await this.client.from("board_versions").insert({
      shop_id: viewer.shopId,
      label: "Board save",
      snapshot: { board: persisted, items: [] },
    });
    await this.trimHistory(viewer.shopId);
    return persisted;
  }

  async listBoardVersions(viewer: Viewer) {
    const { data, error } = await this.client
      .from("board_versions")
      .select("id, label, created_at")
      .eq("shop_id", viewer.shopId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return ((data ?? []) as Array<{ id: string; label: string; created_at: string }>).map(
      (row) => ({ id: row.id, label: row.label, at: row.created_at }),
    );
  }

  async restoreBoardVersion(viewer: Viewer, versionId: string): Promise<boolean> {
    const { data: latest } = await this.client
      .from("board_versions")
      .select("id, snapshot")
      .eq("id", versionId)
      .eq("shop_id", viewer.shopId)
      .maybeSingle();
    if (!latest) return false;
    const current = await this.loadCatalog(viewer);
    const snapshot = latest.snapshot as { board?: BoardSnapshot; items?: Item[] };
    const board = snapshot.board ?? emptyBoard();
    await this.saveBoard(viewer, board, current.board.version);
    if (snapshot.items?.length) {
      await this.saveCatalog(viewer, {
        shop: current.shop,
        items: snapshot.items,
        board: (await this.loadCatalog(viewer)).board,
        history: [],
        suggestions: current.suggestions,
      });
    }
    return true;
  }

  async undoLast(viewer: Viewer): Promise<boolean> {
    const current = await this.loadCatalog(viewer);
    const { data: latest } = await this.client
      .from("board_versions")
      .select("id, snapshot")
      .eq("shop_id", viewer.shopId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return false;
    const snapshot = latest.snapshot as { board?: BoardSnapshot; items?: Item[] };
    await this.client
      .from("board_versions")
      .delete()
      .eq("id", latest.id)
      .eq("shop_id", viewer.shopId);
    await this.saveCatalog(viewer, {
      shop: current.shop,
      items: snapshot.items ?? [],
      board: snapshot.board ?? emptyBoard(),
      history: [],
      suggestions: current.suggestions,
    });
    return true;
  }

  async updateShop(viewer: Viewer, input: ShopInput): Promise<Shop> {
    const current = (await this.loadCatalog(viewer)).shop;
    const next = applyShopInput(current, input);
    const extras = {
      instagram: next.instagram,
      telegram: next.telegram,
      categories: next.categories,
      logoUrl: next.logoUrl,
      coverUrl: next.coverUrl,
    };

    const payloads = [
      {
        name: next.name,
        tagline: next.tagline,
        location: next.location,
        whatsapp: next.whatsapp,
        instagram: next.instagram,
        telegram: next.telegram,
        currency: next.currency,
        currency_symbol: next.currencySymbol,
        logo_url: next.logoUrl,
        cover_url: next.coverUrl,
        categories: next.categories,
      },
      {
        name: next.name,
        tagline: next.tagline,
        location: next.location,
        whatsapp: next.whatsapp,
        currency: next.currency,
        currency_symbol: next.currencySymbol,
        logo_url: next.logoUrl,
        cover_url: next.coverUrl,
      },
      {
        name: next.name,
        // Pack contacts into tagline until Supabase columns exist.
        tagline: joinShopTagline(next.tagline, extras),
        location: next.location,
        whatsapp: next.whatsapp,
        currency: next.currency,
        currency_symbol: next.currencySymbol,
      },
    ];

    for (const payload of payloads) {
      const result = await this.client
        .from("shops")
        .update(payload)
        .eq("id", viewer.shopId);
      if (!result.error) return next;
      if (!isMissingColumnError(result.error)) throw result.error;
    }
    throw new Error("Could not update shop settings");
  }

  async bulkUpdateItems(
    viewer: Viewer,
    ids: string[],
    patch: BulkItemPatch,
  ): Promise<Item[]> {
    const updated: Item[] = [];
    for (const id of ids) {
      const current = await this.getItem(viewer, id);
      if (!current) continue;
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
    if (!current) return null;
    return this.createItem(viewer, itemInputFromClone(current));
  }

  private async trimHistory(shopId: string) {
    const { data } = await this.client
      .from("board_versions")
      .select("id")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    const extra = (data ?? []).slice(40);
    if (extra.length) {
      await this.client
        .from("board_versions")
        .delete()
        .in(
          "id",
          extra.map((row) => row.id),
        );
    }
  }

  private async writeProduct(shopId: string, item: Item) {
    const publishedAt = item.published
      ? item.publishedAt ?? new Date().toISOString()
      : null;
    const payload = {
      id: item.id,
      shop_id: shopId,
      code: item.code,
      title: item.title,
      notes: item.notes,
      description: item.description,
      retail_price: item.price,
      wholesale_price: item.wholesalePrice,
      min_wholesale_qty: item.minWholesaleQty,
      sizes: item.sizes,
      quantity: item.quantity,
      material: item.material,
      origin: item.origin,
      category: item.category,
      subcategory: item.subcategory,
      condition: item.condition,
      status: item.status,
      tags: item.tags,
      collections: item.collections,
      published: item.published,
      published_at: publishedAt,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
    const { error } = await this.client.from("products").upsert(payload, {
      onConflict: "id",
    });
    if (error) throw error;

    await this.client
      .from("media")
      .update({ variant_id: null })
      .eq("product_id", item.id);
    await this.client.from("product_variants").delete().eq("product_id", item.id);

    const variants =
      item.variants.length > 0
        ? item.variants
        : [{ id: `${item.id}-v1`, color: null, photos: item.photos, videos: item.videos }];

    await this.client.from("product_variants").insert(
      variants.map((variant, index) => ({
        id: variant.id,
        shop_id: shopId,
        product_id: item.id,
        color: variant.color,
        sort_order: index,
      })),
    );

    await this.client
      .from("media")
      .update({ product_id: null, variant_id: null })
      .eq("product_id", item.id);

    const table = new SupabaseMediaTable(this.client);
    const privacy = item.published ? "public" : "private";
    const attach = async (
      url: string,
      kind: "image" | "video",
      variantId: string | null,
      sortOrder: number,
    ) => {
      const stored = persistableUrl(url);
      const id = parseMediaRef(stored);
      const found = id
        ? await table.get(id, shopId)
        : await table.findByUrl(shopId, stored);
      if (found) {
        try {
          await table.update(found.id, shopId, {
            productId: item.id,
            variantId,
            kind,
            sortOrder,
            url: found.storageKey ? found.url : stored,
            privacy,
            uploadStatus: "complete",
          });
        } catch (error) {
          if (!isMissingColumnError(error as { message?: string })) throw error;
          await table.update(found.id, shopId, {
            productId: item.id,
            variantId,
            kind,
            sortOrder,
            url: found.storageKey ? found.url : stored,
          });
        }
        return;
      }
      const fullInsert = await this.client.from("media").insert({
        shop_id: shopId,
        product_id: item.id,
        variant_id: variantId,
        kind,
        url: stored,
        sort_order: sortOrder,
        upload_status: "complete",
        privacy,
        original_filename: "",
      });
      if (!fullInsert.error) return;
      if (!isMissingColumnError(fullInsert.error)) throw fullInsert.error;
      const basicInsert = await this.client.from("media").insert({
        shop_id: shopId,
        product_id: item.id,
        variant_id: variantId,
        kind,
        url: stored,
        sort_order: sortOrder,
      });
      if (basicInsert.error) throw basicInsert.error;
    };

    for (const variant of variants) {
      for (const [index, url] of variant.photos.entries()) {
        await attach(url, "image", variant.id, index);
      }
      for (const [index, url] of variant.videos.entries()) {
        await attach(url, "video", variant.id, index);
      }
    }
    const extraPhotos = flattenMedia(item).photos.filter(
      (url) => !variants.some((variant) => variant.photos.includes(url)),
    );
    for (const [index, url] of extraPhotos.entries()) {
      await attach(url, "image", null, index);
    }
  }
}
