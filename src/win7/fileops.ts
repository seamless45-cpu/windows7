import type React from "react";
import {
  state, setState, MenuItem, FsNode, extOf, baseOf, kindOf, children, trashNodes, restoreNodes, deleteForever, copyNodes, moveNodes, mkdir, mkfile,
  renameNode, msgBox, progressDialog, openNode, openApp, setSettings, resolvePath, pathOf, notify, promptBox, uid,
} from "./store";
import { WALLPAPERS } from "./data";
import { APPS } from "./registry";

let undoFn: (() => void) | null = null;
let undoLabel = "";
export function setUndo(label: string, fn: () => void) {
  undoFn = fn;
  undoLabel = label;
}
export function undoLast() {
  if (undoFn) {
    const f = undoFn;
    undoFn = null;
    f();
    notify({ title: "Undo", text: "Last action undone: " + undoLabel, icon: "info" });
  }
}
export const canUndo = () => !!undoFn;
export const undoName = () => undoLabel;

export function wpStyle(key: string, pos: string): React.CSSProperties {
  let img = "";
  if (key.startsWith("fs:")) {
    const n = state.fs[key.slice(3)];
    img = n?.content ? `url("${n.content}")` : "";
  } else {
    img = WALLPAPERS.find((w) => w.key === key)?.css || WALLPAPERS[0].css;
  }
  if (!img) img = WALLPAPERS[0].css;
  const custom = key.startsWith("fs:");
  const st: React.CSSProperties = { background: img, backgroundSize: "cover", backgroundPosition: "center" };
  if (custom) {
    st.backgroundColor = "#000";
    st.backgroundRepeat = "no-repeat";
    switch (pos) {
      case "fit": st.backgroundSize = "contain"; break;
      case "stretch": st.backgroundSize = "100% 100%"; break;
      case "tile": st.backgroundSize = "200px 150px"; st.backgroundRepeat = "repeat"; break;
      case "center": st.backgroundSize = "auto"; break;
      default: st.backgroundSize = "cover";
    }
  }
  return st;
}

export function clipboardSet(ids: string[], mode: "copy" | "cut") {
  setState({ clipboard: { ids, mode } });
}

export function deleteNodes(ids: string[], opts: { permanent?: boolean; inTrash?: boolean } = {}) {
  ids = ids.filter((i) => state.fs[i]);
  if (!ids.length) return;
  const items = ids.map((i) => state.fs[i]);
  const perm = opts.permanent || opts.inTrash;
  const one = items.length === 1;
  const heavy = items.some((n) => n.type === "folder") || items.length > 3;
  const run = () => {
    const doIt = () => {
      if (perm) deleteForever(ids);
      else {
        trashNodes(ids);
        setUndo("Delete", () => restoreNodes(ids));
      }
    };
    if (heavy) progressDialog({ title: "Deleting", text: one ? `Deleting '${items[0].name}'` : `Deleting ${items.length} items`, ms: 900, onDone: doIt, icon: "recycle" });
    else doIt();
  };
  if (perm) {
    msgBox({
      title: one ? (items[0].type === "folder" ? "Delete Folder" : "Delete File") : "Delete Multiple Items",
      text: one ? `Are you sure you want to permanently delete ${items[0].type === "folder" ? "this folder" : "this file"}?\n\n${items[0].name}` : `Are you sure you want to permanently delete these ${items.length} items?`,
      icon: "question",
      buttons: ["Yes", "No"],
      onResult: (b) => b === "Yes" && run(),
    });
  } else run();
}

export function pasteInto(dir: string) {
  const cb = state.clipboard;
  if (!cb) return;
  const ids = cb.ids.filter((i) => state.fs[i] && !state.fs[i].trash);
  if (!ids.length) return;
  const mode = cb.mode;
  const from = state.fs[ids[0]]?.parent;
  progressDialog({
    title: mode === "copy" ? "Copying" : "Moving",
    text: `${mode === "copy" ? "Copying" : "Moving"} ${ids.length} item${ids.length > 1 ? "s" : ""} from '${from ? state.fs[from]?.name : ""}' to '${state.fs[dir]?.name}'`,
    ms: 700 + ids.length * 300,
    icon: "folder",
    onDone: () => {
      if (mode === "copy") {
        const made = copyNodes(ids, dir);
        setUndo("Copy", () => deleteForever(made));
      } else {
        const olds = ids.map((i) => [i, state.fs[i].parent as string] as const);
        moveNodes(ids, dir);
        setState({ clipboard: null });
        setUndo("Move", () => olds.forEach(([i, p]) => moveNodes([i], p)));
      }
    },
  });
}

export function doRename(id: string, name: string): boolean {
  const old = state.fs[id]?.name;
  const ok = renameNode(id, name);
  if (ok && old && old !== name) setUndo("Rename", () => renameNode(id, old));
  return ok;
}

export function createShortcutFor(id: string, dir: string) {
  const n = state.fs[id];
  if (!n) return;
  let content = JSON.stringify({ t: "path", v: id });
  if (n.type === "file" && n.content?.startsWith("app:")) content = JSON.stringify({ t: "app", v: n.content.slice(4) });
  const nid = mkfile(dir, `${baseOf(n.name)} - Shortcut.lnk`, content);
  state.fs[nid].size = 1200;
  return nid;
}

export function newShortcutWizard(dir: string, onCreated?: (id: string) => void) {
  promptBox({
    title: "Create Shortcut",
    text: "Type the location of the item (a program name such as notepad, a path such as C:\\Users, or a web address):",
    value: "",
    onOk: (v) => {
      v = v.trim();
      if (!v) return;
      let c: { t: string; v: string } | null = null;
      const lc = v.toLowerCase().replace(/\.exe$/, "");
      const MAP: Record<string, string> = { notepad: "notepad", calc: "calc", mspaint: "paint", cmd: "cmd", explorer: "explorer", iexplore: "ie", taskmgr: "taskmgr", wmplayer: "wmp", wordpad: "wordpad", charmap: "charmap" };
      if (MAP[lc]) c = { t: "app", v: MAP[lc] };
      else if (/^(https?:\/\/|www\.)/i.test(v)) c = { t: "url", v };
      else {
        const id = resolvePath(v);
        if (id) c = { t: "path", v: id };
      }
      if (!c) {
        msgBox({ title: "Create Shortcut", text: `The file '${v}' cannot be found. Check the name and try again.`, icon: "error" });
        return;
      }
      const name = c.t === "app" ? APPS[c.v].title : c.t === "url" ? v.replace(/^https?:\/\//, "") : state.fs[c.v]?.name || v;
      const nid = mkfile(dir, name.replace(/[\\/:*?"<>|]/g, "") + ".lnk", JSON.stringify(c), 1200);
      onCreated?.(nid);
    },
  });
}

export function newItems(dir: string, onCreated?: (id: string) => void): MenuItem[] {
  const mk = (label: string, icon: string, fn: () => string): MenuItem => ({
    label,
    icon,
    onClick: () => {
      const id = fn();
      setUndo("New item", () => deleteForever([id]));
      onCreated?.(id);
    },
  });
  return [
    mk("Folder", "folder", () => mkdir(dir, "New folder")),
    { label: "Shortcut", icon: "file@lnk", onClick: () => newShortcutWizard(dir, onCreated) },
    { sep: true },
    mk("Bitmap image", "image", () => mkfile(dir, "New Bitmap Image.bmp", "", 0)),
    mk("Microsoft Word Document", "rtf", () => mkfile(dir, "New Microsoft Word Document.doc", "", 0)),
    mk("Rich Text Document", "rtf", () => mkfile(dir, "New Rich Text Document.rtf", "", 0)),
    mk("Text Document", "txt", () => mkfile(dir, "New Text Document.txt", "", 0)),
    mk("Compressed (zipped) Folder", "zip", () => mkfile(dir, "New Compressed (zipped) Folder.zip", "", 22)),
  ];
}

export function showProps(target: { kind: "fs"; id: string } | { kind: "sys"; key: string }) {
  openApp("props", target, { title: target.kind === "fs" ? (state.fs[target.id]?.name || "Item") + " Properties" : "Properties" });
}

export function setWallpaperFrom(id: string) {
  setSettings({ wallpaper: "fs:" + id, wpPos: "fill" });
}

export function openIn(id: string, app: string) {
  openApp(app, { file: id });
}

export function nodeMenuItems(ids: string[], opts: { dir?: string; inTrash?: boolean; onRename?: (id: string) => void; onOpen?: (id: string) => void }): MenuItem[] {
  const nodes = ids.map((i) => state.fs[i]).filter(Boolean) as FsNode[];
  if (!nodes.length) return [];
  const one = nodes.length === 1 ? nodes[0] : null;
  const open = (id: string) => (opts.onOpen ? opts.onOpen(id) : openNode(id));
  if (opts.inTrash) {
    return [
      { label: "Restore", bold: true, onClick: () => restoreNodes(ids) },
      { sep: true },
      { label: "Cut", disabled: true },
      { sep: true },
      { label: "Delete", onClick: () => deleteNodes(ids, { inTrash: true }) },
      { sep: true },
      { label: "Properties", onClick: () => one && showProps({ kind: "fs", id: one.id }) },
    ];
  }
  const items: MenuItem[] = [{ label: one && one.type === "folder" ? "Open" : "Open", bold: true, onClick: () => ids.forEach(open) }];
  if (one) {
    const e = extOf(one.name);
    if (one.type === "folder") items.push({ label: "Open in new window", onClick: () => openApp("explorer", { path: one.id }) });
    if (["jpg", "jpeg", "png", "bmp", "gif", "svg"].includes(e)) {
      items.push({ label: "Edit", onClick: () => openApp("paint", { file: one.id }) });
      items.push({ label: "Set as desktop background", onClick: () => setWallpaperFrom(one.id) });
    }
    if (["txt", "log", "ini", "bat"].includes(e)) items.push({ label: "Edit", onClick: () => openApp("notepad", { file: one.id }) });
    if (["mp3", "wma", "wav", "wmv", "mp4"].includes(e)) {
      items.push({ label: "Play", onClick: () => openApp("wmp", { file: one.id }) });
      // Windows 7's Play To verb streams the item to a DLNA renderer
      items.push({ label: "Play to", sub: [{ label: "Living room TV", icon: "network", onClick: () => openApp("playto", { file: one.id }) }, { label: "Media PC", icon: "computer", onClick: () => openApp("playto", { file: one.id }) }] });
    }
    if (["jpg", "jpeg", "png", "bmp", "gif"].includes(e)) items.push({ label: "Play to", onClick: () => openApp("playto", { file: one.id }) });
    if (e === "txt" || e === "rtf" || e === "doc") items.push({ label: "Print", onClick: () => msgBox({ title: "Print", text: "No printer is installed. Install a printer using Devices and Printers in Control Panel.", icon: "warn" }) });
    if (one.type === "file")
      items.push({
        label: "Open with",
        sub: [
          { label: "Notepad", icon: "notepad", onClick: () => openApp("notepad", { file: one.id }) },
          { label: "WordPad", icon: "wordpad", onClick: () => openApp("wordpad", { file: one.id }) },
          { label: "Paint", icon: "paint", onClick: () => openApp("paint", { file: one.id }) },
          { label: "Windows Media Player", icon: "wmp", onClick: () => openApp("wmp", { file: one.id }) },
          { label: "Internet Explorer", icon: "ie", onClick: () => openApp("ie", { url: "file:" + one.id }) },
          { sep: true },
          { label: "Choose default program...", onClick: () => openApp("openwith", { file: one.id, ext: extOf(one.name) }) },
        ],
      });
  }
  items.push({ sep: true });
  items.push({
    label: "Send to",
    sub: [
      { label: "Desktop (create shortcut)", icon: "desktop", onClick: () => ids.forEach((i) => createShortcutFor(i, "desk")) },
      { label: "Documents", icon: "docs", onClick: () => { const m = copyNodes(ids, "docs"); setUndo("Send to", () => deleteForever(m)); } },
      { label: "Compressed (zipped) folder", icon: "zip", onClick: () => mkfile(opts.dir || "docs", (one ? baseOf(one.name) : "Archive") + ".zip", "", 32e3) },
      { label: "DVD RW Drive (E:)", icon: "cd", onClick: () => msgBox({ title: "Send To", text: "Please insert a disc into drive E:.", icon: "warn" }) },
    ],
  });
  items.push({ sep: true });
  items.push({ label: "Cut", shortcut: "Ctrl+X", onClick: () => clipboardSet(ids, "cut") });
  items.push({ label: "Copy", shortcut: "Ctrl+C", onClick: () => clipboardSet(ids, "copy") });
  items.push({ sep: true });
  items.push({ label: "Create shortcut", onClick: () => ids.forEach((i) => createShortcutFor(i, opts.dir || "desk")) });
  items.push({ label: "Delete", shortcut: "Del", onClick: () => deleteNodes(ids) });
  items.push({ label: "Rename", shortcut: "F2", disabled: !one, onClick: () => one && opts.onRename?.(one.id) });
  items.push({ sep: true });
  items.push({ label: "Properties", onClick: () => one && showProps({ kind: "fs", id: one.id }) });
  return items;
}

export function describeNode(n: FsNode): string {
  return `${kindOf(n)} — ${pathOf(n.id)}`;
}
export function folderCount(id: string) {
  return children(id).length;
}
export const newId = uid;
