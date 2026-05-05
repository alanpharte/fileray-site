import { build, context } from "esbuild";
import { rm, mkdir, copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(root, "src");
const distDir = path.resolve(root, "dist");
const watch = process.argv.includes("--watch");

async function copyStatic() {
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && (entry.name.endsWith(".html") || entry.name.endsWith(".css") || entry.name === "manifest.json")) {
      await copyFile(path.join(srcDir, entry.name), path.join(distDir, entry.name));
    }
  }
  const iconsSrc = path.join(srcDir, "icons");
  try {
    const iconFiles = await readdir(iconsSrc);
    await mkdir(path.join(distDir, "icons"), { recursive: true });
    for (const f of iconFiles) {
      await copyFile(path.join(iconsSrc, f), path.join(distDir, "icons", f));
    }
  } catch {
    // no icons dir; ignore
  }
}

async function buildAll() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const entryPoints = {
    background: path.join(srcDir, "background.ts"),
    content: path.join(srcDir, "content.ts"),
    popup: path.join(srcDir, "popup.ts"),
    options: path.join(srcDir, "options.ts"),
  };

  const opts = {
    entryPoints,
    bundle: true,
    format: "esm",
    target: "chrome120",
    outdir: distDir,
    logLevel: "info",
    sourcemap: true,
  };

  if (watch) {
    const ctx = await context(opts);
    await ctx.watch();
    await copyStatic();
    console.log("[fileray-tagger] watching for changes...");
  } else {
    await build(opts);
    await copyStatic();
    // Validate manifest references all built files
    const manifest = JSON.parse(await readFile(path.join(distDir, "manifest.json"), "utf8"));
    console.log(`[fileray-tagger] built v${manifest.version} -> ${distDir}`);
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
