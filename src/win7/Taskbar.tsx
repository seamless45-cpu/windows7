"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useStore, getState, setState, setSettings, openApp, focusWin, minWin, closeWin, toggleStart, toggleFlyout, showMenu, showDesktop, tbThick, workArea, view, setWin, openCP, openPath,
  notify, lsGet, Win, MenuItem, lock, openJumpList, taskbarActivate,
} from "./store";
import { APPS } from "./registry";
import { Icon, appIcon } from "./icons";
import { useNow, fmtTime, fmtShortDate, fmtLongDate, nowTz, Slider } from "./ui";
import { playSys } from "./sound";

const ICON_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * The Start orb. The artwork is the real Windows 7 Start button; the glow and
 * the hover/open highlights are layered in CSS so the button still lights up
 * like the original.
 */
export function StartOrb({ size = 54 }: { size?: number }) {
  const px = size >= 48 ? 96 : size >= 40 ? 54 : 32;
  return (
    <span className="orb-img" style={{ width: size, height: size }}>
      <img src={`${ICON_BASE}/icons/start-orb-${px}.png`} alt="Start" width={size} height={size} draggable={false} />
    </span>
  );
}

function Thumb({ win }: { win: Win }) {
  const ref = useRef<HTMLDivElement>(null);
  const wa = workArea(getState());
  const w = win.max ? wa.w : win.w;
  const h = win.max ? wa.h : win.h;
  const k = Math.min(190 / w, 112 / h);
  useEffect(() => {
    const src = document.querySelector(`[data-win="${win.id}"]`) as HTMLElement | null;
    const host = ref.current;
    if (!src || !host) return;
    const clone = src.cloneNode(true) as HTMLElement;
    const sc = src.querySelectorAll("canvas");
    const cc = clone.querySelectorAll("canvas");
    sc.forEach((c, i) => {
      const t = cc[i] as HTMLCanvasElement | undefined;
      if (!t) return;
      t.width = c.width;
      t.height = c.height;
      try { t.getContext("2d")?.drawImage(c, 0, 0); } catch {}
    });
    const st = src.querySelectorAll("textarea");
    clone.querySelectorAll("textarea").forEach((t, i) => { t.textContent = (st[i] as HTMLTextAreaElement)?.value || ""; });
    clone.querySelectorAll("iframe,video,audio,[contenteditable]").forEach((e) => { if (e.tagName === "DIV" || e.tagName === "SPAN") e.removeAttribute("contenteditable"); else e.remove(); });
    clone.querySelectorAll("input").forEach((i) => i.removeAttribute("name"));
    clone.classList.remove("min", "closing", "peek-hide", "peek-show", "inactive");
    clone.classList.add("active", "thumb-clone");
    clone.removeAttribute("data-win");
    Object.assign(clone.style, { left: "0px", top: "0px", width: w + "px", height: h + "px", transform: `scale(${k})`, transformOrigin: "0 0", opacity: "1", visibility: "visible", pointerEvents: "none", zIndex: "0", position: "absolute", animation: "none" });
    host.innerHTML = "";
    host.appendChild(clone);
  }, [win.id, win.x, win.w, win.h, win.max, win.min, k, w, h]);
  return <div ref={ref} className="thumb-host" style={{ width: Math.round(w * k), height: Math.round(h * k) }} />;
}

interface Group { key: string; app: string; wins: Win[]; pinned: boolean }

export function Taskbar() {
  const settings = useStore((s) => s.settings);
  const windows = useStore((s) => s.windows);
  const focus = useStore((s) => s.focus);
  const startOpen = useStore((s) => s.startOpen);
  const flyout = useStore((s) => s.flyout);
  const menu = useStore((s) => s.menu);
  const notifs = useStore((s) => s.notifications);
  const tb = settings.taskbar;
  const taskbarIdx = useStore((s) => s.taskbarIdx);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (taskbarIdx !== null) barRef.current?.focus(); }, [taskbarIdx]);
  const th = tbThick(settings);
  const vertical = tb.pos === "left" || tb.pos === "right";
  const [hover, setHover] = useState<{ key: string; rect: DOMRect } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const hoverT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const now = useNow(1000);
  const online = settings.defaults.net !== "off";

  const groups: Group[] = useMemo(() => {
    const gk = (app: string) => APPS[app]?.group || app;
    const run = windows.filter((w) => !APPS[w.app].noTask);
    const out: Group[] = [];
    // Pinned entries are validated in the store, but the list can also be
    // edited by an older build or by hand — never let a stale id break the bar.
    settings.pinned.filter((p) => !!APPS[p]).forEach((p) => out.push({ key: gk(p), app: p, wins: [], pinned: true }));
    run.forEach((w) => {
      const k = gk(w.app);
      let g = out.find((x) => x.key === k);
      if (!g) {
        g = { key: k, app: w.app, wins: [], pinned: false };
        out.push(g);
      }
      g.wins.push(w);
    });
    if (tb.combine === "never") {
      const res: Group[] = [];
      out.forEach((g) => {
        if (!g.wins.length) res.push(g);
        else g.wins.forEach((w) => res.push({ key: g.key + ":" + w.id, app: w.app, wins: [w], pinned: g.pinned }));
      });
      return res;
    }
    return out;
  }, [windows, settings.pinned, tb.combine]);

  const clearHover = () => {
    if (hoverT.current) clearTimeout(hoverT.current);
    if (peekT.current) clearTimeout(peekT.current);
    hoverT.current = setTimeout(() => {
      setHover(null);
      setState({ peek: getState().peek === "all" ? "all" : null });
    }, 220);
  };
  const keepHover = () => {
    if (hoverT.current) clearTimeout(hoverT.current);
  };

  const activate = (g: Group) => {
    if (!g.wins.length) return openApp(g.app);
    const sorted = [...g.wins].sort((a, b) => b.z - a.z);
    const top = sorted[0];
    if (g.wins.length === 1) {
      if (focus === top.id && !top.min) minWin(top.id);
      else focusWin(top.id);
    } else {
      const active = sorted.find((w) => w.id === focus && !w.min);
      if (active) focusWin(sorted[sorted.length - 1].id);
      else focusWin(top.id);
    }
    setHover(null);
    setState({ peek: null });
  };

  const jump = (e: React.MouseEvent, g: Group) => {
    e.preventDefault();
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // every taskbar button and pinned program offers a Windows 7 jump list
    openJumpList(g.app, { x: r.left / view.scale, y: r.bottom / view.scale });
  };

  /* Shift+click opens a pinned program; middle click opens a new window */
  const trackKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const st = getState();
    const keys: string[] = [];
    st.windows.filter((w) => !APPS[w.app].noTask && !w.closing).forEach((w) => {
      const k = APPS[w.app].group || w.app;
      if (!keys.includes(k)) keys.push(k);
    });
    const groups = keys.length;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      const i = st.taskbarIdx === null ? (d > 0 ? 0 : groups - 1) : (st.taskbarIdx + d + groups + 1) % (groups + 1);
      setState({ taskbarIdx: i });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      taskbarActivate(0);
    } else if (e.key === "Escape") {
      setState({ taskbarIdx: null });
    } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      const i = st.taskbarIdx ?? 0;
      const el = document.querySelectorAll(".tb-btn")[i] as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        const app = el.getAttribute("data-app") || "";
        if (app) openJumpList(app, { x: r.left / view.scale, y: r.bottom / view.scale });
      }
    }
  };

  const barMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const arrange = (mode: "cascade" | "stack" | "side") => {
      const wa = workArea(getState());
      const vis = getState().windows.filter((w) => !w.min && !APPS[w.app].noTask && !APPS[w.app].fixed);
      vis.forEach((w, i) => {
        if (mode === "cascade") setWin(w.id, { max: false, snap: null, x: wa.x + 20 + i * 30, y: wa.y + 20 + i * 30, w: Math.min(720, wa.w - 80), h: Math.min(480, wa.h - 60) });
        else if (mode === "stack") setWin(w.id, { max: false, snap: null, x: wa.x, y: wa.y + (wa.h / vis.length) * i, w: wa.w, h: wa.h / vis.length });
        else setWin(w.id, { max: false, snap: null, x: wa.x + (wa.w / vis.length) * i, y: wa.y, w: wa.w / vis.length, h: wa.h });
      });
    };
    showMenu(e, [
      { label: "Toolbars", sub: [{ label: "Address", disabled: true }, { label: "Links", disabled: true }, { label: "Desktop", disabled: true }] },
      { sep: true },
      { label: "Cascade windows", onClick: () => arrange("cascade") },
      { label: "Show windows stacked", onClick: () => arrange("stack") },
      { label: "Show windows side by side", onClick: () => arrange("side") },
      { label: "Show the desktop", onClick: showDesktop },
      { sep: true },
      { label: "Start Task Manager", onClick: () => openApp("taskmgr") },
      { sep: true },
      { label: "Lock the taskbar", checked: tb.lock, onClick: () => setSettings({ taskbar: { ...tb, lock: !tb.lock } }) },
      { label: "Properties", onClick: () => openCP("taskbar") },
    ]);
  };

  // drag taskbar to edge when unlocked
  const barDown = (e: React.PointerEvent) => {
    if (tb.lock || e.button !== 0 || (e.target as HTMLElement).closest(".tb-btn,.tb-tray,.orb,.tb-show")) return;
    const mv = (ev: PointerEvent) => {
      const { w, h } = getState().screen;
      const x = ev.clientX / view.scale, y = ev.clientY / view.scale;
      const d = { left: x, right: w - x, top: y, bottom: h - y };
      const pos = (Object.entries(d).sort((a, b) => a[1] - b[1])[0][0]) as "left" | "right" | "top" | "bottom";
      if (pos !== getState().settings.taskbar.pos) setSettings({ taskbar: { ...getState().settings.taskbar, pos } });
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const autoHidden = tb.autohide && !revealed && !startOpen && !flyout && !menu;
  const unread = notifs.length;

  const popupStyle = (): React.CSSProperties => {
    if (!hover) return {};
    const r = hover.rect;
    const sc = view.scale;
    if (vertical) return { top: Math.max(4, r.top / sc - 30), [tb.pos === "left" ? "left" : "right"]: th + 6 };
    const cx = (r.left + r.width / 2) / sc;
    return { left: cx, transform: "translateX(-50%)", [tb.pos === "top" ? "top" : "bottom"]: th + 6 };
  };
  const hgroup = hover ? groups.find((g) => g.key === hover.key) : null;

  return (
    <>
      <div
        ref={barRef}
        tabIndex={taskbarIdx !== null ? 0 : -1}
        className={`taskbar tb-${tb.pos}${tb.small ? " small" : ""}${autoHidden ? " autohidden" : ""}`}
        style={{ [vertical ? "width" : "height"]: th }}
        onContextMenu={barMenu}
        onPointerDown={barDown}
        onKeyDown={(e) => {
          if (e.key === "Escape") setState({ taskbarIdx: null });
          else if (["ArrowLeft", "ArrowRight", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            const keys: string[] = [];
            getState().windows.filter((w) => !APPS[w.app].noTask && !w.closing).forEach((w) => {
              const k = APPS[w.app].group || w.app;
              if (!keys.includes(k)) keys.push(k);
            });
            if (e.key === "Enter" || e.key === " ") taskbarActivate(0);
            else {
              const d = e.key === "ArrowRight" ? 1 : -1;
              const i = taskbarIdx === null ? 0 : (taskbarIdx + d + keys.length + 1) % (keys.length + 1);
              setState({ taskbarIdx: i });
            }
          }
        }}
        onPointerEnter={() => tb.autohide && setRevealed(true)}
        onPointerLeave={() => setRevealed(false)}
      >
        <div className={"orb" + (startOpen ? " on" : "")} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); toggleStart(); }} title="Start">
          <StartOrb size={tb.small ? 42 : 54} />
        </div>
        <div className="tb-items">
          {groups.map((g, groupIdx) => {
            const active = g.wins.some((w) => w.id === focus && !w.min);
            const prog = g.wins.find((w) => typeof w.progress === "number")?.progress;
            const sep = tb.combine === "never" && g.wins.length === 1;
            return (
              <div
                key={g.key}
                data-app={g.app}
                data-tbkey={g.key}
                className={"tb-btn" + (g.wins.length ? " run" : "") + (g.wins.length > 1 ? " multi" : "") + (active ? " active" : "") + (sep ? " labeled" : "") + (taskbarIdx === groupIdx ? " kb" : "")}
                onClick={(e) => (e.shiftKey ? openApp(g.app) : activate(g))}
                onKeyDown={trackKey}
                onAuxClick={(e) => e.button === 1 && openApp(g.app)}
                onContextMenu={(e) => jump(e, g)}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", e.clientX - r.left + "px");
                }}
                onMouseEnter={(e) => {
                  keepHover();
                  const el = e.currentTarget;
                  if (showT.current) clearTimeout(showT.current);
                  if (g.wins.length) showT.current = setTimeout(() => setHover({ key: g.key, rect: el.getBoundingClientRect() }), hover ? 0 : 380);
                  else setHover(null);
                }}
                onMouseLeave={() => {
                  if (showT.current) clearTimeout(showT.current);
                  clearHover();
                }}
              >
                <Icon name={appIcon(g.app)} size={tb.small ? 20 : 32} />
                {sep && <span className="tb-label">{g.wins[0].title}</span>}
                {typeof prog === "number" && <div className="tb-prog"><div style={{ width: prog * 100 + "%" }} /></div>}
              </div>
            );
          })}
        </div>
        <div className="tb-tray" onPointerDown={(e) => e.stopPropagation()}>
          <div className="tray-ico" title="Show hidden icons" onClick={() => toggleFlyout("overflow")}><Icon name="chevron" size={14} /></div>
          <div className="tray-ico" title={`Action Center${unread ? " — " + unread + " message(s)" : ""}`} onClick={() => toggleFlyout("action")}>
            <Icon name="flagAC" size={16} />
            {unread > 0 && <i className="tray-badge" />}
          </div>
          <div className="tray-ico" title={online ? "Network 2\nInternet access" : "Not connected — no connections available"} onClick={() => toggleFlyout("network")}><Icon name={online ? "netOn" : "netOff"} size={16} /></div>
          <div className="tray-ico" title={settings.muted ? "Speakers: Muted" : `Speakers: ${settings.volume}%`} onClick={() => toggleFlyout("volume")}><Icon name={settings.muted || settings.volume === 0 ? "speakerMute" : "speaker"} size={16} /></div>
          <div className="tray-ico" title="100% available (plugged in, charging)" onClick={() => toggleFlyout("battery")}><Icon name="battery" size={16} /></div>
          <div className="tray-clock" onClick={() => toggleFlyout("clock")} title={fmtLongDate(now, settings)}>
            <div>{fmtTime(now, settings)}</div>
            {!vertical && <div>{fmtShortDate(now, settings)}</div>}
          </div>
        </div>
        <div
          className="tb-show"
          title="Show desktop"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => { showDesktop(); }}
          onMouseEnter={() => {
            if (!tb.peek) return;
            if (peekT.current) clearTimeout(peekT.current);
            peekT.current = setTimeout(() => setState({ peek: "all" }), 400);
          }}
          onMouseLeave={() => {
            if (peekT.current) clearTimeout(peekT.current);
            if (getState().peek === "all") setState({ peek: null });
          }}
        />
      </div>

      {hover && hgroup && hgroup.wins.length > 0 && (
        <div className={"thumbs tb-" + tb.pos} style={popupStyle()} onMouseEnter={keepHover} onMouseLeave={clearHover}>
          {[...hgroup.wins].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map((w) => (
            <div
              key={w.id}
              className={"thumb" + (w.id === focus ? " active" : "")}
              onMouseEnter={() => {
                if (peekT.current) clearTimeout(peekT.current);
                if (tb.peek) peekT.current = setTimeout(() => setState({ peek: w.id }), 350);
              }}
              onMouseLeave={() => {
                if (peekT.current) clearTimeout(peekT.current);
                if (getState().peek !== "all") setState({ peek: null });
              }}
              onClick={() => { focusWin(w.id); setHover(null); setState({ peek: null }); }}
              onAuxClick={(e) => e.button === 1 && closeWin(w.id)}
            >
              <div className="thumb-title">
                <Icon name={appIcon(w.app)} size={16} />
                <span>{w.title}</span>
                <button className="thumb-x" onClick={(e) => { e.stopPropagation(); closeWin(w.id); setHover(null); setState({ peek: null }); }}>✕</button>
              </div>
              <div className="thumb-body"><Thumb win={w} /></div>
            </div>
          ))}
        </div>
      )}
      <Flyouts />
      <Balloon />
    </>
  );
}

/* ------------------------------------------------------------- flyouts */
function flyStyle(pos: string, th: number): React.CSSProperties {
  switch (pos) {
    case "top": return { top: th + 4, right: 8 };
    case "left": return { left: th + 4, bottom: 6 };
    case "right": return { right: th + 4, bottom: 6 };
    default: return { bottom: th + 4, right: 8 };
  }
}

function CalendarPane() {
  const s = useStore((st) => st.settings);
  const now = useNow(1000);
  const [off, setOff] = useState(0);
  const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
  const first = d.getDay();
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const prevDays = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
  const cells: { n: number; cur: boolean }[] = [];
  for (let i = 0; i < first; i++) cells.push({ n: prevDays - first + 1 + i, cur: false });
  for (let i = 1; i <= days; i++) cells.push({ n: i, cur: true });
  while (cells.length < 42) cells.push({ n: cells.length - first - days + 1, cur: false });
  const wk = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  return (
    <div className="cal">
      <div className="cal-head">
        <button onClick={() => setOff(off - 1)}>◀</button>
        <span onClick={() => setOff(0)}>{d.toLocaleDateString(s.region, { month: "long", year: "numeric" })}</span>
        <button onClick={() => setOff(off + 1)}>▶</button>
      </div>
      <div className="cal-grid">
        {wk.map((w) => <b key={w}>{w}</b>)}
        {cells.map((c, i) => (
          <span key={i} className={(c.cur ? "" : "dim ") + (c.cur && off === 0 && c.n === now.getDate() ? "today" : "")}>{c.n}</span>
        ))}
      </div>
    </div>
  );
}

function AnalogClock({ size = 130 }: { size?: number }) {
  const tz = useStore((s) => s.settings.tz);
  const [, t] = useState(0);
  useEffect(() => {
    const i = setInterval(() => t((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const d = nowTz(tz);
  const s = d.getSeconds(), m = d.getMinutes(), h = d.getHours() % 12;
  return (
    <svg width={size} height={size} viewBox="0 0 130 130">
      <circle cx="65" cy="65" r="60" fill="#f4f7fb" stroke="#6b7b92" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1="65" y1="12" x2="65" y2={i % 3 ? 17 : 21} stroke="#234" strokeWidth={i % 3 ? 2 : 3} transform={`rotate(${i * 30} 65 65)`} />)}
      <line x1="65" y1="65" x2="65" y2="34" stroke="#123" strokeWidth="5" strokeLinecap="round" transform={`rotate(${h * 30 + m / 2} 65 65)`} />
      <line x1="65" y1="65" x2="65" y2="20" stroke="#123" strokeWidth="3" strokeLinecap="round" transform={`rotate(${m * 6} 65 65)`} />
      <line x1="65" y1="72" x2="65" y2="16" stroke="#c22" strokeWidth="1.500" transform={`rotate(${s * 6} 65 65)`} />
    </svg>
  );
}

function Flyouts() {
  const flyout = useStore((s) => s.flyout);
  const s = useStore((st) => st.settings);
  const notifs = useStore((st) => st.notifications);
  const now = useNow(1000);
  const th = tbThick(s);
  const online = s.defaults.net !== "off";
  if (!flyout) return null;
  const st = flyStyle(s.taskbar.pos, th);
  const close = () => setState({ flyout: null });
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  if (flyout === "clock")
    return (
      <div className="flyout clock-fly" style={st} onPointerDown={stop}>
        <div className="cf-left">
          <div className="cf-time">{fmtTime(now, s, true)}</div>
          <div className="cf-date">{fmtLongDate(now, s)}</div>
          <CalendarPane />
          <a className="cf-link" onClick={() => { close(); openApp("calendar"); }}>Open Calendar</a>
          <a className="cf-link" onClick={() => { close(); openCP("datetime"); }}>Change date and time settings...</a>
        </div>
        <div className="cf-right"><AnalogClock size={150} /></div>
      </div>
    );
  if (flyout === "volume")
    return (
      <div className="flyout vol-fly" style={st} onPointerDown={stop}>
        <div className="vol-label">Speakers</div>
        <div className="vol-slider"><Slider value={s.muted ? 0 : s.volume} onChange={(v) => { setSettings({ volume: v, muted: false }); }} style={{ writingMode: "vertical-lr", direction: "rtl", height: 110 } as React.CSSProperties} /></div>
        <div className="vol-val">{s.muted ? "Muted" : s.volume}</div>
        <button className="vol-mute" onClick={() => { setSettings({ muted: !s.muted }); playSys(s.muted ? "restore" : "minimize"); }} title={s.muted ? "Unmute" : "Mute"}><Icon name={s.muted ? "speakerMute" : "speaker"} size={20} /></button>
        <a className="cf-link" onClick={() => { close(); playSys("ding"); }}>Test</a>
        <a className="cf-link" onClick={() => { close(); openCP("sound"); }}>Mixer</a>
      </div>
    );
  if (flyout === "network")
    return (
      <div className="flyout net-fly" style={st} onPointerDown={stop}>
        <div className="nf-head">Currently connected to:</div>
        <div className="nf-cur"><Icon name={online ? "netOn" : "netOff"} size={32} /><div><b>{online ? "Network 2" : "No connection"}</b><br />{online ? "Internet access" : "No networks available"}</div></div>
        <div className="nf-sec">Dial-up and VPN</div>
        <div className="nf-row"><Icon name="network" size={20} />Broadband Connection</div>
        <div className="nf-sec">Wireless Network Connection</div>
        {["Home Network", "Coffee Shop WiFi", "Guest"].map((n, i) => (
          <div key={n} className={"nf-row" + (i === 0 && online ? " connected" : "")} onClick={() => { setSettings({ defaults: { ...s.defaults, net: "on" } }); notify({ title: "Network", text: `Connected to ${n}.`, icon: "info" }); close(); }}>
            <Icon name="netOn" size={20} />{n}{i === 0 && online ? " — Connected" : ""}
          </div>
        ))}
        <div className="nf-foot">
          <a onClick={() => { setSettings({ defaults: { ...s.defaults, net: online ? "off" : "on" } }); close(); notify({ title: "Network", text: online ? "Network connection disabled." : "Connected to Network 2. Internet access.", icon: online ? "warn" : "info" }); }}>{online ? "Disable network" : "Enable network"}</a>
          <a onClick={() => { close(); openCP("network"); }}>Open Network and Sharing Center</a>
        </div>
      </div>
    );
  if (flyout === "battery")
    return (
      <div className="flyout bat-fly" style={st} onPointerDown={stop}>
        <div style={{ padding: "6px 10px" }}><b>100% available (plugged in, charging)</b></div>
        <div className="nf-sec">Select a power plan</div>
        {[["balanced", "Balanced"], ["saver", "Power saver"], ["high", "High performance"]].map(([k, l]) => (
          <div key={k} className="nf-row" onClick={() => setSettings({ power: { ...s.power, plan: k } })}><span style={{ width: 14 }}>{s.power.plan === k ? "●" : ""}</span>{l}</div>
        ))}
        <div className="nf-foot"><a onClick={() => { close(); openCP("power"); }}>More power options</a></div>
      </div>
    );
  if (flyout === "overflow")
    return (
      <div className="flyout ovf-fly" style={{ ...st, right: 130 }} onPointerDown={stop}>
        <div className="ovf-grid">
          <div className="tray-ico" title="Safely Remove Hardware and Eject Media" onClick={() => { close(); playSys("hardware-remove"); notify({ title: "Safe to Remove Hardware", text: "The device 'Generic USB Drive' can now be safely removed.", icon: "info" }); }}><Icon name="usb" size={18} /></div>
          <div className="tray-ico" title="Windows Update" onClick={() => { close(); openCP("wupdate"); }}><Icon name="update" size={18} /></div>
          <div className="tray-ico" title="Windows Defender" onClick={() => { close(); openCP("actioncenter"); }}><Icon name="security" size={18} /></div>
        </div>
        <div className="nf-foot"><a onClick={() => { close(); openCP("taskbar"); }}>Customize...</a></div>
      </div>
    );
  // action center
  return (
    <div className="flyout ac-fly" style={st} onPointerDown={stop}>
      <div className="ac-head">{notifs.length ? `${notifs.length} message${notifs.length > 1 ? "s" : ""}` : "No new messages"}</div>
      <div className="ac-list">
        {notifs.slice(0, 6).map((n) => (
          <div key={n.id} className="ac-item"><Icon name={n.icon === "error" ? "error" : n.icon === "warn" ? "warn" : "info"} size={20} /><div><b>{n.title}</b><br />{n.text}</div></div>
        ))}
        {!notifs.length && <div style={{ padding: 10, color: "#666" }}>No new notifications. Your computer is running smoothly.</div>}
      </div>
      <div className="nf-foot">
        <a onClick={() => { close(); openCP("actioncenter"); }}>Open Action Center</a>
        <a onClick={() => setState({ notifications: [] })}>Clear messages</a>
        <a onClick={() => { close(); lock(); }}>Lock computer</a>
      </div>
    </div>
  );
}

function Balloon() {
  const b = useStore((s) => s.balloon);
  const s = useStore((st) => st.settings);
  if (!b) return null;
  return (
    <div className="balloon" style={flyStyle(s.taskbar.pos, tbThick(s))} onClick={() => setState({ balloon: null })}>
      <div className="balloon-h"><Icon name={b.icon === "error" ? "error" : b.icon === "warn" ? "warn" : "info"} size={16} /><b>{b.title}</b><span>✕</span></div>
      <div>{b.text}</div>
    </div>
  );
}
