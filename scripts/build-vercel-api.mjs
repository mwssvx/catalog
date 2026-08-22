import * as esbuild from "esbuild";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "api");
const apiBundle = path.join(apiDir, "index.js");

mkdirSync(apiDir, { recursive: true });
rmSync(apiBundle, { force: true });

await esbuild.build({
  entryPoints: [path.join(root, "server/vercel.ts")],
  outfile: apiBundle,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "bundle",
  alias: {
    "@": path.join(root, "src"),
  },
});

writeFileSync(
  path.join(apiDir, "package.json"),
  JSON.stringify({ type: "module" }),
);

console.log("Built api/index.js for Vercel");
