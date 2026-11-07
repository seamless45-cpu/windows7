"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useStore, state as gs, getState, showMenu, setState, setSettings, openApp, openCP, openPath, openNode, children, trashed, setIconPos, workArea, view, setWin, extOf,
  moveNodes, kindOf, uid,
} from "./store";
import { Icon, nodeIcon } from "./icons";
import { InlineEdit } from "./ui";
import { GadgetLayer } from "./gadgets";
import { Wallpaper } from "./Wallpaper";
import { WALLPAPERS } from "./data";
import { wpStyle, nodeMenuItems, deleteNodes, pasteInto, clipboardSet, doRename, newItems, createShortcutFor, undoLast, showProps, canUndo, undoName } from "./fileops";
import { emptyRecycle } from "./dialogs";

interface Item { key: string; name: string; icon: string; sys?: string; id?: string; folder?: boolean }
const CELL = { large: { w: 100, h: 112, i: 64 }, medium: { w: 84, h: 98, i: 48 }, small: { w: 76, h: 78, i: 32 } };

export function Desktop() {
  const settings = useStore((s) => s.settings);
  const fs = useStore((s) => s.fs);
  const iconPos = useStore((s) => s.iconPos);
  const clip = useStore((s) => s.clipboard);
  const screen = useStore((s) => s.screen);
  useStore((s) => s.rev);
  const [sel, setSel] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [band, setBand] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [flash, setFlash] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cell = CELL[settings.iconSize] || CELL.medium;
  const hasTrash = Object.values(fs).some((n) => n.trash);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    const si = settings.sysIcons;
    if (si.recycle) out.push({ key: "sys:recycle", sys: "recycle", name: "Recycle Bin", icon: hasTrash ? "recycleFull" : "recycle" });
    if (si.computer) out.push({ key: "sys:computer", sys: "computer", name: "Computer", icon: "computer" });
    if (si.user) out.push({ key: "sys:user", sys: "user", name: settings.currentUser, icon: "user" });
    if (si.network) out.push({ key: "sys:network", sys: "network", name: "Network", icon: "network" });
    if (si.cpanel) out.push({ key: "sys:cpanel", sys: "cpanel", name: "Control Panel", icon: "controlpanel" });
    const kids = Object.values(fs).filter((n) => n.parent === "desk" && !n.trash && (!n.hidden || settings.folder.showHidden));
    kids.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
    kids.forEach((n) => {
      const showExt = settings.folder.showExt;
      const e = extOf(n.name);
      const label = e === "lnk" ? n.name.replace(/\.lnk$/i, "") : showExt || n.type === "folder" ? n.name : n.name.replace(/\.[^.]+$/, "");
      out.push({ key: n.id, id: n.id, name: label, icon: nodeIcon(n), folder: n.type === "folder" });
    });
    return out;
  }, [fs, settings.sysIcons, settings.currentUser, settings.folder.showExt, settings.folder.showHidden, hasTrash]);

  const wa = workArea(getState());
  const rows = Math.max(1, Math.floor((wa.h - 8) / cell.h));
  const posOf = (it: Item, i: number) => {
    const p = !settings.autoArrange && iconPos[it.key];
    if (p) return p;
    return { x: 6 + Math.floor(i / rows) * cell.w, y: 6 + (i % rows) * cell.h };
  };
  void screen;

  // clear selection of vanished items
  useEffect(() => {
    setSel((s) => s.filter((k) => items.some((i) => i.key === k)));
  }, [items]);

  const openItem = (it: Item) => {
    if (it.id) return openNode(it.id);
    switch (it.sys) {
      case "computer": return openPath("computer");
      case "user": return openPath("home");
      case "network": return openPath("network");
      case "recycle": return openPath("recycle");
      default: return openCP();
    }
  };
  const selFs = (keys = sel) => keys.filter((k) => !k.startsWith("sys:"));

  const sortBy = (how: "name" | "size" | "type" | "date") => {
    const arr = [...items];
    const fsOf = (it: Item) => (it.id ? fs[it.id] : null);
    const sysFirst = (a: Item, b: Item) => (a.sys ? 0 : 1) - (b.sys ? 0 : 1);
    arr.sort((a, b) => {
      const s = sysFirst(a, b);
      if (s) return s;
      const fa = fsOf(a), fb = fsOf(b);
      if (!fa || !fb) return 0;
      if (how === "size") return fa.size - fb.size;
      if (how === "type") return kindOf(fa).localeCompare(kindOf(fb)) || fa.name.localeCompare(fb.name);
      if (how === "date") return fb.modified - fa.modified;
      return fa.name.localeCompare(fb.name);
    });
    const m: Record<string, { x: number; y: number }> = {};
    arr.forEach((it, i) => (m[it.key] = { x: 6 + Math.floor(i / rows) * cell.w, y: 6 + (i % rows) * cell.h }));
    setSettings({ autoArrange: false });
    setIconPos(m);
  };

  const refresh = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 140);
    setState({ rev: getState().rev + 1 });
  };

  /** Windows 7's "Next desktop background" — steps through the installed wallpapers. */
  const nextBackground = () => {
    const all = WALLPAPERS.map((w) => w.key);
    const i = all.indexOf(settings.wallpaper);
    setSettings({ wallpaper: all[(i + 1 + all.length) % all.length] });
  };

  const bgMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const st = getState();
    showMenu(e, [
      {
        label: "View",
        sub: [
          { label: "Large icons", checked: settings.iconSize === "large", radio: true, onClick: () => setSettings({ iconSize: "large" }) },
          { label: "Medium icons", checked: settings.iconSize === "medium", radio: true, onClick: () => setSettings({ iconSize: "medium" }) },
          { label: "Small icons", checked: settings.iconSize === "small", radio: true, onClick: () => setSettings({ iconSize: "small" }) },
          { sep: true },
          { label: "Auto arrange icons", checked: settings.autoArrange, onClick: () => setSettings({ autoArrange: !settings.autoArrange }) },
          { label: "Align icons to grid", checked: settings.alignGrid, onClick: () => setSettings({ alignGrid: !settings.alignGrid }) },
          { sep: true },
          { label: "Show desktop icons", checked: settings.showIcons, onClick: () => setSettings({ showIcons: !settings.showIcons }) },
          { label: "Show desktop gadgets", checked: true, onClick: () => openApp("gadgets") },
        ],
      },
      {
        label: "Sort by",
        sub: [
          { label: "Name", onClick: () => sortBy("name") },
          { label: "Size", onClick: () => sortBy("size") },
          { label: "Item type", onClick: () => sortBy("type") },
          { label: "Date modified", onClick: () => sortBy("date") },
        ],
      },
      { label: "Refresh", onClick: refresh },
      { sep: true },
      { label: "Paste", disabled: !st.clipboard, onClick: () => pasteInto("desk") },
      {
        label: "Paste shortcut",
        disabled: !st.clipboard,
        onClick: () => st.clipboard?.ids.forEach((i) => createShortcutFor(i, "desk")),
      },
      { label: canUndo() ? `Undo ${undoName()}` : "Undo", disabled: !canUndo(), shortcut: "Ctrl+Z", onClick: undoLast },
      { sep: true },
      { label: "New", sub: newItems("desk", (id) => setRenaming(id)) },
      { sep: true },
      { label: "Next desktop background", icon: "photos", disabled: !settings.wallpaper.startsWith("media:") && !settings.wallpaper.startsWith("fs:"), onClick: () => nextBackground() },
      { sep: true },
      { label: "Screen resolution", icon: "display", onClick: () => openCP("display") },
      { label: "Gadgets", icon: "gadgets", onClick: () => openApp("gadgets") },
      { label: "Personalize", icon: "appearance", onClick: () => openCP("personalization") },
    ]);
  };

  const iconMenu = (e: React.MouseEvent, it: Item) => {
    e.preventDefault();
    e.stopPropagation();
    const keys = sel.includes(it.key) ? sel : [it.key];
    if (!sel.includes(it.key)) setSel([it.key]);
    if (it.sys) {
      const base = [{ label: "Open", bold: true, onClick: () => openItem(it) }];
      if (it.sys === "recycle")
        showMenu(e, [...base, { label: "Empty Recycle Bin", disabled: !hasTrash, onClick: emptyRecycle }, { sep: true }, { label: "Create shortcut", disabled: true }, { label: "Rename", disabled: true }, { label: "Properties", onClick: () => showProps({ kind: "sys", key: "recycle" }) }]);
      else
        showMenu(e, [
          ...base,
          ...(it.sys === "computer" ? [{ label: "Manage", icon: "system", onClick: () => openCP("system") }, { label: "Map network drive...", onClick: () => openPath("network") }] : []),
          { sep: true },
          { label: "Rename", disabled: true },
          { label: "Properties", onClick: () => (it.sys === "computer" ? openCP("system") : it.sys === "network" ? openCP("network") : it.sys === "user" ? showProps({ kind: "fs", id: "home" }) : openCP()) },
        ]);
      return;
    }
    showMenu(e, nodeMenuItems(selFs(keys), { dir: "desk", onRename: (id) => setRenaming(id) }));
  };

  /* -------- icon dragging -------- */
  const iconDown = (e: React.PointerEvent, it: Item) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setState({ focus: null });
    let cur = sel;
    const multi = e.ctrlKey || e.metaKey;
    if (multi) {
      cur = sel.includes(it.key) ? sel.filter((k) => k !== it.key) : [...sel, it.key];
      setSel(cur);
    } else if (!sel.includes(it.key)) {
      cur = [it.key];
      setSel(cur);
    }
    if (renaming) return;
    const sx = e.clientX, sy = e.clientY, sc = view.scale;
    let dragging = false;
    const els = () => cur.map((k) => ref.current?.querySelector(`[data-icon="${CSS.escape(k)}"]`) as HTMLElement | null).filter(Boolean) as HTMLElement[];
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!dragging && Math.abs(dx) + Math.abs(dy) < 5) return;
      dragging = true;
      els().forEach((el) => {
        el.style.transform = `translate(${dx / sc}px,${dy / sc}px)`;
        el.style.pointerEvents = "none";
        el.style.zIndex = "5";
        el.style.opacity = ".75";
      });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      const list = els();
      if (!dragging) {
        if (!multi && cur.length > 1) setSel([it.key]);
        return;
      }
      const dx = (ev.clientX - sx) / sc, dy = (ev.clientY - sy) / sc;
      const under = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      list.forEach((el) => {
        el.style.transform = "";
        el.style.pointerEvents = "";
        el.style.zIndex = "";
        el.style.opacity = "";
      });
      const fsIds = selFs(cur);
      const tgt = under?.closest("[data-icon]") as HTMLElement | null;
      const tkey = tgt?.getAttribute("data-icon");
      if (tkey === "sys:recycle" && fsIds.length) return deleteNodes(fsIds);
      if (tkey && !cur.includes(tkey) && !tkey.startsWith("sys:") && gs.fs[tkey]?.type === "folder" && fsIds.length) return moveNodes(fsIds, tkey);
      const dropDir = under?.closest("[data-dropdir]")?.getAttribute("data-dropdir");
      if (dropDir && fsIds.length && !dropDir.match(/^(computer|network|recycle|favorites|libraries|search)/)) return moveNodes(fsIds, dropDir);
      if (under?.closest(".win,.taskbar,.start-menu")) return;
      const m: Record<string, { x: number; y: number }> = {};
      const maxX = wa.w - cell.w, maxY = wa.h - cell.h;
      cur.forEach((k) => {
        const idx = items.findIndex((q) => q.key === k);
        if (idx < 0) return;
        const p = posOf(items[idx], idx);
        let nx = Math.min(Math.max(0, p.x + dx), maxX), ny = Math.min(Math.max(0, p.y + dy), maxY);
        if (settings.alignGrid) {
          nx = 6 + Math.round((nx - 6) / cell.w) * cell.w;
          ny = 6 + Math.round((ny - 6) / cell.h) * cell.h;
        }
        m[k] = { x: nx, y: ny };
      });
      if (settings.autoArrange) setSettings({ autoArrange: false });
      setIconPos(m);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  /* -------- rubber band -------- */
  const bgDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("[data-icon],.gadget")) return;
    setState({ focus: null });
    const r = ref.current!.getBoundingClientRect();
    const sc = view.scale;
    const sx = (e.clientX - r.left) / sc, sy = (e.clientY - r.top) / sc;
    const base = e.ctrlKey ? sel : [];
    if (!e.ctrlKey) setSel([]);
    setRenaming(null);
    let on = false;
    const mv = (ev: PointerEvent) => {
      const x = (ev.clientX - r.left) / sc, y = (ev.clientY - r.top) / sc;
      if (!on && Math.abs(x - sx) + Math.abs(y - sy) < 4) return;
      on = true;
      const b = { x1: Math.min(sx, x), y1: Math.min(sy, y), x2: Math.max(sx, x), y2: Math.max(sy, y) };
      setBand(b);
      const hit: string[] = [];
      ref.current?.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
        const q = el.getBoundingClientRect();
        const qx1 = (q.left - r.left) / sc, qy1 = (q.top - r.top) / sc, qx2 = (q.right - r.left) / sc, qy2 = (q.bottom - r.top) / sc;
        if (qx1 < b.x2 && qx2 > b.x1 && qy1 < b.y2 && qy2 > b.y1) hit.push(el.getAttribute("data-icon")!);
      });
      setSel([...new Set([...base, ...hit])]);
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      setBand(null);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  /* -------- keyboard when desktop focused -------- */
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const st = getState();
      if (st.power !== "desktop" || st.focus || st.startOpen) return;
      const t = e.target as HTMLElement;
      if (t?.closest?.("input,textarea,select,[contenteditable]")) return;
      const fsIds = selFs();
      if (e.key === "Delete" && fsIds.length) {
        e.preventDefault();
        deleteNodes(fsIds, { permanent: e.shiftKey });
      } else if (e.key === "F2" && fsIds.length === 1) setRenaming(fsIds[0]);
      else if (e.key === "F5") {
        e.preventDefault();
        refresh();
      } else if (e.key === "Enter") sel.forEach((k) => { const it = items.find((q) => q.key === k); if (it) openItem(it); });
      else if (e.ctrlKey && e.key.toLowerCase() === "c" && fsIds.length) clipboardSet(fsIds, "copy");
      else if (e.ctrlKey && e.key.toLowerCase() === "x" && fsIds.length) clipboardSet(fsIds, "cut");
      else if (e.ctrlKey && e.key.toLowerCase() === "v") pasteInto("desk");
      else if (e.ctrlKey && e.key.toLowerCase() === "z") undoLast();
      else if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSel(items.map((i) => i.key));
      }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  });

  const onDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData("text/win7-ids");
    if (!raw) return;
    e.preventDefault();
    const ids: string[] = JSON.parse(raw);
    const tgt = (e.target as HTMLElement).closest("[data-icon]")?.getAttribute("data-icon");
    const dir = tgt && gs.fs[tgt]?.type === "folder" ? tgt : "desk";
    if (e.ctrlKey) {
      import("./store").then((m) => m.copyNodes(ids, dir));
    } else moveNodes(ids, dir);
  };

  const ws = wpStyle(settings.wallpaper, settings.wpPos);
  void uid; void setWin; void children; void trashed;
  return (
    <div
      ref={ref}
      className={"desktop" + (flash ? " flash" : "") + " icons-" + settings.iconSize + (settings.wallpaper.startsWith("media:") ? " has-media" : "")}
      style={settings.wallpaper.startsWith("media:") ? { background: "#000" } : ws}
      onPointerDown={bgDown}
      onContextMenu={bgMenu}
      onDragOver={(e) => e.dataTransfer.types.includes("text/win7-ids") && e.preventDefault()}
      onDrop={onDrop}
      data-dropdir="desk"
    >
      <Wallpaper wallpaper={settings.wallpaper} pos={settings.wpPos} sound={settings.wpSound} />
      <div className="wp-shade" />
      {settings.showIcons &&
        items.map((it, i) => {
          const p = posOf(it, i);
          const selected = sel.includes(it.key);
          const cut = clip?.mode === "cut" && it.id && clip.ids.includes(it.id);
          return (
            <div
              key={it.key}
              data-icon={it.key}
              className={"dicon" + (selected ? " sel" : "") + (cut ? " cut" : "")}
              style={{ left: p.x, top: p.y, width: cell.w - 6, height: cell.h - 6 }}
              onPointerDown={(e) => iconDown(e, it)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                openItem(it);
              }}
              onContextMenu={(e) => iconMenu(e, it)}
            >
              <Icon name={it.icon} size={cell.i} />
              {renaming === it.key ? (
                <InlineEdit
                  value={gs.fs[it.key]?.name || it.name}
                  folder={it.folder}
                  multiline
                  onDone={(v) => {
                    setRenaming(null);
                    if (v !== null) doRename(it.key, v);
                  }}
                />
              ) : (
                <span className="dlabel">{it.name}</span>
              )}
            </div>
          );
        })}
      {band && <div className="band" style={{ left: band.x1, top: band.y1, width: band.x2 - band.x1, height: band.y2 - band.y1 }} />}
      <GadgetLayer />
    </div>
  );
}
