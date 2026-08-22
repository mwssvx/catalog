import type { Hono } from "hono";
import { getViewer, requireOwner } from "@/lib/auth";
import {
  bulkUpdateItems,
  createItem,
  deleteItem,
  duplicateItem,
  getItem,
  listItems,
  updateItem,
} from "@/lib/catalog/store";
import {
  bulkItemsSchema,
  itemFiltersSchema,
  itemInputSchema,
} from "@/lib/catalog/schemas";
import { jsonError, readJson } from "@/lib/http/respond";

function parsePublished(
  value: string | null,
  owner: boolean,
): boolean | undefined {
  if (!owner) return true;
  if (value === "all") return undefined;
  if (value === "false") return false;
  if (value === "true") return true;
  return undefined;
}

export function registerItemsRoutes(app: Hono) {
  app.get("/api/v1/items", async (c) => {
    try {
      const viewer = await getViewer();
      const url = new URL(c.req.url);
      const missingParam = url.searchParams.get("missing");
      const filters = itemFiltersSchema.parse({
        status: url.searchParams.get("status") || "all",
        category: url.searchParams.get("category") || "all",
        size: url.searchParams.get("size") || "all",
        q: url.searchParams.get("q") || undefined,
        collection: url.searchParams.get("collection") || undefined,
        published: parsePublished(
          url.searchParams.get("published"),
          Boolean(viewer),
        ),
        missing: missingParam === "true" ? true : undefined,
      });
      const items = await listItems(filters);
      return Response.json({ items });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.post("/api/v1/items", async (c) => {
    try {
      await requireOwner();
      const input = itemInputSchema.parse(await readJson(c.req.raw));
      const item = await createItem(input);
      return Response.json({ item }, { status: 201 });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.post("/api/v1/items/bulk", async (c) => {
    try {
      await requireOwner();
      const body = bulkItemsSchema.parse(await readJson(c.req.raw));
      const items = await bulkUpdateItems(body.ids, {
        published: body.published,
        status: body.status,
        pricePercent: body.pricePercent,
        priceDelta: body.priceDelta,
      });
      return Response.json({ items });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.post("/api/v1/items/:id/duplicate", async (c) => {
    try {
      await requireOwner();
      const id = c.req.param("id");
      const item = await duplicateItem(id);
      if (!item) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      return Response.json({ item }, { status: 201 });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.get("/api/v1/items/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const item = await getItem(id);
      if (!item) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      return Response.json({ item });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.patch("/api/v1/items/:id", async (c) => {
    try {
      await requireOwner();
      const id = c.req.param("id");
      const input = itemInputSchema.parse(await readJson(c.req.raw));
      const item = await updateItem(id, input);
      if (!item) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      return Response.json({ item });
    } catch (error) {
      return jsonError(error);
    }
  });

  app.delete("/api/v1/items/:id", async (c) => {
    try {
      await requireOwner();
      const id = c.req.param("id");
      const ok = await deleteItem(id);
      if (!ok) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      return Response.json({ ok: true });
    } catch (error) {
      return jsonError(error);
    }
  });
}
