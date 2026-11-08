#!/usr/bin/env node
/**
 * Fails if the published static export at the repository root is stale.
 *
 * GitHub Pages serves `index.html` and `_next/` from the repository root, so a
 * merge that changes `src/` without re-running `npm run build:pages` leaves the
 * live site on an old build — exactly the "I never see any updates" failure.
 * This checks, mechanically, that what is committed is a complete export of the
 * current sources:
 *
 *  1. every asset `index.html` references exists on disk;
 *  2. every stylesheet and script the page loads is present;
 *  3. files whose names Next fingerprints are not orphaned (no stale chunks);
 *  4. the bundle contains markers for features that must be in the build.
 */
import { readFile, readdir, access } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const problems = [];

const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

const html = await readFile(path.join(root, "index.html"), "utf8");

// 1 + 2: every referenced asset must exist.
const refs = new Set(
  [...html.matchAll(/\/windows7\/(_next\/[^"'\s\\]+)/g)].map((m) => m[1])
);
for (const rel of refs) {
  if (!(await exists(path.join(root, rel)))) problems.push(`referenced asset missing: ${rel}`);
}
if (!refs.size) problems.push("index.html references no _next assets — wrong base path?");

// 3: no orphaned chunk files.
const chunkDir = path.join(root, "_next/static/chunks");
let chunks = [];
try {
  chunks = await readdir(chunkDir);
} catch {
  problems.push("_next/static/chunks is missing — the export was never published");
}
// Chunks are reachable either from the document or from another chunk (Turbopack
// links dynamic imports inside the bundle), so a chunk that nothing mentions at
// all is left over from an older publish.
const referenced = new Set([...refs].map((r) => path.basename(r)));
let chunkText = "";
for (const c of chunks.filter((x) => /\.(js|css)$/.test(x))) {
  chunkText += await readFile(path.join(chunkDir, c), "utf8");
}
const orphans = chunks.filter(
  (c) => /\.(js|css)$/.test(c) && !referenced.has(c) && !chunkText.includes(c)
);
if (orphans.length) problems.push(`${orphans.length} stale chunk(s) mentioned nowhere, e.g. ${orphans[0]}`);

// 4: features that must be in the shipped bundle.
const bundle = (
  await Promise.all(
    chunks.filter((c) => c.endsWith(".js")).map((c) => readFile(path.join(chunkDir, c), "utf8"))
  )
).join("\n");
const css = (
  await Promise.all(
    chunks.filter((c) => c.endsWith(".css")).map((c) => readFile(path.join(chunkDir, c), "utf8"))
  )
).join("\n");

const MARKERS = {
  "Start menu search box": "Search programs and files",
  "3D Text screen saver": "3D Text",
  "Lightning screen saver": "Lightning",
  "Fun experimental features": "Fun experimental",
  "fade-through-black transition": "fade-black",
  "theme cross-dissolve": "theme-mix",
};
for (const [label, marker] of Object.entries(MARKERS)) {
  const hay = marker === "fade-black" || marker === "theme-mix" ? css : bundle;
  if (!hay.includes(marker)) problems.push(`published bundle is missing: ${label} (looked for "${marker}")`);
}

if (problems.length) {
  console.error("Published site is stale or incomplete:");
  for (const p of problems) console.error("  - " + p);
  console.error("\nRun `npm run build:pages` and commit the result.");
  process.exit(1);
}
console.log(`Published site is current (${refs.size} referenced assets, ${chunks.length} chunks, all feature markers present).`);
