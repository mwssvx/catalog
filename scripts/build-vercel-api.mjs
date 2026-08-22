import * as esbuild from "esbuild";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "api");

rmSync(apiDir, { recursive: true, force: true });
mkdirSync(apiDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, "server/vercel.ts")],
  outfile: path.join(apiDir, "index.js"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "bundle",
  alias: {
    "@": path.join(root, "src"),
  },
});

console.log("Built api/index.js for Vercel");
