import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, ".vercel/output");
const staticDir = path.join(outputDir, "static");
const funcDir = path.join(outputDir, "functions/api.func");

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(funcDir, { recursive: true });

cpSync(path.join(root, "dist"), staticDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, "server/vercel.ts")],
  outfile: path.join(funcDir, "index.js"),
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
  path.join(funcDir, "package.json"),
  JSON.stringify({ type: "module" }),
);

writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify({
    runtime: "nodejs20.x",
    handler: "index.js",
    launcherType: "Nodejs",
    shouldAddHelpers: true,
  }),
);

writeFileSync(
  path.join(outputDir, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      { src: "/api/(.*)", dest: "/api" },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index.html" },
    ],
  }),
);

console.log("Built .vercel/output for Vercel");
