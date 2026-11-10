/* Windows 7 Ultimate — service worker.
 *
 * The simulator is entirely client-side, so once its shell, icons, wallpapers
 * and sounds are cached it boots with no network at all — which is what an
 * installed "Windows" should do. Strategy:
 *
 *  - navigations: network first, falling back to the cached shell, so a new
 *    publish is picked up immediately but the app still opens offline;
 *  - /_next/static/*: cache first (the file names are fingerprinted, so a new
 *    build produces new URLs and the old entries are pruned on activate);
 *  - wallpapers, icons, sounds: cache first, filled lazily as things are used;
 *  - everything else: network with a cache fallback.
 *
 * BASE is injected by the build via `?base=` — GitHub Pages serves the app from
 * /windows7/, where an absolute "/index.html" would miss.
 */
const params = new URL(self.location.href).searchParams;
const BASE = params.get("base") || "";
const VERSION = params.get("v") || "1";
const SHELL = `w7-shell-${VERSION}`;
const RUNTIME = `w7-runtime-${VERSION}`;

/** The minimum needed to show the boot screen and then the desktop. */
const SHELL_URLS = [`${BASE}/`, `${BASE}/manifest.webmanifest`];

/** Assets that are cheap and make the first offline run feel complete. */
const PRELOAD = [
  `${BASE}/icons/pwa/icon-192.png`,
  `${BASE}/wallpapers/win7.jpg`,
  `${BASE}/sounds/default/startup.mp3`,
  `${BASE}/sounds/default/logon.mp3`,
  `${BASE}/sounds/default/shutdown.mp3`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Add individually: one 404 must not abort the whole install.
      // `new Request()` only accepts absolute URLs, so resolve against the
      // origin first — "/" is not a URL a Request constructor will take.
      for (const path of [...SHELL_URLS, ...PRELOAD]) {
        const url = new URL(path, self.location.origin).toString();
        try {
          await cache.add(new Request(url, { cache: "reload" }));
        } catch {
          /* ignore a missing optional asset */
        }
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("w7-") && n !== SHELL && n !== RUNTIME).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

const isStatic = (url) => url.pathname.includes("/_next/static/");
const isAsset = (url) =>
  /\/(wallpapers|icons|sounds)\//.test(url.pathname) || /\.(png|jpg|jpeg|svg|webp|mp3|wav|ogg|ico|css|woff2?)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: fresh page when online, cached shell when not.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL);
          cache.put(`${BASE}/`, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(SHELL);
          return (
            (await cache.match(`${BASE}/`)) ||
            (await cache.match(req)) ||
            new Response(
              `<!doctype html><meta charset="utf-8"><title>Windows 7</title>
               <body style="margin:0;background:#000;color:#dbe7f3;font:13px 'Segoe UI',sans-serif;
                          display:grid;place-items:center;height:100vh">
               <div style="text-align:center">
                 <div style="font-size:22px;letter-spacing:.4px">Windows 7</div>
                 <p style="color:#8fa6bf">This copy is not cached yet. Reconnect once to install it.</p>
                 <button onclick="location.reload()" style="padding:4px 14px">Retry</button>
               </div></body>`,
              { headers: { "content-type": "text/html; charset=utf-8" }, status: 200 }
            )
          );
        }
      })()
    );
    return;
  }

  if (isStatic(url)) {
    // Fingerprinted: a cache hit can never be stale.
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      })()
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        } catch {
          return new Response("", { status: 504 });
        }
      })()
    );
  }
});

// Let the page ask for an immediate update of the shell.
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});
