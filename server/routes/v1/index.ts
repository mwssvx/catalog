import type { Hono } from "hono";
import { availableSizes } from "@/lib/catalog/store";
import { jsonError } from "@/lib/http/respond";
import { registerAuthRoutes } from "./auth";
import { registerItemsRoutes } from "./items";
import { registerMediaRoutes } from "./media";
import { registerParseRoutes } from "./parse";
import { registerShopRoutes } from "./shop";

/**
 * Mounts all `/api/v1/*` handlers on the Hono app.
 * Imports use `@/` (→ `src/*`) via the root tsconfig; `tsx watch` resolves
 * from the project root the same way Vite does.
 */
export function registerV1Routes(app: Hono) {
  registerAuthRoutes(app);
  registerShopRoutes(app);
  registerItemsRoutes(app);
  registerMediaRoutes(app);
  registerParseRoutes(app);

  app.get("/api/v1/meta/sizes", async (c) => {
    try {
      const sizes = await availableSizes();
      return Response.json({ sizes });
    } catch (error) {
      return jsonError(error);
    }
  });
}
