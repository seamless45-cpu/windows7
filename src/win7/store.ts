import { useSyncExternalStore } from "react";
import { APPS } from "./registry";
import { seedFs } from "./data";
import { snd, playSys } from "./sound";

/* ------------------------------------------------------------------ types */
export interface FsNode {
  id: string;
  name: string;
  type: "folder" | "file";
  parent: string | null;
  content?: string;
  size: number;
  created: number;
  modified: number;
  trash?: { from: string; at: number } | null;
  hidden?: boolean;
  letter?: string;
  label?: string;
  total?: number;
  free?: number;
  meta?: { artist?: string; album?: string; len?: number };
}
export type Fs = Record<string, FsNode>;

export interface MenuItem {
  label?: string;
  sep?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean;
  radio?: boolean;
  sub?: MenuItem[];
  bold?: boolean;
  icon?: string;
  shortcut?: string;
}

export interface User { name: string; pic: string; pass?: string; admin: boolean }
export interface GadgetInst { id: string; type: string; x: number; y: number; top?: boolean }
export interface Installed { id: string; name: string; publisher: string; size: string; date: string; version: string }

export interface Settings {
  theme: "aero" | "basic" | "classic" | "hc";
  wallpaper: string;
  wpPos: "fill" | "fit" | "stretch" | "tile" | "center";
  colorKey: string;
  transparency: boolean;
  intensity: number;
  soundScheme: "default" | "none";
  screensaver: "none" | "bubbles" | "ribbons" | "photos" | "blank";
  ssWait: number;
  showIcons: boolean;
  iconSize: "large" | "medium" | "small";
  sysIcons: Record<string, boolean>;
  autoArrange: boolean;
  alignGrid: boolean;
  resolution: string;
  dpi: number;
  pointer: "aero" | "large" | "black";
  trails: boolean;
  keyClick: boolean;
  users: User[];
  currentUser: string;
  volume: number;
  muted: boolean;
  taskbar: { lock: boolean; autohide: boolean; small: boolean; pos: "bottom" | "top" | "left" | "right"; combine: "always" | "never"; peek: boolean };
  pinned: string[];
  recent: string[];
  gadgets: GadgetInst[];
  clock24: boolean;
  tz: number | null;
  region: string;
  power: { plan: string; display: number; sleep: number };
  firewall: boolean;
  autoUpdate: string;
  uac: "always" | "default" | "never";
  folder: { showHidden: boolean; showExt: boolean; preview: boolean; details: boolean; navPane: boolean };
  ie: { home: string; favs: { title: string; url: string }[]; history: string[] };
  installed: Installed[];
  hiddenTray: string[];
  defaults: Record<string, string>;
  highContrastText: boolean;
  deviceDisabled: string[];
}

export interface Win {
  id: string;
  app: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  min: boolean;
  max: boolean;
  z: number;
  props: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  snap?: "l" | "r" | null;
  prev?: { x: number; y: number; w: number; h: number } | null;
  progress?: number | null;
  closing?: boolean;
  modal?: boolean;
}

export interface Notif { id: number; title: string; text: string; icon: string; time: number }
export type Power = "boot" | "login" | "welcome" | "desktop" | "locked" | "shuttingdown" | "off" | "sleep" | "restarting" | "logoff";

export interface State {
  settings: Settings;
  fs: Fs;
  iconPos: Record<string, { x: number; y: number }>;
  windows: Win[];
  focus: string | null;
  clipboard: { ids: string[]; mode: "copy" | "cut" } | null;
  power: Power;
  startOpen: boolean;
  flyout: null | "clock" | "volume" | "network" | "action" | "overflow" | "battery";
  peek: null | "all" | string;
  desktopShown: boolean;
  hiddenIds: string[];
  notifications: Notif[];
  balloon: Notif | null;
  menu: { x: number; y: number; items: MenuItem[] } | null;
  altTab: { idx: number; ids: string[] } | null;
  mag: { on: boolean; level: number };
  screen: { w: number; h: number };
  runDialog: boolean;
  screensaverOn: boolean;
  rev: number;
}

/* --------------------------------------------------------------- defaults */
export const DEFAULTS: Settings = {
  theme: "aero",
  wallpaper: "win7",
  wpPos: "fill",
  colorKey: "sky",
  transparency: true,
  intensity: 50,
  soundScheme: "default",
  screensaver: "none",
  ssWait: 10,
  showIcons: true,
  iconSize: "medium",
  sysIcons: { computer: true, user: true, network: true, recycle: true, cpanel: true },
  autoArrange: false,
  alignGrid: true,
  resolution: "native",
  dpi: 100,
  pointer: "aero",
  trails: false,
  keyClick: false,
  users: [
    { name: "User", pic: "flower", admin: true },
    { name: "Guest", pic: "star", admin: false },
  ],
  currentUser: "User",
  volume: 60,
  muted: false,
  taskbar: { lock: true, autohide: false, small: false, pos: "bottom", combine: "always", peek: true },
  pinned: ["ie", "explorer", "wmp"],
  recent: ["notepad", "paint", "calc"],
  gadgets: [
    { id: "g1", type: "clock", x: -190, y: 20 },
    { id: "g2", type: "cpu", x: -190, y: 190 },
  ],
  clock24: false,
  tz: null,
  region: "en-US",
  power: { plan: "balanced", display: 10, sleep: 30 },
  firewall: true,
  autoUpdate: "auto",
  uac: "default",
  folder: { showHidden: false, showExt: true, preview: false, details: true, navPane: true },
  ie: { home: "about:home", favs: [{ title: "Windows Live", url: "about:home" }, { title: "Wikipedia", url: "https://en.m.wikipedia.org" }, { title: "Bing", url: "about:bing" }], history: [] },
  installed: [
    { id: "ie8", name: "Windows Internet Explorer 8", publisher: "Microsoft Corporation", size: "—", date: "7/14/2009", version: "8.0.7600" },
    { id: "wmp12", name: "Windows Media Player 12", publisher: "Microsoft Corporation", size: "—", date: "7/14/2009", version: "12.0.7600" },
    { id: "net", name: "Microsoft .NET Framework 3.5 SP1", publisher: "Microsoft Corporation", size: "38.2 MB", date: "7/14/2009", version: "3.5.30729" },
    { id: "vc", name: "Microsoft Visual C++ 2008 Redistributable", publisher: "Microsoft Corporation", size: "592 KB", date: "7/14/2009", version: "9.0.30729" },
  ],
  hiddenTray: ["net-tools"],
  defaults: { browser: "ie", music: "wmp", photos: "photos", text: "notepad", email: "none" },
  highContrastText: false,
  deviceDisabled: [],
};

export const view = { scale: 1 };
export let locale = "en-US";

/* --------------------------------------------------------------- storage */
export function lsGet<T>(k: string, d: T): T {
  try {
    if (typeof localStorage === "undefined") return d;
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}
export function lsSet(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

function mergeSettings(saved: Partial<Settings>): Settings {
  const s = { ...DEFAULTS, ...saved } as Settings;
  s.taskbar = { ...DEFAULTS.taskbar, ...(saved.taskbar || {}) };
  s.sysIcons = { ...DEFAULTS.sysIcons, ...(saved.sysIcons || {}) };
  s.power = { ...DEFAULTS.power, ...(saved.power || {}) };
  s.folder = { ...DEFAULTS.folder, ...(saved.folder || {}) };
  s.ie = { ...DEFAULTS.ie, ...(saved.ie || {}) };
  s.defaults = { ...DEFAULTS.defaults, ...(saved.defaults || {}) };
  return s;
}

function init(): State {
  const settings = mergeSettings(lsGet<Partial<Settings>>("win7.settings", {}));
  let fs = lsGet<Fs | null>("win7.fs.v1", null);
  if (!fs || !fs["c"]) {
    fs = seedFs();
  }
  locale = settings.region;
  snd.vol = settings.volume / 100;
  snd.muted = settings.muted;
  snd.scheme = settings.soundScheme;
  snd.keyClick = settings.keyClick;
  return {
    settings,
    fs,
    iconPos: lsGet("win7.icons", {}),
    windows: [],
    focus: null,
    clipboard: null,
    power: "boot",
    startOpen: false,
    flyout: null,
    peek: null,
    desktopShown: false,
    hiddenIds: [],
    notifications: [],
    balloon: null,
    menu: null,
    altTab: null,
    mag: { on: false, level: 2 },
    screen: { w: 1280, h: 720 },
    runDialog: false,
    screensaverOn: false,
    rev: 0,
  };
}

export let state: State = init();
const listeners = new Set<() => void>();
let fsTimer: ReturnType<typeof setTimeout> | null = null;

export function getState() {
  return state;
}

export function setState(p: Partial<State> | ((s: State) => Partial<State>)) {
  const patch = typeof p === "function" ? p(state) : p;
  state = { ...state, ...patch };
  if ("settings" in patch) {
    lsSet("win7.settings", state.settings);
  }
  if ("iconPos" in patch) lsSet("win7.icons", state.iconPos);
  if ("fs" in patch) {
    if (fsTimer) clearTimeout(fsTimer);
    fsTimer = setTimeout(() => {
      if (!lsSet("win7.fs.v1", state.fs)) {
        notify({ title: "Disk full", text: "The browser storage quota is full. Recent changes may not be saved.", icon: "error" });
      }
    }, 350);
  }
  listeners.forEach((l) => l());
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => sel(state),
    () => sel(state)
  );
}

export function setSettings(patch: Partial<Settings>) {
  const settings = { ...state.settings, ...patch };
  if (patch.region) locale = patch.region;
  if ("volume" in patch) snd.vol = settings.volume / 100;
  if ("muted" in patch) snd.muted = settings.muted;
  if ("soundScheme" in patch) snd.scheme = settings.soundScheme;
  if ("keyClick" in patch) snd.keyClick = settings.keyClick;
  setState({ settings });
}

export function resetAll() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith("win7.")).forEach((k) => localStorage.removeItem(k));
  } catch {}
  location.reload();
}

/* --------------------------------------------------------------- helpers */
let uidSeq = 0;
export const uid = () => "n" + Date.now().toString(36) + (uidSeq++).toString(36) + Math.floor(Math.random() * 1e4).toString(36);
export const extOf = (name: string) => {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
};
export const baseOf = (name: string) => {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
};

export function fmtSize(b: number): string {
  if (b <= 0) return "0 KB";
  if (b < 1024) return "1 KB";
  return Math.ceil(b / 1024).toLocaleString("en-US") + " KB";
}
export function fmtBig(b: number): string {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b >= 1e3) return (b / 1e3).toFixed(1) + " KB";
  return b + " bytes";
}
export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString(locale, { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const KINDS: Record<string, string> = {
  txt: "Text Document", log: "Text Document", ini: "Configuration settings", rtf: "Rich Text Document", doc: "Microsoft Word Document", html: "HTML Document", htm: "HTML Document",
  jpg: "JPEG image", jpeg: "JPEG image", png: "PNG image", bmp: "Bitmap image", gif: "GIF image", svg: "SVG image", mp3: "MP3 Format Sound", wma: "Windows Media audio file", wav: "Wave Sound",
  wmv: "Windows Media video file", mp4: "MP4 Video", webm: "WebM Video", exe: "Application", lnk: "Shortcut", zip: "Compressed (zipped) Folder", iso: "Disc Image File", ttf: "TrueType font file", dll: "Application extension", bat: "Windows Batch File",
};
export function kindOf(n: FsNode): string {
  if (n.type === "folder") return n.parent === null ? "Local Disk" : "File folder";
  const e = extOf(n.name);
  return KINDS[e] || (e ? e.toUpperCase() + " File" : "File");
}

export function pathOf(id: string, fs: Fs = state.fs): string {
  const parts: string[] = [];
  let n: FsNode | undefined = fs[id];
  while (n) {
    parts.unshift(n.parent === null ? n.letter || n.name : n.name);
    n = n.parent ? fs[n.parent] : undefined;
  }
  return parts.join("\\") + (parts.length === 1 ? "\\" : "");
}

export function children(id: string, fs: Fs = state.fs): FsNode[] {
  return Object.values(fs).filter((n) => n.parent === id && !n.trash);
}
export function trashed(fs: Fs = state.fs): FsNode[] {
  return Object.values(fs).filter((n) => n.trash);
}
export function isDesc(fs: Fs, id: string, anc: string): boolean {
  let n: FsNode | undefined = fs[id];
  while (n) {
    if (n.id === anc) return true;
    n = n.parent ? fs[n.parent] : undefined;
  }
  return false;
}
export function resolvePath(p: string, cwd?: string, fs: Fs = state.fs): string | null {
  let str = p.trim().replace(/\//g, "\\").replace(/^"|"$/g, "");
  if (!str) return cwd || null;
  let cur: string | null = cwd || null;
  const m = /^([a-zA-Z]:)(.*)$/.exec(str);
  if (m) {
    const dr = Object.values(fs).find((n) => n.parent === null && n.letter?.toLowerCase() === m[1].toLowerCase());
    if (!dr) return null;
    cur = dr.id;
    str = m[2];
  } else if (str.startsWith("\\")) {
    let r: string | null = cwd || null;
    while (r && fs[r]?.parent) r = fs[r].parent;
    cur = r;
  }
  for (const part of str.split("\\").filter(Boolean)) {
    if (part === ".") continue;
    if (part === "..") {
      cur = cur && fs[cur]?.parent ? fs[cur].parent : cur;
      continue;
    }
    if (!cur) return null;
    const c = children(cur, fs).find((n) => n.name.toLowerCase() === part.toLowerCase());
    if (!c) return null;
    cur = c.id;
  }
  return cur;
}

export function uniqueName(fs: Fs, parent: string, name: string, mode: "num" | "copy" = "num"): string {
  const sibs = new Set(Object.values(fs).filter((n) => n.parent === parent && !n.trash).map((n) => n.name.toLowerCase()));
  if (!sibs.has(name.toLowerCase())) return name;
  const e = extOf(name);
  const b = e ? name.slice(0, name.length - e.length - 1) : name;
  for (let i = mode === "copy" ? 1 : 2; i < 999; i++) {
    const cand = mode === "copy" ? `${b} - Copy${i > 1 ? ` (${i})` : ""}${e ? "." + e : ""}` : `${b} (${i})${e ? "." + e : ""}`;
    if (!sibs.has(cand.toLowerCase())) return cand;
  }
  return name + uid();
}

function fsEdit(fn: (fs: Fs) => void) {
  const fs = { ...state.fs };
  fn(fs);
  setState({ fs });
}

export function mkdir(parent: string, name = "New folder"): string {
  const id = uid();
  fsEdit((fs) => {
    fs[id] = { id, name: uniqueName(fs, parent, name), type: "folder", parent, size: 0, created: Date.now(), modified: Date.now() };
  });
  return id;
}
export function mkfile(parent: string, name: string, content = "", size?: number): string {
  const id = uid();
  fsEdit((fs) => {
    fs[id] = { id, name: uniqueName(fs, parent, name), type: "file", parent, content, size: size ?? content.length, created: Date.now(), modified: Date.now() };
  });
  return id;
}
export function writeFile(id: string, content: string) {
  fsEdit((fs) => {
    if (fs[id]) fs[id] = { ...fs[id], content, size: content.length, modified: Date.now() };
  });
}
export function renameNode(id: string, name: string): boolean {
  name = name.trim();
  const n = state.fs[id];
  if (!n || !name) return false;
  if (/[\\/:*?"<>|]/.test(name)) {
    msgBox({ title: "Rename", text: 'A file name cannot contain any of the following characters:\n\\ / : * ? " < > |', icon: "warn" });
    return false;
  }
  if (name.toLowerCase() !== n.name.toLowerCase() && n.parent && children(n.parent).some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    msgBox({ title: "Rename Folder", text: "A file with the name you specified already exists. Specify a different file name.", icon: "warn" });
    return false;
  }
  fsEdit((fs) => {
    fs[id] = { ...fs[id], name, modified: Date.now() };
  });
  return true;
}
export function trashNodes(ids: string[]) {
  fsEdit((fs) => {
    ids.forEach((id) => {
      const n = fs[id];
      if (n && n.parent) fs[id] = { ...n, trash: { from: n.parent, at: Date.now() } };
    });
  });
  playSys("recycle");
}
export function restoreNodes(ids: string[]) {
  fsEdit((fs) => {
    ids.forEach((id) => {
      const n = fs[id];
      if (!n?.trash) return;
      let to = n.trash.from;
      if (!fs[to] || fs[to].trash) to = "desk";
      fs[id] = { ...n, parent: to, name: uniqueName(fs, to, n.name), trash: null };
    });
  });
}
export function deleteForever(ids: string[]) {
  fsEdit((fs) => {
    const rm = (id: string) => {
      Object.values(fs).filter((c) => c.parent === id).forEach((c) => rm(c.id));
      delete fs[id];
    };
    ids.forEach(rm);
  });
}
export function emptyTrash() {
  deleteForever(trashed().map((n) => n.id));
}
export function copyNodes(ids: string[], to: string): string[] {
  const out: string[] = [];
  fsEdit((fs) => {
    const dup = (id: string, parent: string, top: boolean) => {
      const n = fs[id];
      if (!n) return;
      const nid = uid();
      const kids = Object.values(fs).filter((c) => c.parent === id && !c.trash);
      fs[nid] = { ...n, id: nid, parent, name: top ? uniqueName(fs, parent, n.name, "copy") : n.name, created: Date.now(), modified: Date.now(), trash: null };
      if (top) out.push(nid);
      kids.forEach((k) => dup(k.id, nid, false));
    };
    ids.forEach((id) => {
      if (fs[id] && !isDesc(fs, to, id)) dup(id, to, true);
    });
  });
  return out;
}
export function moveNodes(ids: string[], to: string) {
  fsEdit((fs) => {
    ids.forEach((id) => {
      const n = fs[id];
      if (!n || n.id === to || isDesc(fs, to, id) || n.parent === to) return;
      fs[id] = { ...n, parent: to, name: uniqueName(fs, to, n.name, "copy"), modified: Date.now() };
    });
  });
}
export function searchFs(root: string | null, q: string): FsNode[] {
  q = q.toLowerCase();
  const out: FsNode[] = [];
  const fs = state.fs;
  const all = Object.values(fs).filter((n) => !n.trash);
  const byParent: Record<string, FsNode[]> = {};
  all.forEach((n) => {
    const k = n.parent || "";
    (byParent[k] ||= []).push(n);
  });
  const walk = (id: string) => {
    for (const c of byParent[id] || []) {
      if (c.name.toLowerCase().includes(q)) out.push(c);
      if (c.type === "folder") walk(c.id);
      if (out.length > 200) return;
    }
  };
  if (root) walk(root);
  else Object.values(fs).filter((n) => n.parent === null).forEach((d) => walk(d.id));
  return out;
}

/* --------------------------------------------------------------- windows */
let winSeq = 1;
let zTop = 10;
const guards = new Map<string, () => boolean>();
export function setGuard(id: string, fn: (() => boolean) | null) {
  if (fn) guards.set(id, fn);
  else guards.delete(id);
}

export function tbThick(s: Settings): number {
  const t = s.taskbar;
  if (t.pos === "left" || t.pos === "right") return t.small ? 46 : 64;
  return t.small ? 30 : 40;
}
export function workArea(s: State) {
  const t = s.settings.taskbar;
  const { w, h } = s.screen;
  if (t.autohide) return { x: 0, y: 0, w, h };
  const th = tbThick(s.settings);
  switch (t.pos) {
    case "top": return { x: 0, y: th, w, h: h - th };
    case "left": return { x: th, y: 0, w: w - th, h };
    case "right": return { x: 0, y: 0, w: w - th, h };
    default: return { x: 0, y: 0, w, h: h - th };
  }
}

export function topWindow(exclude?: string): Win | undefined {
  return state.windows.filter((w) => !w.min && !w.closing && w.id !== exclude).sort((a, b) => b.z - a.z)[0];
}

function patchWin(id: string, p: Partial<Win>) {
  setState({ windows: state.windows.map((w) => (w.id === id ? { ...w, ...p } : w)) });
}
export function setWin(id: string, p: Partial<Win>) {
  patchWin(id, p);
}

export function openApp(app: string, props: any = {}, opts: Partial<Win> = {}): string { // eslint-disable-line @typescript-eslint/no-explicit-any
  const meta = APPS[app];
  if (!meta) return "";
  if (meta.single) {
    const ex = state.windows.find((w) => w.app === app && !w.closing);
    if (ex) {
      if (Object.keys(props).length) patchWin(ex.id, { props: { ...ex.props, ...props } });
      focusWin(ex.id);
      return ex.id;
    }
  }
  const wa = workArea(state);
  const count = state.windows.filter((w) => !APPS[w.app].noTask).length;
  const w = Math.min(opts.w ?? meta.w, wa.w - 8);
  const h = Math.min(opts.h ?? meta.h, wa.h - 8);
  let x: number, y: number;
  if (meta.noTask || meta.modal) {
    const n = state.windows.filter((q) => APPS[q.app].noTask).length;
    x = wa.x + Math.round((wa.w - w) / 2) + (n % 5) * 20;
    y = wa.y + Math.round((wa.h - h) / 2.4) + (n % 5) * 20;
  } else {
    x = wa.x + Math.max(0, Math.round((wa.w - w) / 2 - 70 + (count % 8) * 30));
    y = wa.y + Math.max(0, Math.round((wa.h - h) / 2 - 40 + (count % 8) * 26));
  }
  const win: Win = { id: "w" + winSeq++, app, title: opts.title || meta.title, x: opts.x ?? x, y: opts.y ?? y, w, h, min: false, max: false, z: ++zTop, props, modal: meta.modal, ...opts };
  const settings = !meta.noTask && !meta.hidden && !state.settings.recent.includes(app) ? { ...state.settings, recent: [app, ...state.settings.recent].slice(0, 6) } : state.settings;
  setState({ windows: [...state.windows, win], focus: win.id, startOpen: false, flyout: null, desktopShown: false, settings });
  return win.id;
}

export function focusWin(id: string) {
  const w = state.windows.find((q) => q.id === id);
  if (!w || w.closing) return;
  if (state.focus === id && !w.min && w.z === zTop && !state.startOpen && !state.flyout) return;
  const modal = state.windows.find((q) => q.modal && q.id !== id && !q.closing);
  if (modal) {
    patchWin(modal.id, { z: ++zTop });
    setState({ focus: modal.id });
    return;
  }
  setState({ windows: state.windows.map((q) => (q.id === id ? { ...q, min: false, z: ++zTop } : q)), focus: id, desktopShown: false });
}

export function closeWin(id: string, force = false) {
  const g = guards.get(id);
  if (!force && g && g()) return;
  guards.delete(id);
  const w = state.windows.find((q) => q.id === id);
  if (!w) return;
  patchWin(id, { closing: true });
  setTimeout(() => {
    const wins = state.windows.filter((q) => q.id !== id);
    const top = wins.filter((q) => !q.min && !q.closing).sort((a, b) => b.z - a.z)[0];
    setState({ windows: wins, focus: state.focus === id ? top?.id ?? null : state.focus, peek: state.peek === id ? null : state.peek });
  }, 140);
}

export function minWin(id: string) {
  playSys("minimize");
  const wins = state.windows.map((q) => (q.id === id ? { ...q, min: true } : q));
  const top = wins.filter((q) => !q.min && !q.closing).sort((a, b) => b.z - a.z)[0];
  setState({ windows: wins, focus: top?.id ?? null });
}
export function maxWin(id: string) {
  const w = state.windows.find((q) => q.id === id);
  if (!w || APPS[w.app].fixed) return;
  if (w.max || w.snap) {
    const p = w.prev;
    patchWin(id, { max: false, snap: null, ...(p ? { x: p.x, y: p.y, w: p.w, h: p.h } : {}), prev: null });
  } else {
    patchWin(id, { max: true, prev: { x: w.x, y: w.y, w: w.w, h: w.h } });
  }
  focusWin(id);
}
export function snapWin(id: string, side: "l" | "r") {
  const w = state.windows.find((q) => q.id === id);
  if (!w || APPS[w.app].fixed) return;
  const wa = workArea(state);
  const hw = Math.floor(wa.w / 2);
  patchWin(id, { max: false, snap: side, prev: w.prev || { x: w.x, y: w.y, w: w.w, h: w.h }, x: side === "l" ? wa.x : wa.x + hw, y: wa.y, w: hw, h: wa.h });
}
export function showDesktop() {
  if (state.desktopShown) {
    setState({ windows: state.windows.map((w) => (state.hiddenIds.includes(w.id) ? { ...w, min: false } : w)), desktopShown: false, hiddenIds: [], peek: null });
  } else {
    const vis = state.windows.filter((w) => !w.min && !APPS[w.app].noTask).map((w) => w.id);
    setState({ windows: state.windows.map((w) => (vis.includes(w.id) ? { ...w, min: true } : w)), desktopShown: true, hiddenIds: vis, focus: null, startOpen: false, flyout: null, peek: null });
  }
}
export function closeAllMenus() {
  if (state.startOpen || state.flyout || state.menu) setState({ startOpen: false, flyout: null, menu: null });
}
export function toggleStart() {
  setState({ startOpen: !state.startOpen, flyout: null, menu: null });
}
export function toggleFlyout(f: State["flyout"]) {
  setState({ flyout: state.flyout === f ? null : f, startOpen: false, menu: null });
}
export function showMenu(e: { clientX: number; clientY: number } | { x: number; y: number }, items: MenuItem[]) {
  const x = "clientX" in e ? e.clientX / view.scale : e.x;
  const y = "clientY" in e ? e.clientY / view.scale : e.y;
  setState({ menu: { x, y, items }, startOpen: false, flyout: null });
}
export function hideMenu() {
  if (state.menu) setState({ menu: null });
}

/* ----------------------------------------------------------- dialogs etc */
let notifSeq = 1;
export function notify(o: { title: string; text: string; icon?: string }) {
  const n: Notif = { id: notifSeq++, title: o.title, text: o.text, icon: o.icon || "info", time: Date.now() };
  setState({ notifications: [n, ...state.notifications].slice(0, 30), balloon: n });
  playSys("balloon");
  setTimeout(() => {
    if (state.balloon?.id === n.id) setState({ balloon: null });
  }, 6000);
}

export function msgBox(o: { title?: string; text: string; icon?: "error" | "warn" | "info" | "question" | "shield"; buttons?: string[]; onResult?: (b: string) => void }): string {
  const lines = o.text.split("\n").reduce((a, l) => a + Math.max(1, Math.ceil(l.length / 52)), 0);
  playSys(o.icon === "error" ? "error" : o.icon === "info" ? "ding" : "exclaim");
  return openApp("msgbox", { buttons: ["OK"], icon: "info", ...o }, { title: o.title || "Windows", h: Math.min(420, 130 + lines * 17) });
}

export function uac(o: { name: string; publisher?: string; path?: string; onAllow: () => void }) {
  if (state.settings.uac === "never") return o.onAllow();
  playSys("exclaim");
  openApp("uac", o);
}

export function promptBox(o: { title: string; text: string; value?: string; onOk: (v: string) => void }) {
  openApp("inputbox", o, { title: o.title });
}

export function progressDialog(o: { title: string; text: string; ms?: number; onDone?: () => void; parent?: string; icon?: string }) {
  openApp("progress", o, { title: o.title });
}

/* ---------------------------------------------------------------- opening */
export function openCP(page?: string) {
  const ex = state.windows.find((w) => w.app === "controlpanel" && !w.closing);
  if (ex) {
    patchWin(ex.id, { props: { ...ex.props, page: page || "home", nonce: Math.random() } });
    focusWin(ex.id);
  } else openApp("controlpanel", { page: page || "home" });
}

export function openPath(path: string) {
  openApp("explorer", { path });
}

export function runShortcut(t: string, v: string) {
  if (t === "app") openApp(v);
  else if (t === "path") {
    if (state.fs[v]) openNode(v);
    else openPath(v);
  }
  else if (t === "cp") openCP(v);
  else if (t === "url") openApp("ie", { url: v });
}

export function openNode(id: string) {
  const n = state.fs[id];
  if (!n) return;
  if (n.type === "folder") return openPath(id);
  const e = extOf(n.name);
  if (e === "lnk") {
    try {
      const o = JSON.parse(n.content || "{}");
      runShortcut(o.t, o.v);
    } catch {}
    return;
  }
  if (e === "exe") {
    const c = n.content || "";
    if (c.startsWith("app:")) {
      const a = c.slice(4);
      if (a === "setup") return openApp("setup", { name: n.name.replace(/\.exe$/i, "") });
      return openApp(a);
    }
    return msgBox({ title: n.name, text: `${n.name} is not a valid Win32 application.`, icon: "error" });
  }
  const df = state.settings.defaults;
  if (["txt", "log", "ini", "cfg", "bat", "js", "css", "md", "xml", "json", "csv"].includes(e)) return openApp(df.text === "wordpad" ? "wordpad" : "notepad", { file: id });
  if (["rtf", "doc", "docx"].includes(e)) return openApp("wordpad", { file: id });
  if (["html", "htm"].includes(e)) return openApp("ie", { url: "file:" + id });
  if (["jpg", "jpeg", "png", "bmp", "gif", "svg"].includes(e)) return openApp(df.photos === "paint" ? "paint" : "photos", { file: id });
  if (["mp3", "wma", "wav", "wmv", "mp4", "avi", "webm", "mpg", "m4a", "ogg"].includes(e)) return openApp("wmp", { file: id });
  if (e === "iso") return msgBox({ title: "Windows Disc Image Burner", text: "To burn this disc image, insert a blank recordable disc into your drive.", icon: "info" });
  if (e === "ttf") return msgBox({ title: n.name, text: "This font preview is not available in this simulation.", icon: "info" });
  msgBox({
    title: "Windows",
    text: `Windows can't open this file:\n\n${n.name}\n\nTo open this file, Windows needs to know what program you want to use to open it.`,
    icon: "info",
    buttons: ["Open with Notepad", "Cancel"],
    onResult: (b) => b !== "Cancel" && openApp("notepad", { file: id }),
  });
}

const RUN_MAP: Record<string, string> = {
  notepad: "notepad", calc: "calc", mspaint: "paint", paint: "paint", cmd: "cmd", explorer: "explorer", iexplore: "ie", taskmgr: "taskmgr", wmplayer: "wmp", write: "wordpad", wordpad: "wordpad",
  snippingtool: "snip", charmap: "charmap", magnify: "magnifier", stikynot: "sticky", soundrecorder: "recorder", dvdmaker: "dvdmaker", winver: "winver", minesweeper: "minesweeper", helppane: "help",
};
export function runCommand(raw: string): boolean {
  let cmd = raw.trim();
  if (!cmd) return false;
  const lc = cmd.toLowerCase().replace(/\.exe$/, "");
  if (RUN_MAP[lc]) {
    openApp(RUN_MAP[lc]);
    return true;
  }
  if (lc === "control" || lc === "control panel") return openCP(), true;
  if (lc.startsWith("control ")) return openCP(lc.slice(8).trim() || "home"), true;
  if (lc === "desk.cpl") return openCP("display"), true;
  if (lc === "main.cpl") return openCP("mouse"), true;
  if (lc === "timedate.cpl") return openCP("datetime"), true;
  if (lc === "appwiz.cpl") return openCP("programs"), true;
  if (lc === "sysdm.cpl") return openCP("system"), true;
  if (lc === "mmsys.cpl") return openCP("sound"), true;
  if (lc === "powercfg.cpl") return openCP("power"), true;
  if (lc === "intl.cpl") return openCP("region"), true;
  if (lc === "devmgmt.msc") return openCP("devmgr"), true;
  if (lc === "firewall.cpl") return openCP("firewall"), true;
  if (lc === "inetcpl.cpl") return openCP("inetopts"), true;
  if (lc === "shutdown") return shutdown(), true;
  if (lc === "regedit" || lc === "msconfig" || lc === "gpedit.msc") {
    msgBox({ title: cmd, text: "Registry editing has been disabled by your administrator.", icon: "error" });
    return true;
  }
  if (/^https?:\/\//i.test(cmd) || /^www\./i.test(cmd)) return openApp("ie", { url: cmd }), true;
  cmd = cmd.replace(/^"|"$/g, "");
  if (cmd === "." || cmd === "..") return openPath("home"), true;
  if (cmd.startsWith("\\\\")) return openPath("network"), true;
  if (cmd.toLowerCase() === "shell:desktop") return openPath("desk"), true;
  const id = resolvePath(cmd);
  if (id) {
    openNode(id);
    return true;
  }
  msgBox({ title: cmd, text: `Windows cannot find '${cmd}'. Make sure you typed the name correctly, and then try again.`, icon: "error" });
  return false;
}

/* -------------------------------------------------------------- power */
export function shutdown() {
  setState({ power: "shuttingdown", startOpen: false, flyout: null, menu: null });
  playSys("shutdown");
  setTimeout(() => setState({ power: "off", windows: [], focus: null }), 2600);
}
export function restart() {
  setState({ power: "restarting", startOpen: false, flyout: null, menu: null });
  playSys("shutdown");
  setTimeout(() => setState({ power: "boot", windows: [], focus: null }), 2600);
}
export function sleep() {
  setState({ power: "sleep", startOpen: false, flyout: null, menu: null });
}
export function wake() {
  setState({ power: "locked" });
}
export function lock() {
  setState({ power: "locked", startOpen: false, flyout: null, menu: null });
}
export function logoff() {
  setState({ power: "logoff", startOpen: false, flyout: null, menu: null });
  playSys("logoff");
  setTimeout(() => setState({ power: "login", windows: [], focus: null, desktopShown: false }), 2200);
}
export function login(name: string) {
  const fresh = state.power === "login" || state.power === "boot" || state.settings.currentUser !== name;
  if (!fresh) {
    setState({ power: "desktop" });
    return;
  }
  if (state.settings.currentUser !== name) setState({ windows: [], focus: null });
  setSettings({ currentUser: name });
  setState({ power: "welcome" });
  playSys("startup");
  setTimeout(() => {
    setState({ power: "desktop" });
    if (!lsGet("win7.welcomed", false)) {
      lsSet("win7.welcomed", true);
      setTimeout(() => notify({ title: "Welcome to Windows 7", text: "Press the Windows key to open the Start menu, or right-click the desktop to personalize it.", icon: "info" }), 900);
    }
  }, 2300);
}

/* ------------------------------------------------------------ icon pos */
export function setIconPos(map: Record<string, { x: number; y: number }>) {
  setState({ iconPos: { ...state.iconPos, ...map } });
}

export function bumpRev() {
  setState({ rev: state.rev + 1 });
}
