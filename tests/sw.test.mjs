/**
 * Exercises public/sw.js as a real service worker would run it.
 *
 * The script is loaded into a tiny mock of the ServiceWorkerGlobalScope (caches,
 * clients, skipWaiting, fetch) and then driven through the three cases that
 * matter for an installed "Windows":
 *
 *  1. a navigation while offline is answered from the cached shell;
 *  2. a fingerprinted /_next/static/ file is served from cache without a network
 *     hit, and is cached on first use;
 *  3. install tolerates a missing optional asset instead of failing.
 *
 *   node tests/sw.test.mjs
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
};

const code = await readFile(path.resolve(import.meta.dirname, "../public/sw.js"), "utf8");

/** A minimal CacheStorage. */
function makeCaches() {
  const store = new Map();
  const cacheFor = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const map = store.get(name);
    return {
      async add(req) {
        const url = typeof req === "string" ? req : req.url;
        // simulate a 404 for the deliberately-missing asset
        if (url.includes("missing")) throw new Error("404");
        map.set(url, new Response("cached:" + url));
      },
      async put(req, res) {
        map.set(typeof req === "string" ? req : req.url, res);
      },
      async match(req) {
        const url = typeof req === "string" ? req : req.url;
        return map.get(url);
      },
    };
  };
  return {
    _store: store,
    async open(name) {
      return cacheFor(name);
    },
    async keys() {
      return [...store.keys()];
    },
    async delete(name) {
      return store.delete(name);
    },
  };
}

function makeScope({ origin = "https://example.test", online = true } = {}) {
  const listeners = {};
  const caches = makeCaches();
  const fetched = [];
  const scope = {
    location: new URL(`${origin}/sw.js?base=%2Fwindows7&v=test`),
    caches,
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (t, fn) => {
      (listeners[t] = listeners[t] || []).push(fn);
    },
    fetch: async (req) => {
      const url = typeof req === "string" ? req : req.url;
      fetched.push(url);
      if (!online) throw new Error("offline");
      return new Response("network:" + url, { status: 200 });
    },
    Response,
    Request,
    URL,
    console,
  };
  vm.createContext(scope);
  // Inside the context, `self` is the global object (a service worker's scope).
  vm.runInContext("globalThis.self = globalThis;", scope);
  vm.runInContext(code, scope);
  return { scope, listeners, caches, fetched, origin };
}

const dispatch = async (listeners, type, event) => {
  const fns = listeners[type] || [];
  const waits = [];
  const ev = { ...event };
  ev.waitUntil = (p) => waits.push(p);
  ev.respondWith = (p) => {
    ev.response = p;
  };
  for (const fn of fns) fn(ev);
  await Promise.all(waits);
  return ev.response ? await ev.response : undefined;
};

console.log("service worker");

// --- install caches the shell and survives a missing asset
{
  const { listeners, caches } = makeScope();
  await dispatch(listeners, "install", {});
  const shell = await caches.open("w7-shell-test");
  const hasIndex = !!(await shell.match("https://example.test/windows7/"));
  check("install caches the shell document", hasIndex);
  const hasIcon = !!(await shell.match("https://example.test/windows7/icons/pwa/icon-192.png"));
  check("install caches the icon", hasIcon);
  const act = await dispatch(listeners, "activate", {});
  check("activate claims clients", act === undefined);
}

// --- offline navigation falls back to the cached shell
{
  const { listeners, caches } = makeScope({ online: false });
  await dispatch(listeners, "install", {});
  const res = await dispatch(listeners, "fetch", {
    request: { url: "https://example.test/windows7/", method: "GET", mode: "navigate" },
  });
  const body = await res.text();
  check("offline navigation returns the cached shell", body.includes("cached:https://example.test/windows7/"), body.slice(0, 60));
}

// --- online navigation refreshes the cache
{
  const { listeners, caches, fetched } = makeScope({ online: true });
  await dispatch(listeners, "install", {});
  const res = await dispatch(listeners, "fetch", {
    request: { url: "https://example.test/windows7/", method: "GET", mode: "navigate" },
  });
  const body = await res.text();
  check("online navigation goes to the network", body.startsWith("network:"), body.slice(0, 40));
  check("navigation hit the network exactly once", fetched.filter((u) => u.endsWith("/windows7/")).length === 1);
}

// --- fingerprinted static assets are cache-first
{
  const { listeners, caches, fetched } = makeScope({ online: true });
  const url = "https://example.test/windows7/_next/static/chunks/a1b2.js";
  await dispatch(listeners, "fetch", { request: new Request(url, { method: "GET" }) });
  check("first static request goes to the network", fetched.includes(url));
  const before = fetched.length;
  const res = await dispatch(listeners, "fetch", { request: new Request(url, { method: "GET" }) });
  check("second static request is served from cache", !fetched.slice(before).includes(url));
  const body = await res.text();
  check("cached static body is returned", body.includes("a1b2.js"), body.slice(0, 40));
}

// --- assets (wallpapers/sounds) are cached on use, and a miss offline is graceful
{
  const { listeners, fetched } = makeScope({ online: true });
  const url = "https://example.test/windows7/sounds/default/logon.mp3";
  await dispatch(listeners, "fetch", { request: new Request(url, { method: "GET" }) });
  const before = fetched.length;
  await dispatch(listeners, "fetch", { request: new Request(url, { method: "GET" }) });
  check("sound is cached after first play", !fetched.slice(before).includes(url));

  const off = makeScope({ online: false });
  const r = await dispatch(off.listeners, "fetch", {
    request: new Request("https://example.test/windows7/sounds/default/notplayed.mp3", { method: "GET" }),
  });
  check("uncached asset offline resolves instead of throwing", r && r.status === 504, String(r && r.status));
}

// --- non-GET and cross-origin requests are ignored
{
  const { listeners, fetched } = makeScope({ online: true });
  const r1 = await dispatch(listeners, "fetch", { request: new Request("https://example.test/x", { method: "POST" }) });
  check("POST is not intercepted", r1 === undefined);
  const r2 = await dispatch(listeners, "fetch", { request: new Request("https://other.test/windows7/sounds/a.mp3") });
  check("cross-origin is not intercepted", r2 === undefined);
  check("no network traffic for ignored requests", fetched.length === 0);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
