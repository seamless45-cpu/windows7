"use client";
import React, { useEffect } from "react";
import {
  useStore, getState, setState, focusWin, minWin, snapWin, openApp, openPath, openNode, jumpRecent, jumpPinned, jumpPin, closeJumpList,
  flipCommit, flipCancel, workArea, tbThick, view, Win, closeWin, MenuItem, setSettings, notify,
} from "./store";
import { APPS } from "./registry";
import { Icon, appIcon } from "./icons";
import { WALLPAPERS } from "./data";

/* ====================================================== Jump list popup */
export function JumpList() {
  const jl = useStore((s) => s.jumplist);
  const fs = useStore((s) => s.fs);
  const pinned = useStore((s) => s.rev);
  if (!jl) return null;
  void pinned;
  const meta = APPS[jl.app];
  const recent = jumpRecent(jl.app);
  const p = jumpPinned(jl.app);
  const others = recent.filter((id) => !p.includes(id));
  const open = (id: string, app = jl.app) => {
    closeJumpList();
    openApp(app, { file: id });
  };
  const tasks: MenuItem[] = [];
  if (jl.app === "notepad") tasks.push({ label: "New document", icon: "notepad", onClick: () => { closeJumpList(); openApp("notepad"); } });
  if (jl.app === "paint") tasks.push({ label: "New picture", icon: "paint", onClick: () => { closeJumpList(); openApp("paint"); } });
  if (jl.app === "explorer") {
    tasks.push(
      { label: "Documents", icon: "docs", onClick: () => { closeJumpList(); openPath("docs"); } },
      { label: "Pictures", icon: "pictures", onClick: () => { closeJumpList(); openPath("pics"); } },
      { label: "Music", icon: "music", onClick: () => { closeJumpList(); openPath("music"); } },
      { label: "Computer", icon: "computer", onClick: () => { closeJumpList(); openPath("computer"); } }
    );
  }
  if (jl.app === "ie") {
    tasks.push(
      { label: "Open new tab", icon: "ie", onClick: () => { closeJumpList(); openApp("ie", { newtab: true }); } },
      { label: "Start InPrivate Browsing", icon: "ie", onClick: () => { closeJumpList(); openApp("ie", { private: true }); } }
    );
    getState().settings.ie.favs.slice(0, 4).forEach((f) => tasks.push({ label: f.title, icon: "ie", onClick: () => { closeJumpList(); openApp("ie", { url: f.url }); } }));
  }
  if (jl.app === "wmp") tasks.push({ label: "Play all music", icon: "music", onClick: () => { closeJumpList(); openApp("wmp", { playAll: true }); } });
  if (jl.app === "calc" || jl.app === "cmd") tasks.push({ label: "Pin to taskbar", icon: "favorites", onClick: () => { closeJumpList(); } });

  const st = getState();
  const W = 300;
  const x = Math.max(4, Math.min(jl.x, st.screen.w - W - 4));
  const below = jl.y < st.screen.h / 2;
  const style: React.CSSProperties = below
    ? { left: x, top: Math.min(jl.y + 4, st.screen.h - 200) }
    : { left: x, bottom: Math.max(4, st.screen.h - jl.y + 4) };

  return (
    <div className="jumplist" style={style} onPointerDown={(e) => e.stopPropagation()}>
      <div className="jl-head"><Icon name={meta.icon} size={20} /><b>{meta.title.replace(/^(Untitled|Document) - /, "")}</b></div>
      {tasks.length > 0 && (
        <>
          <div className="jl-sec">Tasks</div>
          {tasks.map((t, i) => (
            <div key={"t" + i} className="jl-item" onClick={t.onClick}>
              <Icon name={t.icon || "file"} size={16} />
              <span>{t.label}</span>
            </div>
          ))}
        </>
      )}
      {p.length > 0 && (
        <>
          <div className="jl-sec">Pinned</div>
          {p.map((id) => (
            <div key={"p" + id} className="jl-item" onClick={() => open(id)}>
              <Icon name="txt" size={16} />
              <span>{fs[id]?.name}</span>
              <button className="jl-pin on" title="Unpin from this list" onClick={(e) => { e.stopPropagation(); jumpPin(jl.app, id, false); }}>📌</button>
            </div>
          ))}
        </>
      )}
      <div className="jl-sec">Recent</div>
      {others.length === 0 && <div className="jl-empty">No recent items.</div>}
      {others.map((id) => (
        <div key={id} className="jl-item" onClick={() => open(id)}>
          <Icon name="txt" size={16} />
          <span>{fs[id]?.name}</span>
          <button className="jl-pin" title="Pin to this list" onClick={(e) => { e.stopPropagation(); jumpPin(jl.app, id, true); }}>📌</button>
        </div>
      ))}
      <div className="jl-foot">
        <div className="jl-item" onClick={() => { closeJumpList(); openApp(jl.app); }}><Icon name={meta.icon} size={16} /><span>Open {meta.title.replace(/^(Untitled|Document) - /, "")}</span></div>
        <div className="jl-item" onClick={() => {
          const st = getState();
          const pinned = st.settings.pinned;
          const has = pinned.includes(jl.app);
          setSettings({ pinned: has ? pinned.filter((x) => x !== jl.app) : [...pinned, jl.app] });
          closeJumpList();
        }}>
          <Icon name="favorites" size={16} />
          <span>{getState().settings.pinned.includes(jl.app) ? "Unpin this program from taskbar" : "Pin this program to taskbar"}</span>
        </div>
        {getState().windows.filter((w) => w.app === jl.app).length > 0 && (
          <div className="jl-item" onClick={() => { getState().windows.filter((w) => w.app === jl.app).forEach((w) => closeWin(w.id)); closeJumpList(); }}>
            <Icon name="error" size={16} /><span>Close all windows</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================== Flip 3D (Win+Tab) overlay */
export function Flip3D() {
  const flip = useStore((s) => s.flip);
  const windows = useStore((s) => s.windows);
  const focus = useStore((s) => s.focus);
  useEffect(() => {
    if (!flip) return;
    const up = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.key === "OS" || e.key === "Enter") {
        e.preventDefault();
        flipCommit();
      } else if (e.key === "Escape") flipCancel();
      else if (e.key === "Tab") {
        e.preventDefault();
        import("./store").then((m) => m.flipStart(e.shiftKey ? -1 : 1));
      }
    };
    window.addEventListener("keyup", up);
    window.addEventListener("keydown", up);
    return () => {
      window.removeEventListener("keyup", up);
      window.removeEventListener("keydown", up);
    };
  }, [flip]);
  if (!flip) return null;
  const wa = workArea(getState());
  const list = flip.ids.map((id) => windows.find((w) => w.id === id)).filter(Boolean) as Win[];
  return (
    <div className="flip3d" onClick={flipCommit} onContextMenu={(e) => { e.preventDefault(); flipCancel(); }}>
      <div className="flip3d-stage">
        {list.map((w, i) => {
          const off = i - (flip.idx % Math.max(1, list.length));
          const abs = Math.abs(off);
          return (
            <div
              key={w.id}
              className={"flip3d-card" + (off === 0 ? " front" : "")}
              style={{
                transform: `translate3d(${off * 120}px, ${off * -26}px, ${-abs * 180}px) rotateY(${-off * 6}deg) scale(${1 - abs * 0.02})`,
                zIndex: 100 - abs,
                opacity: abs > 4 ? 0 : 1,
              }}
              onPointerDown={(e) => { e.stopPropagation(); setState({ flip: { ...flip, idx: (flip.idx + off + list.length * 2) % list.length } }); }}
            >
              <div className="flip3d-title"><Icon name={appIcon(w.app)} size={16} />{w.title}</div>
              <div className="flip3d-body">{w.id === focus ? <Icon name={appIcon(w.app)} size={72} /> : <Icon name={appIcon(w.app)} size={72} />}</div>
            </div>
          );
        })}
      </div>
      <div className="flip3d-hint">Release the Windows key to open the selected window · Esc to cancel</div>
      {void wa}
    </div>
  );
}

/* =========================== Snap Assist: show desktop frame + snap preview */
export function SnapAssist() {
  const focus = useStore((s) => s.focus);
  const windows = useStore((s) => s.windows);
  const settings = useStore((s) => s.settings);
  const w = windows.find((q) => q.id === focus);
  const visible = !!w && !w.max && !w.min && !!w.snap && settings.snapAssist;
  const others = windows.filter((q) => !q.min && !q.closing && q.id !== focus && !APPS[q.app].noTask);
  if (!visible) return null;
  const wa = workArea(getState());
  const left = w!.snap === "l";
  const style: React.CSSProperties = left
    ? { left: wa.x + wa.w / 2, top: wa.y, width: wa.w / 2, height: wa.h }
    : { left: wa.x, top: wa.y, width: wa.w / 2, height: wa.h };
  void others;
  return (
    <div className="snap-assist" style={style} onClick={() => setState({ peek: null })}>
      <div className="sa-inner">
        <Icon name="appearance" size={28} />
        <b>Choose a window to snap here</b>
        <span>Click a taskbar button to fill the other half of the screen.</span>
      </div>
    </div>
  );
}

/* ======================================================= Aero Shake hook */
export function useShake() {
  const enabled = useStore((s) => s.settings.shake);
  useEffect(() => {
    if (!enabled) return;
    let lastX = 0, lastY = 0, lastT = 0, flips = 0, winId: string | null = null, cooldown = 0, prevDx = 0;
    const reset = () => { flips = 0; winId = null; prevDx = 0; };
    const mv = (e: PointerEvent) => {
      if (!(e.buttons & 1)) return reset();
      const el = (e.target as HTMLElement | null)?.closest?.(".win") as HTMLElement | null;
      if (!el) return reset();
      const id = el.getAttribute("data-win");
      if (!id) return reset();
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (now - lastT > 220) {
        reset();
        lastX = e.clientX;
        lastY = e.clientY;
        lastT = now;
        return;
      }
      // a "shake" is a rapid sequence of direction reversals with little vertical movement
      if (Math.abs(dx) > 14 && Math.abs(dy) < 12 && Math.sign(dx) !== Math.sign(prevDx)) {
        if (winId === id) flips++;
        else { flips = 1; winId = id; }
        prevDx = dx;
        if (flips >= 5 && now > cooldown) {
          cooldown = now + 1500;
          flips = 0;
          const st = getState();
          const others = st.windows.filter((q) => q.id !== id && !q.closing && !APPS[q.app].noTask);
          const hidden = others.filter((q) => q.min).length;
          const restore = hidden >= Math.max(1, others.filter((q) => !q.closing && !APPS[q.app].noTask).length);
          if (restore) {
            setState({ windows: st.windows.map((q) => (q.id === id ? q : others.some((o) => o.id === q.id) ? { ...q, min: false } : q)), desktopShown: false, hiddenIds: [] });
          } else if (others.length) {
            setState({ windows: st.windows.map((q) => (others.some((o) => o.id === q.id) ? { ...q, min: true } : q)) });
            notify({ title: "Aero Shake", text: "Other windows were minimized. Shake again to restore them.", icon: "info" });
          }
        }
      } else if (Math.abs(dx) > 14) prevDx = dx;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
    };
    window.addEventListener("pointermove", mv, { passive: true });
    return () => window.removeEventListener("pointermove", mv);
  }, [enabled]);
}

/* ============================================ desktop wallpaper shuffle */
const KEY = "win7.shuffle.next";
export function WallpaperShuffle() {
  const on = useStore((s) => s.settings.wpShuffle);
  const mins = useStore((s) => s.settings.wpInterval);
  const fs = useStore((s) => s.fs);
  useEffect(() => {
    if (!on) return;
    const pick = () => {
      const settings = getState().settings;
      const pics = Object.values(getState().fs).filter((n) => !n.trash && n.content?.startsWith("data:image"));
      const pool = [...WALLPAPERS.map((w) => w.key), ...pics.map((p) => "fs:" + p.id)];
      const cur = settings.wallpaper;
      const next = pool[(pool.indexOf(cur) + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length] || pool[0];
      setSettings({ wallpaper: next });
    };
    const iv = setInterval(() => {
      const now = Date.now();
      const last = Number(localStorage.getItem(KEY) || 0);
      if (last && now - last < mins * 60000) return;
      localStorage.setItem(KEY, String(now));
      pick();
    }, 5000);
    return () => clearInterval(iv);
  }, [on, mins, fs]);
  return null;
}

