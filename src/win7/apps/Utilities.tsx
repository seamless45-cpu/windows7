"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Win, useStore, getState, setWin, setState, setSettings, closeWin, openApp, openCP, msgBox, notify, promptBox, mkfile, writeFile, lsGet, lsSet,
  MenuItem, children, uid, fmtDate, pathOf,
} from "../store";
import { MenuBar, Btn, GroupBox, Check, Slider, useNow, GlassBar } from "../ui";
import { Icon, nodeIcon } from "../icons";
import { playSys } from "../sound";

/* ====================================================== Windows Journal */
interface Stroke { pts: [number, number][]; color: string; w: number }
interface JPage { strokes: Stroke[] }

export function Journal({ win }: { win: Win }) {
  const [pages, setPages] = useState<JPage[]>(() => lsGet<JPage[]>("win7.journal", [{ strokes: [] }]));
  const [pi, setPi] = useState(0);
  const [color, setColor] = useState("#1a3a8c");
  const [w, setW] = useState(3);
  const [tool, setTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [dirty, setDirty] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const [cur, setCur] = useState<Stroke | null>(null);
  const page = pages[pi] || { strokes: [] };

  const save = () => {
    lsSet("win7.journal", pages);
    setDirty(false);
    notify({ title: "Windows Journal", text: "Your notes were saved.", icon: "info" });
  };
  const saveToFile = () => {
    const txt = pages.map((p, i) => `--- Page ${i + 1} (${p.strokes.length} strokes) ---`).join("\n");
    const id = mkfile("docs", "Notes.jnt", txt);
    writeFile(id, txt);
    notify({ title: "Windows Journal", text: "Notes.jnt was saved in your Documents folder.", icon: "info" });
  };

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    const sc = state_scale();
    return [(e.clientX - r.left) / sc, (e.clientY - r.top) / sc];
  };
  const state_scale = () => {
    const el = document.querySelector(".w7") as HTMLElement | null;
    const m = el?.style.transform.match(/scale\(([\d.]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  };

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    if (tool === "eraser") {
      const [x, y] = pos(e);
      setPages((ps) => ps.map((p, i) => (i !== pi ? p : { strokes: p.strokes.filter((s) => !s.pts.some(([px, py]) => Math.hypot(px - x, py - y) < 12)) })));
      setDirty(true);
      return;
    }
    setCur({ pts: [pos(e)], color: tool === "highlighter" ? "#ffd00088" : color, w: tool === "highlighter" ? 16 : w });
  };
  const move = (e: React.PointerEvent) => {
    if (!cur) return;
    const p = pos(e);
    setCur({ ...cur, pts: [...cur.pts, p] });
  };
  const up = () => {
    if (!cur) return;
    const s = cur;
    setCur(null);
    setPages((ps) => ps.map((p, i) => (i === pi ? { strokes: [...p.strokes, s] } : p)));
    setDirty(true);
  };

  const menus = [
    {
      label: "File",
      items: (): MenuItem[] => [
        { label: "New note", shortcut: "Ctrl+N", onClick: () => { setPages([{ strokes: [] }]); setPi(0); setDirty(false); } },
        { label: "Save", shortcut: "Ctrl+S", onClick: save },
        { label: "Save As…", onClick: saveToFile },
        { label: "Print", onClick: () => msgBox({ title: "Print", text: "No printer is installed. Install a printer using Devices and Printers in Control Panel.", icon: "warn" }) },
        { sep: true },
        { label: "Exit", onClick: () => closeWin(win.id) },
      ],
    },
    {
      label: "Insert",
      items: (): MenuItem[] => [{ label: "New page", onClick: () => { setPages([...pages, { strokes: [] }]); setPi(pages.length); } }],
    },
    {
      label: "View",
      items: (): MenuItem[] => [
        { label: "Pen", checked: tool === "pen", radio: true, onClick: () => setTool("pen") },
        { label: "Highlighter", checked: tool === "highlighter", radio: true, onClick: () => setTool("highlighter") },
        { label: "Eraser", checked: tool === "eraser", radio: true, onClick: () => setTool("eraser") },
      ],
    },
    { label: "Help", items: (): MenuItem[] => [{ label: "About Windows Journal", onClick: () => msgBox({ title: "About Windows Journal", text: "Windows Journal\nMicrosoft Windows 7\nVersion 6.1 (Build 7601)", icon: "info" }) }] },
  ];

  const lines = Array.from({ length: 30 }, (_, i) => 56 + i * 28);

  return (
    <div className="journal">
      <MenuBar menus={menus} />
      <div className="jr-bar">
        <div className="jr-tools">
          {([["pen", "✒"], ["highlighter", "🖍"], ["eraser", "🧽"]] as const).map(([t, g]) => (
            <button key={t} className={"jr-tool" + (tool === t ? " on" : "")} title={t} onClick={() => setTool(t)}>{g}</button>
          ))}
          <span className="sep" />
          {["#1a3a8c", "#c8102e", "#111", "#2a9a3a"].map((c) => (
            <button key={c} className={"jr-color" + (color === c && tool === "pen" ? " on" : "")} style={{ background: c }} onClick={() => { setColor(c); setTool("pen"); }} />
          ))}
          <span className="sep" />
          <input type="range" className="w7range" min={1} max={10} value={w} onChange={(e) => setW(+e.target.value)} style={{ width: 90 }} />
          <span className="sep" />
          <button className="jr-tool" title="Previous page" disabled={pi === 0} onClick={() => setPi(pi - 1)}>◀</button>
          <span className="jr-pg">Page {pi + 1} of {pages.length}</span>
          <button className="jr-tool" title="Next page" onClick={() => (pi + 1 < pages.length ? setPi(pi + 1) : (setPages([...pages, { strokes: [] }]), setPi(pages.length)))}>▶</button>
          <button className="jr-tool" title="New page" onClick={() => { setPages([...pages, { strokes: [] }]); setPi(pages.length); }}>＋</button>
          <span className="sep" />
          <button className="g-btn" onClick={() => { const p = [...pages]; p[pi] = { strokes: [] }; setPages(p); setDirty(true); }}>Clear page</button>
          <button className="g-btn" onClick={save}>{dirty ? "Save*" : "Saved"}</button>
        </div>
      </div>
      <div className="jr-page-wrap">
        <svg ref={svg} className="jr-page" viewBox="0 0 740 620" width="740" height="620" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}>
          <rect width="740" height="620" fill="#fff" />
          <rect x="34" y="14" width="2" height="592" fill="#e88" />
          {lines.map((y) => <line key={y} x1="40" y1={y} x2="730" y2={y} stroke="#cfd8ea" strokeWidth="1" />)}
          {page.strokes.map((s, i) => (
            <polyline key={i} points={s.pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {cur && <polyline points={cur.pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={cur.color} strokeWidth={cur.w} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </div>
      <div className="g-note">Draw with the pen, mark with the highlighter or rub out strokes with the eraser. Notes are saved to this browser with File &gt; Save.</div>
    </div>
  );
}

/* ========================================================== XPS Viewer */
export function XpsViewer({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const [doc, setDoc] = useState<string | null>(win.props.file || null);
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const docs = useMemo(() => Object.values(fs).filter((n) => n.type === "file" && /\.(xps|oxps)$/i.test(n.name) && !n.trash), [fs]);
  const body = doc && fs[doc] ? fs[doc].content || "" : "";
  const menus = [
    {
      label: "File",
      items: (): MenuItem[] => [
        { label: "Open…", onClick: () => openApp("explorer", { path: "docs" }) },
        { label: "Save a Copy…", onClick: () => msgBox({ title: "Save a Copy", text: "A copy of the document was saved in your Documents folder.", icon: "info" }) },
        { label: "Print", onClick: () => msgBox({ title: "Print", text: "No printer is installed.", icon: "warn" }) },
        { sep: true },
        { label: "Exit", onClick: () => closeWin(win.id) },
      ],
    },
    {
      label: "View",
      items: (): MenuItem[] => [
        { label: "Zoom in", shortcut: "Ctrl++", onClick: () => setZoom((z) => Math.min(200, z + 25)) },
        { label: "Zoom out", shortcut: "Ctrl+-", onClick: () => setZoom((z) => Math.max(50, z - 25)) },
        { label: "Actual size", onClick: () => setZoom(100) },
      ],
    },
    { label: "Help", items: (): MenuItem[] => [{ label: "About XPS Viewer", onClick: () => msgBox({ title: "About XPS Viewer", text: "XPS Viewer\nMicrosoft Windows 7\nVersion 6.1 (Build 7601)", icon: "info" }) }] },
  ];
  return (
    <div className="xps">
      <MenuBar menus={menus} />
      <div className="xps-bar">
        <Icon name="xps" size={20} />
        <select className="w7input" value={doc || ""} onChange={(e) => setDoc(e.target.value || null)}>
          <option value="">— Select an XPS document —</option>
          {docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <span className="sep" />
        <button className="g-btn" onClick={() => setZoom((z) => Math.max(50, z - 25))}>−</button>
        <span className="xps-z">{zoom}%</span>
        <button className="g-btn" onClick={() => setZoom((z) => Math.min(200, z + 25))}>+</button>
        <span className="sep" />
        <button className="g-btn" onClick={() => setPage((p) => Math.max(1, p - 1))}>◀</button>
        <span className="xps-z">Page {page}</span>
        <button className="g-btn" onClick={() => setPage((p) => p + 1)}>▶</button>
      </div>
      <div className="xps-doc">
        <div className="xps-paper" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
          {body ? (
            body.trim().startsWith("<") ? <div dangerouslySetInnerHTML={{ __html: body }} /> : <pre className="xps-pre">{body}</pre>
          ) : (
            <div className="xps-empty">
              <Icon name="xps" size={64} />
              <b>No document open</b>
              <p>XPS is an electronic paper format that preserves the layout of a document. Choose a document above to view it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== Sticky Notes 2 (multi-note manager) */
export interface Note { id: string; text: string; color: string; x: number; y: number; w: number; h: number }
const NOTE_COLORS = ["#fff7a8", "#ffd6a8", "#ffb8d0", "#b8e8ff", "#c8ffb8", "#e0c8ff"];

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(() => lsGet<Note[]>("win7.notes", []));
  const save = (n: Note[]) => {
    setNotes(n);
    lsSet("win7.notes", n);
  };
  return { notes, save };
}

export function StickyNotes2() {
  const { notes, save } = useNotes();
  const add = (color = NOTE_COLORS[0]) => {
    const n: Note = {
      id: uid(),
      text: "",
      color,
      x: 120 + (notes.length % 5) * 26,
      y: 120 + (notes.length % 5) * 26,
      w: 220,
      h: 190,
    };
    save([...notes, n]);
  };
  const edit = (id: string, patch: Partial<Note>) => save(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const del = (id: string) => save(notes.filter((n) => n.id !== id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        add();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="sn">
      <div className="sn-bar">
        <button className="g-btn" onClick={() => add()}>＋ New note</button>
        {NOTE_COLORS.map((c) => <button key={c} className="jr-color" style={{ background: c }} title="New note in this color" onClick={() => add(c)} />)}
        <div style={{ flex: 1 }} />
        <span className="g-note">{notes.length} note{notes.length === 1 ? "" : "s"} saved in this browser</span>
      </div>
      <div className="sn-list">
        {notes.length === 0 && (
          <div className="sn-empty">
            <Icon name="sticky2" size={56} />
            <b>No notes yet</b>
            <p>Create a note to jot down reminders. Sticky Notes stay on your desktop until you delete them.</p>
            <Btn def onClick={() => add()}>New note</Btn>
          </div>
        )}
        {notes.map((n) => (
          <div key={n.id} className="sn-note" style={{ background: n.color }}>
            <div className="sn-h">
              <button title="Delete note" onClick={() => del(n.id)}>✕</button>
              <div className="sn-pal">
                {NOTE_COLORS.map((c) => <i key={c} style={{ background: c }} onClick={() => edit(n.id, { color: c })} />)}
              </div>
            </div>
            <textarea value={n.text} placeholder="Type your note…" onChange={(e) => edit(n.id, { text: e.target.value })} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================== Speech Recognition */
const SPEECH_CMDS: [string, string][] = [
  ["open notepad", "Opens Notepad"],
  ["open calculator", "Opens Calculator"],
  ["open internet explorer", "Opens Internet Explorer"],
  ["open control panel", "Opens Control Panel"],
  ["open documents", "Opens your Documents folder"],
  ["show desktop", "Minimizes all windows"],
  ["start menu", "Opens the Start menu"],
  ["take a screenshot", "Opens the Snipping Tool"],
  ["what time is it", "Reads the current time"],
  ["play music", "Opens Windows Media Player"],
  ["shut down", "Shuts down the computer"],
  ["close window", "Closes the active window"],
];

export function SpeechRecognition(_: { win: Win }) {
  const [state, setState] = useState<"off" | "ready" | "listen">("off");
  const [heard, setHeard] = useState<{ text: string; ok: boolean; at: number }[]>([]);
  const [typed, setTyped] = useState("");
  const [lang, setLang] = useState(() => lsGet("win7.speech.lang", "en-US"));
  const [confidence, setConfidence] = useState(0);
  const rec = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const supported = typeof window !== "undefined" && !!((window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown }).webkitSpeechRecognition || (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition);

  const runCommand = (raw: string) => {
    const t = raw.toLowerCase().trim();
    let ok = true;
    if (t.includes("open notepad") || t === "notepad") openApp("notepad");
    else if (t.includes("calculator")) openApp("calc");
    else if (t.includes("internet explorer") || t.includes("browser")) openApp("ie");
    else if (t.includes("control panel")) openCP();
    else if (t.includes("documents")) openApp("explorer", { path: "docs" });
    else if (t.includes("pictures")) openApp("explorer", { path: "pics" });
    else if (t.includes("wordpad")) openApp("wordpad");
    else if (t.includes("paint")) openApp("paint");
    else if (t.includes("command prompt")) openApp("cmd");
    else if (t.includes("task manager")) openApp("taskmgr");
    else if (t.includes("screenshot") || t.includes("snip")) openApp("snip");
    else if (t.includes("play music")) openApp("wmp");
    else if (t.includes("start menu")) toggleStartCmd();
    else if (t.includes("show desktop")) showDesktopCmd();
    else if (t.includes("time")) {
      const d = new Date();
      say(`It is ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`);
    } else if (t.includes("shut down") || t.includes("shutdown")) {
      import("../store").then((m) => m.shutdown());
    } else if (t.includes("close")) {
      const id = getState().focus;
      if (id) import("../store").then((m) => m.closeWin(id));
    } else ok = false;
    setHeard((h) => [{ text: raw, ok, at: Date.now() }, ...h].slice(0, 20));
    if (ok) playSys("ding");
    else playSys("error");
  };
  const showDesktopCmd = () => import("../store").then((m) => m.showDesktop());
  const toggleStartCmd = () => import("../store").then((m) => m.toggleStart());
  const say = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(u);
    } catch {
      msgBox({ title: "Speech Recognition", text, icon: "info" });
    }
  };

  const start = () => {
    setState2Listen();
    if (!supported) return;
    try {
      const C = (window as unknown as { webkitSpeechRecognition: new () => unknown; SpeechRecognition: new () => unknown }).webkitSpeechRecognition || (window as unknown as { SpeechRecognition: new () => unknown }).SpeechRecognition;
      const r = new C() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      r.continuous = true;
      r.interimResults = true;
      r.lang = lang;
      r.onresult = (ev: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const res = ev.results[ev.results.length - 1];
        setConfidence(Math.round((res[0].confidence || 0.9) * 100));
        if (res.isFinal) runCommand(res[0].transcript);
      };
      r.onerror = () => setState2Ready();
      r.onend = () => setState2Ready();
      r.start();
      rec.current = r;
    } catch {
      setState2Ready();
    }
  };
  const setState2Listen = () => setState("listen");
  const setState2Ready = () => setState("ready");
  const stop = () => {
    try {
      rec.current?.stop();
    } catch {}
    rec.current = null;
    setState2Ready();
  };
  useEffect(() => () => { try { rec.current?.stop(); } catch {} }, []);

  return (
    <div className="speech">
      <div className="sp-head">
        <Icon name="speech" size={48} />
        <div>
          <h3>Set up Speech Recognition</h3>
          <p className="g-note">Control your computer with your voice. Say commands like “open notepad”, “show desktop” or “what time is it”.</p>
        </div>
      </div>
      <GroupBox title="Microphone">
        <div className="sp-row">
          <span className={"sp-led " + state} />
          <b>{state === "listen" ? "Listening…" : state === "ready" ? "Ready" : "Off"}</b>
          <div style={{ flex: 1 }} />
          {state === "listen" ? <Btn onClick={stop}>Stop listening</Btn> : <Btn def onClick={start}>Start listening</Btn>}
        </div>
        <p>Language: <select className="w7input" value={lang} onChange={(e) => { setLang(e.target.value); lsSet("win7.speech.lang", e.target.value); }}><option value="en-US">English (United States)</option><option value="en-GB">English (United Kingdom)</option><option value="es-ES">Spanish (Spain)</option><option value="fr-FR">French (France)</option></select></p>
        {confidence > 0 && <p className="g-note">Recognition confidence: {confidence}%</p>}
        {!supported && state !== "off" && (
          <p className="sp-warn">
            This browser does not provide a microphone speech engine, so Speech Recognition is running in <b>type-a-command</b> mode. Type a command below and press Enter — every supported command behaves exactly as if it had been spoken.
          </p>
        )}
      </GroupBox>
      {!supported && (
        <div className="sp-type">
          <input
            className="w7input"
            placeholder="Type a command, e.g. open calculator"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && typed.trim()) {
                runCommand(typed);
                setTyped("");
              }
            }}
          />
          <Btn onClick={() => { if (typed.trim()) { runCommand(typed); setTyped(""); } }}>Go</Btn>
        </div>
      )}
      <div className="sp-cmds">
        <div className="cp-sec">Commands you can say</div>
        <table className="cp-t wide"><tbody>{SPEECH_CMDS.map(([c, d]) => <tr key={c} onClick={() => runCommand(c)} className="sp-cmd"><td><b>{c}</b></td><td>{d}</td></tr>)}</tbody></table>
      </div>
      {heard.length > 0 && (
        <>
          <div className="cp-sec">History</div>
          <div className="sp-hist">{heard.map((h, i) => <div key={i} className={h.ok ? "" : "bad"}><b>{new Date(h.at).toLocaleTimeString()}</b> — “{h.text}” {h.ok ? "✓" : "— not recognized"}</div>)}</div>
        </>
      )}
    </div>
  );
}

/* ================================================ Windows Mobility Center */
export function Mobility() {
  const s = useStore((st) => st.settings);
  const [bright, setBright] = useState(() => lsGet("win7.bright", 80));
  const [vol, setVol] = useState(s.volume);
  const [batt, setBatt] = useState(92);
  const [sync, setSync] = useState(() => lsGet("win7.sync", true));
  const [present, setPresent] = useState(false);
  const online = s.defaults.net !== "off";
  useEffect(() => {
    const i = setInterval(() => setBatt((b) => Math.max(5, Math.min(100, b + (Math.random() > 0.6 ? 1 : -1)))), 8000);
    return () => clearInterval(i);
  }, []);
  const tile = (title: string, icon: string, body: React.ReactNode, foot?: React.ReactNode) => (
    <div className="mb-tile">
      <div className="mb-t"><Icon name={icon} size={22} /><b>{title}</b></div>
      <div className="mb-b">{body}</div>
      {foot && <div className="mb-f">{foot}</div>}
    </div>
  );
  return (
    <div className="mobility">
      <div className="mb-grid">
        {tile("Brightness", "display", <Slider value={bright} onChange={(v) => { setBright(v); lsSet("win7.bright", v); }} />, <span>{bright}%</span>)}
        {tile("Volume", "sound", <div className="mb-row"><button className="g-btn" onClick={() => setSettings({ muted: !s.muted })}>{s.muted ? "Unmute" : "Mute"}</button><Slider value={s.muted ? 0 : vol} onChange={(v) => { setVol(v); setSettings({ volume: v, muted: false }); }} /></div>, <span>{s.muted ? "Muted" : vol}</span>)}
        {tile("Battery Status", "battery", <div className="mb-batt"><div className="mb-batt-fill" style={{ width: batt + "%" }} /></div>, <span>{batt}% available (plugged in, charging)</span>)}
        {tile("Wireless Network", "netOn", <div className="mb-net"><b>{online ? "Network 2" : "Offline"}</b><span>{online ? "Connected — Internet access" : "No connection"}</span></div>, <button className="g-btn" onClick={() => setSettings({ defaults: { ...s.defaults, net: online ? "off" : "on" } })}>{online ? "Turn off" : "Turn on"}</button>)}
        {tile("Display Orientation", "photos", <div className="mb-rot"><button className="g-btn" onClick={() => notify({ title: "Display", text: "The display was rotated to Landscape.", icon: "info" })}>Rotate</button><span>Landscape</span></div>)}
        {tile("Sync Center", "update", <div className="mb-net"><b>{sync ? "Sync in progress" : "Not syncing"}</b><span>Offline files</span></div>, <button className="g-btn" onClick={() => { setSync(!sync); lsSet("win7.sync", !sync); notify({ title: "Sync Center", text: sync ? "Synchronization stopped." : "Sync started for all offline files.", icon: "info" }); }}>{sync ? "Stop sync" : "Sync"}</button>)}
        {tile("Presentation Settings", "appearance", <div className="mb-net"><b>{present ? "On" : "Off"}</b><span>Turn off screen saver while presenting</span></div>, <button className="g-btn" onClick={() => { setPresent(!present); notify({ title: "Presentation Settings", text: present ? "Presentation mode is off." : "Presentation mode is on. Notifications will be hidden.", icon: "info" }); }}>{present ? "Turn off" : "Turn on"}</button>)}
        {tile("Windows Mobility Center", "power", <div className="mb-row"><button className="g-btn" onClick={() => openCP("power")}>Power Options</button><button className="g-btn" onClick={() => openCP("display")}>Display</button><button className="g-btn" onClick={() => openCP("sound")}>Sound</button></div>)}
      </div>
      <div className="g-note">The Windows Mobility Center puts the settings laptop users need most in one place (Win+X).</div>
    </div>
  );
}

/* ==================================================== Reliability Monitor */
interface RevEvent { id: string; at: number; kind: "info" | "warn" | "error"; source: string; text: string }
const EVENT_POOL: [RevEvent["kind"], string, string][] = [
  ["info", "Windows Update", "Windows successfully installed update KB976902."],
  ["info", "Service Control Manager", "The Windows Audio service entered the running state."],
  ["warn", "Application Hang", "Windows Explorer stopped responding and was restarted."],
  ["info", "Windows Defender", "Quick scan completed. No threats were found."],
  ["error", "Application Error", "Faulting application mspaint.exe, version 6.1.7601 was closed."],
  ["info", "Kernel-General", "The operating system started."],
  ["warn", "Disk", "The device \\Device\\Harddisk0 has a bad block."],
  ["info", "System Restore", "A restore point was created successfully."],
  ["error", "Application Error", "Faulting application iexplore.exe was closed unexpectedly."],
  ["info", "User Profile Service", "The user profile was loaded successfully."],
];
function seedEvents(): RevEvent[] {
  const saved = lsGet<RevEvent[] | null>("win7.reliability", null);
  if (saved) return saved;
  const now = Date.now();
  const evs: RevEvent[] = EVENT_POOL.map(([kind, source, text], i) => ({
    id: "e" + i,
    at: now - (i + 1) * 86400e3 - Math.random() * 6e7,
    kind,
    source,
    text,
  }));
  evs.push({ id: "boot", at: now - 3600e3, kind: "info", source: "Kernel-General", text: "The operating system started." });
  return evs.sort((a, b) => a.at - b.at);
}

export function Reliability() {
  const [events, setEvents] = useState<RevEvent[]>(seedEvents);
  const [sel, setSel] = useState<RevEvent | null>(null);
  useEffect(() => { lsSet("win7.reliability", events); }, [events]);
  const days = 28;
  const html = useStore((s) => s.rev);
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const cols = Array.from({ length: days }, (_, i) => {
    const t = dayStart - (days - 1 - i) * 86400e3;
    const evs = events.filter((e) => e.at >= t && e.at < t + 86400e3);
    const score = Math.max(1, Math.min(10, 10 - evs.filter((e) => e.kind !== "info").length * 2 - evs.filter((e) => e.kind === "info").length * 0));
    return { t, evs, score, d: new Date(t) };
  });
  const recent = [...events].sort((a, b) => b.at - a.at);
  const kindIcon = (k: RevEvent["kind"]) => (k === "error" ? "error" : k === "warn" ? "warn" : "info");
  return (
    <div className="reliability">
      <div className="cp-sec">Reliability Index</div>
      <div className="rel-chart">
        {cols.map((c, i) => (
          <div key={i} className="rel-col" title={`${c.d.toLocaleDateString()} — index ${c.score}`} onClick={() => setSel(c.evs[0] || null)}>
            <div className="rel-bar" style={{ height: c.score * 10 + "%" }} />
            <span>{(i === 0 || c.d.getDate() === 1) ? c.d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}</span>
          </div>
        ))}
      </div>
      <div className="rel-legend"><Icon name="info" size={14} /> Information <Icon name="warn" size={14} /> Warning <Icon name="error" size={14} /> Critical</div>
      <div className="cp-sec">Event log ({recent.length})</div>
      <div className="rel-table">
        <div className="rel-th"><span style={{ width: 150 }}>Date</span><span style={{ width: 30 }} /><span style={{ width: 170 }}>Source</span><span>Event</span></div>
        {recent.map((e) => (
          <div key={e.id} className={"rel-tr" + (sel?.id === e.id ? " sel" : "")} onClick={() => setSel(e)}>
            <span style={{ width: 150 }}>{new Date(e.at).toLocaleString(undefined, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            <span style={{ width: 30 }}><Icon name={kindIcon(e.kind)} size={16} /></span>
            <span style={{ width: 170 }}>{e.source}</span>
            <span>{e.text}</span>
          </div>
        ))}
      </div>
      {sel && (
        <GroupBox title="Event details">
          <p><b>{sel.source}</b> — {new Date(sel.at).toLocaleString()}</p>
          <p>{sel.text}</p>
          <p className="g-note">Event type: {sel.kind === "info" ? "Information" : sel.kind === "warn" ? "Warning" : "Critical"}</p>
          <div className="mb-row"><Btn onClick={() => msgBox({ title: "Problem Reporting", text: "Windows has no additional information about this event.", icon: "info" })}>Check for a solution</Btn><Btn onClick={() => { setEvents(events.filter((e) => e.id !== sel.id)); setSel(null); }}>Delete event</Btn></div>
        </GroupBox>
      )}
      <div className="mb-row">
        <Btn onClick={() => msgBox({ title: "System Restore", text: "A restore point named 'Windows Update' was created successfully.", icon: "info" })}>Create restore point</Btn>
        <Btn onClick={() => msgBox({ title: "Problem Reports", text: "No new solutions were found.", icon: "info" })}>Check for solutions</Btn>
        <Btn onClick={() => { const e: RevEvent = { id: "e" + Date.now(), at: Date.now(), kind: "info", source: "Reliability Monitor", text: "A new reliability event was recorded." }; setEvents([...events, e]); }}>Refresh</Btn>
      </div>
      {void html}
    </div>
  );
}

/* ============================================== Windows Anytime Upgrade */
const EDITIONS: { name: string; price: string; features: string[] }[] = [
  { name: "Windows 7 Home Premium", price: "$79.95", features: ["Aero Glass, Aero Peek, Aero Shake", "HomeGroup file sharing", "Windows Media Center", "Multi-touch and handwriting recognition", "Create DVDs with Windows DVD Maker"] },
  { name: "Windows 7 Professional", price: "$129.95", features: ["Everything in Home Premium", "Windows XP Mode", "Domain join and Group Policy", "Back up to a network location", "Remote Desktop host"] },
  { name: "Windows 7 Ultimate", price: "$159.95", features: ["Everything in Professional", "BitLocker Drive Encryption", "BitLocker To Go", "AppLocker", "35 languages with Language Pack downloads"] },
];

export function AnytimeUpgrade({ win }: { win?: Win }) {
  const [sel, setSel] = useState(1);
  const [step, setStep] = useState(0);
  const [key, setKey] = useState("");
  const e = EDITIONS[sel];
  const buy = () => {
    if (step === 0) return setStep(1);
    if (step === 1) {
      if (key.replace(/-/g, "").length < 10) return msgBox({ title: "Windows Anytime Upgrade", text: "The product key you entered is not valid. A product key is 25 characters long.", icon: "error" });
      setStep(2);
      notify({ title: "Windows Anytime Upgrade", text: `Your edition was upgraded to ${e.name}. Some features are not available in this simulation.`, icon: "info" });
    }
  };
  return (
    <div className="wau">
      <div className="wau-head">
        <Icon name="trust" size={44} />
        <div><b>Windows Anytime Upgrade</b><p className="g-note">Get more features by upgrading your edition of Windows 7.</p></div>
      </div>
      {step === 0 && (
        <>
          <div className="wau-list">
            {EDITIONS.map((x, i) => (
              <div key={x.name} className={"wau-row" + (i === sel ? " sel" : "")} onClick={() => setSel(i)}>
                <Icon name="flag" size={32} />
                <div style={{ flex: 1 }}><b>{x.name}</b><ul>{x.features.slice(0, 3).map((f) => <li key={f}>{f}</li>)}</ul></div>
                <b>{x.price}</b>
              </div>
            ))}
          </div>
          <div className="mb-row"><Btn def onClick={buy}>Upgrade this computer</Btn><Btn onClick={() => openApp("ie", { url: "about:upgrade" })}>Compare editions online</Btn></div>
        </>
      )}
      {step === 1 && (
        <GroupBox title={`Enter your product key for ${e.name}`}>
          <p className="g-note">Type the 25-character product key that came with your upgrade. The key is checked locally in this simulation.</p>
          <input className="w7input wau-key" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" value={key} onChange={(ev) => setKey(ev.target.value.toUpperCase())} />
          <div className="mb-row"><Btn def onClick={buy}>Next</Btn><Btn onClick={() => setStep(0)}>Back</Btn></div>
        </GroupBox>
      )}
      {step === 2 && (
        <div className="wau-done">
          <Icon name="defaultprogs" size={56} />
          <b>Upgrade complete</b>
          <p>Your computer is now running {e.name}.</p>
          <Btn def onClick={() => (win ? closeWin(win.id) : msgBox({ title: "Windows Anytime Upgrade", text: "Your upgrade is complete.", icon: "info" }))}>Finish</Btn>
        </div>
      )}
      {void win}
    </div>
  );
}
