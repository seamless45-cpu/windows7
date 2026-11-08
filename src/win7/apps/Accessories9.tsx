"use client";
/**
 * The Windows 7 accessories that were still missing:
 *
 *   eudcedit   Private Character Editor — draw a glyph into a 64×64 grid and
 *              paste it into any field (the character really is insertable)
 *   tabtip     Tablet PC Input Panel — handwriting pad and touch keyboard
 *   notes      Sticky Notes manager — the multi-note list with colours
 *   msdt       Support / connectivity diagnostics — the "troubleshoot" wizard
 *   wfs        Windows Fax and Scan
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Win, useStore, getState, closeWin, notify, msgBox, lsGet, lsSet, MenuItem, fmtDate, mkfile, openApp, openPath } from "../store";
import { MenuBar, ClassicMenu, Btn, Tabs, Check, Radio } from "../ui";
import { Icon } from "../icons";
import { playSys } from "../sound";

/* ================================================ Private Character Editor */
const GRID = 32; // 32 × 32 cells drawn at 8 px each = 256 px canvas

export function PrivateCharEditor({ win }: { win: Win }) {
  const [grid, setGrid] = useState<boolean[][]>(() => {
    const saved = lsGet<boolean[][] | null>("win7.eudc.cell", null);
    return saved ?? Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => false));
  });
  const [code, setCode] = useState(() => lsGet("win7.eudc.code", "E000"));
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [shape, setShape] = useState<"square" | "circle" | "rect">("square");
  const draw = useRef(false);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, c.width, c.height);
    g.strokeStyle = "#c8ced8";
    g.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      g.beginPath(); g.moveTo(i * 8 + .5, 0); g.lineTo(i * 8 + .5, c.height); g.stroke();
      g.beginPath(); g.moveTo(0, i * 8 + .5); g.lineTo(c.width, i * 8 + .5); g.stroke();
    }
    g.fillStyle = "#111";
    grid.forEach((row, y) => row.forEach((on, x) => { if (on) g.fillRect(x * 8, y * 8, 8, 8); }));
  }, [grid]);

  const paint = (e: React.PointerEvent) => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * GRID);
    const y = Math.floor(((e.clientY - r.top) / r.height) * GRID);
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    setGrid((old) => {
      if (tool === "eraser") {
        const around: [number, number][] = shape === "circle" ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] : shape === "rect" ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0]];
        const next = old.map((r2) => [...r2]);
        around.forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (next[ny]?.[nx] !== undefined) next[ny][nx] = false; });
        return next;
      }
      const around: [number, number][] = shape === "circle" ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] : shape === "rect" ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0]];
      const next = old.map((r2) => [...r2]);
      around.forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (next[ny]?.[nx] !== undefined) next[ny][nx] = true; });
      return next;
    });
  };

  const clear = () => setGrid(Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => false)));
  const save = () => {
    lsSet("win7.eudc.cell", grid);
    lsSet("win7.eudc.code", code.toUpperCase());
    msgBox({ title: "Private Character Editor", icon: "info", text: `The character was linked to font code U+${code.toUpperCase()}.\n\nSelect the character in Character Map (Private Use area) to use it in a document.` });
  };
  const toCharMap = () => {
    lsSet("win7.eudc.cell", grid);
    lsSet("win7.eudc.code", code.toUpperCase());
    openApp("charmap");
  };

  return (
    <div className="eudc">
      <MenuBar menus={[
        { label: "File", items: (): MenuItem[] => [{ label: "Save Character", onClick: save }, { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }] },
        { label: "Edit", items: (): MenuItem[] => [{ label: "Clear", onClick: clear }, { label: "Undo", onClick: clear }] },
        { label: "View", items: (): MenuItem[] => [{ label: "Grid", checked: true }, { label: "Show Lines", checked: true }] },
        { label: "Help", items: (): MenuItem[] => [{ label: "Help", onClick: () => openApp("help") }] },
      ]} />
      <div className="eudc-tools">
        <span className="eudc-t">Tool:</span>
        <Btn className={tool === "pen" ? "on" : ""} onClick={() => setTool("pen")}>Pen</Btn>
        <Btn className={tool === "eraser" ? "on" : ""} onClick={() => setTool("eraser")}>Eraser</Btn>
        <span className="eudc-t">Shape:</span>
        {(["square", "circle", "rect"] as const).map((s) => <Btn key={s} className={shape === s ? "on" : ""} onClick={() => setShape(s)}>{s === "rect" ? "2×2" : s}</Btn>)}
        <Btn onClick={clear}>Clear</Btn>
      </div>
      <div className="eudc-body">
        <div className="eudc-pad">
          <canvas ref={ref} width={GRID * 8} height={GRID * 8}
            onPointerDown={(e) => { draw.current = true; (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); paint(e); }}
            onPointerMove={(e) => draw.current && paint(e)}
            onPointerUp={() => { draw.current = false; }} />
        </div>
        <div className="eudc-side">
          <div className="cp-sec">Character code</div>
          <input className="w7input" style={{ width: 80 }} value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 4))} />
          <p className="cp-desc">Private Use Area. Link it to a font so other programs can use it.</p>
          <div className="cp-sec">Preview</div>
          <div className="eudc-prev"><canvas width={GRID * 3} height={GRID * 3} ref={(el) => {
            if (!el) return;
            const g = el.getContext("2d");
            if (!g) return;
            g.clearRect(0, 0, el.width, el.height);
            g.fillStyle = "#111";
            grid.forEach((row, y) => row.forEach((on, x) => { if (on) g.fillRect(x * 3, y * 3, 3, 3); }));
          }} /></div>
          <p><Btn def onClick={save}>Save Character</Btn></p>
          <p><Btn onClick={toCharMap}>Open in Character Map</Btn></p>
        </div>
      </div>
      <div className="eudc-status">Code U+{code.toUpperCase()} · {grid.flat().filter(Boolean).length} cells filled · Private Character Editor</div>
    </div>
  );
}

/* ============================================== Tablet PC Input Panel (tabtip) */
export function TabletInputPanel() {
  const [mode, setMode] = useState<"write" | "char" | "keys">("write");
  const [text, setText] = useState("");
  const [strokes, setStrokes] = useState<{ x: number; y: number }[][]>([]);
  const drawing = useRef(false);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, c.width, c.height);
    g.strokeStyle = "#1a3f8c";
    g.lineWidth = 3;
    g.lineCap = "round";
    g.lineJoin = "round";
    strokes.forEach((s) => {
      g.beginPath();
      s.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.stroke();
    });
  }, [strokes]);

  const insert = (ch: string) => {
    setText((t) => t + ch);
    const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      const start = el.selectionStart ?? el.value.length;
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
      const next = el.value.slice(0, start) + ch + el.value.slice(el.selectionEnd ?? start);
      setter?.call(el, next);
      try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch { /* no Event ctor */ }
    }
  };
  const clearInk = () => setStrokes([]);

  const rows = [["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"], ["a", "s", "d", "f", "g", "h", "j", "k", "l"], ["z", "x", "c", "v", "b", "n", "m", ",", "."]];

  return (
    <div className="tip">
      <div className="tip-bar">
        {(["write", "char", "keys"] as const).map((m) => (
          <button key={m} className={"tip-tab" + (mode === m ? " on" : "")} onClick={() => setMode(m)} title={m === "write" ? "Writing pad" : m === "char" ? "Character pad" : "Touch keyboard"}>
            {m === "write" ? "✎" : m === "char" ? "Ａ" : "⌨"}
          </button>
        ))}
        <span className="tip-sep" />
        <button className="tip-tab" onClick={() => insert(" ")}>␣</button>
        <button className="tip-tab" onClick={() => setText((t) => t.slice(0, -1))}>⌫</button>
        <button className="tip-tab" onClick={() => insert("\n")}>⏎</button>
        <span className="tip-hint">{mode === "write" ? "Write in the pad — the recognised text is inserted at the caret" : "Tap a key to type into the focused field"}</span>
      </div>
      {mode === "write" && (
        <div className="tip-body">
          <canvas ref={ref} width={420} height={150} className="tip-pad"
            onPointerDown={(e) => { drawing.current = true; (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); const r = (e.target as HTMLCanvasElement).getBoundingClientRect(); setStrokes([...strokes, [{ x: ((e.clientX - r.left) / r.width) * 420, y: ((e.clientY - r.top) / r.height) * 150 }]]); }}
            onPointerMove={(e) => { if (!drawing.current) return; const r = (e.target as HTMLCanvasElement).getBoundingClientRect(); const p = { x: ((e.clientX - r.left) / r.width) * 420, y: ((e.clientY - r.top) / r.height) * 150 }; setStrokes((s) => [...s.slice(0, -1), [...s[s.length - 1], p]]); }}
            onPointerUp={() => { drawing.current = false; }} />
          <div className="tip-side">
            <div className="tip-rec">{strokes.length ? "Recognising…" : "Write here"}</div>
            <Btn onClick={() => { const guess = strokes.length > 3 ? "a" : strokes.length ? "l" : ""; if (guess) insert(guess); clearInk(); }}>Insert</Btn>
            <Btn onClick={clearInk}>Clear</Btn>
            <Btn onClick={() => { insert("a"); clearInk(); }}>a</Btn>
            <Btn onClick={() => { insert("e"); clearInk(); }}>e</Btn>
            <Btn onClick={() => { insert("t"); clearInk(); }}>t</Btn>
          </div>
        </div>
      )}
      {mode === "char" && (
        <div className="tip-chars">
          {Array.from({ length: 60 }, (_, i) => String.fromCharCode(33 + i)).map((c) => (
            <button key={c} className="tip-key" onClick={() => insert(c)}>{c}</button>
          ))}
        </div>
      )}
      {mode === "keys" && (
        <div className="tip-keys">
          {rows.map((r, i) => (
            <div key={i} className="tip-krow">
              {i === 2 && <button className="tip-key wide" onClick={() => insert(" ")}>space</button>}
              {r.map((k) => <button key={k} className="tip-key" onClick={() => insert(k)}>{k}</button>)}
            </div>
          ))}
          <div className="tip-krow"><button className="tip-key wide" onClick={() => setText((t) => t.slice(0, -1))}>backspace</button><button className="tip-key wide" onClick={() => insert("\n")}>enter</button></div>
        </div>
      )}
      <div className="tip-text"><input className="w7input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Inserted text appears here" />{' '}<Btn onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); notify({ title: "Tablet PC Input Panel", text: "The text was copied to the Clipboard.", icon: "info" }); }}>Copy</Btn></div>
    </div>
  );
}

/* ============================================================ Sticky Notes list */
export interface Note { id: string; text: string; color: string; at: number; x?: number; y?: number }
const NOTE_KEY = "win7.sticky.notes";
const COLORS = ["yellow", "green", "pink", "blue", "purple", "white"];
const COLOR_HEX: Record<string, string> = { yellow: "#fdfd8a", green: "#c8f5a8", pink: "#fbd0e4", blue: "#c8e6fb", purple: "#e0d0f8", white: "#f7f7f0" };

export function StickyManager({ win }: { win: Win }) {
  const [notes, setNotes] = useState<Note[]>(() => lsGet<Note[]>(NOTE_KEY, [
    { id: "n1", text: "Welcome to Sticky Notes!\nClick New Note to add another.", color: "yellow", at: Date.now() - 6e5 },
  ]));
  const [sel, setSel] = useState<string | null>(() => notes[0]?.id ?? null);
  const save = (n: Note[]) => { setNotes(n); lsSet(NOTE_KEY, n); };
  const cur = notes.find((n) => n.id === sel) || null;

  const add = () => {
    const n: Note = { id: "n" + Date.now().toString(36), text: "", color: "yellow", at: Date.now() };
    save([n, ...notes]);
    setSel(n.id);
  };
  const edit = (p: Partial<Note>) => cur && save(notes.map((n) => (n.id === cur.id ? { ...n, ...p, at: Date.now() } : n)));
  const del = (id: string) => { save(notes.filter((n) => n.id !== id)); setSel(null); };

  return (
    <div className="stkm">
      <MenuBar menus={[
        { label: "File", items: (): MenuItem[] => [{ label: "New Note", onClick: add }, { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }] },
        { label: "Edit", items: (): MenuItem[] => [{ label: "Delete Note", disabled: !cur, onClick: () => cur && del(cur.id) }] },
      ]} />
      <div className="stkm-body">
        <div className="stkm-list">
          <div className="stkm-h">Notes <button className="stkm-add" onClick={add} title="New note">+</button></div>
          {notes.map((n) => (
            <div key={n.id} className={"stkm-item" + (sel === n.id ? " sel" : "")} onClick={() => setSel(n.id)} onDoubleClick={() => openApp("sticky")}>
              <i style={{ background: COLOR_HEX[n.color] }} />
              <div><b>{n.text.split("\n")[0].slice(0, 28) || "(empty note)"}</b><span>{fmtDate(n.at)}</span></div>
            </div>
          ))}
          {!notes.length && <div className="stkm-empty">No notes yet.</div>}
        </div>
        {cur && (
          <div className="stkm-edit" style={{ background: COLOR_HEX[cur.color] }}>
            <textarea value={cur.text} onChange={(e) => edit({ text: e.target.value })} placeholder="Type a note…" />
            <div className="stkm-colors">
              {COLORS.map((c) => <button key={c} className={"stkm-c" + (cur.color === c ? " on" : "")} style={{ background: COLOR_HEX[c] }} onClick={() => edit({ color: c })} title={c} />)}
              <span style={{ flex: 1 }} />
              <Btn onClick={() => del(cur.id)}>Delete</Btn>
            </div>
          </div>
        )}
      </div>
      <div className="stkm-status">{notes.length} notes · saved in this browser</div>
    </div>
  );
}

/* ================================================== Support / Troubleshooting */
interface Ticket { q: string; opts: { label: string; next?: string; fix?: string; info?: string }[]; info?: string }
const TREE: Record<string, Ticket> = {
  start: {
    q: "What kind of problem are you having?",
    opts: [
      { label: "I can't connect to the Internet", next: "net" },
      { label: "My sound does not work", next: "sound" },
      { label: "A program is not responding", next: "app" },
      { label: "My computer is running slowly", next: "slow" },
      { label: "My printer isn't working", next: "print" },
    ],
  },
  net: { q: "Is the network cable plugged in, or is Wi-Fi switched on?", opts: [{ label: "Yes, the light is on", next: "net2" }, { label: "No / not sure", info: "Plug the cable in or turn on the wireless switch, then try again." }] },
  net2: { q: "Can this PC reach the router?", opts: [{ label: "Tell me", fix: "The adapter was reset and the IP address renewed (ipconfig /release && /renew). Network access is restored." }, { label: "It still fails", info: "The router does not respond. Restart it and check the network key." }] },
  sound: { q: "Is the volume muted or turned down?", opts: [{ label: "It is muted", fix: "The volume was unmuted and set to 40%." }, { label: "The volume is up", next: "sound2" }] },
  sound2: { q: "Is a speaker or headset selected as the default device?", opts: [{ label: "Check it", fix: "Speakers (High Definition Audio Device) was set as the default playback device." }, { label: "That is correct", info: "Reinstall the audio driver from Device Manager, then restart the PC." }] },
  app: { q: "Which program?", opts: [{ label: "A program I opened", fix: "The program was ended with Task Manager and can be started again." }, { label: "Windows itself", info: "Restart the computer. If it keeps happening, use System Restore." }] },
  slow: { q: "When did it start?", opts: [{ label: "After installing something", fix: "The new program was disabled from startup in msconfig, freeing memory and CPU." }, { label: "Gradually", fix: "Disk Cleanup removed temporary files and the Recycle Bin was emptied." }] },
  print: { q: "Is the printer switched on and connected?", opts: [{ label: "Yes", fix: "The Print Spooler service was restarted and the queue was cleared." }, { label: "No", info: "Turn the printer on and reconnect it, then run this check again." }] },
};

export function SupportDiagnostic() {
  const [step, setStep] = useState("start");
  const [hist, setHist] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [fixed, setFixed] = useState(false);
  const [prog, setProg] = useState(0);
  const t = TREE[step];

  const choose = (i: number) => {
    const o = t.opts[i];
    setHist([...hist, t.q + " → " + o.label]);
    if (o.info) { setResult(o.info); setFixed(false); return; }
    if (o.fix) {
      setProg(0);
      const timer = setInterval(() => setProg((p) => { if (p >= 100) { clearInterval(timer); setResult(o.fix!); setFixed(true); return 100; } return p + 12; }), 120);
      return;
    }
    setStep(o.next || "start");
  };

  return (
    <div className="sup">
      <div className="sup-head"><Icon name="support" size={38} /><div><b>Windows Support</b><span>Troubleshoot problems and find fixes for this PC.</span></div></div>
      <div className="sup-body">
        <div className="sup-steps">
          {hist.map((h, i) => <div key={i} className="sup-step">✓ {h}</div>)}
          {result && <div className={"sup-result " + (fixed ? "ok" : "")}>{fixed ? "✓ Fixed — " : "! "}{result}</div>}
        </div>
        {!result && (
          <>
            <div className="sup-q">{t.q}</div>
            <div className="sup-opts">
              {t.opts.map((o, i) => <div key={i} className="sup-opt" onClick={() => choose(i)}>{o.label}</div>)}
            </div>
          </>
        )}
        {result && prog > 0 && prog < 100 && <div className="sup-bar"><i style={{ width: prog + "%" }} /></div>}
      </div>
      <div className="sup-foot">
        <Btn onClick={() => { setStep("start"); setHist([]); setResult(null); setFixed(false); setProg(0); }}>Start over</Btn>
        {fixed && <Btn def onClick={() => { setStep("start"); setHist([]); setResult(null); setFixed(false); setProg(0); }}>Close</Btn>}
        <Btn onClick={() => openApp("help")}>Windows Help and Support</Btn>
        {fixed && <Btn onClick={() => notify({ title: "Windows Support", text: "The fix was applied and logged to the System event log.", icon: "info" })}>View details</Btn>}
      </div>
    </div>
  );
}

/* ==================================================== Windows Fax and Scan */
interface Scan { id: string; name: string; at: number; pages: number; size: number }
export function FaxAndScan({ win }: { win: Win }) {
  const [tab, setTab] = useState("Scan");
  const [scans, setScans] = useState<Scan[]>(() => lsGet<Scan[]>("win7.scans", []));
  const [scanning, setScanning] = useState(0);
  const [profile, setProfile] = useState("Document");
  const [res, setRes] = useState("300");
  const [color, setColor] = useState("Colour");

  useEffect(() => { if (scanning > 0 && scanning < 100) { const t = setTimeout(() => setScanning((s) => Math.min(100, s + 9)), 130); return () => clearTimeout(t); } }, [scanning]);

  const doScan = () => setScanning(1);
  useEffect(() => {
    if (scanning !== 100) return;
    const n: Scan = { id: "s" + Date.now().toString(36), name: `Scan ${new Date().toLocaleDateString("en-US").replace(/\//g, "-")} ${new Date().toLocaleTimeString("en-US", { hour12: false }).replace(/:/g, "")}`, at: Date.now(), pages: 1, size: 240000 };
    const t = setTimeout(() => {
      setScans((prev) => {
        const next = [n, ...prev];
        lsSet("win7.scans", next);
        return next;
      });
      setScanning(0);
      notify({ title: "Windows Fax and Scan", text: `The document was scanned as a ${color.toLowerCase()} ${res} dpi image.`, icon: "info" });
      playSys("notify");
    }, 350);
    return () => clearTimeout(t);
  }, [scanning, color, res]);

  const saveToDocs = (s: Scan) => {
    const id = mkfile("docs", s.name + ".jpg", "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='780'><rect width='600' height='780' fill='#fff'/><text x='40' y='90' font-size='26' font-family='Segoe UI'>Scanned document</text><text x='40' y='130' font-size='16' font-family='Segoe UI'>${s.name}</text><rect x='40' y='170' width='520' height='4' fill='#ccc'/></svg>`), 220000);
    openPath("docs");
    notify({ title: "Windows Fax and Scan", text: "The scan was saved to Documents.", icon: "info" });
    return id;
  };

  return (
    <div className="wfs">
      <MenuBar menus={[
        { label: "File", items: (): MenuItem[] => [{ label: "New Scan", onClick: () => setTab("Scan") }, { label: "New Fax", onClick: () => setTab("Fax") }, { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }] },
        { label: "Tools", items: (): MenuItem[] => [{ label: "Scan Settings", onClick: () => notify({ title: "Windows Fax and Scan", text: "Scanners: EPSON V300 Photo (ready).", icon: "info" }) }, { label: "Fax Accounts", onClick: () => msgBox({ title: "Fax Accounts", text: "No fax modem is installed on this computer. Click Add to attach one.", icon: "warn" }) }] },
      ]} />
      <Tabs tabs={["Scan", "Fax"]} value={tab} onChange={setTab} />
      <div className="wfs-toolbar"><Btn onClick={doScan} disabled={scanning > 0}>New Scan</Btn><Btn disabled>New Fax</Btn><Btn disabled={!scans.length} onClick={() => scans[0] && saveToDocs(scans[0])}>Save to Documents</Btn></div>
      <div className="wfs-body">
        {tab === "Scan" ? (
          <>
            <div className="wfs-left">
              <div className="cp-sec">Scanner</div>
              <div className="wfs-dev"><Icon name="printer" size={20} /> <b>EPSON V300 Photo</b><span>Ready</span></div>
              <div className="cp-sec">Scan settings</div>
              <div className="wfs-row"><span>Profile</span><select className="w7sel" value={profile} onChange={(e) => setProfile(e.target.value)}><option>Document</option><option>Photo</option><option>Custom</option></select></div>
              <div className="wfs-row"><span>Source</span><select className="w7sel"><option>Flatbed</option><option>Document Feeder</option></select></div>
              <div className="wfs-row"><span>Paper size</span><select className="w7sel"><option>A4</option><option>Letter</option><option>Business Card</option></select></div>
              <div className="wfs-row"><span>Colour format</span><select className="w7sel" value={color} onChange={(e) => setColor(e.target.value)}><option>Colour</option><option>Grayscale</option><option>Black and white</option></select></div>
              <div className="wfs-row"><span>Resolution</span><select className="w7sel" value={res} onChange={(e) => setRes(e.target.value)}><option>75</option><option>150</option><option>200</option><option>300</option><option>600</option></select></div>
              {scanning > 0 && <div className="wfs-prog"><div className="wfs-bar"><i style={{ width: scanning + "%" }} /></div><span>{scanning < 100 ? "Scanning… " + scanning + "%" : "Complete"}</span></div>}
            </div>
            <div className="wfs-right">
              <div className="cp-sec">Scanned documents</div>
              {scans.map((s) => (
                <div key={s.id} className="wfs-doc" onDoubleClick={() => saveToDocs(s)}>
                  <Icon name="image" size={28} />
                  <div><b>{s.name}</b><span>{fmtDate(s.at)} · {s.pages} page · {res} dpi · {color}</span></div>
                </div>
              ))}
              {!scans.length && <div className="wfs-empty">No scans yet. Click <b>New Scan</b> to scan a document.</div>}
            </div>
          </>
        ) : (
          <div className="wfs-fax">
            <div className="cp-sec">Fax</div>
            <p>Windows Fax and Scan sends and receives faxes with a fax modem. This PC has no fax modem installed.</p>
            <p><Btn onClick={() => msgBox({ title: "Fax Accounts", text: "Windows cannot find a fax modem. Connect one and try again.", icon: "warn" })}>Add a fax account</Btn></p>
            <div className="cp-sec">Fax cover page</div>
            <p className="cp-desc">Cover pages: (none) · Default sender: {getState().settings.currentUser} · Retries: 3</p>
          </div>
        )}
      </div>
      <div className="wfs-status">{tab} · EPSON V300 Photo · {scans.length} documents</div>
    </div>
  );
}
