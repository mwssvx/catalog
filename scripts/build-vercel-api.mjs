import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [path.join(root, "server/vercel.ts")],
  outfile: path.join(root, "api/index.js"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  packages: "external",
  alias: {
    "@": path.join(root, "src"),
  },
});

console.log("Built api/index.js for Vercel");
