import type { Hono } from "hono";
import { requireOwner } from "@/lib/auth";
import { parseNotes } from "@/lib/catalog/parse";
import { parseNotesSchema } from "@/lib/catalog/schemas";
import { jsonError, readJson } from "@/lib/http/respond";

export function registerParseRoutes(app: Hono) {
  app.post("/api/v1/parse", async (c) => {
    try {
      await requireOwner();
      const body = parseNotesSchema.parse(await readJson(c.req.raw));
      return Response.json({ parsed: parseNotes(body.notes ?? "") });
    } catch (error) {
      return jsonError(error);
    }
  });
}
