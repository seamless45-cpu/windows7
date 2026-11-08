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
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <defs>
        <radialGradient id="gcf" cx=".4" cy=".3" r=".9"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#c8d4e4" /></radialGradient>
      </defs>
      <circle cx="65" cy="65" r="60" fill="url(#gcf)" stroke="#5b6b82" strokeWidth="4" />
      <circle cx="65" cy="65" r="56" fill="none" stroke="#fff" strokeWidth="1.500" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1="65" y1="12" x2="65" y2={i % 3 ? 18 : 22} stroke="#234" strokeWidth={i % 3 ? 2 : 3.500} transform={`rotate(${i * 30} 65 65)`} />)}
      <line x1="65" y1="65" x2="65" y2="34" stroke="#123" strokeWidth="5" strokeLinecap="round" transform={`rotate(${h * 30 + m / 2} 65 65)`} />
      <line x1="65" y1="65" x2="65" y2="20" stroke="#123" strokeWidth="3.500" strokeLinecap="round" transform={`rotate(${m * 6} 65 65)`} />
      <line x1="65" y1="75" x2="65" y2="16" stroke="#d22" strokeWidth="1.500" transform={`rotate(${s * 6} 65 65)`} />
      <circle cx="65" cy="65" r="4" fill="#d22" />
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
      <div className="g-cal-h">{d.toLocaleDateString(getState().settings.region, { month: "long", year: "numeric" })}</div>
      <div className="g-cal-g">
        {["S", "M", "T", "W", "T", "F", "S"].map((c, i) => <b key={i}>{c}</b>)}
        {cells.map((c, i) => <span key={i} className={c === d.getDate() ? "today" : ""}>{c}</span>)}
      </div>
    </div>
  );
}

function Dial({ v, label }: { v: number; label: string }) {
  const a = -120 + (v / 100) * 240;
  return (
    <svg width="60" height="64" viewBox="0 0 60 64">
      <path d="M10 48A26 26 0 1 1 50 48" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="6" strokeLinecap="round" />
      <path d="M10 48A26 26 0 1 1 50 48" fill="none" stroke="#7fe36a" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(v / 100) * 120} 200`} />
      <line x1="30" y1="34" x2="30" y2="14" stroke="#fff" strokeWidth="2.500" strokeLinecap="round" transform={`rotate(${a} 30 34)`} />
      <text x="30" y="60" textAnchor="middle" fontSize="10" fill="#fff">{label} {Math.round(v)}%</text>
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
  useEffect(shuffle, []); // eslint-disable-line react-hooks/exhaustive-deps
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
  }, []);
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
    const mv = (ev: PointerEvent) => {
      nx = ox + (ev.clientX - sx) / sc;
      ny = oy + (ev.clientY - sy) / sc;
      el.style.left = nx + "px";
      el.style.top = ny + "px";
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      setSettings({ gadgets: getState().settings.gadgets.map((q) => (q.id === g.id ? { ...q, x: nx, y: ny } : q)) });
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
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
