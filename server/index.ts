import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "./app";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || process.env.API_PORT || 3001);
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  const dist = path.join(root, "dist");
  app.use("/*", serveStatic({ root: dist }));
  app.get("*", serveStatic({ root: dist, path: "index.html" }));
}

console.log(`API listening on http://127.0.0.1:${port}`);
serve({ fetch: app.fetch, port });
