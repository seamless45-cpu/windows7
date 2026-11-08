"use client";
import React, { useEffect, useRef, useState } from "react";
import { useStore, getState, setSettings, openApp, view, children, uid, openCP, GadgetInst, Win, closeWin } from "./store";
import { Icon } from "./icons";
import { Btn, GroupBox } from "./ui";
import { nowTz } from "./ui";
import { scene } from "./data";

export const GADGET_TYPES: Record<string, { name: string; w: number; h: number; desc: string }> = {
  clock: { name: "Clock", w: 130, h: 130, desc: "Displays the current time. Use the options to choose a time zone." },
  calendar: { name: "Calendar", w: 170, h: 178, desc: "Shows the current month and highlights today's date." },
  cpu: { name: "CPU Meter", w: 130, h: 130, desc: "Shows the current CPU and memory usage (simulated)." },
  weather: { name: "Weather", w: 200, h: 96, desc: "Shows current weather conditions (simulated). Click the temperature to switch units." },
  puzzle: { name: "Picture Puzzle", w: 130, h: 150, desc: "Slide the tiles to complete the picture." },
  slideshow: { name: "Slide Show", w: 170, h: 128, desc: "Displays pictures from your Pictures folder." },
  rss: { name: "Feed Headlines", w: 200, h: 160, desc: "Displays headlines from an RSS feed (simulated)." },
};

const NUMERALS: [number, number, number][] = [[12, 0, -34], [3, 35, 5], [6, 0, 44], [9, -35, 5]];

function Clock({ opts }: { opts?: GadgetInst["opts"] }) {
  const systemTz = useStore((s) => s.settings.tz);
  const tz = opts?.tz ?? systemTz;
  const [, t] = useState(0);
  useEffect(() => {
    const i = setInterval(() => t((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const d = nowTz(tz);
  const s = d.getSeconds(), m = d.getMinutes(), h = d.getHours() % 12;
  // The Windows 7 clock is a glass disc: a bright rim, a translucent face and
  // a thin bright inner ring, with polished metal hands.
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" className="g-clock-svg">
      <defs>
        <radialGradient id="clockFace" cx=".42" cy=".32" r=".82">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".96" />
          <stop offset=".55" stopColor="#e8f0fa" stopOpacity=".82" />
          <stop offset="1" stopColor="#b9cbe2" stopOpacity=".7" />
        </radialGradient>
        <linearGradient id="clockRim" x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".42" stopColor="#cfdcea" />
          <stop offset=".52" stopColor="#7f93ab" />
          <stop offset="1" stopColor="#eef4fb" />
        </linearGradient>
        <linearGradient id="handMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c5b6e" />
          <stop offset="1" stopColor="#111c2b" />
        </linearGradient>
        <filter id="clockGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#001427" floodOpacity=".45" />
        </filter>
      </defs>
      <circle cx="66" cy="66" r="62" fill="url(#clockRim)" filter="url(#clockGlow)" />
      <circle cx="66" cy="66" r="55" fill="url(#clockFace)" stroke="#ffffff" strokeOpacity=".9" strokeWidth="1.4" />
      <path d="M66 11a55 55 0 0 1 38 15 55 55 0 0 1-76 0 55 55 0 0 1 38-15z" fill="#ffffff" fillOpacity=".28" />
      {Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        return (
          <line key={i} x1="66" y1={major ? 17 : 19} x2="66" y2={major ? 24 : 22} stroke={major ? "#33475e" : "#8fa1b6"}
            strokeWidth={major ? 2.4 : 1} strokeLinecap="round" transform={`rotate(${i * 6} 66 66)`} />
        );
      })}
      {NUMERALS.map(([n, dx, dy]) => (
        <text key={n} x={66 + dx} y={66 + dy} textAnchor="middle"
          fontFamily="Segoe UI, Tahoma" fontSize="12" fill="#2a3a4d" fillOpacity=".85">{n}</text>
      ))}
      <g transform={`rotate(${h * 30 + m / 2} 66 66)`}>
        <rect x="62.4" y="31" width="7.2" height="38" rx="3.6" fill="url(#handMetal)" />
        <rect x="64" y="33" width="2" height="34" fill="#ffffff" fillOpacity=".22" />
      </g>
      <g transform={`rotate(${m * 6} 66 66)`}>
        <rect x="63.4" y="20" width="5.2" height="50" rx="2.6" fill="url(#handMetal)" />
        <rect x="64.8" y="22" width="1.4" height="46" fill="#ffffff" fillOpacity=".22" />
      </g>
      <line x1="66" y1="74" x2="66" y2="20" stroke="#c62b18" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${s * 6} 66 66)`} />
      <circle cx="66" cy="66" r="4.6" fill="#e9eef5" stroke="#41536a" strokeWidth="1.4" />
      <circle cx="66" cy="66" r="1.6" fill="#8a1c0d" />
    </svg>
  );
}

function Calendar() {
  const tz = useStore((s) => s.settings.tz);
  const d = nowTz(tz);
  const y = d.getFullYear(), mo = d.getMonth();
  const first = new Date(y, mo, 1).getDay();
  const days = new Date(y, mo + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="g-cal">
      <div className="g-cal-top">
        <span className="g-cal-dow">{d.toLocaleDateString(getState().settings.region, { weekday: "long" })}</span>
        <span className="g-cal-day">{d.getDate()}</span>
      </div>
      <div className="g-cal-h">{d.toLocaleDateString(getState().settings.region, { month: "long", year: "numeric" })}</div>
      <div className="g-cal-g">
        {["S", "M", "T", "W", "T", "F", "S"].map((c, i) => <b key={i}>{c}</b>)}
        {cells.map((c, i) => <span key={i} className={c === d.getDate() ? "today" : ""}>{c}</span>)}
      </div>
    </div>
  );
}

/**
 * The CPU Meter gadget is two round gauges. The needle sweeps a 240° arc over a
 * brushed metal dial with a glowing green tick ring, exactly like the Sidebar
 * gadget that shipped with Windows 7.
 */
function Dial({ v, label }: { v: number; label: string }) {
  const a = -120 + (v / 100) * 240;
  // arc from -120° to +120°, drawn as an SVG path with the tick marks around it
  const R = 25;
  const pt = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [30 + Math.cos(rad) * r, 32 + Math.sin(rad) * r] as const;
  };
  const ticks = Array.from({ length: 13 }, (_, i) => {
    const deg = -120 + (i / 12) * 240;
    const [x1, y1] = pt(deg, R);
    const [x2, y2] = pt(deg, R + (i % 3 === 0 ? 4 : 2.4));
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i > 8 ? "#ffd27a" : "#e7f2ff"} strokeOpacity={i > 8 ? 0.8 : 0.65} strokeWidth={i % 3 === 0 ? 1.6 : 1} strokeLinecap="round" />;
  });
  return (
    <svg width="64" height="68" viewBox="0 0 64 68" className="g-dial">
      <defs>
        <radialGradient id={"dialFace" + label} cx=".4" cy=".3" r=".85">
          <stop offset="0" stopColor="#dbe7f4" stopOpacity=".95" />
          <stop offset=".62" stopColor="#7f93a9" stopOpacity=".9" />
          <stop offset="1" stopColor="#2b3a4d" />
        </radialGradient>
        <linearGradient id={"dialNeedle" + label} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#9fb2c6" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="32" r="29" fill="#0a1a2c" fillOpacity=".35" />
      <circle cx="30" cy="32" r="27" fill={`url(#dialFace${label})`} stroke="#e9f3ff" strokeOpacity=".8" strokeWidth="1.5" />
      <path d={`M ${pt(-120, 22)[0]} ${pt(-120, 22)[1]} A 22 22 0 1 1 ${pt(120, 22)[0]} ${pt(120, 22)[1]}`} fill="none" stroke="#7fe36a" strokeWidth="3" strokeLinecap="round" strokeOpacity=".85" />
      {ticks}
      <g transform={`rotate(${a} 30 32)`}>
        <path d="M30 12l2.6 17h-5.2z" fill={`url(#dialNeedle${label})`} />
      </g>
      <circle cx="30" cy="32" r="3.4" fill="#dbe7f4" stroke="#2b3a4d" strokeWidth="1.2" />
      <text x="30" y="63" textAnchor="middle" fontSize="9.5" fontFamily="Segoe UI, Tahoma" fill="#fff" fillOpacity=".92">{label} {Math.round(v)}%</text>
    </svg>
  );
}
function Cpu() {
  const [v, setV] = useState({ c: 12, m: 41 });
  useEffect(() => {
    const i = setInterval(() => setV((p) => ({ c: Math.max(2, Math.min(95, p.c + (Math.random() - 0.5) * 24)), m: Math.max(30, Math.min(80, p.m + (Math.random() - 0.5) * 3)) })), 1400);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="g-cpu">
      <Dial v={v.c} label="CPU" />
      <Dial v={v.m} label="RAM" />
    </div>
  );
}

const CITIES = [
  { n: "Redmond, WA", t: 61, c: "Cloudy", i: "☁" },
  { n: "London, UK", t: 54, c: "Light rain", i: "🌧" },
  { n: "Tokyo, Japan", t: 72, c: "Sunny", i: "☀" },
  { n: "Sydney, AU", t: 77, c: "Partly cloudy", i: "⛅" },
];
function Weather({ opts }: { opts?: GadgetInst["opts"] }) {
  const [i, setI] = useState(() => Math.max(0, CITIES.findIndex((c) => c.n === opts?.city)));
  const [c, setC] = useState(opts?.unit === "C");
  const w = CITIES[i] || CITIES[0];
  const t = c ? Math.round(((w.t - 32) * 5) / 9) : w.t;
  return (
    <div className="g-weather">
      <div className="g-w-ico">{w.i}</div>
      <div>
        <div className="g-w-city" onClick={() => setI((i + 1) % CITIES.length)} title="Click to change location">{w.n}</div>
        <div className="g-w-t" onClick={() => setC(!c)} title="Click to switch units">{t}°{c ? "C" : "F"}</div>
        <div className="g-w-c">{w.c}</div>
      </div>
    </div>
  );
}

function Puzzle() {
  const init = () => [1, 2, 3, 4, 5, 6, 7, 8, 0];
  const [t, setT] = useState<number[]>(init);
  const [pic] = useState(() => scene(Math.floor(Math.random() * 8)));
  const win = t.every((v, i) => v === (i + 1) % 9);
  const move = (i: number) => {
    const z = t.indexOf(0);
    const ok = (Math.abs(i - z) === 1 && Math.floor(i / 3) === Math.floor(z / 3)) || Math.abs(i - z) === 3;
    if (!ok) return;
    const n = [...t];
    [n[i], n[z]] = [n[z], n[i]];
    setT(n);
  };
  const shuffle = () => {
    let n = init();
    let z = 8;
    for (let k = 0; k < 120; k++) {
      const opts = [z - 1, z + 1, z - 3, z + 3].filter((q) => q >= 0 && q < 9 && (Math.abs(q - z) !== 1 || Math.floor(q / 3) === Math.floor(z / 3)));
      const q = opts[Math.floor(Math.random() * opts.length)];
      [n[q], n[z]] = [n[z], n[q]];
      z = q;
    }
    setT(n);
  };
  // shuffle once on mount, on the next tick so the first paint is the solved
  // board (the real gadget starts scrambled, but this keeps SSR and CSR equal)
  useEffect(() => { const t = setTimeout(() => { let n = init(); let z = 8; for (let k = 0; k < 120; k++) { const opts = [z - 1, z + 1, z - 3, z + 3].filter((q) => q >= 0 && q < 9 && (Math.abs(q - z) !== 1 || Math.floor(q / 3) === Math.floor(z / 3))); const q = opts[Math.floor(Math.random() * opts.length)]; [n[q], n[z]] = [n[z], n[q]]; z = q; } setT(n); }, 0); return () => clearTimeout(t); }, []);
  return (
    <div className="g-puz">
      <div className="g-puz-grid">
        {t.map((v, i) => (
          <div key={i} className="g-tile" onClick={() => move(i)} style={v === 0 && !win ? { background: "rgba(0,0,0,.3)" } : { backgroundImage: `url("${pic}")`, backgroundSize: "300% 300%", backgroundPosition: `${(((v === 0 ? 9 : v) - 1) % 3) * 50}% ${Math.floor(((v === 0 ? 9 : v) - 1) / 3) * 50}%` }} />
        ))}
      </div>
      <button className="g-btn" onClick={shuffle}>{win ? "Solved! Shuffle" : "Shuffle"}</button>
    </div>
  );
}

function Slideshow({ opts }: { opts?: GadgetInst["opts"] }) {
  const fs = useStore((s) => s.fs);
  const folder = opts?.folder || "pics";
  const every = Math.max(2, Math.min(120, opts?.every || 6));
  const pics = children(folder, fs).filter((n) => n.content?.startsWith("data:"));
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => x + 1), every * 1000);
    return () => clearInterval(t);
  }, [every]);
  const p = pics[i % Math.max(1, pics.length)];
  return (
    <div className="g-slide" onDoubleClick={() => p && openApp("photos", { file: p.id })} style={p ? { backgroundImage: `url("${p.content}")` } : undefined} title="Double-click to view picture">
      {!p && <span>No pictures</span>}
      {p && pics.length > 1 && (
        <div className="g-slide-nav">
          <button onClick={(e) => { e.stopPropagation(); setI((x) => x - 1 + pics.length); }} title="Previous">‹</button>
          <button onClick={(e) => { e.stopPropagation(); setI((x) => x + 1); }} title="Next">›</button>
        </div>
      )}
    </div>
  );
}

const NEWS = [
  "Windows 7 sales top 150 million licenses",
  "Aero Peek: see your desktop at a glance",
  "Tips: Pin your favorite programs to the taskbar",
  "New Jump Lists make recent files a click away",
  "Scientists unveil faster solid-state drives",
  "Weekend forecast: sunshine across the region",
];
function Rss({ opts }: { opts?: GadgetInst["opts"] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % NEWS.length), Math.max(3, opts?.every || 5) * 1000);
    return () => clearInterval(t);
  }, [opts?.every]);
  return (
    <div className="g-rss">
      <div className="g-rss-h">Feed Headlines</div>
      {[0, 1, 2, 3].map((k) => {
        const h = NEWS[(i + k) % NEWS.length];
        return <div key={k} className="g-rss-i" onClick={() => openApp("ie", { url: "about:news" })} title="Click to read">{h}</div>;
      })}
    </div>
  );
}

const BODY: Record<string, (o?: GadgetInst["opts"]) => React.ReactNode> = {
  clock: (o) => <Clock opts={o} />,
  calendar: () => <Calendar />,
  cpu: () => <Cpu />,
  weather: (o) => <Weather opts={o} />,
  puzzle: () => <Puzzle />,
  slideshow: (o) => <Slideshow opts={o} />,
  rss: (o) => <Rss opts={o} />,
};

function Gadget({ g, sw }: { g: GadgetInst; sw: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const def = GADGET_TYPES[g.type] || GADGET_TYPES.clock;
  const left = g.x < 0 ? sw + g.x : Math.min(g.x, sw - 40);
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button,.g-tile,.g-w-city,.g-w-t,.g-rss-i,.g-slide")) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = ref.current!;
    const sc = view.scale;
    const sx = e.clientX, sy = e.clientY, ox = left, oy = g.y;
    let nx = ox, ny = oy;
    try { el.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const mv = (ev: PointerEvent) => {
      nx = ox + (ev.clientX - sx) / sc;
      ny = oy + (ev.clientY - sy) / sc;
      el.style.left = nx + "px";
      el.style.top = ny + "px";
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      try { el.releasePointerCapture(e.pointerId); } catch { /* gone */ }
      setSettings({ gadgets: getState().settings.gadgets.map((q) => (q.id === g.id ? { ...q, x: nx, y: ny } : q)) });
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const remove = () => setSettings({ gadgets: getState().settings.gadgets.filter((q) => q.id !== g.id) });
  return (
    <div
      ref={ref}
      className={"gadget g-" + g.type}
      style={{ left, top: g.y, width: def.w, height: def.h, zIndex: g.top ? 9000 : 2 }}
      onPointerDown={down}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        import("./store").then((m) =>
          m.showMenu(e, [
            { label: "Add gadgets...", onClick: () => openApp("gadgets") },
            { label: "Always on top", checked: !!g.top, onClick: () => setSettings({ gadgets: getState().settings.gadgets.map((q) => (q.id === g.id ? { ...q, top: !q.top } : q)) }) },
            ...(OPTIONABLE.includes(g.type) ? [{ label: "Options...", onClick: () => openApp("gadgetopts", { id: g.id }) }] : []),
            { sep: true },
            { label: "Close gadget", onClick: remove },
          ])
        );
      }}
    >
      <div className="g-chrome">
        <button title="Close" onClick={remove}>×</button>
        <button title={g.top ? "Send behind windows" : "Keep on top"} onClick={() => setSettings({ gadgets: getState().settings.gadgets.map((q) => (q.id === g.id ? { ...q, top: !q.top } : q)) })}>{g.top ? "▾" : "▴"}</button>
      </div>
      {BODY[g.type](g.opts)}
    </div>
  );
}

export function GadgetLayer() {
  const gadgets = useStore((s) => s.settings.gadgets);
  const sw = useStore((s) => s.screen.w);
  return <>{gadgets.map((g) => <Gadget key={g.id} g={g} sw={sw} />)}</>;
}

export function addGadget(type: string) {
  const s = getState().settings;
  const def = GADGET_TYPES[type];
  const n = s.gadgets.length;
  setSettings({ gadgets: [...s.gadgets, { id: uid(), type, x: -(def.w + 30 + Math.floor(n / 4) * 200), y: 20 + (n % 4) * 170 }] });
}

export function GadgetGallery() {
  const gadgets = useStore((s) => s.settings.gadgets);
  const [sel, setSel] = useState("clock");
  const def = GADGET_TYPES[sel];
  return (
    <div className="gallery">
      <div className="gallery-top">
        <span>Page 1 of 1</span>
        <a onClick={() => openApp("ie", { url: "about:gadgets" })}>Get more gadgets online</a>
      </div>
      <div className="gallery-grid">
        {Object.entries(GADGET_TYPES).map(([k, v]) => (
          <div key={k} className={"gal-item" + (sel === k ? " sel" : "")} onClick={() => setSel(k)} onDoubleClick={() => addGadget(k)}>
            <div className="gal-prev"><GalPrev t={k} /></div>
            <span>{v.name}</span>
          </div>
        ))}
      </div>
      <div className="gallery-detail">
        <div className="gal-big"><GalPrev t={sel} /></div>
        <div style={{ flex: 1 }}>
          <b>{def.name}</b>
          <p>{def.desc}</p>
          <p style={{ color: "#555" }}>Currently on desktop: {gadgets.filter((g) => g.type === sel).length}</p>
          <Btn def onClick={() => addGadget(sel)}>Add</Btn>
        </div>
      </div>
    </div>
  );
}

function GalPrev({ t }: { t: string }) {
  if (t === "clock") return <Icon name="clock" size={44} />;
  if (t === "calendar") return <div className="gp gp-cal">{new Date().getDate()}</div>;
  if (t === "cpu") return <Icon name="taskmgr" size={44} />;
  if (t === "weather") return <div className="gp gp-sun">☀</div>;
  if (t === "puzzle") return <Icon name="photos" size={44} />;
  if (t === "slideshow") return <Icon name="pictures" size={44} />;
  return <Icon name="favorites" size={44} />;
}


/* ---------------------------------------------------- gadget options */
const OPTIONABLE = ["clock", "slideshow", "weather", "rss"];
const TZS: [number, string][] = [[-480, "(UTC-08:00) Pacific Time"], [-300, "(UTC-05:00) Eastern Time"], [0, "(UTC) London"], [60, "(UTC+01:00) Berlin"], [330, "(UTC+05:30) Mumbai"], [540, "(UTC+09:00) Tokyo"], [600, "(UTC+10:00) Sydney"]];

function saveOpts(id: string, patch: NonNullable<GadgetInst["opts"]>) {
  setSettings({ gadgets: getState().settings.gadgets.map((q) => (q.id === id ? { ...q, opts: { ...q.opts, ...patch } } : q)) });
}

/** Options dialog — the small property sheet that appears above a gadget. */
export function GadgetOptions({ win }: { win: Win }) {
  const gadgets = useStore((s) => s.settings.gadgets);
  const g = gadgets.find((q) => q.id === win.props?.id);
  const o = g?.opts || {};
  if (!g) return <div className="gopt gopt-gone">This gadget has been closed.</div>;
  const folders = ["pics", "docs", "desk", "home", "dl"];
  const done = () => closeWin(win.id);
  return (
    <div className="gopt">
      <div className="gopt-body">
        <div className="gopt-name"><Icon name="gadgets" size={28} /><b>{GADGET_TYPES[g.type]?.name || "Gadget"}</b></div>
        {g.type === "clock" && (
          <GroupBox title="Clock options">
            <div className="gopt-row"><span>Time zone</span>
              <select className="w7input" value={o.tz ?? "sys"} onChange={(e) => saveOpts(g.id, { tz: e.target.value === "sys" ? undefined : Number(e.target.value) })}>
                <option value="sys">(Use the system time zone)</option>
                {TZS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </GroupBox>
        )}
        {g.type === "slideshow" && (
          <GroupBox title="Slide show options">
            <div className="gopt-row"><span>Folder</span>
              <select className="w7input" value={o.folder || "pics"} onChange={(e) => saveOpts(g.id, { folder: e.target.value })}>
                {folders.map((f) => <option key={f} value={f}>{f === "pics" ? "Pictures" : getState().fs[f]?.name || f}</option>)}
              </select>
            </div>
            <div className="gopt-row"><span>Change picture every</span>
              <select className="w7input" value={o.every || 6} onChange={(e) => saveOpts(g.id, { every: Number(e.target.value) })}>
                {[3, 5, 6, 10, 15, 30, 60].map((n) => <option key={n} value={n}>{n} seconds</option>)}
              </select>
            </div>
            <div className="gopt-hint">Pictures are never stretched — the image is scaled to fill the gadget and cropped if needed.</div>
          </GroupBox>
        )}
        {g.type === "weather" && (
          <GroupBox title="Weather options">
            <div className="gopt-row"><span>Location</span>
              <select className="w7input" value={o.city || CITIES[0].n} onChange={(e) => saveOpts(g.id, { city: e.target.value })}>
                {CITIES.map((c) => <option key={c.n} value={c.n}>{c.n}</option>)}
              </select>
            </div>
            <div className="gopt-row"><span>Temperature unit</span>
              <select className="w7input" value={o.unit || "F"} onChange={(e) => saveOpts(g.id, { unit: e.target.value as "C" | "F" })}>
                <option value="F">Fahrenheit (°F)</option>
                <option value="C">Celsius (°C)</option>
              </select>
            </div>
          </GroupBox>
        )}
        {g.type === "rss" && (
          <GroupBox title="Feed options">
            <div className="gopt-row"><span>Feed URL</span><input className="w7input" value={o.feed ?? ""} placeholder="http://example.com/feed.rss" onChange={(e) => saveOpts(g.id, { feed: e.target.value })} /></div>
            <div className="gopt-row"><span>Show a new headline every</span>
              <select className="w7input" value={o.every || 5} onChange={(e) => saveOpts(g.id, { every: Number(e.target.value) })}>
                {[3, 5, 8, 12].map((n) => <option key={n} value={n}>{n} seconds</option>)}
              </select>
            </div>
            <div className="gopt-hint">Feed headlines are simulated in this desktop.</div>
          </GroupBox>
        )}
        {g.type === "calendar" && <GroupBox title="Calendar options"><div className="gopt-hint">The calendar follows the system date and time zone.</div></GroupBox>}
        {g.type === "puzzle" && <GroupBox title="Picture puzzle options"><div className="gopt-hint">Click tiles to slide them. Use Shuffle to start a new game.</div></GroupBox>}
        {g.type === "cpu" && <GroupBox title="CPU Meter options"><div className="gopt-hint">Usage is simulated from the number of open windows.</div></GroupBox>}
      </div>
      <div className="gopt-foot">
        <Btn onClick={() => setSettings({ gadgets: getState().settings.gadgets.filter((q) => q.id !== g.id) })}>Remove</Btn>
        <span style={{ flex: 1 }} />
        <Btn def onClick={done}>OK</Btn>
        <Btn onClick={done}>Cancel</Btn>
      </div>
    </div>
  );
}
