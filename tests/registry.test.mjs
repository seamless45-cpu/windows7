/**
 * Structural checks on the app registry.
 *
 * The shell resolves a window's body through `appmap`. A key that exists in the
 * registry but not in the map opens an empty window, and a key in the map that
 * is not registered can never be opened — both are silent failures at runtime.
 * This test reads the sources and asserts the two agree, and that the windows
 * added in recent passes are all registered and implemented.
 *
 *   node tests/registry.test.mjs
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
};

const root = path.resolve(import.meta.dirname, "..");
const registry = await readFile(path.join(root, "src/win7/registry.ts"), "utf8");
const appmap = await readFile(path.join(root, "src/win7/appmap.tsx"), "utf8");

// `key: { title: ...` at the top level of the APPS object
const registered = new Set([...registry.matchAll(/^ {2}([a-zA-Z0-9_]+): \{ title:/gm)].map((m) => m[1]));

// components in the map: `key: Component,` (allowing indentation)
const mapped = new Set([
  // `key: Component,`
  ...[...appmap.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*[A-Za-z0-9_]+,$/gm)].map((m) => m[1]),
  // `key: () => <Component />,`
  ...[...appmap.matchAll(/^ {2}([a-zA-Z0-9_]+):\s*\(\)\s*=>/gm)].map((m) => m[1]),
]);

console.log(`registry consistency (${registered.size} apps, ${mapped.size} mapped)`);

const unmapped = [...registered].filter((k) => !mapped.has(k));
check("every registered app has a component", unmapped.length === 0, unmapped.join(", "));

const unregistered = [...mapped].filter((k) => !registered.has(k));
check("every component belongs to a registered app", unregistered.length === 0, unregistered.join(", "));

// features added in the PWA / research pass must be openable
const MUST_EXIST = ["reversi", "checkers", "backgammon", "spades", "calc", "fun"];
for (const k of MUST_EXIST) check(`registrar knows about "${k}"`, registered.has(k));

// Control Panel pages must be reachable: every page id used by CATS/PAGES
// should appear in the COMP table or be a category.
const cp = await readFile(path.join(root, "src/win7/apps/ControlPanel.tsx"), "utf8");
const compBlock = cp.slice(cp.indexOf("const COMP: Record<string"), cp.indexOf("function CPLaunch"));
const compKeys = new Set([...compBlock.matchAll(/\b([a-zA-Z0-9_]+):\s*(?:\(|\s*<)/g)].map((m) => m[1]));
// pages are declared one per line, but some lines carry several entries
const pStart = cp.indexOf("const PAGES: Record");
// the PAGES object ends where the next top-level const begins
const pEnd = cp.indexOf("\nconst ", pStart + 10);
const pagesBlock = cp.slice(pStart, pEnd > 0 ? pEnd : undefined);
const pageKeys = new Set([...pagesBlock.matchAll(/\b([a-zA-Z0-9_]+): \{ title: "/g)].map((m) => m[1]));
const missingComp = [...pageKeys].filter((k) => !compKeys.has(k));
check("every Control Panel page has a body", missingComp.length === 0, missingComp.join(", "));
check("Indexing Options page exists", pageKeys.has("indexing") && compKeys.has("indexing"));
check("ClearType page exists", pageKeys.has("cleartype") && compKeys.has("cleartype"));

// every cat referenced by a page must be a real category
const catIds = new Set([...cp.matchAll(/^ {2}\{ id: "([a-z-]+)", title:/gm)].map((m) => m[1]));
const usedCats = new Set([...cp.matchAll(/cat: "([a-z-]+)"/g)].map((m) => m[1]));
const badCats = [...usedCats].filter((c) => !catIds.has(c));
check("every page's category exists", badCats.length === 0, badCats.join(", "));

// taskbar toolbars: the right-click menu, the Control Panel tab and the strip
const tbSrc = await readFile(path.join(root, "src/win7/Taskbar.tsx"), "utf8");
const stSrc = await readFile(path.join(root, "src/win7/store.ts"), "utf8");
for (const id of ["address", "links", "desktop"]) {
  check(`toolbar "${id}" is in the taskbar menu`, tbSrc.includes(`label: "${id[0].toUpperCase()}${id.slice(1)}", checked: tb.bars`));
}
check("toolbar strip is rendered by the taskbar", tbSrc.includes("<TaskbarToolbars bars={tb.bars}"));
check("toolbar address bar navigates", /const go = \(\) =>/.test(tbSrc) && tbSrc.includes('openApp("ie", { url: q })'));
check("toolbar desktop lists the desktop folder", tbSrc.includes('n.parent === "desk"'));
check("toolbar order is stable", tbSrc.includes('TASKBAR_BAR_IDS.filter((x) => x === b || cur.includes(x))'));
check("toolbar setting is persisted and sanitised", stSrc.includes("bars: (Array.isArray(taskbar.bars)"));
check("Control Panel Toolbars tab toggles bars", /tab === "Toolbars" && \(/.test(cp) && cp.includes("set({ bars: v ?"));

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
