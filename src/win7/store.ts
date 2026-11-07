import { useSyncExternalStore } from "react";
import { APPS } from "./registry";
import { seedFs, WALLPAPERS } from "./data";
import { snd, playSys, SCHEMES, clearCache, preload } from "./sound";
import { bugcheckText, logEvent, EVENT_IDS, type StopCode } from "./kernel";

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
  /** play the audio of a video background (desktop slideshow sound) */
  wpSound: boolean;
  colorKey: string;
  transparency: boolean;
  intensity: number;
  soundScheme: string;
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
  wpShuffle: boolean;
  wpInterval: number;
  snapAssist: boolean;
  shake: boolean;
  aero: { animations: boolean; shadows: boolean; taskbarAnim: boolean; smoothScroll: boolean };
  recentDocs: { id: string; app: string; at: number }[];
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
  /** true while a maximize/snap/restore animation is running */
  changing?: boolean;
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
  power: Power | "bsod";
  /** set when the kernel bug-checked, so the blue screen can name the stop code */
  crash: { stop: string; driver?: string; text: string } | null;
  /** diagnostics: force a driver to fail on the next boot (Control Panel) */
  brokenDriver: string | null;
  safeMode: boolean;
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
  flip: { ids: string[]; idx: number } | null;
  taskbarIdx: number | null;
  jumplist: { app: string; x: number; y: number; pinned: string[] } | null;
  altTabHover: string | null;
  windowIds: string[];
  notifyToast: { title: string; text: string; icon: string; at: number } | null;
}

/* --------------------------------------------------------------- defaults */
export const DEFAULTS: Settings = {
  theme: "aero",
  wallpaper: "win7",
  wpPos: "fill",
  wpSound: false,
  colorKey: "sky",
  transparency: true,
  intensity: 50,
  soundScheme: "Windows Default",
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
  wpShuffle: false,
  wpInterval: 30,
  snapAssist: true,
  shake: true,
  aero: { animations: true, shadows: true, taskbarAnim: true, smoothScroll: true },
  recentDocs: [],
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

/* -------------------------------------------------- state sanitisation
 * Saved settings come from localStorage, which may hold values written by an
 * older build of the simulation, a half-finished write, or a manually edited
 * entry. A single unexpected value (e.g. an unknown icon size) used to throw
 * while the shell mounted and left the user with a black screen, so every
 * persisted setting is validated here and falls back to its default.
 */
const oneOf = <T extends string | number>(v: unknown, allowed: readonly T[], fb: T): T =>
  (allowed as readonly unknown[]).includes(v) ? (v as T) : fb;
const bool = (v: unknown, fb: boolean): boolean => (typeof v === "boolean" ? v : fb);
const num = (v: unknown, fb: number, min = -Infinity, max = Infinity): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb;
const str = (v: unknown, fb: string): string => (typeof v === "string" && v.length ? v : fb);
const arr = <T,>(v: unknown, fb: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fb);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const strArr = (v: unknown, fb: string[] = []): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : fb);

export const THEMES = ["aero", "basic", "classic", "hc"] as const;
export const ICON_SIZES = ["large", "medium", "small"] as const;
export const WP_POSITIONS = ["fill", "fit", "stretch", "tile", "center"] as const;
export const SCREENSAVERS = ["none", "bubbles", "ribbons", "photos", "blank"] as const;
export const POINTERS = ["aero", "large", "black"] as const;
export const TASKBAR_SIDES = ["bottom", "top", "left", "right"] as const;
export const COMBINE_MODES = ["always", "never"] as const;
export const GADGET_TYPES_KNOWN = ["clock", "calendar", "cpu", "weather", "puzzle", "slideshow", "rss"] as const;

function sanitizeUsers(v: unknown): User[] {
  const list = arr<unknown>(v, []).filter((u): u is Record<string, unknown> => !!u && typeof u === "object");
  const users: User[] = list.map((u) => ({
    name: str(u.name, "User").slice(0, 40),
    pic: str(u.pic, "flower"),
    admin: bool(u.admin, false),
    ...(typeof u.pass === "string" && u.pass ? { pass: u.pass } : {}),
  }));
  const seen = new Set<string>();
  const unique = users.filter((u) => (seen.has(u.name.toLowerCase()) ? false : (seen.add(u.name.toLowerCase()), true)));
  return unique.length ? unique : DEFAULTS.users.map((u) => ({ ...u }));
}

function sanitizeGadgets(v: unknown): GadgetInst[] {
  return arr<unknown>(v, [])
    .filter((g): g is Record<string, unknown> => !!g && typeof g === "object")
    .map((g, i) => ({
      id: str(g.id, "g" + i),
      type: oneOf(g.type, GADGET_TYPES_KNOWN, "clock"),
      x: num(g.x, 0, -10000, 10000),
      y: num(g.y, 20, -10000, 10000),
      top: bool(g.top, false),
    }));
}

function sanitizeSettings(savedRaw: unknown): Settings {
  const saved = obj(savedRaw) as Partial<Settings>;
  const d = DEFAULTS;
  const taskbar = obj(saved.taskbar);
  const power = obj(saved.power);
  const folder = obj(saved.folder);
  const ieSaved = obj(saved.ie);
  const aero = obj(saved.aero);
  const defaults = obj(saved.defaults);
  const sysIconsRaw = obj(saved.sysIcons);
  const sysIcons: Record<string, boolean> = { ...d.sysIcons };
  Object.keys(sysIcons).forEach((k) => { sysIcons[k] = bool(sysIconsRaw[k], true); });

  const users = sanitizeUsers(saved.users);
  const currentUser = users.some((u) => u.name === saved.currentUser) ? (saved.currentUser as string) : users[0].name;

  const installed = arr<unknown>(saved.installed, d.installed)
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x, i) => ({
      id: str(x.id, "pkg" + i),
      name: str(x.name, "Program"),
      publisher: str(x.publisher, "Unknown"),
      size: str(x.size, "—"),
      date: str(x.date, "—"),
      version: str(x.version, "1.0"),
    }));

  const wp = saved.wallpaper;
  const knownWp = WALLPAPERS.some((w) => w.key === wp);
  const wallpaper = typeof wp === "string" && (knownWp || wp.startsWith("fs:") || wp.startsWith("media:")) ? wp : d.wallpaper;

  const defaultsOut: Record<string, string> = { ...d.defaults };
  Object.keys(defaultsOut).forEach((k) => { defaultsOut[k] = str(defaults[k], defaultsOut[k]); });

  return {
    theme: oneOf(saved.theme, THEMES, d.theme),
    wallpaper,
    wpPos: oneOf(saved.wpPos, WP_POSITIONS, d.wpPos),
    wpSound: bool(saved.wpSound, d.wpSound),
    colorKey: str(saved.colorKey, d.colorKey),
    transparency: bool(saved.transparency, d.transparency),
    intensity: num(saved.intensity, d.intensity, 0, 100),
    // legacy saves stored "default"/"none"; the scheme names are Windows' own
    soundScheme: saved.soundScheme === "none" ? "No Sounds"
      : SCHEMES.includes(saved.soundScheme as (typeof SCHEMES)[number]) ? (saved.soundScheme as string)
      : "Windows Default",
    screensaver: oneOf(saved.screensaver, SCREENSAVERS, d.screensaver),
    ssWait: num(saved.ssWait, d.ssWait, 1, 240),
    showIcons: bool(saved.showIcons, d.showIcons),
    iconSize: oneOf(saved.iconSize, ICON_SIZES, d.iconSize),
    sysIcons,
    autoArrange: bool(saved.autoArrange, d.autoArrange),
    alignGrid: bool(saved.alignGrid, d.alignGrid),
    resolution: str(saved.resolution, d.resolution),
    dpi: num(saved.dpi, d.dpi, 100, 200),
    pointer: oneOf(saved.pointer, POINTERS, d.pointer),
    trails: bool(saved.trails, d.trails),
    keyClick: bool(saved.keyClick, d.keyClick),
    users,
    currentUser,
    volume: num(saved.volume, d.volume, 0, 100),
    muted: bool(saved.muted, d.muted),
    taskbar: {
      lock: bool(taskbar.lock, d.taskbar.lock),
      autohide: bool(taskbar.autohide, d.taskbar.autohide),
      small: bool(taskbar.small, d.taskbar.small),
      pos: oneOf(taskbar.pos, TASKBAR_SIDES, d.taskbar.pos),
      combine: oneOf(taskbar.combine, COMBINE_MODES, d.taskbar.combine),
      peek: bool(taskbar.peek, d.taskbar.peek),
    },
    pinned: strArr(saved.pinned, d.pinned).filter((a) => !!APPS[a]),
    recent: strArr(saved.recent, d.recent).filter((a) => !!APPS[a]),
    gadgets: sanitizeGadgets(saved.gadgets),
    clock24: bool(saved.clock24, d.clock24),
    tz: typeof saved.tz === "number" && Number.isFinite(saved.tz) ? saved.tz : null,
    region: str(saved.region, d.region),
    power: {
      plan: str(power.plan, d.power.plan),
      display: num(power.display, d.power.display, 1, 240),
      sleep: num(power.sleep, d.power.sleep, 0, 600),
    },
    firewall: bool(saved.firewall, d.firewall),
    autoUpdate: str(saved.autoUpdate, d.autoUpdate),
    uac: oneOf(saved.uac, ["always", "default", "never"] as const, d.uac),
    folder: {
      showHidden: bool(folder.showHidden, d.folder.showHidden),
      showExt: bool(folder.showExt, d.folder.showExt),
      preview: bool(folder.preview, d.folder.preview),
      details: bool(folder.details, d.folder.details),
      navPane: bool(folder.navPane, d.folder.navPane),
    },
    ie: {
      home: str(ieSaved.home, d.ie.home),
      favs: arr<unknown>(ieSaved.favs, d.ie.favs)
        .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
        .map((f) => ({ title: str(f.title, "Favorite"), url: str(f.url, "about:home") })),
      history: strArr(ieSaved.history, []),
    },
    installed,
    hiddenTray: strArr(saved.hiddenTray, d.hiddenTray),
    defaults: defaultsOut,
    highContrastText: bool(saved.highContrastText, d.highContrastText),
    deviceDisabled: strArr(saved.deviceDisabled, []),
    wpShuffle: bool(saved.wpShuffle, d.wpShuffle),
    wpInterval: num(saved.wpInterval, d.wpInterval, 1, 1440),
    snapAssist: bool(saved.snapAssist, d.snapAssist),
    shake: bool(saved.shake, d.shake),
    aero: {
      animations: bool(aero.animations, d.aero.animations),
      shadows: bool(aero.shadows, d.aero.shadows),
      taskbarAnim: bool(aero.taskbarAnim, d.aero.taskbarAnim),
      smoothScroll: bool(aero.smoothScroll, d.aero.smoothScroll),
    },
    recentDocs: arr<unknown>(saved.recentDocs, [])
      .map((x) => obj(x))
      .filter((x) => typeof x.id === "string")
      .map((x) => ({ id: x.id as string, app: str(x.app, "notepad"), at: num(x.at, 0) })),
  };
}

/** The desktop needs at least a bootable C: drive; anything else is reseeded. */
function sanitizeFs(raw: unknown): Fs | null {
  const fs = obj(raw) as Fs;
  const keys = Object.keys(fs);
  if (!keys.length) return null;
  const root = fs["c"];
  if (!root || root.type !== "folder" || typeof root.name !== "string") return null;
  const ok = keys.every((k) => {
    const n = fs[k];
    return !!n && typeof n === "object" && typeof n.id === "string" && typeof n.name === "string" && (n.type === "file" || n.type === "folder");
  });
  return ok ? fs : null;
}

function sanitizeIconPos(raw: unknown): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const src = obj(raw);
  Object.keys(src).forEach((k) => {
    const p = obj(src[k]);
    if (typeof p.x === "number" && typeof p.y === "number" && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      out[k] = { x: p.x, y: p.y };
    }
  });
  return out;
}

export function resetSettings() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("win7."))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
}

function init(): State {
  const settings = sanitizeSettings(lsGet<unknown>("win7.settings", {}));
  let fs = sanitizeFs(lsGet<unknown>("win7.fs.v1", null));
  if (!fs) {
    // first run, cleared storage, or a file system that cannot be read back
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
    iconPos: sanitizeIconPos(lsGet<unknown>("win7.icons", {})),
    windows: [],
    focus: null,
    clipboard: null,
    power: "boot",
    crash: null,
    brokenDriver: null,
    safeMode: false,
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
    flip: null,
    taskbarIdx: null,
    jumplist: null,
    altTabHover: null,
    windowIds: [],
    notifyToast: null,
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
  if ("soundScheme" in patch) {
    snd.scheme = settings.soundScheme;
    clearCache();
    preload();
  }
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
  if (meta.exe && !meta.noTask && !meta.hidden) {
    const e = EVENT_IDS.appError;
    logEvent("Information", e.source, 1000, `${meta.exe} started (${meta.title}).`, "Application");
  }
  if (props && props.file && state.fs[props.file]) {
    try { jumpTouch(app, props.file); } catch {}
  }
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
/**
 * Marks a window as being in the middle of a maximise/restore/snap animation.
 * The frame then transitions its geometry for `ms` (Aero's DWM animation),
 * instead of teleporting to the new bounds.
 */
function animateChange(id: string, ms: number) {
  patchWin(id, { changing: true });
  clearTimeout(changeTimers.get(id));
  changeTimers.set(
    id,
    setTimeout(() => {
      changeTimers.delete(id);
      patchWin(id, { changing: false });
    }, ms)
  );
}
const changeTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Exact, hand-edited window geometry (drag/resize) — no animation. */
export function setGeom(id: string, geom: { x: number; y: number; w: number; h: number }) {
  patchWin(id, { ...geom, max: false, snap: null });
}

export function maxWin(id: string) {
  const w = state.windows.find((q) => q.id === id);
  if (!w || APPS[w.app].fixed) return;
  if (w.max || w.snap) {
    const p = w.prev;
    animateChange(id, 175);
    patchWin(id, { max: false, snap: null, ...(p ? { x: p.x, y: p.y, w: p.w, h: p.h } : {}), prev: null });
    playSys("restore");
  } else {
    animateChange(id, 175);
    patchWin(id, { max: true, prev: { x: w.x, y: w.y, w: w.w, h: w.h } });
    playSys("restore");
  }
  focusWin(id);
}
export function snapWin(id: string, side: "l" | "r") {
  const w = state.windows.find((q) => q.id === id);
  if (!w || APPS[w.app].fixed) return;
  playSys("restore");
  const wa = workArea(state);
  const hw = Math.floor(wa.w / 2);
  animateChange(id, 175);
  patchWin(id, { max: false, snap: side, prev: w.prev || { x: w.x, y: w.y, w: w.w, h: w.h }, x: side === "l" ? wa.x : wa.x + hw, y: wa.y, w: hw, h: wa.h });
}
/**
 * Aero Shake — grab a window and shake it and every other window minimises.
 * Shaking again is not required: Windows restores with the same gesture, so a
 * second shake brings back the windows it hid.
 */
export function shakeWin(id: string) {
  if (state.desktopShown) {
    setState({ windows: state.windows.map((w) => (state.hiddenIds.includes(w.id) ? { ...w, min: false } : w)), desktopShown: false, hiddenIds: [], peek: null });
    return;
  }
  const others = state.windows.filter((w) => !w.min && !w.closing && w.id !== id && !APPS[w.app].noTask).map((w) => w.id);
  if (!others.length) return;
  playSys("minimize");
  setState({
    windows: state.windows.map((w) => (others.includes(w.id) ? { ...w, min: true } : w)),
    desktopShown: true,
    hiddenIds: others,
    focus: id,
    peek: null,
  });
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

/* ------------------------------------------------------------ jump lists */
export const JL_PINNED = "win7.jlp"; // { [app]: string[] } pinned file ids

export function jumpRecent(app: string): string[] {
  return lsGet<string[]>("win7.jl." + app, []).filter((id) => state.fs[id] && !state.fs[id].trash);
}
export function jumpTouch(app: string, id: string) {
  const l = jumpRecent(app);
  lsSet("win7.jl." + app, [id, ...l.filter((x) => x !== id)].slice(0, 8));
  const docs = state.settings.recentDocs.filter((d) => d.id !== id);
  setSettings({ recentDocs: [{ id, app, at: Date.now() }, ...docs].slice(0, 25) });
}
export function jumpPinnedAll(): Record<string, string[]> {
  return lsGet<Record<string, string[]>>(JL_PINNED, {});
}
export function jumpPinned(app: string): string[] {
  return (jumpPinnedAll()[app] || []).filter((id) => state.fs[id] && !state.fs[id].trash);
}
export function jumpPin(app: string, id: string, on: boolean) {
  const all = jumpPinnedAll();
  const cur = all[app] || [];
  all[app] = on ? [id, ...cur.filter((x) => x !== id)] : cur.filter((x) => x !== id);
  lsSet(JL_PINNED, all);
  bumpRev();
}

export function openJumpList(app: string, at: { x: number; y: number }) {
  setState({ jumplist: { app, x: at.x, y: at.y, pinned: jumpPinned(app) }, menu: null, startOpen: false, flyout: null });
}
export function closeJumpList() {
  if (state.jumplist) setState({ jumplist: null });
}

/* -------------------------------------------------- Flip 3D / taskbar nav */
export function flipStart(dir = 1) {
  const ids = state.windows.filter((w) => !w.min && !w.closing && !APPS[w.app].noTask).sort((a, b) => b.z - a.z).map((w) => w.id);
  if (!ids.length) return;
  if (!state.flip) setState({ flip: { ids, idx: dir > 0 ? 1 % ids.length : ids.length - 1 }, startOpen: false, flyout: null, menu: null });
  else setState({ flip: { ...state.flip, idx: (state.flip.idx + dir + ids.length) % ids.length } });
}
export function flipCommit() {
  const f = state.flip;
  if (!f) return;
  const id = f.ids[f.idx % f.ids.length];
  setState({ flip: null });
  if (id) focusWin(id);
}
export function flipCancel() {
  if (state.flip) setState({ flip: null });
}

export function taskbarFocus(idx: number) {
  const stops: string[] = [];
  state.windows.filter((w) => !APPS[w.app].noTask && !w.closing).forEach((w) => {
    const key = APPS[w.app].group || w.app;
    if (!stops.includes(key)) stops.push(key);
  });
  stops.push("$tray");
  if (idx < 0) idx = stops.length - 1;
  if (idx >= stops.length) idx = 0;
  setState({ taskbarIdx: idx });
}
export function taskbarActivate(dir = 0) {
  const i = state.taskbarIdx;
  if (i === null) return;
  const groups: string[] = [];
  state.windows.filter((w) => !APPS[w.app].noTask && !w.closing).forEach((w) => {
    const key = APPS[w.app].group || w.app;
    if (!groups.includes(key)) groups.push(key);
  });
  const key = groups[i];
  if (!key) return; // tray
  const wins = state.windows
    .filter((w) => !APPS[w.app].noTask && !w.closing && (APPS[w.app].group || w.app) === key)
    .sort((a, b) => a.z - b.z);
  if (!wins.length) { void dir; return; }
  const cur = wins.findIndex((w) => w.id === state.focus && !w.min);
  const next = wins[(cur + 1) % wins.length] || wins[0];
  if (next.min) setState({ windows: state.windows.map((w) => (w.id === next.id ? { ...w, min: false } : w)) });
  focusWin(next.id);
}

/* ------------------------------------------------------------- snap assist */
export function snappedHalf(): string | null {
  const w = state.windows.find((q) => q.id === state.focus);
  if (!w || w.max || !w.snap || w.min) return null;
  return w.id;
}

/* ------------------------------------------------------------- lock/sleep */
/* ----------------------------------------------------------- dialogs etc */
let notifSeq = 1;
/** Windows' "device connected" announcement for removable drives. */
export function deviceConnected(name: string) {
  playSys("hardware-insert");
  notify({ title: "Device connected", text: `${name} was connected. Click to see what happens with this device.`, icon: "info" });
}

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
  logEvent("Information", EVENT_IDS.uac.source, EVENT_IDS.uac.id, EVENT_IDS.uac.text.replace("%s", o.name), "Security");
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
  if (e === "xps" || e === "oxps") return openApp("xps", { file: id });
  if (e === "jnt") return openApp("journal");
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
  snippingtool: "snip", charmap: "charmap", magnify: "magnifier", stikynot: "sticky2", soundrecorder: "recorder", dvdmaker: "dvdmaker", winver: "winver", minesweeper: "minesweeper", helppane: "help",
  sol: "solitaire", solitaire: "solitaire", spider: "spider", hearts: "hearts", gameexplorer: "gamecenter", journal: "journal", xpsrchvw: "xps",
  sysdiag: "sysdiag", msinfo32: "sysdiag", msinfo: "sysdiag", eventvwr: "eventvwr", cleanmgr: "cleanmgr", dfrgui: "cleanmgr", regedit: "regedit", optionalfeatures: "features", features: "features", freecell: "freecell", mahjong: "mahjong", mahjongtitans: "mahjong", chess: "chess", chesstitans: "chess", purbleplace: "purble", purble: "purble",
  speechux: "speech", mblctr: "mobility", perfmon: "reliability", windowsanytimeupgradeui: "trust", wscui: "reliability", notepad2: "notepad", sticky: "sticky2",
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
  if (lc === "wscui.cpl") return openCP("actioncenter"), true;
  if (lc === "mblctr" || lc === "mblctr.exe") return openApp("mobility"), true;
  if (lc === "perfmon" || lc === "perfmon.exe") return openApp("reliability"), true;
  if (lc === "sol" || lc === "sol.exe") return openApp("solitaire"), true;
  if (lc === "shell:games") return openApp("gamecenter"), true;
  if (lc === "shell:controlpanelfolder") return openCP(), true;
  if (lc === "shell:documents") return openPath("docs"), true;
  if (lc === "shell:pictures") return openPath("pics"), true;
  if (lc === "shell:music") return openPath("music"), true;
  if (lc === "shell:downloads") return openPath("dl"), true;
  if (lc === "shell:computer") return openPath("computer"), true;
  if (lc === "inetcpl.cpl") return openCP("inetopts"), true;
  if (lc === "shutdown") return shutdown(), true;
  if (lc === "msconfig" || lc === "gpedit.msc") {
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

/* ---------------------------------------------------- kernel / bug check */
/**
 * Bug check: the kernel has stopped. Windows 7 shows the blue screen for a
 * moment and then restarts; here it stays until you click, then reboots.
 */
export function bugCheck(stop: string, driver?: string) {
  const text = bugcheckText(stop as StopCode, driver);
  logEvent("Critical", EVENT_IDS.bugCheck.source, EVENT_IDS.bugCheck.id, `${EVENT_IDS.bugCheck.text} Stop code ${stop}${driver ? ` (${driver})` : ""}.`);
  if (driver) logEvent("Error", EVENT_IDS.driverFail.source, 7000, EVENT_IDS.driverFail.text.replace("%s", driver), "System");
  setState({
    power: "bsod",
    crash: { stop, driver, text },
    startOpen: false,
    flyout: null,
    menu: null,
  });
}

/** Reboot after a bug check (or from the diagnostics page). */
export function reboot(opts: { safeMode?: boolean } = {}) {
  setState({ windows: [], focus: null, crash: null, safeMode: !!opts.safeMode, power: "restarting" });
  setTimeout(() => setState({ power: "boot" }), 1400);
}

/* -------------------------------------------------------------- power */
export function shutdown() {
  logEvent("Information", "User32", 1074, `The process explorer.exe has initiated the power off of computer on behalf of user ${state.settings.currentUser}.`);
  setState({ power: "shuttingdown", startOpen: false, flyout: null, menu: null });
  playSys("shutdown");
  setTimeout(() => setState({ power: "off", windows: [], focus: null }), 2600);
}
export function restart() {
  logEvent("Information", "User32", 1074, `The process explorer.exe has initiated the restart of computer on behalf of user ${state.settings.currentUser}.`);
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
  logEvent("Information", "Microsoft-Windows-Winlogon", 7001, `User Logon Notification for Customer Experience Improvement Program (${name}).`);
  logEvent("Information", EVENT_IDS.serviceStart.source, 7036, EVENT_IDS.serviceStart.text.replace("%s", "Themes"), "System");
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
