"use client";
import React, { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Win, useStore, focusWin, closeWin, minWin, maxWin, snapWin, setWin, setGeom, view, getState, workArea, shakeWin, showMenu } from "./store";
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
      <div className="crash" data-err={this.state.err}>
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

/** Keyboard form of the system menu's Move and Size commands (Alt+Space). */
function keyboardAdjust(id: string, mode: "move" | "size") {
  const original = getState().windows.find((w) => w.id === id);
  if (!original) return;
  const finish = () => {
    window.removeEventListener("keydown", key, true);
    window.removeEventListener("blur", finish);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); finish(); return; }
    if (e.key === "Escape") {
      e.preventDefault();
      setGeom(id, { x: original.x, y: original.y, w: original.w, h: original.h });
      finish();
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    const w = getState().windows.find((q) => q.id === id);
    if (!w) return finish();
    const step = e.ctrlKey ? 1 : 8;
    const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
    const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
    if (mode === "move") setGeom(id, { x: w.x + dx, y: w.y + dy, w: w.w, h: w.h });
    else setGeom(id, { x: w.x, y: w.y, w: Math.max(240, w.w + dx), h: Math.max(120, w.h + dy) });
  };
  window.addEventListener("keydown", key, true);
  window.addEventListener("blur", finish);
}

export function showWindowSystemMenu(id: string, at?: { x: number; y: number }) {
  const w = getState().windows.find((q) => q.id === id);
  if (!w) return;
  const fixed = !!APPS[w.app].fixed;
  const restored = !w.max && !w.snap;
  showMenu(at || { x: w.x + 7, y: w.y + 27 }, [
    { label: "Restore", disabled: restored || fixed, onClick: () => maxWin(id) },
    { label: "Move", disabled: !restored || fixed, onClick: () => keyboardAdjust(id, "move") },
    { label: "Size", disabled: !restored || fixed, onClick: () => keyboardAdjust(id, "size") },
    { label: "Minimize", disabled: w.min || fixed, onClick: () => minWin(id) },
    { label: "Maximize", disabled: w.max || fixed, onClick: () => maxWin(id) },
    { sep: true },
    { label: "Close", shortcut: "Alt+F4", onClick: () => closeWin(id) },
  ]);
}

const WindowFrame = memo(function WindowFrame({ win, active, peek, wx, wy, ww, wh }: { win: Win; active: boolean; peek: string; wx: number; wy: number; ww: number; wh: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const meta = APPS[win.app];
  const Comp = COMPONENTS[win.app];
  const fixed = !!meta.fixed;
  const frameless = meta.chrome === "none";
  const animationsEnabled = useStore((s) => s.settings.aero.animations);

  const geom = win.max ? { left: wx, top: wy, width: ww, height: wh } : { left: win.x, top: win.y, width: win.w, height: win.h };

  // The snap overlay fades in and out (Windows 7 does not pop it).
  const prev = (side: "l" | "r" | "m" | null) => {
    const el = document.getElementById("snap-prev");
    if (!el) return;
    if (!side) {
      el.style.opacity = "0";
      window.setTimeout(() => {
        if (el.style.opacity === "0") el.style.display = "none";
      }, 130);
      return;
    }
    el.style.display = "block";
    requestAnimationFrame(() => (el.style.opacity = "1"));
    el.style.top = wy + "px";
    el.style.height = wh + "px";
    el.style.left = side === "r" ? wx + ww / 2 + "px" : wx + "px";
    el.style.width = (side === "m" ? ww : ww / 2) + "px";
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (!t.closest(".win-drag") || t.closest("button,input,select,textarea,.nodrag,a,.w-btns")) return;
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    focusWin(win.id);
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
    // Pointer capture keeps a fast drag (or a drag that leaves the window /
    // the viewport) streaming to this frame; without it the browser can steal
    // the pointer and the window stops mid-drag.
    try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = x;
    const oy = y;
    let moved = false;
    let snap: "l" | "r" | "m" | null = null;
    let dir = 0;
    let reversals = 0;
    let lastX = e.clientX;
    let lastTurn = 0;
    let raf = 0;
    let pending: PointerEvent | null = null;
    const nudge = (ev: PointerEvent | null) => {
      if (ev) pending = ev;
      const p = pending;
      if (!p || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const ev2 = pending!;
        pending = null;
        const dx = (ev2.clientX - sx) / sc;
        const dy = (ev2.clientY - sy) / sc;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
        moved = true;
        el.classList.add("dragging");
        const nx = ox + dx;
        const ny = Math.min(Math.max(wy, oy + dy), sh - 30);
        el.style.left = nx + "px";
        el.style.top = ny + "px";
        x = nx;
        y = ny;
        const px = ev2.clientX / sc;
        const py = ev2.clientY / sc;
        const s2 = fixed ? null : px <= 2 ? "l" : px >= sw - 3 ? "r" : py <= 1 ? "m" : null;
        if (s2 !== snap) {
          snap = s2;
          prev(s2 as "l" | "r" | "m" | null);
        }
      });
    };
    const mv = (ev: PointerEvent) => {
      const step = ev.clientX - lastX;
      lastX = ev.clientX;
      if (Math.abs(step) > 2) {
        const nd = step > 0 ? 1 : -1;
        if (dir && nd !== dir) {
          const now = Date.now();
          if (now - lastTurn < 400) reversals += 1;
          else reversals = 1;
          lastTurn = now;
          if (reversals >= 4 && !fixed) {
            reversals = 0;
            shakeWin(win.id);
          }
        }
        dir = nd;
      }
      nudge(ev);
    };
    const finish = (ev: PointerEvent, cancelled: boolean) => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      try { el.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      el.classList.remove("dragging");
      prev(null);
      if (cancelled) {
        if (moved) setGeom(win.id, { x: ox, y: oy, w, h });
        return;
      }
      if (!moved) {
        // a plain click on the caption still lands the geometry already applied
        if (ev && (win.max || win.snap)) setGeom(win.id, { x, y, w, h });
        return;
      }
      if (snap === "m") {
        setWin(win.id, { x, y, prev: { x, y, w, h } });
        maxWin(win.id);
      } else if (snap) {
        setWin(win.id, { x, y, prev: { x, y, w, h } });
        snapWin(win.id, snap);
      } else setGeom(win.id, { x, y, w, h });
    };
    const up = (ev: PointerEvent) => finish(ev, false);
    const cancel = (ev: PointerEvent) => finish(ev, true);
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  };

  const onResize = (dir: string) => (e: React.PointerEvent) => {
    if (e.button !== 0 || win.max || fixed) return;
    e.stopPropagation();
    e.preventDefault();
    focusWin(win.id);
    const el = ref.current;
    if (!el) return;
    // The 4 px grab strips overlay the client area, so the pointer has to stay
    // captured by the frame for the whole gesture.
    try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const sc = view.scale;
    const sx = e.clientX;
    const sy = e.clientY;
    const o = { x: win.x, y: win.y, w: win.w, h: win.h };
    const cur = { ...o };
    const minW = frameless ? 140 : 240;
    const minH = frameless ? 120 : 120;
    let raf = 0;
    let pending: PointerEvent | null = null;
    let started = false;
    const paint = (ev: PointerEvent | null) => {
      if (ev) pending = ev;
      const p = pending;
      if (!p || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const ev2 = pending!;
        pending = null;
        const dx = (ev2.clientX - sx) / sc;
        const dy = (ev2.clientY - sy) / sc;
        if (!started && Math.abs(dx) + Math.abs(dy) < 2) return;
        started = true;
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
      });
    };
    const mv = (ev: PointerEvent) => {
      if (!started) el.classList.add("resizing");
      paint(ev);
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      try { el.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      el.classList.remove("resizing");
      if (started) setGeom(win.id, cur);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  /**
   * DWM's minimize/restore motion follows the taskbar button, not a generic
   * fade. Derive both endpoints from untransformed frame geometry so restore
   * starts at the same app button even though the minimized frame is scaled.
   */
  const prevMin = useRef(win.min);
  const minMotion = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (win.min === prevMin.current) {
      if (!animationsEnabled || reduced) {
        minMotion.current?.cancel();
        minMotion.current = null;
      }
      return;
    }
    prevMin.current = win.min;
    minMotion.current?.cancel();
    minMotion.current = null;
    if (fixed || !animationsEnabled || reduced) return;
    const el = ref.current;
    if (!el) return;
    const btn = document.querySelector<HTMLElement>(`[data-tbkey="${APPS[win.app]?.group || win.app}"]`);
    const br = btn?.getBoundingClientRect();
    const sc = view.scale || 1;
    const frame = win.max ? { x: wx, y: wy, w: ww, h: wh } : { x: win.x, y: win.y, w: win.w, h: win.h };
    const cx = (frame.x + frame.w / 2) * sc;
    const cy = (frame.y + frame.h / 2) * sc;
    const sx = br ? Math.max(0.04, Math.min(0.3, br.width / Math.max(1, frame.w * sc))) : 0.08;
    const sy = br ? Math.max(0.04, Math.min(0.3, br.height / Math.max(1, frame.h * sc))) : 0.08;
    const tx = br ? (br.left + br.width / 2 - cx) / sc : 0;
    const ty = br ? (br.top + br.height / 2 - cy) / sc : 40;
    const fromTaskbar = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
    const keyframes = win.min
      ? [{ transform: "none", opacity: 1, visibility: "visible" }, { transform: fromTaskbar, opacity: 0, visibility: "hidden" }]
      : [{ transform: fromTaskbar, opacity: 0, visibility: "visible" }, { transform: "none", opacity: 1, visibility: "visible" }];
    const animation = el.animate(keyframes, {
      duration: 250,
      easing: "linear",
      fill: "forwards",
    });
    minMotion.current = animation;
    animation.onfinish = () => {
      animation.cancel();
      if (minMotion.current === animation) minMotion.current = null;
    };
    return () => {
      animation.cancel();
      if (minMotion.current === animation) minMotion.current = null;
    };
  }, [win.min, win.max, win.snap, win.x, win.y, win.w, win.h, fixed, win.app, animationsEnabled, wx, wy, ww, wh]);

  const cls = ["win", `app-${win.app}`, active ? "active" : "inactive", win.max ? "max" : "", win.min ? "min" : "", win.closing ? "closing" : "", win.changing ? "changing" : "", win.max || win.snap ? "snapped" : "", frameless ? "frameless" : "", fixed ? "fixed" : "", peek].filter(Boolean).join(" ");

  return (
    <div ref={ref} className={cls} data-win={win.id} style={{ ...geom, zIndex: win.z }} onPointerDownCapture={() => focusWin(win.id)} onPointerDown={onDown}>
      {!frameless && (
        <>
          <div className="w-title win-drag" onDoubleClick={(e) => { if (!fixed && !(e.target as HTMLElement).closest(".w-btns,.w-icon-button")) maxWin(win.id); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); showWindowSystemMenu(win.id, { x: e.clientX / view.scale, y: e.clientY / view.scale }); }}>
            <span className="w-icon-button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); showWindowSystemMenu(win.id); }} onDoubleClick={(e) => { e.stopPropagation(); closeWin(win.id); }}>
              <Icon name={meta.icon} size={16} className="w-ico" />
            </span>
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
