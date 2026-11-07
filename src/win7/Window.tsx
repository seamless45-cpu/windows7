"use client";
import React, { memo, useRef } from "react";
import { Win, useStore, focusWin, closeWin, minWin, maxWin, snapWin, setWin, view, getState, workArea } from "./store";
import { APPS } from "./registry";
import { Icon } from "./icons";
import { COMPONENTS } from "./appmap";

class Boundary extends React.Component<{ win: Win; children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { err: String(e?.message || e) };
  }
  render() {
    if (this.state.err === null) return this.props.children;
    return (
      <div className="crash">
        <Icon name="error" size={40} />
        <div>
          <b>{this.props.win.title} has stopped working</b>
          <p>A problem caused the program to stop working correctly. Windows will close the program.</p>
          <button className="w7btn" onClick={() => closeWin(this.props.win.id, true)}>Close program</button>
        </div>
      </div>
    );
  }
}

const DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

const WindowFrame = memo(function WindowFrame({ win, active, peek, wx, wy, ww, wh }: { win: Win; active: boolean; peek: string; wx: number; wy: number; ww: number; wh: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const meta = APPS[win.app];
  const Comp = COMPONENTS[win.app];
  const fixed = !!meta.fixed;
  const frameless = meta.chrome === "none";

  const geom = win.max ? { left: wx, top: wy, width: ww, height: wh } : { left: win.x, top: win.y, width: win.w, height: win.h };

  const prev = (side: "l" | "r" | "m" | null) => {
    const el = document.getElementById("snap-prev");
    if (!el) return;
    if (!side) {
      el.style.display = "none";
      return;
    }
    el.style.display = "block";
    el.style.top = wy + "px";
    el.style.height = wh + "px";
    el.style.left = side === "r" ? wx + ww / 2 + "px" : wx + "px";
    el.style.width = (side === "m" ? ww : ww / 2) + "px";
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (!t.closest(".win-drag") || t.closest("button,input,select,textarea,.nodrag,a")) return;
    const el = ref.current;
    if (!el) return;
    const sc = view.scale;
    let { x, y } = win;
    let { w, h } = win;
    const sw = getState().screen.w;
    const sh = getState().screen.h;
    if (win.max || win.snap) {
      if (fixed) return;
      const p = win.prev || { x: 60, y: 40, w: Math.min(meta.w, sw - 80), h: Math.min(meta.h, sh - 80) };
      const rel = (e.clientX / sc - (win.max ? wx : win.x)) / (win.max ? ww : win.w);
      w = p.w;
      h = p.h;
      x = e.clientX / sc - w * rel;
      y = win.max ? wy : win.y;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.width = w + "px";
      el.style.height = h + "px";
      setWin(win.id, { max: false, snap: null, x, y, w, h, prev: null });
    }
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = x;
    const oy = y;
    let moved = false;
    let snap: "l" | "r" | "m" | null = null;
    const mv = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / sc;
      const dy = (ev.clientY - sy) / sc;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      moved = true;
      const nx = ox + dx;
      const ny = Math.min(Math.max(wy, oy + dy), sh - 30);
      el.style.left = nx + "px";
      el.style.top = ny + "px";
      x = nx;
      y = ny;
      const px = ev.clientX / sc;
      const py = ev.clientY / sc;
      const s = fixed ? null : px <= 2 ? "l" : px >= sw - 3 ? "r" : py <= 1 ? "m" : null;
      if (s !== snap) {
        snap = s;
        prev(s);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      prev(null);
      if (!moved) return;
      if (snap === "m") {
        setWin(win.id, { x, y, prev: { x, y, w, h } });
        maxWin(win.id);
      } else if (snap) {
        setWin(win.id, { x, y, prev: { x, y, w, h } });
        snapWin(win.id, snap);
      } else setWin(win.id, { x, y });
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onResize = (dir: string) => (e: React.PointerEvent) => {
    if (e.button !== 0 || win.max || fixed) return;
    e.stopPropagation();
    e.preventDefault();
    focusWin(win.id);
    const el = ref.current;
    if (!el) return;
    const sc = view.scale;
    const sx = e.clientX;
    const sy = e.clientY;
    const o = { x: win.x, y: win.y, w: win.w, h: win.h };
    const cur = { ...o };
    const minW = frameless ? 140 : 240;
    const minH = frameless ? 120 : 120;
    const mv = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / sc;
      const dy = (ev.clientY - sy) / sc;
      let { x, y, w, h } = o;
      if (dir.includes("e")) w = Math.max(minW, o.w + dx);
      if (dir.includes("s")) h = Math.max(minH, o.h + dy);
      if (dir.includes("w")) {
        w = Math.max(minW, o.w - dx);
        x = o.x + (o.w - w);
      }
      if (dir.includes("n")) {
        h = Math.max(minH, o.h - dy);
        y = o.y + (o.h - h);
      }
      cur.x = x; cur.y = y; cur.w = w; cur.h = h;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.width = w + "px";
      el.style.height = h + "px";
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      setWin(win.id, { ...cur, snap: null });
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const cls = ["win", `app-${win.app}`, active ? "active" : "inactive", win.max ? "max" : "", win.min ? "min" : "", win.closing ? "closing" : "", frameless ? "frameless" : "", fixed ? "fixed" : "", peek].filter(Boolean).join(" ");

  return (
    <div ref={ref} className={cls} data-win={win.id} style={{ ...geom, zIndex: win.z }} onPointerDownCapture={() => focusWin(win.id)} onPointerDown={onDown}>
      {!frameless && (
        <>
          <div className="w-title win-drag" onDoubleClick={(e) => !fixed && !(e.target as HTMLElement).closest(".w-btns") && maxWin(win.id)}>
            <Icon name={meta.icon} size={16} className="w-ico" />
            <span className="w-title-text">{win.title}</span>
          </div>
          <div className="w-btns" onPointerDown={(e) => e.stopPropagation()}>
            {!fixed && (
              <button className="cb cmin" title="Minimize" onClick={() => minWin(win.id)}>
                <svg width="12" height="10" viewBox="0 0 12 10"><rect className="g-o" x="1.500" y="5.500" width="8" height="3" strokeWidth="1.200" /></svg>
              </button>
            )}
            {!fixed && (
              <button className="cb cmax" title={win.max ? "Restore Down" : "Maximize"} onClick={() => maxWin(win.id)}>
                {win.max ? (
                  <svg width="12" height="10" viewBox="0 0 12 10"><rect className="g-o" x="3.500" y="1.500" width="6" height="5" fill="none" strokeWidth="2.600" /><rect className="g-f" x="3.500" y="1.500" width="6" height="5" fill="none" strokeWidth="1.200" /><rect className="g-o" x="1.500" y="3.500" width="6" height="5" fill="none" strokeWidth="2.600" /><rect className="g-f" x="1.500" y="3.500" width="6" height="5" fill="none" strokeWidth="1.200" /></svg>
                ) : (
                  <svg width="12" height="10" viewBox="0 0 12 10"><rect className="g-o" x="1.500" y="1.500" width="8.500" height="6.500" fill="none" strokeWidth="3" /><rect className="g-f" x="1.500" y="1.500" width="8.500" height="6.500" fill="none" strokeWidth="1.400" /></svg>
                )}
              </button>
            )}
            <button className="cb cclose" title="Close" onClick={() => closeWin(win.id)}>
              <svg width="12" height="10" viewBox="0 0 12 10"><path className="g-o" d="M2.500 1.500l7 7M9.500 1.500l-7 7" strokeWidth="4" strokeLinecap="round" /><path className="g-f" d="M2.500 1.500l7 7M9.500 1.500l-7 7" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </>
      )}
      {!frameless && <div className="w-glass" id={"gs-" + win.id} />}
      <div className="w-client">
        <Boundary win={win}>{Comp ? <Comp win={win} /> : null}</Boundary>
      </div>
      {!win.max && !fixed && DIRS.map((d) => <div key={d} className={"rz rz-" + d} onPointerDown={onResize(d)} />)}
    </div>
  );
});

export function WindowLayer() {
  const windows = useStore((s) => s.windows);
  const focus = useStore((s) => s.focus);
  const peek = useStore((s) => s.peek);
  const wa = workArea(getState());
  useStore((s) => s.settings.taskbar);
  useStore((s) => s.screen);
  const modal = windows.filter((w) => w.modal && !w.closing).sort((a, b) => b.z - a.z)[0];
  return (
    <div className={"win-layer" + (peek === "all" ? " peek-all" : "") + (peek && peek !== "all" ? " peek-one" : "")}>
      {windows.map((w) => (
        <WindowFrame key={w.id} win={w} active={focus === w.id} peek={peek && peek !== "all" ? (peek === w.id ? "peek-show" : "peek-hide") : ""} wx={wa.x} wy={wa.y} ww={wa.w} wh={wa.h} />
      ))}
      {modal && <div className="modal-dim" style={{ zIndex: modal.z - 1 }} />}
      <div id="snap-prev" className="snap-prev" />
    </div>
  );
}
