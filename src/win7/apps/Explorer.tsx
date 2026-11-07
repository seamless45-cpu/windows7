"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Win, useStore, getState, setWin, showMenu, openApp, openCP, openNode, mkdir, searchFs, children, trashed, restoreNodes, kindOf, fmtDate, fmtSize, fmtBig, extOf, pathOf, msgBox,
  FsNode, MenuItem, setSettings, moveNodes, copyNodes, setState, view, resolvePath, openPath,
} from "../store";
import { Icon, nodeIcon } from "../icons";
import { GlassBar, cmpLocale } from "../ui";
import { nodeMenuItems, newItems, deleteNodes, pasteInto, clipboardSet, doRename, createShortcutFor, undoLast, canUndo, undoName, showProps, setUndo } from "../fileops";
import { emptyRecycle } from "../dialogs";
import { InlineEdit } from "../ui";

type ViewMode = "xl" | "large" | "medium" | "small" | "list" | "details" | "tiles";
interface Row { id: string; name: string; icon: string; kind: string; size?: number; modified?: number; node?: FsNode; virt?: boolean; folder: boolean; loc?: string; sub?: string }

const LIBS: [string, string][] = [["docs", "Documents"], ["music", "Music"], ["pics", "Pictures"], ["vids", "Videos"]];
const NETPCS = ["PC", "MEDIA-SERVER", "LAPTOP"];

function rowOf(n: FsNode, showExt: boolean, loc?: string): Row {
  const e = extOf(n.name);
  const name = e === "lnk" ? n.name.replace(/\.lnk$/i, "") : showExt || n.type === "folder" ? n.name : n.name.replace(/\.[^.]+$/, "");
  return { id: n.id, name, icon: nodeIcon(n), kind: kindOf(n), size: n.type === "file" ? n.size : undefined, modified: n.modified, node: n, folder: n.type === "folder", loc };
}

function isVirtual(p: string) {
  return ["computer", "network", "recycle", "favorites", "libraries", "search"].includes(p);
}

function titleOf(path: string, fs: Record<string, FsNode>): string {
  const t: Record<string, string> = { computer: "Computer", network: "Network", recycle: "Recycle Bin", favorites: "Favorites", libraries: "Libraries", search: "Search Results" };
  return t[path] || fs[path]?.name || "Computer";
}

export function Explorer({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const settings = useStore((s) => s.settings);
  const clip = useStore((s) => s.clipboard);
  const startPath = win.props.path && (isVirtual(win.props.path) || fs[win.props.path]) ? (win.props.path as string) : "libraries";
  const [hist, setHist] = useState<string[]>([startPath]);
  const [hi, setHi] = useState(0);
  const path = hist[hi];
  const [mode, setMode] = useState<ViewMode>(startPath === "pics" ? "large" : startPath === "computer" || startPath === "libraries" || startPath === "favorites" ? "tiles" : "details");
  const [sort, setSort] = useState<{ by: "name" | "modified" | "type" | "size"; dir: 1 | -1 }>({ by: "name", dir: 1 });
  const [sel, setSel] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [rename, setRename] = useState<string | null>(null);
  const [query, setQuery] = useState<string>(win.props.query || "");
  const [q2, setQ2] = useState(query);
  const [addr, setAddr] = useState<string | null>(null);
  const [detailsPane, setDetailsPane] = useState(settings.folder.details);
  const [preview, setPreview] = useState(settings.folder.preview);
  const [navPane, setNavPane] = useState(settings.folder.navPane);
  const [open, setOpen] = useState<string[]>(["c", "home"]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ2(query), 160);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!isVirtual(path) && !fs[path]) go("computer");
  }, [fs, path]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (p: string, push = true) => {
    if (p === path && push) return;
    if (push) {
      const h = [...hist.slice(0, hi + 1), p];
      setHist(h);
      setHi(h.length - 1);
    }
    setSel([]);
    setRename(null);
    setQuery("");
    setQ2("");
    setAddr(null);
  };
  const back = () => hi > 0 && (setHi(hi - 1), setSel([]), setQuery(""));
  const fwd = () => hi < hist.length - 1 && (setHi(hi + 1), setSel([]), setQuery(""));
  const up = () => {
    if (isVirtual(path)) return path !== "computer" && go("computer");
    const n = fs[path];
    if (n?.parent) go(n.parent);
    else go("computer");
  };

  const title = titleOf(path, fs);
  useEffect(() => {
    setWin(win.id, { title });
  }, [title, win.id]);

  // auto-expand ancestors
  useEffect(() => {
    if (isVirtual(path)) return;
    const anc: string[] = [];
    for (let n: FsNode | undefined = fs[path]; n; n = n.parent ? fs[n.parent] : undefined) anc.push(n.id);
    setOpen((o) => [...new Set([...o, ...anc.slice(1)])]);
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  const showExt = settings.folder.showExt;
  const rows: Row[] = useMemo(() => {
    let out: Row[] = [];
    const sh = settings.folder.showHidden;
    const q = q2.trim().toLowerCase();
    if (path === "computer") {
      out = [
        ...["c", "d"].map((id) => ({ id, name: fs[id].name, icon: "drive", kind: "Local Disk", node: fs[id], folder: true, sub: `${fmtBig(fs[id].free || 0)} free of ${fmtBig(fs[id].total || 0)}` })),
        { id: "dvd", name: "DVD RW Drive (E:)", icon: "cd", kind: "CD Drive", folder: true, virt: true, sub: "" },
      ];
    } else if (path === "network") {
      out = NETPCS.map((n) => ({ id: "net:" + n, name: n, icon: "computer", kind: "Computer", folder: true, virt: true }));
    } else if (path === "libraries") {
      out = LIBS.map(([id, n]) => ({ ...rowOf(fs[id], true), name: n, kind: "Library", icon: nodeIcon(fs[id]) }));
    } else if (path === "favorites") {
      out = [["desk", "Desktop"], ["dl", "Downloads"], ["docs", "Recent Places"]].map(([id, n]) => ({ ...rowOf(fs[id], true), name: n, kind: "Shortcut" }));
    } else if (path === "recycle") {
      out = trashed(fs).map((n) => ({ ...rowOf(n, showExt), loc: pathOf(n.trash!.from, fs) }));
      if (q) out = out.filter((r) => r.name.toLowerCase().includes(q));
    } else if (path === "search") {
      out = q ? searchFs(null, q).filter((n) => !n.id.startsWith("exe_")).map((n) => rowOf(n, showExt, n.parent ? pathOf(n.parent, fs) : "")) : [];
    } else if (q) {
      out = searchFs(path, q).map((n) => rowOf(n, showExt, n.parent ? pathOf(n.parent, fs) : ""));
    } else {
      out = children(path, fs).filter((n) => sh || !n.hidden).map((n) => rowOf(n, showExt));
    }
    const k = sort.by;
    out.sort((a, b) => {
      if (!(path === "computer" || path === "network")) {
        if (a.folder !== b.folder && (k === "name" || k === "type" )) return a.folder ? -1 : 1;
      }
      let c = 0;
      if (k === "name") c = cmpLocale(a.name, b.name);
      else if (k === "modified") c = (a.modified || 0) - (b.modified || 0);
      else if (k === "size") c = (a.size || 0) - (b.size || 0);
      else c = cmpLocale(a.kind, b.kind) || cmpLocale(a.name, b.name);
      return c * sort.dir;
    });
    return out;
  }, [fs, path, q2, sort, settings.folder.showHidden, showExt]);

  const selRows = rows.filter((r) => sel.includes(r.id));
  const fsSel = selRows.filter((r) => r.node).map((r) => r.id);
  const inTrash = path === "recycle";
  const canWrite = !isVirtual(path);

  const openRow = (r: Row) => {
    if (r.virt) {
      if (r.id === "dvd") return msgBox({ title: "Windows Explorer", text: "Please insert a disc into drive E:.", icon: "warn", buttons: ["Cancel", "Try Again"] });
      if (r.id.startsWith("net:")) {
        if (r.id === "net:PC") return go("computer");
        return msgBox({ title: "Network Error", text: `Windows cannot access \\\\${r.id.slice(4)}\nCheck the spelling of the name. Otherwise, there might be a problem with your network. To try to identify and resolve network problems, click Diagnose.`, icon: "error", buttons: ["Diagnose", "Cancel"], onResult: (b) => b === "Diagnose" && openCP("network") });
      }
      return;
    }
    if (inTrash) return showProps({ kind: "fs", id: r.id });
    if (r.folder) return go(r.id);
    openNode(r.id);
  };

  const select = (e: React.MouseEvent | { ctrlKey: boolean; shiftKey: boolean; metaKey?: boolean }, id: string) => {
    if (e.shiftKey && anchor) {
      const a = rows.findIndex((r) => r.id === anchor);
      const b = rows.findIndex((r) => r.id === id);
      const [lo, hi2] = a < b ? [a, b] : [b, a];
      setSel(rows.slice(lo, hi2 + 1).map((r) => r.id));
    } else if (e.ctrlKey || e.metaKey) {
      setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
      setAnchor(id);
    } else {
      setSel([id]);
      setAnchor(id);
    }
  };

  const doNew = () => {
    if (!canWrite) return;
    const id = mkdir(path);
    setUndo("New folder", () => import("../store").then((m) => m.deleteForever([id])));
    setSel([id]);
    setRename(id);
  };

  const paste = () => canWrite && pasteInto(path);

  const itemMenu = (e: React.MouseEvent, r: Row) => {
    e.preventDefault();
    e.stopPropagation();
    const ids = sel.includes(r.id) ? sel : [r.id];
    if (!sel.includes(r.id)) setSel([r.id]);
    if (r.virt || !r.node) {
      showMenu(e, [{ label: "Open", bold: true, onClick: () => openRow(r) }, { sep: true }, { label: "Properties", onClick: () => openCP("system") }]);
      return;
    }
    if (r.node.parent === null) {
      showMenu(e, [
        { label: "Open", bold: true, onClick: () => openRow(r) },
        { label: "Open in new window", onClick: () => openApp("explorer", { path: r.id }) },
        { sep: true },
        { label: "Format...", onClick: () => msgBox({ title: "Format Local Disk", text: "You cannot format a drive that contains the running operating system.", icon: "error" }) },
        { sep: true },
        { label: "Properties", onClick: () => showProps({ kind: "fs", id: r.id }) },
      ]);
      return;
    }
    const base = nodeMenuItems(ids.filter((i) => fs[i]), { dir: path, inTrash, onRename: (id) => setRename(id), onOpen: (id) => { const rr = rows.find((x) => x.id === id); if (rr) openRow(rr); } });
    showMenu(e, base);
  };

  const viewItems = (): MenuItem[] =>
    ([["xl", "Extra large icons"], ["large", "Large icons"], ["medium", "Medium icons"], ["small", "Small icons"], ["list", "List"], ["details", "Details"], ["tiles", "Tiles"]] as [ViewMode, string][]).map(([m, l]) => ({ label: l, checked: mode === m, radio: true, onClick: () => setMode(m) }));
  const sortItems = (): MenuItem[] => [
    ...(["name", "modified", "type", "size"] as const).map((k) => ({ label: { name: "Name", modified: "Date modified", type: "Type", size: "Size" }[k], checked: sort.by === k, radio: true, onClick: () => setSort({ by: k, dir: sort.by === k ? (sort.dir === 1 ? -1 : 1) : 1 }) })),
    { sep: true },
    { label: "Ascending", checked: sort.dir === 1, radio: true, onClick: () => setSort({ ...sort, dir: 1 }) },
    { label: "Descending", checked: sort.dir === -1, radio: true, onClick: () => setSort({ ...sort, dir: -1 }) },
  ];

  const bgMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setSel([]);
    const st = getState();
    if (path === "recycle")
      return showMenu(e, [{ label: "View", sub: viewItems() }, { label: "Sort by", sub: sortItems() }, { label: "Refresh", onClick: () => setState({ rev: st.rev + 1 }) }, { sep: true }, { label: "Empty Recycle Bin", onClick: emptyRecycle }, { sep: true }, { label: "Properties", onClick: () => showProps({ kind: "sys", key: "recycle" }) }]);
    if (!canWrite)
      return showMenu(e, [{ label: "View", sub: viewItems() }, { label: "Sort by", sub: sortItems() }, { label: "Refresh", onClick: () => setState({ rev: st.rev + 1 }) }, { sep: true }, { label: "Properties", onClick: () => openCP("system") }]);
    showMenu(e, [
      { label: "View", sub: viewItems() },
      { label: "Sort by", sub: sortItems() },
      { label: "Refresh", shortcut: "F5", onClick: () => setState({ rev: st.rev + 1 }) },
      { sep: true },
      { label: "Paste", shortcut: "Ctrl+V", disabled: !st.clipboard, onClick: paste },
      { label: "Paste shortcut", disabled: !st.clipboard, onClick: () => st.clipboard?.ids.forEach((i) => createShortcutFor(i, path)) },
      { label: canUndo() ? `Undo ${undoName()}` : "Undo", shortcut: "Ctrl+Z", disabled: !canUndo(), onClick: undoLast },
      { sep: true },
      { label: "New", sub: newItems(path, (id) => { setSel([id]); setRename(id); }) },
      { sep: true },
      { label: "Properties", onClick: () => showProps({ kind: "fs", id: path }) },
    ]);
  };

  const key = (e: React.KeyboardEvent) => {
    if (rename) return;
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (e.altKey && k === "arrowleft") return back();
    if (e.altKey && k === "arrowright") return fwd();
    if (e.altKey && k === "arrowup") return up();
    if (k === "backspace") { e.preventDefault(); return back(); }
    if (k === "f5") { e.preventDefault(); return setState({ rev: getState().rev + 1 }); }
    if (k === "enter") { selRows.forEach(openRow); return; }
    if (k === "f2" && fsSel.length === 1 && canWrite) return setRename(fsSel[0]);
    if (k === "delete" && fsSel.length && !(path === "computer")) { e.preventDefault(); return deleteNodes(fsSel, { permanent: e.shiftKey, inTrash }); }
    if (e.ctrlKey && k === "a") { e.preventDefault(); return setSel(rows.map((r) => r.id)); }
    if (e.ctrlKey && k === "c" && fsSel.length) return clipboardSet(fsSel, "copy");
    if (e.ctrlKey && k === "x" && fsSel.length && canWrite) return clipboardSet(fsSel, "cut");
    if (e.ctrlKey && k === "v") return paste();
    if (e.ctrlKey && k === "z") return undoLast();
    if (e.ctrlKey && e.shiftKey && k === "n") return doNew();
    if (e.ctrlKey && k === "f") { e.preventDefault(); return (document.getElementById("exs-" + win.id) as HTMLInputElement | null)?.focus(); }
    if (["arrowdown", "arrowup", "arrowleft", "arrowright", "home", "end"].includes(k)) {
      e.preventDefault();
      if (!rows.length) return;
      const cur = anchor ? rows.findIndex((r) => r.id === anchor) : -1;
      const grid = !(mode === "details" || mode === "list" || mode === "small");
      let n = cur;
      if (k === "home") n = 0;
      else if (k === "end") n = rows.length - 1;
      else if (k === "arrowdown") n = cur + (grid && mode !== "tiles" ? 6 : 1);
      else if (k === "arrowup") n = cur - (grid && mode !== "tiles" ? 6 : 1);
      else if (k === "arrowright") n = cur + 1;
      else n = cur - 1;
      n = Math.max(0, Math.min(rows.length - 1, n));
      if (e.shiftKey && anchor) select(e, rows[n].id);
      else { setSel([rows[n].id]); setAnchor(rows[n].id); }
    }
  };

  /* ---------- drag & drop ---------- */
  const dragStart = (e: React.DragEvent, r: Row) => {
    const ids = sel.includes(r.id) ? sel : [r.id];
    if (!sel.includes(r.id)) setSel([r.id]);
    e.dataTransfer.setData("text/win7-ids", JSON.stringify(ids.filter((i) => fs[i])));
    e.dataTransfer.effectAllowed = "copyMove";
  };
  const dropInto = (e: React.DragEvent, dir: string) => {
    const raw = e.dataTransfer.getData("text/win7-ids");
    if (!raw || !fs[dir] || fs[dir].type !== "folder") return;
    e.preventDefault();
    e.stopPropagation();
    const ids: string[] = JSON.parse(raw).filter((i: string) => i !== dir);
    if (!ids.length) return;
    if (e.ctrlKey) {
      const made = copyNodes(ids, dir);
      setUndo("Copy", () => import("../store").then((m) => m.deleteForever(made)));
    } else {
      const olds = ids.map((i) => [i, fs[i]?.parent as string] as const);
      moveNodes(ids, dir);
      setUndo("Move", () => olds.forEach(([i, p]) => moveNodes([i], p)));
    }
  };
  const dropProps = (dir: string) => ({
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes("text/win7-ids") && fs[dir]?.type === "folder") { e.preventDefault(); e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move"; } },
    onDrop: (e: React.DragEvent) => dropInto(e, dir),
  });

  /* ---------- address bar ---------- */
  const crumbs: { label: string; target: string }[] = useMemo(() => {
    if (isVirtual(path)) return [{ label: titleOf(path, fs), target: path }];
    const out: { label: string; target: string }[] = [];
    const lib = LIBS.find(([id]) => id === path);
    if (lib) return [{ label: "Libraries", target: "libraries" }, { label: lib[1], target: path }];
    for (let n: FsNode | undefined = fs[path]; n; n = n.parent ? fs[n.parent] : undefined) out.unshift({ label: n.parent === null ? n.name : n.name, target: n.id });
    return [{ label: "Computer", target: "computer" }, ...out];
  }, [path, fs]);

  const sepMenu = (e: React.MouseEvent, target: string) => {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let items: MenuItem[] = [];
    if (target === "computer") items = [...["c", "d"].map((id) => ({ label: fs[id].name, icon: "drive", onClick: () => go(id) }))];
    else if (target === "libraries") items = LIBS.map(([id, n]) => ({ label: n, icon: nodeIcon(fs[id]), onClick: () => go(id) }));
    else items = children(target, fs).filter((n) => n.type === "folder").map((n) => ({ label: n.name, icon: "folder", onClick: () => go(n.id) }));
    if (!items.length) items = [{ label: "(Empty)", disabled: true }];
    showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, items);
  };

  const submitAddr = (v: string) => {
    const t = v.trim();
    const l = t.toLowerCase();
    const virt: Record<string, string> = { computer: "computer", network: "network", libraries: "libraries", favorites: "favorites", "recycle bin": "recycle", desktop: "desk", documents: "docs", pictures: "pics", music: "music", videos: "vids", downloads: "dl" };
    if (virt[l]) go(virt[l]);
    else {
      const id = resolvePath(t);
      if (id && fs[id]?.type === "folder") go(id);
      else if (id) openNode(id);
      else msgBox({ title: "Windows Explorer", text: `Windows can't find '${t}'. Check the spelling and try again.`, icon: "error" });
    }
    setAddr(null);
  };

  /* ---------- command bar ---------- */
  const organize = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, [
      { label: "Cut", shortcut: "Ctrl+X", disabled: !fsSel.length || !canWrite, onClick: () => clipboardSet(fsSel, "cut") },
      { label: "Copy", shortcut: "Ctrl+C", disabled: !fsSel.length, onClick: () => clipboardSet(fsSel, "copy") },
      { label: "Paste", shortcut: "Ctrl+V", disabled: !clip || !canWrite, onClick: paste },
      { label: "Undo", shortcut: "Ctrl+Z", disabled: !canUndo(), onClick: undoLast },
      { sep: true },
      { label: "Select all", shortcut: "Ctrl+A", onClick: () => setSel(rows.map((x) => x.id)) },
      { sep: true },
      { label: "Layout", sub: [
        { label: "Details pane", checked: detailsPane, onClick: () => setDetailsPane(!detailsPane) },
        { label: "Preview pane", checked: preview, onClick: () => setPreview(!preview) },
        { label: "Navigation pane", checked: navPane, onClick: () => setNavPane(!navPane) },
      ] },
      { label: "Folder and search options", onClick: () => openCP("folderopts") },
      { sep: true },
      { label: "Delete", shortcut: "Del", disabled: !fsSel.length, onClick: () => deleteNodes(fsSel, { inTrash }) },
      { label: "Rename", shortcut: "F2", disabled: fsSel.length !== 1 || !canWrite, onClick: () => setRename(fsSel[0]) },
      { label: "Properties", disabled: fsSel.length !== 1, onClick: () => showProps({ kind: "fs", id: fsSel[0] }) },
      { sep: true },
      { label: "Close", onClick: () => import("../store").then((m) => m.closeWin(win.id)) },
    ]);
  };
  const viewsBtn = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, viewItems());
  };
  const cycleView = () => {
    const order: ViewMode[] = ["details", "list", "small", "medium", "large", "xl", "tiles"];
    setMode(order[(order.indexOf(mode) + 1) % order.length]);
  };

  const cmds: { label: string; fn: () => void; arrow?: boolean }[] = [];
  if (path === "recycle") {
    cmds.push({ label: "Empty the Recycle Bin", fn: emptyRecycle });
    cmds.push({ label: fsSel.length ? "Restore this item" : "Restore all items", fn: () => restoreNodes(fsSel.length ? fsSel : rows.map((r) => r.id)) });
  } else if (path === "computer") {
    cmds.push({ label: "System properties", fn: () => openCP("system") });
    cmds.push({ label: "Uninstall or change a program", fn: () => openCP("programs") });
    cmds.push({ label: "Map network drive", fn: () => go("network") });
    cmds.push({ label: "Open Control Panel", fn: () => openCP() });
  } else if (path === "network") {
    cmds.push({ label: "Network and Sharing Center", fn: () => openCP("network") });
    cmds.push({ label: "Add a printer", fn: () => openCP("devices") });
  } else {
    if (selRows.length === 1 && !selRows[0].virt) cmds.push({ label: selRows[0].folder ? "Open" : "Open", fn: () => openRow(selRows[0]) });
    if (selRows.length === 1 && ["jpg", "png", "bmp", "jpeg"].includes(extOf(selRows[0].node?.name || ""))) cmds.push({ label: "Slide show", fn: () => openApp("photos", { file: selRows[0].id }) });
    if (path === "pics") cmds.push({ label: "Slide show", fn: () => openApp("photos", { file: rows[0]?.id }) });
    if (canWrite) cmds.push({ label: "New folder", fn: doNew });
    if (path === "music" || path === "vids") cmds.push({ label: "Play all", fn: () => openApp("wmp", { playAll: path }) });
  }

  /* ---------- rendering ---------- */
  const sizeLabel = (r: Row) => (r.folder ? "" : fmtSize(r.size || 0));
  const renderName = (r: Row) =>
    rename === r.id ? (
      <InlineEdit
        value={r.node?.name || r.name}
        folder={r.folder}
        multiline={mode !== "details" && mode !== "list" && mode !== "small"}
        onDone={(v) => {
          setRename(null);
          if (v !== null) doRename(r.id, v);
          rootRef.current?.focus();
        }}
      />
    ) : (
      <span className="ex-name">{r.name}</span>
    );

  const itemProps = (r: Row) => ({
    "data-id": r.id,
    className: "ex-item" + (sel.includes(r.id) ? " sel" : "") + (clip?.mode === "cut" && clip.ids.includes(r.id) ? " cut" : ""),
    draggable: !!r.node && r.node.parent !== null && !inTrash && !rename,
    onDragStart: (e: React.DragEvent) => dragStart(e, r),
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); select(e, r.id); rootRef.current?.focus(); },
    onDoubleClick: (e: React.MouseEvent) => { e.stopPropagation(); openRow(r); },
    onContextMenu: (e: React.MouseEvent) => itemMenu(e, r),
    ...(r.folder && r.node && !inTrash ? dropProps(r.id) : {}),
  });

  const iconSz = mode === "xl" ? 96 : mode === "large" ? 64 : mode === "medium" ? 48 : mode === "tiles" ? 48 : 16;
  const one = selRows.length === 1 ? selRows[0] : null;

  const detailsInfo = () => {
    if (one) {
      const n = one.node;
      return (
        <div className="ex-det-one">
          {n?.content?.startsWith("data:image") ? <img src={n.content} alt="" className="ex-det-thumb" /> : <Icon name={one.icon} size={48} />}
          <div>
            <b>{one.name}</b>
            <div className="ex-det-sub">{one.kind}</div>
            {one.sub && <div className="ex-det-sub">{one.sub}</div>}
            {n && !one.sub && <div className="ex-det-sub">Date modified: {fmtDate(n.modified)}{n.type === "file" ? `   Size: ${fmtSize(n.size)}` : ""}</div>}
            {n?.parent === null && n.total && <div className="drive-bar" style={{ width: 200 }}><i style={{ width: ((n.total - (n.free || 0)) / n.total) * 100 + "%" }} /></div>}
          </div>
        </div>
      );
    }
    if (selRows.length > 1) return <div className="ex-det-one"><Icon name="folder" size={48} /><b>{selRows.length} items selected</b></div>;
    return <div className="ex-det-one"><Icon name={path === "recycle" ? "recycle" : isVirtual(path) ? "computer" : nodeIcon(fs[path])} size={48} /><div><b>{title}</b><div className="ex-det-sub">{rows.length} item{rows.length === 1 ? "" : "s"}</div></div></div>;
  };

  const previewPane = () => {
    const n = one?.node;
    if (!n || n.type !== "file") return <div className="ex-prev-empty">Select a file to preview.</div>;
    if (n.content?.startsWith("data:image")) return <img src={n.content} alt="" style={{ maxWidth: "100%" }} />;
    const e = extOf(n.name);
    if (["txt", "log", "ini", "bat", "md", "js", "css"].includes(e)) return <pre className="ex-prev-txt">{(n.content || "").slice(0, 1500)}</pre>;
    if (["rtf", "doc", "html"].includes(e)) return <div className="ex-prev-txt" dangerouslySetInnerHTML={{ __html: (n.content || "").replace(/<script[\s\S]*?<\/script>/gi, "") }} />;
    return <div className="ex-prev-empty"><Icon name={one!.icon} size={64} /><br />No preview available.</div>;
  };

  const TreeItem = ({ id, label, icon, depth, target, expandId }: { id: string; label: string; icon: string; depth: number; target: string; expandId?: string }) => {
    const kids = expandId && fs[expandId] ? children(expandId, fs).filter((n) => n.type === "folder" && (!n.hidden || settings.folder.showHidden)) : [];
    const isOpen = !!expandId && open.includes(expandId);
    return (
      <>
        <div
          className={"nav-item" + (path === target ? " sel" : "")}
          style={{ paddingLeft: 4 + depth * 14 }}
          onClick={() => go(target)}
          {...(fs[target]?.type === "folder" ? dropProps(target) : {})}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            showMenu(e, [{ label: "Open", bold: true, onClick: () => go(target) }, { label: "Open in new window", onClick: () => openApp("explorer", { path: target }) }, ...(fs[target] ? [{ sep: true }, { label: "Properties", onClick: () => showProps({ kind: "fs", id: target }) } as MenuItem] : [])]);
          }}
          data-key={id}
        >
          <span className="nav-tri" onClick={(e) => { e.stopPropagation(); if (expandId) setOpen(isOpen ? open.filter((o) => o !== expandId) : [...open, expandId]); }}>{expandId && kids.length ? (isOpen ? "◢" : "▷") : ""}</span>
          <Icon name={icon} size={16} />
          <span className="nav-label">{label}</span>
        </div>
        {isOpen && kids.map((k) => <TreeItem key={k.id} id={k.id} label={k.name} icon={nodeIcon(k)} depth={depth + 1} target={k.id} expandId={k.id} />)}
      </>
    );
  };

  const headCol = (label: string, by: "name" | "modified" | "type" | "size", w?: number) => (
    <div className="ex-th" style={w ? { width: w, flex: "none" } : { flex: 1 }} onClick={() => setSort({ by, dir: sort.by === by ? (sort.dir === 1 ? -1 : 1) : 1 })}>
      {label}
      {sort.by === by && <span className="ex-sort">{sort.dir === 1 ? "▲" : "▼"}</span>}
    </div>
  );

  const trashCount = trashed(fs).length;

  return (
    <div className="explorer" ref={rootRef} tabIndex={0} onKeyDown={key} data-dropdir={path} {...(canWrite && fs[path] ? dropProps(path) : {})}>
      <GlassBar winId={win.id}>
        <div className="ex-navbar">
          <div className="ex-navbtns">
            <button className="navbtn" disabled={hi === 0} onClick={back} title="Back"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 2L4 8l6 6" stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" /></svg></button>
            <button className="navbtn fwd" disabled={hi >= hist.length - 1} onClick={fwd} title="Forward"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 2l6 6-6 6" stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" /></svg></button>
          </div>
          <div className="ex-addr" onClick={() => setAddr(isVirtual(path) ? title : pathOf(path, fs))}>
            <Icon name={path === "recycle" ? "recycle" : isVirtual(path) ? "computer" : nodeIcon(fs[path] || fs.c)} size={16} />
            {addr !== null ? (
              <input autoFocus className="ex-addr-in" defaultValue={addr} onFocus={(e) => e.target.select()} onBlur={() => setAddr(null)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") submitAddr((e.target as HTMLInputElement).value); if (e.key === "Escape") setAddr(null); }} />
            ) : (
              <div className="ex-crumbs">
                {crumbs.map((c, i) => (
                  <React.Fragment key={c.target + i}>
                    <span className="crumb" onClick={(e) => { e.stopPropagation(); go(c.target); }} {...(fs[c.target] ? dropProps(c.target) : {})}>{c.label}</span>
                    <span className="crumb-sep" onClick={(e) => sepMenu(e, c.target)}>▸</span>
                  </React.Fragment>
                ))}
              </div>
            )}
            <button className="ex-refresh" title="Refresh" onClick={(e) => { e.stopPropagation(); setState({ rev: getState().rev + 1 }); }}>⟳</button>
          </div>
          <div className="ex-search">
            <input id={"exs-" + win.id} placeholder={path === "search" ? "Search Computer" : `Search ${title}`} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") setQuery(""); }} />
            {query ? <span className="ex-clear" onClick={() => setQuery("")}>✕</span> : <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="5.500" cy="5.500" r="4" fill="none" stroke="#5a7aa8" strokeWidth="1.600" /><path d="M8.500 8.500L13 13" stroke="#5a7aa8" strokeWidth="2" /></svg>}
          </div>
        </div>
      </GlassBar>
      <div className="ex-cmdbar">
        <button className="cmd" onClick={organize}>Organize <i>▾</i></button>
        {cmds.map((c) => <button key={c.label} className="cmd" onClick={c.fn}>{c.label}</button>)}
        <div style={{ flex: 1 }} />
        <button className="cmd" onClick={cycleView} title="Change your view">
          <Icon name="folder" size={14} /> <i onClick={(e) => { e.stopPropagation(); viewsBtn(e); }}>▾</i>
        </button>
        <button className={"cmd sq" + (preview ? " on" : "")} title="Show the preview pane" onClick={() => setPreview(!preview)}><svg width="16" height="14" viewBox="0 0 16 14"><rect x="1" y="1" width="14" height="12" fill="#fff" stroke="#556" /><rect x="9" y="1" width="6" height="12" fill="#bcd2ee" stroke="#556" /></svg></button>
        <button className="cmd sq" title="Get help" onClick={() => openApp("help")}><Icon name="help" size={16} /></button>
      </div>
      <div className="ex-body">
        {navPane && (
          <div className="ex-nav">
            <div className="nav-head">{void 0}<TreeItem id="fav" label="Favorites" icon="favorites" depth={0} target="favorites" /></div>
            <TreeItem id="fdesk" label="Desktop" icon="desktop" depth={1} target="desk" />
            <TreeItem id="fdl" label="Downloads" icon="downloads" depth={1} target="dl" />
            <TreeItem id="frecent" label="Recent Places" icon="folder" depth={1} target="favorites" />
            <div style={{ height: 6 }} />
            <TreeItem id="lib" label="Libraries" icon="docs" depth={0} target="libraries" />
            {LIBS.map(([id, n]) => <TreeItem key={id} id={"l" + id} label={n} icon={nodeIcon(fs[id])} depth={1} target={id} expandId={id} />)}
            <div style={{ height: 6 }} />
            <TreeItem id="comp" label="Computer" icon="computer" depth={0} target="computer" />
            <TreeItem id="c" label={fs.c.name} icon="drive" depth={1} target="c" expandId="c" />
            <TreeItem id="d" label={fs.d.name} icon="drive" depth={1} target="d" expandId="d" />
            <TreeItem id="dvd" label="DVD RW Drive (E:)" icon="cd" depth={1} target="computer" />
            <div style={{ height: 6 }} />
            <TreeItem id="net" label="Network" icon="network" depth={0} target="network" />
            <TreeItem id="rb" label="Recycle Bin" icon={trashCount ? "recycleFull" : "recycle"} depth={0} target="recycle" />
          </div>
        )}
        <div className="ex-main">
          <div
            className={"ex-list mode-" + mode}
            onClick={() => { setSel([]); rootRef.current?.focus(); }}
            onContextMenu={bgMenu}
          >
            {mode === "details" && (
              <div className="ex-head">
                {headCol("Name", "name")}
                {path === "recycle" || q2 || path === "search" ? <div className="ex-th" style={{ width: 170, flex: "none" }}>Location</div> : null}
                {headCol("Date modified", "modified", 140)}
                {headCol("Type", "type", 130)}
                {headCol("Size", "size", 80)}
              </div>
            )}
            <div className={"ex-rows" + (mode === "details" ? " explorer-rows" : "")}>
              {path === "computer" && !q2 && <div className="ex-group">Hard Disk Drives ({rows.filter((r) => r.node).length})</div>}
              {rows.map((r, i) => {
                const sep = path === "computer" && !q2 && r.id === "dvd";
                const label = renderName(r);
                return (
                  <React.Fragment key={r.id}>
                    {sep && <div className="ex-group" style={{ width: "100%" }}>Devices with Removable Storage (1)</div>}
                    {mode === "details" ? (
                      <div {...itemProps(r)}>
                        <div className="ex-c" style={{ flex: 1, minWidth: 0 }}><Icon name={r.icon} size={16} />{label}</div>
                        {(path === "recycle" || q2 || path === "search") && <div className="ex-c dim" style={{ width: 170, flex: "none" }}>{r.loc}</div>}
                        <div className="ex-c dim" style={{ width: 140, flex: "none" }}>{r.modified ? fmtDate(r.modified) : ""}</div>
                        <div className="ex-c dim" style={{ width: 130, flex: "none" }}>{r.kind}</div>
                        <div className="ex-c dim right" style={{ width: 80, flex: "none" }}>{sizeLabel(r)}</div>
                      </div>
                    ) : mode === "tiles" ? (
                      <div {...itemProps(r)}>
                        <Icon name={r.icon} size={48} />
                        <div className="ex-tile-t">
                          {label}
                          <div className="dim">{r.sub !== undefined && r.sub !== "" ? "" : r.kind}</div>
                          {r.node?.parent === null && r.node.total ? <><div className="drive-bar"><i style={{ width: ((r.node.total - (r.node.free || 0)) / r.node.total) * 100 + "%" }} /></div><div className="dim">{r.sub}</div></> : <div className="dim">{r.folder ? "" : sizeLabel(r)}</div>}
                        </div>
                      </div>
                    ) : mode === "list" || mode === "small" ? (
                      <div {...itemProps(r)}><Icon name={r.icon} size={16} />{label}</div>
                    ) : (
                      <div {...itemProps(r)} style={{ width: iconSz + 34 }}>
                        {r.node?.content?.startsWith("data:image") && !r.node.content.includes("svg+xml;utf8,<svg") && r.node.type === "file" && ["jpg", "png", "jpeg", "bmp", "gif", "svg"].includes(extOf(r.node.name)) ? (
                          <img className="ex-thumb" src={r.node.content} alt="" style={{ width: iconSz, height: Math.round(iconSz * 0.75) }} draggable={false} />
                        ) : (
                          <Icon name={r.icon} size={iconSz} />
                        )}
                        {label}
                      </div>
                    )}
                    {void i}
                  </React.Fragment>
                );
              })}
              {!rows.length && <div className="ex-empty">{q2 ? "No items match your search." : path === "recycle" ? "The Recycle Bin is empty." : "This folder is empty."}</div>}
            </div>
          </div>
          {preview && <div className="ex-prev">{previewPane()}</div>}
        </div>
      </div>
      {detailsPane && <div className="ex-details">{detailsInfo()}</div>}
      <div className="ex-status">
        <span>{rows.length} item{rows.length === 1 ? "" : "s"}</span>
        {selRows.length > 0 && <span>{selRows.length} selected{selRows.some((r) => r.size) ? ` — ${fmtSize(selRows.reduce((a, b) => a + (b.size || 0), 0))}` : ""}</span>}
        {clip && <span style={{ marginLeft: "auto" }}>Clipboard: {clip.ids.length} item(s) ({clip.mode})</span>}
      </div>
      {void setSettings}
      {void openPath}
    </div>
  );
}
