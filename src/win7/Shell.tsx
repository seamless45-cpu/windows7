"use client";
import React, { useEffect, useRef } from "react";
import {
  useStore, getState, setState, view, closeAllMenus, toggleStart, showDesktop, openApp, openPath, lock, closeWin, focusWin, maxWin, snapWin, minWin, hideMenu, openCP, setSettings, setWin, workArea, notify,
  flipStart, flipCommit, flipCancel, jumpTouch, closeJumpList, openJumpList, toggleFlyout,
  minimizeAll, restoreMinimized, activateTaskbarSlot, taskbarFocus,
} from "./store";
import { APPS } from "./registry";
import { IconDefs } from "./icons";
import { Desktop } from "./Desktop";
import { WindowLayer, showWindowSystemMenu } from "./Window";
import { Taskbar } from "./Taskbar";
import { StartMenu } from "./StartMenu";
import { ContextMenuHost } from "./ui";
import { PowerScreens, AltTab, Screensaver } from "./system";
import { JumpList, Flip3D, SnapAssist, useShake, WallpaperShuffle } from "./aero";
import { COLORS } from "./data";
import { FadeLayer, ThemeMix } from "./Transitions";
import { playClick, preload, unlockAudio } from "./sound";
import { CURSOR_CSS } from "./cursors";
import { installSoftKeyboardGuard } from "./softKeyboard";
import { usePwa } from "./pwa";

/**
 * Registers the service worker and listens for the browser's install prompt, so
 * the Start menu can offer "Install this PC".
 */
function PwaLifecycle() {
  usePwa();
  return null;
}

/**
 * Keeps programmatic focus (the Start menu's search box, dialogs, the logon
 * password field) from raising a phone's on-screen keyboard.
 */
function SoftKeyboardGuard() {
  useEffect(() => installSoftKeyboardGuard(), []);
  return null;
}

/** The real Aero pointer set, inlined once as a stylesheet (see cursors.ts). */
function CursorStyles() {
  useEffect(() => {
    const el = document.createElement("style");
    el.id = "w7-cursors";
    el.textContent = CURSOR_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  return null;
}

/**
 * PWA entry points. The manifest's shortcuts point at `?app=notepad` and
 * friends, so an installed copy can launch straight into a program the way a
 * pinned Windows 7 Jump List item does. Runs once, after the desktop appears.
 */
function useDeepLink() {
  const power = useStore((s) => s.power);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || power !== "desktop") return;
    done.current = true;
    const app = new URLSearchParams(window.location.search).get("app");
    if (!app) return;
    if (!APPS[app]) return;
    // Drop the parameter so a refresh restarts on the desktop, not in the app.
    const url = new URL(window.location.href);
    url.searchParams.delete("app");
    url.searchParams.delete("source");
    window.history.replaceState(null, "", url.toString());
    window.setTimeout(() => openApp(app), 260);
  }, [power]);
}

export default function Shell() {
  useDeepLink();
  const settings = useStore((s) => s.settings);
  const power = useStore((s) => s.power);
  const mag = useStore((s) => s.mag);
  const screen = useStore((s) => s.screen);
  const windows = useStore((s) => s.windows);
  const ref = useRef<HTMLDivElement>(null);
  const magRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  useShake();

  const rw = settings.resolution === "native" ? 0 : parseInt(settings.resolution.split("x")[0], 10);
  const resZoom = rw ? 1280 / rw : 1;

  /* ---------------- last-resort error surface ---------------- */
  useEffect(() => {
    // React error boundaries only catch render errors. Asynchronous failures
    // (timers, audio, canvas) used to leave the desktop half-drawn with no
    // way to recover, so they are reported through the notification area.
    const onError = (e: ErrorEvent) => {
      const msg = e.error?.message || e.message || "Unknown error";
      notify({ title: "Windows", text: `An unexpected error occurred: ${msg}`, icon: "warn" });
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  /* ---------------- audio ---------------- */
  useEffect(() => {
    // Sound only plays after a gesture, so the scheme is decoded once and then
    // unlocked on the first click/keypress (Windows' "System Sounds" scheme).
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    preload();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  /* ---------------- size & scale ---------------- */
  useEffect(() => {
    const fit = () => {
      const auto = window.innerWidth < 900 ? window.innerWidth / 900 : 1;
      const sc = resZoom * (settings.dpi / 100) * auto;
      view.scale = sc;
      setState({ screen: { w: Math.round(window.innerWidth / sc), h: Math.round(window.innerHeight / sc) } });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [resZoom, settings.dpi]);

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    let metaDown = false;
    let metaCombo = false;
    const kd = (e: KeyboardEvent) => {
      const st = getState();
      if (st.flip) return;
      if (st.screensaverOn) return;
      if (st.power !== "desktop") return;
      if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") playClick();
      if (e.key === "Meta" || e.key === "OS") {
        metaDown = true;
        metaCombo = false;
        return;
      }
      const k = e.key.toLowerCase();
      const combo = e.metaKey || (e.ctrlKey && e.altKey);
      if (combo) {
        metaCombo = true;
        let handled = true;
        const fw = st.windows.find((w) => w.id === st.focus);
        if (/^[0-9]$/.test(k)) {
          const slot = k === "0" ? 9 : Number(k) - 1;
          activateTaskbarSlot(slot, e.altKey ? "jump" : e.shiftKey ? "new" : e.ctrlKey ? "cycle" : "activate");
        }
        else if (k === "d") showDesktop();
        else if (k === "e") openPath("computer");
        else if (k === "r") openApp("run");
        else if (k === "l") lock();
        else if (k === "m") e.shiftKey ? restoreMinimized() : minimizeAll();
        else if (k === "u") openCP("ease");
        else if (k === "b") taskbarFocus(-1);
        else if (k === " " && st.settings.taskbar.peek) setState({ peek: "all", startOpen: false, flyout: null });
        else if (k === "w" && e.ctrlKey && e.altKey) { if (fw) closeWin(fw.id); }
        else if (k === "f" ) openApp("explorer", { path: "search" });
        else if (k === "pause") openCP("system");
        else if (k === "arrowleft" && fw) snapWin(fw.id, "l");
        else if (k === "arrowright" && fw) snapWin(fw.id, "r");
        else if (k === "arrowup" && fw && !fw.max) maxWin(fw.id);
        else if (k === "arrowdown" && fw) (fw.max || fw.snap ? maxWin(fw.id) : minWin(fw.id));
        else if (k === "tab" && !(e.ctrlKey && e.altKey)) { flipStart(e.shiftKey ? -1 : 1); }
        else if (k === "home") { shakeDesktop(); }
        else if (k === "t") taskbarFocus(st.taskbarIdx === null ? 0 : st.taskbarIdx + (e.shiftKey ? -1 : 1));
        else if (k === "p") { openApp("mobility"); }
        else if (k === "x") { openApp("mobility"); }
        else if (k === "+" || k === "=" ) { setState({ mag: { on: true, level: Math.min(8, st.mag.level + 0.5) } }); openApp("magnifier"); }
        else if (k === "-") setState({ mag: { ...st.mag, level: Math.max(1, st.mag.level - 0.5) } });
        else if (k === "tab" && e.ctrlKey && e.altKey) altTab(e);
        else handled = false;
        if (handled) e.preventDefault();
        return;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "Escape") {
        e.preventDefault();
        openApp("taskmgr");
        return;
      }
      if (e.ctrlKey && !e.shiftKey && e.key === "Escape") {
        e.preventDefault();
        toggleStart();
        return;
      }
      if (e.altKey && e.key === " ") {
        e.preventDefault();
        const w = st.windows.find((q) => q.id === st.focus);
        if (w) showWindowSystemMenu(w.id);
        return;
      }
      if (e.altKey && e.key === "Escape") {
        e.preventDefault();
        const ids = st.windows.filter((w) => !APPS[w.app].noTask && !w.closing).sort((a, b) => a.z - b.z).map((w) => w.id);
        const at = ids.indexOf(st.focus || "");
        if (ids.length) focusWin(ids[(at + 1) % ids.length]);
        return;
      }
      if (e.altKey && e.key === "Tab") {
        e.preventDefault();
        altTab(e);
        return;
      }
      if (e.altKey && e.key === "F4") {
        e.preventDefault();
        const w = st.windows.find((q) => q.id === st.focus);
        if (w) closeWin(w.id);
        return;
      }
      if (e.key === "Escape") {
        if (st.flip) { flipCancel(); return; }
        if (st.jumplist) return closeJumpList();
        if (st.menu) return hideMenu();
        if (st.startOpen || st.flyout) return closeAllMenus();
        const w = st.windows.find((q) => q.id === st.focus);
        if (w && (APPS[w.app].noTask && w.app !== "filedlg" ? true : w.app === "filedlg")) closeWin(w.id, true);
        return;
      }
      if (e.key === "F11") {
        e.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.().catch(() => {});
        return;
      }
      if (e.key === "Meta") return;
    };
    const shakeDesktop = () => {
      const st = getState();
      const vis = st.windows.filter((w) => !w.min && !w.closing && !APPS[w.app].noTask);
      if (!vis.length) return;
      if (st.desktopShown) {
        setState({ windows: st.windows.map((w) => (st.hiddenIds.includes(w.id) ? { ...w, min: false } : w)), desktopShown: false, hiddenIds: [], peek: null });
      } else {
        setState({ windows: st.windows.map((w) => (vis.some((v) => v.id === w.id) ? { ...w, min: true } : w)), desktopShown: true, hiddenIds: vis.map((w) => w.id), peek: null, focus: null });
      }
    };
    const altTab = (e: KeyboardEvent) => {
      const st = getState();
      const ids = st.windows.filter((w) => !APPS[w.app].noTask && !w.closing).sort((a, b) => b.z - a.z).map((w) => w.id);
      if (ids.length < 1) return;
      if (!st.altTab) setState({ altTab: { ids, idx: ids.length > 1 ? (e.shiftKey ? ids.length - 1 : 1) : 0 }, startOpen: false, flyout: null });
      else {
        const n = st.altTab.ids.length;
        setState({ altTab: { ...st.altTab, idx: (st.altTab.idx + (e.shiftKey ? -1 : 1) + n) % n } });
      }
    };
    const ku = (e: KeyboardEvent) => {
      if ((e.key === "Meta" || e.key === "OS") && metaDown) {
        if (!metaCombo && getState().power === "desktop") toggleStart();
        if (getState().peek === "all") setState({ peek: null });
        metaDown = false;
      }
      if (e.key === " " && getState().peek === "all") setState({ peek: null });
      if ((e.key === "Alt" || e.key === "Control") && getState().altTab) {
        const a = getState().altTab!;
        setState({ altTab: null });
        const id = a.ids[a.idx % a.ids.length];
        if (id) focusWin(id);
      }
    };
    const blur = () => {
      if (getState().altTab) setState({ altTab: null });
      metaDown = false;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
    };
  }, []);

  /* ---------------- touch: long-press & double-tap ---------------- */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let sx = 0, sy = 0;
    let last = { t: 0, x: 0, y: 0 };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      sx = e.clientX;
      sy = e.clientY;
      const target = e.target as HTMLElement;
      timer = setTimeout(() => {
        timer = null;
        target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: sx, clientY: sy, button: 2 }));
      }, 600);
    };
    const move = (e: PointerEvent) => {
      if (timer && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 10) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
        const now = Date.now();
        if (now - last.t < 380 && Math.abs(e.clientX - last.x) < 30 && Math.abs(e.clientY - last.y) < 30) {
          (e.target as HTMLElement).dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY }));
          last = { t: 0, x: 0, y: 0 };
        } else last = { t: now, x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  /* ---------------- screensaver idle ---------------- */
  useEffect(() => {
    let last = Date.now();
    const bump = () => {
      last = Date.now();
    };
    const ev = ["pointermove", "pointerdown", "keydown", "wheel"];
    ev.forEach((n) => window.addEventListener(n, bump, { passive: true }));
    const iv = setInterval(() => {
      const st = getState();
      if (st.power === "desktop" && st.settings.power.sleep > 0 && Date.now() - last > st.settings.power.sleep * 60000) { setState({ power: "sleep" }); last = Date.now(); return; }
      if (st.power !== "desktop" || st.screensaverOn || st.settings.screensaver === "none") return;
      if (Date.now() - last > st.settings.ssWait * 60000) setState({ screensaverOn: true });
    }, 5000);
    return () => {
      ev.forEach((n) => window.removeEventListener(n, bump));
      clearInterval(iv);
    };
  }, []);

  /* ---------------- pointer trails + magnifier follow ---------------- */
  useEffect(() => {
    const dots = trailRef.current ? Array.from(trailRef.current.children) as HTMLElement[] : [];
    const hist: { x: number; y: number }[] = [];
    let raf = 0;
    const mv = (e: PointerEvent) => {
      if (magRef.current && getState().mag.on) {
        magRef.current.style.transformOrigin = `${e.clientX / view.scale}px ${e.clientY / view.scale}px`;
      }
      if (!getState().settings.trails) return;
      hist.unshift({ x: e.clientX / view.scale, y: e.clientY / view.scale });
      hist.length = Math.min(hist.length, 14);
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        dots.forEach((d, i) => {
          const p = hist[(i + 1) * 2 - 1];
          if (p) { d.style.transform = `translate(${p.x}px,${p.y}px)`; d.style.opacity = String(0.5 - i * 0.07); }
        });
      });
    };
    window.addEventListener("pointermove", mv, { passive: true });
    return () => window.removeEventListener("pointermove", mv);
  }, []);

  const rgb = (COLORS.find((c) => c.key === settings.colorKey) || COLORS[0]).rgb;
  const alpha = settings.transparency && settings.theme === "aero" ? 0.22 + (settings.intensity / 100) * 0.62 : 1;
  const style = {
    "--gc": rgb.join(","),
    "--ga": alpha,
    "--gi": settings.intensity / 100,
    width: screen.w,
    height: screen.h,
    transform: view.scale !== 1 ? `scale(${view.scale})` : undefined,
    transformOrigin: "0 0",
  } as React.CSSProperties;

  const closeOnDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest(".ctx-host,.start-menu,.flyout,.orb,.tray-ico,.tray-clock,.mb-item,.thumbs,.balloon,.jumplist")) return;
    const st = getState();
    if (st.menu || st.startOpen || st.flyout) closeAllMenus();
    if (st.jumplist) closeJumpList();
  };

  // click-sound / blur
  void jumpTouch; void toggleFlyout; void flipCommit; void openJumpList;
  void setSettings; void setWin; void workArea;
  void windows;

  return (
    <div
      ref={ref}
      className={`w7 theme-${settings.theme}${settings.transparency && settings.theme === "aero" ? " glass" : " noglass"}${settings.highContrastText ? " bigtext" : ""} ptr-${settings.pointer} tbpos-${settings.taskbar.pos}${settings.aero.animations ? " motion" : " nomotion"}${settings.clearType ? "" : " nocleartype"}`}
      style={style}
      onPointerDownCapture={closeOnDown}
      onContextMenu={(e) => {
        if (!(e.target as HTMLElement).closest("input,textarea,[contenteditable=true]")) e.preventDefault();
      }}
    >
      <IconDefs />
      <CursorStyles />
      <SoftKeyboardGuard />
      <PwaLifecycle />
      <div ref={magRef} className="mag-wrap" style={mag.on ? { transform: `scale(${mag.level})` } : undefined}>
        <Desktop />
        <WindowLayer />
        <Taskbar />
        <StartMenu />
      </div>
      <ContextMenuHost />
      <JumpList />
      <SnapAssist />
      <Flip3D />
      <AltTab />
      <div ref={trailRef} className="trails">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</div>
      <Screensaver />
      <ThemeMix />
      <WallpaperShuffle />
      <PowerScreens />
      <FadeLayer />
    </div>
  );
}
