#!/usr/bin/env node
/**
 * Publishes the static export to the repository root for GitHub Pages.
 *
 * Pages for this repository is configured as a legacy branch build that serves
 * `main` from `/`, so there is no place for a `docs/` folder or a CI artifact:
 * the site has to live next to the source. This script copies the contents of
 * `out/` (built with PAGES_BASE_PATH=/windows7) to the repository root, so
 * https://<owner>.github.io/windows7/ serves the simulator itself instead of
 * the README rendered by Jekyll.
 *
 * Rules:
 *  - `out/_next` is replaced wholesale; Next.js fingerprints those file names.
 *  - `out/index.html` becomes the root `index.html`.
 *  - every other generated file is copied only if it is not a source path.
 *  - `.nojekyll` is written so GitHub serves the files verbatim.
 */
import { cp, mkdir, readdir, rm, writeFile, access } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "out");

// Never overwrite anything that is part of the project itself.
const PROTECTED = new Set([
  ".git",
  ".next",
  "out",
  "node_modules",
  "src",
  "scripts",
  "public",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "README.md",
  "LICENSE",
  ".gitignore",
  "next-env.d.ts",
]);

const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

if (!(await exists(path.join(out, "index.html")))) {
  console.error("out/index.html is missing — run the Next.js build first.");
  process.exit(1);
}

await rm(path.join(root, "_next"), { recursive: true, force: true });
await cp(path.join(out, "_next"), path.join(root, "_next"), { recursive: true });

// Route payloads for pages that are not the desktop (the not-found boundary and
// the client-side router's segment files) are not needed and would litter the
// repository root.
// 404.html is kept, because GitHub Pages serves it for unknown paths.
const IGNORED = [/^__next\./, /^_not-found$/, /^404$/, /^index\.txt$/];


const entries = await readdir(out, { withFileTypes: true });
let copied = 0;
for (const entry of entries) {
  if (entry.name === "_next") continue;
  if (IGNORED.some((re) => re.test(entry.name))) {
    // keep the styled 404 page for GitHub Pages, drop the router-only payloads
    if (entry.name !== "404.html") continue;
  }
  if (PROTECTED.has(entry.name)) {
    console.log(`skipped (protected): ${entry.name}`);
    continue;
  }
  await cp(path.join(out, entry.name), path.join(root, entry.name), {
    recursive: true,
    force: true,
  });
  copied += 1;
}

await writeFile(path.join(root, ".nojekyll"), "");
await mkdir(path.join(root, "_next"), { recursive: true });

console.log(`Published the static site to the repository root (${copied} entries + _next, .nojekyll).`);
