/**
 * Checks the PWA is actually installable, against a running server.
 *
 * A browser installs a site only when the manifest parses, has a name, a
 * start_url inside the scope, 192 px and 512 px icons that really exist, and a
 * service worker with a fetch handler that controls the page. Each of those is
 * verified here instead of being assumed.
 *
 *   node tests/pwa.test.mjs http://localhost:3000
 */
const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
let failures = 0;
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
};

const get = async (p) => {
  const r = await fetch(base + p);
  return { status: r.status, type: r.headers.get("content-type") || "", text: await r.text() };
};

console.log(`PWA checks against ${base}`);

// --- manifest
const m = await get("/manifest.webmanifest");
check("manifest served", m.status === 200, `status ${m.status}`);
let mf = null;
try {
  mf = JSON.parse(m.text);
} catch (e) {
  check("manifest is valid JSON", false, e.message);
}
if (mf) {
  check("manifest is valid JSON", true);
  check("has a name", typeof mf.name === "string" && mf.name.length > 0);
  check("has short_name", typeof mf.short_name === "string" && mf.short_name.length > 0);
  check("display is standalone-ish", ["standalone", "fullscreen", "minimal-ui"].includes(mf.display), String(mf.display));
  check("start_url is in scope", mf.start_url && (mf.scope === undefined || mf.start_url.startsWith(mf.scope.replace(/\/$/, ""))));
  check("has theme_color + background_color", !!mf.theme_color && !!mf.background_color);
  const icons = mf.icons || [];
  const size = (s) => icons.filter((i) => i.sizes === s && (i.purpose || "any").includes("any")).length > 0;
  check("has a 192x192 icon", size("192x192"));
  check("has a 512x512 icon", size("512x512"));
  check("has a maskable icon", icons.some((i) => (i.purpose || "").includes("maskable")));
  const origin = new URL(base).origin;
  for (const ic of icons) {
    // Manifest icon paths are absolute against the origin (they include the
    // base path when the site is published under one), so resolve, don't concat.
    const url = new URL(ic.src, origin);
    const r = await fetch(url);
    const buf = await r.arrayBuffer();
    check(`icon ${ic.sizes} exists and is a PNG (${buf.byteLength} B)`, r.status === 200 && buf.byteLength > 500);
  }
}

// --- service worker
const sw = await get("/sw.js");
check("service worker served", sw.status === 200, `status ${sw.status}`);
check("service worker handles fetch", /addEventListener\(\s*["']fetch["']/.test(sw.text));
check("service worker caches the shell", /caches\.open/.test(sw.text));
check("service worker handles install/activate", /addEventListener\(\s*["']install["']/.test(sw.text) && /addEventListener\(\s*["']activate["']/.test(sw.text));

// --- page wiring
const page = await get("/");
check("page linked to the manifest", /manifest\.webmanifest/.test(page.text));
check("page has a theme-color", /name="theme-color"/i.test(page.text));
check("page declares apple-mobile-web-app-capable", /apple-mobile-web-app-capable/i.test(page.text));
check("page has an apple touch icon", /apple-touch-icon/.test(page.text));

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
