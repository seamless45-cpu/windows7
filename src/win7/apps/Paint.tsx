"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Win, useStore, getState, setWin, setGuard, closeWin, msgBox, mkfile, writeFile, lsGet, lsSet, openApp, extOf, MenuItem, showMenu, view } from "../store";
import { Btn } from "../ui";
import { openFileDialog } from "../dialogs";

type Tool = "pencil" | "brush" | "eraser" | "fill" | "picker" | "text" | "magnifier" | "select" | "line" | "rect" | "ellipse" | "roundrect" | "triangle" | "diamond" | "pentagon" | "hexagon" | "star" | "arrow";
const SHAPES: [Tool, string][] = [["line", "╱"], ["rect", "▭"], ["roundrect", "▢"], ["ellipse", "◯"], ["triangle", "△"], ["diamond", "◇"], ["pentagon", "⬠"], ["hexagon", "⬡"], ["star", "☆"], ["arrow", "➜"]];
const PALETTE = ["#000000", "#7f7f7f", "#880015", "#ed1c24", "#ff7f27", "#fff200", "#22b14c", "#00a2e8", "#3f48cc", "#a349a4", "#ffffff", "#c3c3c3", "#b97a57", "#ffaec9", "#ffc90e", "#efe4b0", "#b5e61d", "#99d9ea", "#7092be", "#c8bfe7", "#464646", "#9c5a3c", "#fdd2a0", "#d3f9bc", "#a0e0f0", "#a0b4e8", "#5c1a1a", "#1a3a5c"];
const BRUSHES = ["Brush", "Calligraphy brush", "Airbrush", "Oil brush", "Crayon", "Marker"];

function poly(kind: Tool, x: number, y: number, w: number, h: number): [number, number][] {
  const cx = x + w / 2, cy = y + h / 2;
  switch (kind) {
    case "triangle": return [[cx, y], [x + w, y + h], [x, y + h]];
    case "diamond": return [[cx, y], [x + w, cy], [cx, y + h], [x, cy]];
    case "pentagon": return Array.from({ length: 5 }, (_, i) => [cx + (w / 2) * Math.sin((i * 2 * Math.PI) / 5), cy - (h / 2) * Math.cos((i * 2 * Math.PI) / 5)] as [number, number]);
    case "hexagon": return Array.from({ length: 6 }, (_, i) => [cx + (w / 2) * Math.cos((i * Math.PI) / 3), cy + (h / 2) * Math.sin((i * Math.PI) / 3)] as [number, number]);
    case "star": return Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 0.4 : 1; return [cx + (w / 2) * r * Math.sin((i * Math.PI) / 5), cy - (h / 2) * r * Math.cos((i * Math.PI) / 5)] as [number, number]; });
    case "arrow": return [[x, y + h * 0.3], [x + w * 0.6, y + h * 0.3], [x + w * 0.6, y], [x + w, cy], [x + w * 0.6, y + h], [x + w * 0.6, y + h * 0.7], [x, y + h * 0.7]];
    default: return [];
  }
}

export function Paint({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const cv = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [prevTool, setPrevTool] = useState<Tool>("pencil");
  const [c1, setC1] = useState("#000000");
  const [c2, setC2] = useState("#ffffff");
  const [active, setActive] = useState<1 | 2>(1);
  const [size, setSize] = useState(3);
  const [brush, setBrush] = useState(BRUSHES[0]);
  const [fillMode, setFillMode] = useState<"outline" | "both" | "fill">("outline");
  const [zoom, setZoom] = useState(1);
  const [dims, setDims] = useState({ w: 640, h: 400 });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [fileId, setFileId] = useState<string | null>(win.props.file || null);
  const [dirty, setDirty] = useState(false);
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number; img?: ImageData } | null>(null);
  const [textBox, setTextBox] = useState<{ x: number; y: number } | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [resizeDlg, setResizeDlg] = useState(false);
  const [rs, setRs] = useState({ pct: 100, lock: true });
  const undo = useRef<ImageData[]>([]);
  const redo = useRef<ImageData[]>([]);
  const clip = useRef<ImageData | null>(null);
  const drag = useRef<{ on: boolean; last: { x: number; y: number }; start: { x: number; y: number }; base?: ImageData; color: string; mode?: string; off?: { x: number; y: number } }>({ on: false, last: { x: 0, y: 0 }, start: { x: 0, y: 0 }, color: "#000" });
  const st = useRef({ dirty, fileId });
  st.current = { dirty, fileId };

  const ctx = () => cv.current!.getContext("2d", { willReadFrequently: true })!;
  const name = fileId ? fs[fileId]?.name || "Untitled" : "Untitled";
  useEffect(() => setWin(win.id, { title: `${name} - Paint` }), [name, win.id]);

  const blank = useCallback((w: number, h: number) => {
    const c = cv.current!;
    c.width = w;
    c.height = h;
    const g = ctx();
    g.fillStyle = "#fff";
    g.fillRect(0, 0, w, h);
    setDims({ w, h });
  }, []);
  const loadImage = (src: string, id: string | null) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.min(4000, img.naturalWidth || 640), h = Math.min(4000, img.naturalHeight || 400);
      blank(w, h);
      ctx().drawImage(img, 0, 0, w, h);
      undo.current = [];
      redo.current = [];
      setFileId(id);
      setDirty(false);
    };
    img.src = src;
  };
  useEffect(() => {
    blank(640, 400);
    const n = win.props.file ? getState().fs[win.props.file] : null;
    if (n?.content?.startsWith("data:image")) loadImage(n.content, n.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const snap = () => ctx().getImageData(0, 0, cv.current!.width, cv.current!.height);
  const pushUndo = () => {
    undo.current.push(snap());
    if (undo.current.length > 30) undo.current.shift();
    redo.current = [];
    setDirty(true);
  };
  const doUndo = () => {
    const s = undo.current.pop();
    if (!s) return;
    redo.current.push(snap());
    const c = cv.current!;
    if (c.width !== s.width || c.height !== s.height) { c.width = s.width; c.height = s.height; setDims({ w: s.width, h: s.height }); }
    ctx().putImageData(s, 0, 0);
    setSel(null);
  };
  const doRedo = () => {
    const s = redo.current.pop();
    if (!s) return;
    undo.current.push(snap());
    const c = cv.current!;
    if (c.width !== s.width || c.height !== s.height) { c.width = s.width; c.height = s.height; setDims({ w: s.width, h: s.height }); }
    ctx().putImageData(s, 0, 0);
  };

  const toData = (nm: string) => {
    const e = extOf(nm);
    return cv.current!.toDataURL(e === "jpg" || e === "jpeg" ? "image/jpeg" : "image/png");
  };
  const saveAs = (then?: () => void) =>
    openFileDialog({ mode: "save", exts: ["png", "jpg", "bmp"], name: "Untitled.png", start: "pics", onDone: (id, nm, dir) => {
      const d = toData(id ? getState().fs[id].name : nm);
      const nid = id ? (writeFile(id, d), id) : mkfile(dir, nm, d);
      setFileId(nid);
      setDirty(false);
      st.current.dirty = false;
      const l = lsGet<string[]>("win7.jl.paint", []);
      lsSet("win7.jl.paint", [nid, ...l.filter((x) => x !== nid)].slice(0, 8));
      then?.();
    } });
  const save = (then?: () => void) => {
    const f = st.current.fileId;
    if (f && getState().fs[f]) {
      writeFile(f, toData(getState().fs[f].name));
      setDirty(false);
      st.current.dirty = false;
      then?.();
    } else saveAs(then);
  };
  const ask = useCallback((next: () => void) => {
    if (!st.current.dirty) return next();
    msgBox({ title: "Paint", text: `Do you want to save changes to ${st.current.fileId ? getState().fs[st.current.fileId]?.name : "Untitled"}?`, icon: "warn", buttons: ["Save", "Don't Save", "Cancel"], onResult: (b) => b === "Save" ? save(next) : b === "Don't Save" && next() });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setGuard(win.id, () => {
      if (!st.current.dirty) return false;
      ask(() => closeWin(win.id, true));
      return true;
    });
    return () => setGuard(win.id, null);
  }, [win.id, ask]);

  /* ------- flood fill ------- */
  const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const floodFill = (sx: number, sy: number, color: string) => {
    const c = cv.current!;
    const img = ctx().getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const W = c.width, H = c.height;
    sx = Math.floor(sx); sy = Math.floor(sy);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
    const i0 = (sy * W + sx) * 4;
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3];
    const [r, g, b] = hex(color);
    if (tr === r && tg === g && tb === b && ta === 255) return;
    const stack = [sx, sy];
    const match = (i: number) => d[i] === tr && d[i + 1] === tg && d[i + 2] === tb && d[i + 3] === ta;
    while (stack.length) {
      const y = stack.pop()!;
      let x = stack.pop()!;
      let i = (y * W + x) * 4;
      while (x >= 0 && match(i)) { x--; i -= 4; }
      x++; i += 4;
      let up = false, dn = false;
      while (x < W && match(i)) {
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
        if (y > 0) { const k = i - W * 4; if (match(k)) { if (!up) { stack.push(x, y - 1); up = true; } } else up = false; }
        if (y < H - 1) { const k = i + W * 4; if (match(k)) { if (!dn) { stack.push(x, y + 1); dn = true; } } else dn = false; }
        x++; i += 4;
      }
    }
    ctx().putImageData(img, 0, 0);
  };

  const drawShape = (g: CanvasRenderingContext2D, kind: Tool, a: { x: number; y: number }, b: { x: number; y: number }, shift: boolean) => {
    let x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (shift && kind !== "line") { const m = Math.max(w, h); w = h = m; x = b.x < a.x ? a.x - m : a.x; y = b.y < a.y ? a.y - m : a.y; }
    g.lineWidth = size;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.strokeStyle = drag.current.color;
    const other = active === 1 ? c2 : c1;
    g.fillStyle = fillMode === "fill" ? drag.current.color : other;
    g.beginPath();
    if (kind === "line") { g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); return; }
    if (kind === "rect") g.rect(x, y, w, h);
    else if (kind === "roundrect") g.roundRect(x, y, w, h, Math.min(w, h) * 0.2);
    else if (kind === "ellipse") g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else { const pts = poly(kind, x, y, w, h); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); }
    if (fillMode !== "outline") g.fill();
    if (fillMode !== "fill") g.stroke();
  };

  const pt = (e: { clientX: number; clientY: number }) => {
    const r = cv.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * cv.current!.width, y: ((e.clientY - r.top) / r.height) * cv.current!.height };
  };

  const strokeSeg = (g: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }, color: string) => {
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineCap = "round";
    g.lineJoin = "round";
    if (tool === "eraser") {
      g.strokeStyle = c2;
      g.lineWidth = size * 4;
      g.lineCap = "square";
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    } else if (tool === "pencil") {
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    } else if (brush === "Airbrush") {
      for (let i = 0; i < 14; i++) { const r = size * 4 * Math.sqrt(Math.random()); const t = Math.random() * 6.28; g.fillRect(b.x + Math.cos(t) * r, b.y + Math.sin(t) * r, 1, 1); }
    } else if (brush === "Calligraphy brush") {
      g.lineWidth = 1;
      for (let k = -size; k <= size; k++) { g.beginPath(); g.moveTo(a.x + k, a.y - k); g.lineTo(b.x + k, b.y - k); g.stroke(); }
    } else if (brush === "Crayon") {
      g.globalAlpha = 0.6; g.lineWidth = size * 2;
      g.beginPath(); g.moveTo(a.x + (Math.random() - 0.5) * 2, a.y); g.lineTo(b.x, b.y + (Math.random() - 0.5) * 2); g.stroke(); g.globalAlpha = 1;
    } else if (brush === "Marker") {
      g.globalAlpha = 0.5; g.lineWidth = size * 3; g.lineCap = "butt";
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.globalAlpha = 1;
    } else {
      g.lineWidth = brush === "Oil brush" ? size * 3 : size * 2;
      if (brush === "Oil brush") g.globalAlpha = 0.85;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.globalAlpha = 1;
    }
  };

  const commitSel = () => {
    if (sel?.img) {
      ctx().putImageData(sel.img, Math.round(sel.x), Math.round(sel.y));
    }
    setSel(null);
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button > 2) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pt(e);
    const color = e.button === 2 ? c2 : c1;
    const d = drag.current;
    d.color = color;
    d.last = p;
    d.start = p;
    if (textBox) return;
    if (tool !== "select" && sel) commitSel();
    if (tool === "pencil" || tool === "brush" || tool === "eraser") {
      pushUndo();
      d.on = true;
      const g = ctx();
      strokeSeg(g, p, { x: p.x + 0.01, y: p.y }, color);
    } else if (tool === "fill") {
      pushUndo();
      floodFill(p.x, p.y, color);
    } else if (tool === "picker") {
      const px = ctx().getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
      const h = "#" + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, "0")).join("");
      if (e.button === 2) setC2(h); else setC1(h);
      setTool(prevTool);
    } else if (tool === "magnifier") {
      setZoom(zoom === 1 ? 2 : zoom === 2 ? 4 : 1);
    } else if (tool === "text") {
      setTextBox({ x: p.x, y: p.y });
    } else if (tool === "select") {
      if (sel && p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h) {
        d.on = true;
        d.mode = "move";
        d.off = { x: p.x - sel.x, y: p.y - sel.y };
        if (!sel.img) {
          pushUndo();
          const img = ctx().getImageData(Math.round(sel.x), Math.round(sel.y), Math.round(sel.w), Math.round(sel.h));
          const g = ctx();
          g.fillStyle = c2;
          g.fillRect(Math.round(sel.x), Math.round(sel.y), Math.round(sel.w), Math.round(sel.h));
          d.base = snap();
          setSel({ ...sel, img });
        } else d.base = snap();
      } else {
        commitSel();
        d.on = true;
        d.mode = "new";
        setSel({ x: p.x, y: p.y, w: 0, h: 0 });
      }
    } else {
      pushUndo();
      d.on = true;
      d.base = snap();
    }
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pt(e);
    setPos({ x: Math.round(p.x), y: Math.round(p.y) });
    const d = drag.current;
    if (!d.on) return;
    const g = ctx();
    if (tool === "pencil" || tool === "brush" || tool === "eraser") {
      strokeSeg(g, d.last, p, d.color);
      d.last = p;
    } else if (tool === "select") {
      if (d.mode === "new" && sel) setSel({ x: Math.min(d.start.x, p.x), y: Math.min(d.start.y, p.y), w: Math.abs(p.x - d.start.x), h: Math.abs(p.y - d.start.y) });
      else if (d.mode === "move" && sel?.img && d.base) {
        g.putImageData(d.base, 0, 0);
        setSel({ ...sel, x: p.x - d.off!.x, y: p.y - d.off!.y });
        const tmp = document.createElement("canvas");
        tmp.width = sel.img.width; tmp.height = sel.img.height;
        tmp.getContext("2d")!.putImageData(sel.img, 0, 0);
        g.drawImage(tmp, Math.round(p.x - d.off!.x), Math.round(p.y - d.off!.y));
      }
    } else if (d.base && tool !== "fill" && tool !== "text" && tool !== "picker" && tool !== "magnifier") {
      g.putImageData(d.base, 0, 0);
      drawShape(g, tool, d.start, p, e.shiftKey);
    }
  };
  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    if (tool === "select" && d.mode === "new" && sel && (sel.w < 2 || sel.h < 2)) setSel(null);
    else if (tool === "select" && d.mode === "new" && sel) setSel({ ...sel, x: Math.round(sel.x), y: Math.round(sel.y), w: Math.round(sel.w), h: Math.round(sel.h) });
    if (tool === "select" && d.mode === "move" && sel?.img) {
      // floating selection stays until committed; keep pixels drawn
      ctx().putImageData(d.base!, 0, 0);
      const tmp = document.createElement("canvas");
      tmp.width = sel.img.width; tmp.height = sel.img.height;
      tmp.getContext("2d")!.putImageData(sel.img, 0, 0);
      const p = pt(e);
      ctx().drawImage(tmp, Math.round(p.x - d.off!.x), Math.round(p.y - d.off!.y));
      setSel({ ...sel, x: Math.round(p.x - d.off!.x), y: Math.round(p.y - d.off!.y) });
    }
    d.base = undefined;
  };

  const commitText = (v: string) => {
    if (textBox && v.trim()) {
      pushUndo();
      const g = ctx();
      g.fillStyle = c1;
      g.font = `${fontSize}px Calibri, "Segoe UI", sans-serif`;
      g.textBaseline = "top";
      v.split("\n").forEach((l, i) => g.fillText(l, textBox.x, textBox.y + i * fontSize * 1.2));
    }
    setTextBox(null);
  };

  /* ------- image ops ------- */
  const resizeTo = (w: number, h: number) => {
    pushUndo();
    const c = cv.current!;
    const tmp = document.createElement("canvas");
    tmp.width = c.width; tmp.height = c.height;
    tmp.getContext("2d")!.drawImage(c, 0, 0);
    c.width = w; c.height = h;
    const g = ctx();
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    g.drawImage(tmp, 0, 0, w, h);
    setDims({ w, h });
  };
  const transform = (kind: "r90" | "l90" | "r180" | "fh" | "fv") => {
    pushUndo();
    const c = cv.current!;
    const tmp = document.createElement("canvas");
    tmp.width = c.width; tmp.height = c.height;
    tmp.getContext("2d")!.drawImage(c, 0, 0);
    const W = c.width, H = c.height;
    if (kind === "r90" || kind === "l90") { c.width = H; c.height = W; setDims({ w: H, h: W }); } 
    const g = ctx();
    g.save();
    if (kind === "r90") { g.translate(H, 0); g.rotate(Math.PI / 2); }
    else if (kind === "l90") { g.translate(0, W); g.rotate(-Math.PI / 2); }
    else if (kind === "r180") { g.translate(W, H); g.rotate(Math.PI); }
    else if (kind === "fh") { g.translate(W, 0); g.scale(-1, 1); }
    else { g.translate(0, H); g.scale(1, -1); }
    g.drawImage(tmp, 0, 0);
    g.restore();
  };
  const cropSel = () => {
    if (!sel || sel.w < 2) return;
    pushUndo();
    const g = ctx();
    const img = sel.img || g.getImageData(sel.x, sel.y, sel.w, sel.h);
    const c = cv.current!;
    c.width = Math.round(sel.w); c.height = Math.round(sel.h);
    setDims({ w: c.width, h: c.height });
    ctx().putImageData(img, 0, 0);
    setSel(null);
  };
  const copySel = (cut: boolean) => {
    if (!sel || sel.w < 1) return;
    const g = ctx();
    clip.current = sel.img || g.getImageData(Math.round(sel.x), Math.round(sel.y), Math.round(sel.w), Math.round(sel.h));
    if (cut) {
      if (!sel.img) { pushUndo(); g.fillStyle = c2; g.fillRect(sel.x, sel.y, sel.w, sel.h); }
      setSel(null);
    }
  };
  const paste = () => {
    if (!clip.current) return;
    commitSel();
    pushUndo();
    const img = clip.current;
    const g = ctx();
    d0.base = snap();
    const tmp = document.createElement("canvas");
    tmp.width = img.width; tmp.height = img.height;
    tmp.getContext("2d")!.putImageData(img, 0, 0);
    g.drawImage(tmp, 0, 0);
    setTool("select");
    setSel({ x: 0, y: 0, w: img.width, h: img.height, img });
  };
  const d0 = drag.current;
  const deleteSel = () => { if (sel) { if (!sel.img) { pushUndo(); ctx().fillStyle = c2; ctx().fillRect(sel.x, sel.y, sel.w, sel.h); } else if (d0.base) ctx().putImageData(d0.base, 0, 0); setSel(null); } };

  const key = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey && k === "z") { e.preventDefault(); doUndo(); }
    else if (e.ctrlKey && k === "y") { e.preventDefault(); doRedo(); }
    else if (e.ctrlKey && k === "s") { e.preventDefault(); save(); }
    else if (e.ctrlKey && k === "c") copySel(false);
    else if (e.ctrlKey && k === "x") copySel(true);
    else if (e.ctrlKey && k === "v") paste();
    else if (e.ctrlKey && k === "a") { e.preventDefault(); setTool("select"); setSel({ x: 0, y: 0, w: dims.w, h: dims.h }); }
    else if (k === "delete") deleteSel();
    else if (k === "escape") commitSel();
  };

  const fileMenu = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const items: MenuItem[] = [
      { label: "New", shortcut: "Ctrl+N", onClick: () => ask(() => { blank(640, 400); undo.current = []; setFileId(null); setDirty(false); }) },
      { label: "Open", shortcut: "Ctrl+O", onClick: () => ask(() => openFileDialog({ mode: "open", exts: ["png", "jpg", "jpeg", "bmp", "gif", "svg"], start: "pics", onDone: (id) => { const n = id && getState().fs[id]; if (n && typeof n !== "string" && n.content) loadImage(n.content, n.id); else msgBox({ title: "Paint", text: "This file is empty or not a valid picture.", icon: "warn" }); } })) },
      { label: "Save", shortcut: "Ctrl+S", onClick: () => save() },
      { label: "Save as", onClick: () => saveAs() },
      { sep: true },
      { label: "Set as desktop background (fill)", onClick: () => { import("../store").then((m) => { const id = mkfile("pics", "Paint wallpaper.png", cv.current!.toDataURL()); m.setSettings({ wallpaper: "fs:" + id, wpPos: "fill" }); }); } },
      { label: "Print", onClick: () => msgBox({ title: "Print", text: "No printer is installed.", icon: "warn" }) },
      { sep: true },
      { label: "About Paint", onClick: () => msgBox({ title: "About Paint", text: "Windows 7 Paint\nVersion 6.1 (Build 7601)", icon: "info" }) },
      { label: "Exit", onClick: () => closeWin(win.id) },
    ];
    showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, items);
  };
  const T = ({ t, label, title }: { t: Tool; label: string; title: string }) => (
    <button className={"pt-btn" + (tool === t ? " on" : "")} title={title} onClick={() => { if (tool !== "picker") setPrevTool(tool); setTool(t); if (t !== "select") commitSel(); }}>{label}</button>
  );
  const setColor = (c: string, right = false) => (right || active === 2 ? setC2(c) : setC1(c));

  return (
    <div className="paint" tabIndex={0} onKeyDown={key}>
      <div className="ribbon-tabs"><div className="rt-file paintbtn" onClick={fileMenu}>Paint ▾</div><div className="rt sel">Home</div><div className="rt">View</div>
        <div className="rt-quick"><button title="Save" onClick={() => save()}>💾</button><button title="Undo" onClick={doUndo}>↶</button><button title="Redo" onClick={doRedo}>↷</button></div></div>
      <div className="ribbon">
        <div className="rg"><div className="rg-body"><button className="rb-btn" onClick={paste}><b>📋</b><br />Paste</button><div><button className="rb-btn" onClick={() => copySel(true)}>✂ Cut</button><button className="rb-btn" onClick={() => copySel(false)}>⎘ Copy</button></div></div><div className="rg-t">Clipboard</div></div>
        <div className="rg"><div className="rg-body"><div className="pt-grid"><T t="select" label="⬚" title="Select" /><button className="pt-btn" title="Crop" onClick={cropSel}>⌗</button><button className="pt-btn" title="Resize and skew" onClick={() => setResizeDlg(true)}>⤢</button>
          <button className="pt-btn" title="Rotate" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, [{ label: "Rotate right 90°", onClick: () => transform("r90") }, { label: "Rotate left 90°", onClick: () => transform("l90") }, { label: "Rotate 180°", onClick: () => transform("r180") }, { label: "Flip vertical", onClick: () => transform("fv") }, { label: "Flip horizontal", onClick: () => transform("fh") }]); }}>⟳</button></div></div><div className="rg-t">Image</div></div>
        <div className="rg"><div className="rg-body"><div className="pt-grid"><T t="pencil" label="✎" title="Pencil" /><T t="fill" label="◍" title="Fill with color" /><T t="text" label="A" title="Text" /><T t="eraser" label="▭" title="Eraser" /><T t="picker" label="✒" title="Color picker" /><T t="magnifier" label="⌕" title="Magnifier" /></div></div><div className="rg-t">Tools</div></div>
        <div className="rg"><div className="rg-body"><button className={"rb-btn" + (tool === "brush" ? " on" : "")} onClick={(e) => { setTool("brush"); const r = e.currentTarget.getBoundingClientRect(); showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, BRUSHES.map((b) => ({ label: b, checked: brush === b, radio: true, onClick: () => { setBrush(b); setTool("brush"); } }))); }}><b>🖌</b><br />Brushes ▾</button></div><div className="rg-t">Brushes</div></div>
        <div className="rg"><div className="rg-body"><div className="pt-grid shapes">{SHAPES.map(([t, l]) => <T key={t} t={t} label={l} title={t} />)}</div>
          <div className="col"><select className="w7input" value={fillMode} onChange={(e) => setFillMode(e.target.value as "outline" | "both" | "fill")}><option value="outline">Outline</option><option value="both">Outline + fill</option><option value="fill">Solid fill</option></select></div></div><div className="rg-t">Shapes</div></div>
        <div className="rg"><div className="rg-body col"><div className="pt-size">{[1, 2, 3, 5, 8].map((s) => <button key={s} className={size === s ? "on" : ""} onClick={() => setSize(s)} title={s + "px"}><i style={{ height: s }} /></button>)}</div>
          {tool === "text" && <select className="w7input" value={fontSize} onChange={(e) => setFontSize(+e.target.value)}>{[10, 14, 18, 24, 32, 48].map((f) => <option key={f} value={f}>{f} pt</option>)}</select>}</div><div className="rg-t">Size</div></div>
        <div className="rg"><div className="rg-body">
          <div className="pt-cols"><div className={"pt-c1" + (active === 1 ? " on" : "")} onClick={() => setActive(1)}><i style={{ background: c1 }} />Color 1</div><div className={"pt-c1" + (active === 2 ? " on" : "")} onClick={() => setActive(2)}><i style={{ background: c2 }} />Color 2</div></div>
          <div className="pt-pal">{PALETTE.map((c) => <i key={c} style={{ background: c }} onClick={() => setColor(c)} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setC2(c); }} />)}</div>
          <label className="rb-btn" title="Edit colors">🎨<br />Edit colors<input type="color" value={active === 1 ? c1 : c2} onChange={(e) => setColor(e.target.value)} style={{ opacity: 0, position: "absolute", width: 1, height: 1 }} /></label>
        </div><div className="rg-t">Colors</div></div>
      </div>
      <div className="paint-work" onContextMenu={(e) => e.preventDefault()}>
        <div className="paint-canvas-wrap" style={{ width: dims.w * zoom, height: dims.h * zoom }}>
          <canvas ref={cv} className="paint-canvas" style={{ width: dims.w * zoom, height: dims.h * zoom, cursor: tool === "picker" ? "crosshair" : tool === "text" ? "text" : tool === "magnifier" ? "zoom-in" : "crosshair" }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={() => setPos(null)} />
          {sel && sel.w > 0 && <div className="paint-sel" style={{ left: sel.x * zoom, top: sel.y * zoom, width: sel.w * zoom, height: sel.h * zoom }} />}
          {textBox && <textarea autoFocus className="paint-text" style={{ left: textBox.x * zoom, top: textBox.y * zoom, fontSize: fontSize * zoom, color: c1 }} onBlur={(e) => commitText(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") setTextBox(null); }} />}
        </div>
      </div>
      <div className="paint-status"><span>✛ {pos ? `${pos.x}, ${pos.y}px` : ""}</span><span>{sel && sel.w > 0 ? `⬚ ${Math.round(sel.w)} × ${Math.round(sel.h)}px` : ""}</span><span>▭ {dims.w} × {dims.h}px</span><span style={{ flex: 1 }} /><span>{Math.round(zoom * 100)}%</span><input type="range" className="w7range" min={1} max={4} step={0.5} value={zoom} onChange={(e) => setZoom(+e.target.value)} style={{ width: 100 }} /></div>
      {resizeDlg && (
        <div className="np-dlg" style={{ top: 80, left: 100 }}>
          <div className="np-dlg-t">Resize and Skew<span onClick={() => setResizeDlg(false)}>✕</span></div>
          <div className="np-dlg-b">
            <label>Resize by percentage:</label>
            <input className="w7input" type="number" min={1} max={500} value={rs.pct} onChange={(e) => setRs({ ...rs, pct: +e.target.value })} />
            <div style={{ color: "#555" }}>New size: {Math.round((dims.w * rs.pct) / 100)} × {Math.round((dims.h * rs.pct) / 100)} pixels</div>
            <div className="np-dlg-btns"><Btn def onClick={() => { resizeTo(Math.max(1, Math.round((dims.w * rs.pct) / 100)), Math.max(1, Math.round((dims.h * rs.pct) / 100))); setResizeDlg(false); }}>OK</Btn><Btn onClick={() => setResizeDlg(false)}>Cancel</Btn></div>
          </div>
        </div>
      )}
      {void openApp}
    </div>
  );
}
