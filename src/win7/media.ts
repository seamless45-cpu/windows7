"use client";
/**
 * Custom desktop backgrounds: photos and videos the user uploads.
 *
 * The files are kept in IndexedDB (localStorage cannot hold a video), with a
 * small amount of metadata in localStorage so the chosen background survives a
 * reload even before the blob is read back. Everything is local to the browser;
 * nothing is uploaded anywhere.
 */

const DB_NAME = "win7-media";
const STORE = "wallpapers";
const META_KEY = "win7.media.meta";

export interface MediaMeta {
  id: string;
  name: string;
  kind: "image" | "video";
  type: string;
  size: number;
  /** natural width/height for images, videoWidth/Height for videos */
  w: number;
  h: number;
  /** seconds, videos only */
  duration?: number;
  added: number;
}

const readMeta = (): MediaMeta[] => {
  try {
    const raw = localStorage.getItem(META_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const writeMeta = (list: MediaMeta[]) => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(list));
  } catch {
    /* quota — the blob is still in IndexedDB */
  }
};

export const listMedia = (): MediaMeta[] => readMeta().sort((a, b) => b.added - a.added);
export const mediaMeta = (id: string): MediaMeta | undefined => readMeta().find((m) => m.id === id);

/* ------------------------------------------------------------- IndexedDB */
let dbp: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbp;
}

function idbPut(id: string, blob: Blob) {
  return db().then(
    (d) =>
      new Promise<void>((resolve, reject) => {
        if (!d) return reject(new Error("no indexeddb"));
        const tx = d.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(blob, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}
function idbGet(id: string): Promise<Blob | null> {
  return db().then(
    (d) =>
      new Promise((resolve) => {
        if (!d) return resolve(null);
        const tx = d.transaction(STORE, "readonly");
        const r = tx.objectStore(STORE).get(id);
        r.onsuccess = () => resolve((r.result as Blob) || null);
        r.onerror = () => resolve(null);
      })
  );
}
function idbDel(id: string) {
  return db().then(
    (d) =>
      new Promise<void>((resolve) => {
        if (!d) return resolve();
        const tx = d.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      })
  );
}

/* --------------------------------------------------------- object URLs */
const urls = new Map<string, string>();

/** Returns a usable URL for a stored background, or null if it is gone. */
export async function mediaUrl(id: string): Promise<string | null> {
  const hit = urls.get(id);
  if (hit) return hit;
  const blob = await idbGet(id);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urls.set(id, u);
  return u;
}

/** Synchronous peek used when re-rendering after the first async load. */
export const peekUrl = (id: string) => urls.get(id) || null;

async function probe(file: File): Promise<{ w: number; h: number; duration?: number }> {
  if (file.type.startsWith("video/")) {
    return new Promise((resolve) => {
      const v = document.createElement("video");
      const done = (r: { w: number; h: number; duration?: number }) => {
        clearTimeout(timer);
        URL.revokeObjectURL(v.src);
        resolve(r);
      };
      // a corrupt or unsupported video may never report its metadata, so the
      // probe gives up after a few seconds instead of hanging the upload
      const timer = setTimeout(() => done({ w: 1280, h: 720, duration: 0 }), 4000);
      v.preload = "metadata";
      v.muted = true;
      v.onloadedmetadata = () => done({ w: v.videoWidth || 1280, h: v.videoHeight || 720, duration: v.duration || 0 });
      v.onerror = () => done({ w: 1280, h: 720, duration: 0 });
      v.src = URL.createObjectURL(file);
    });
  }
  return new Promise((resolve) => {
    const img = new Image();
    const done = (r: { w: number; h: number }) => {
      clearTimeout(timer);
      resolve(r);
    };
    const timer = setTimeout(() => done({ w: 1920, h: 1080 }), 4000);
    img.onload = () => done({ w: img.naturalWidth || 1920, h: img.naturalHeight || 1080 });
    img.onerror = () => done({ w: 1920, h: 1080 });
    img.src = URL.createObjectURL(file);
  });
}

/** Store an uploaded photo or video and return its metadata. */
export async function addMedia(file: File): Promise<MediaMeta> {
  const kind: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
  const dims = await probe(file);
  const meta: MediaMeta = {
    id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: file.name,
    kind,
    type: file.type || (kind === "video" ? "video/mp4" : "image/*"),
    size: file.size,
    w: dims.w,
    h: dims.h,
    duration: dims.duration,
    added: Date.now(),
  };
  await idbPut(meta.id, file);
  writeMeta([meta, ...readMeta()]);
  urls.set(meta.id, URL.createObjectURL(file));
  return meta;
}

export async function removeMedia(id: string) {
  await idbDel(id);
  const u = urls.get(id);
  if (u) {
    URL.revokeObjectURL(u);
    urls.delete(id);
  }
  writeMeta(readMeta().filter((m) => m.id !== id));
}

export const isMediaWallpaper = (key: string) => key.startsWith("media:");

/** Windows 7's "Picture position" options. `stretch` is deliberately absent:
 *  stretching a photo or video ruins it, which is the whole point of the other
 *  four. */
export const WP_FITS = [
  { key: "fill", label: "Fill", css: "cover" as const },
  { key: "fit", label: "Fit", css: "contain" as const },
  { key: "center", label: "Center", css: "auto" as const },
  { key: "tile", label: "Tile", css: "auto" as const },
] as const;
export type WpFit = (typeof WP_FITS)[number]["key"];

export const fitCss = (fit: string): "cover" | "contain" | "auto" =>
  (WP_FITS.find((f) => f.key === fit) || WP_FITS[0]).css;

export const prettySize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export const prettyDur = (s?: number) => {
  if (!s) return "";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
};
