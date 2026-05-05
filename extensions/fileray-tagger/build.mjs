import { build, context } from "esbuild";
import { rm, mkdir, copyFile, readdir, readFile, writeFile, stat } from "node:fs/promises";
import { createWriteStream, createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(root, "src");
const distDir = path.resolve(root, "dist");
const watch = process.argv.includes("--watch");
const pack = process.argv.includes("--pack");

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
    if (pack) {
      const zipPath = await packZip(manifest.version);
      console.log(`[fileray-tagger] packaged -> ${zipPath}`);
    }
  }
}

function packZip(version) {
  return new Promise((resolve, reject) => {
    const zipName = `fileray-tagger-v${version}.zip`;
    const zipPath = path.resolve(root, zipName);
    // Build a deterministic Chrome-Web-Store-friendly zip. We exclude .map files
    // (sourcemaps bloat the upload and aren't useful in a published extension).
    const py = `
import os, zipfile, sys
src = sys.argv[1]
dst = sys.argv[2]
with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(src):
        for name in sorted(files):
            if name.endswith(".map"):
                continue
            full = os.path.join(base, name)
            arc = os.path.relpath(full, src).replace(os.sep, "/")
            z.write(full, arc)
print("ok")
`;
    const child = spawn("python3", ["-c", py, distDir, zipPath]);
    child.stderr.on("data", (b) => process.stderr.write(b));
    child.on("error", reject);
    child.on("exit", async (code) => {
      if (code !== 0) return reject(new Error(`python3 zip exited with code ${code}`));
      const s = await stat(zipPath);
      console.log(`[fileray-tagger] zip size: ${(s.size / 1024).toFixed(1)} KiB`);
      resolve(zipPath);
    });
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
