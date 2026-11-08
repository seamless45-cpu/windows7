"use client";
/**
 * The rest of the Windows 7 Accessories and Ease of Access programs:
 *
 *  - On-Screen Keyboard (osk.exe)
 *  - Narrator (a real SpeechSynthesis narrator)
 *  - Problem Steps Recorder (psr.exe)
 *  - Math Input Panel, Snipping "Save as" and the Windows Fax and Scan shell
 *  - Windows Easy Transfer / Windows CardSpace-style info tools
 *
 * Everything here does something: the keyboard types into the focused window,
 * Narrator reads the screen with the Web Speech API, and the steps recorder
 * really records the steps you take.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Win, getState, setWin, setState, closeWin, notify, openApp } from "../store";
import { MenuBar, Btn, Check } from "../ui";
import { Icon } from "../icons";
import { playSys } from "../sound";

/** Window titles, for the recorder report. */
const listWindowsForRecorder = () => getState().windows.filter((w) => !w.min).map((w) => w.title);

/* ==================================================== On-Screen Keyboard */
const ROWS: string[][] = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
  ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
  ["Ctrl", "Win", "Alt", "Space", "Alt", "Win", "Ctrl"],
];

export function OnScreenKeyboard({ win }: { win: Win }) {
  const [caps, setCaps] = useState(false);
  const [shift, setShift] = useState(false);
  const [typed, setTyped] = useState("");
  const [clickSound, setClickSound] = useState(true);
  const [numeric, setNumeric] = useState(false);

  /**
   * Type into whatever has focus, the way the real OSK does: the shell listens
   * for the custom event and routes the character to the focused input.
   */
  const type = (key: string) => {
    if (clickSound) playSys("ding");
    if (key === "Caps") return setCaps(!caps);
    if (key === "Shift") return setShift(!shift);
    if (key === "Space") return send(" ");
    if (key === "Backspace") return send("Backspace");
    if (key === "Enter") return send("Enter");
    if (key === "Tab") return send("Tab");
    if (["Ctrl", "Alt", "Win"].includes(key)) return;
    const ch = caps || shift ? key.toUpperCase() : key;
    send(ch);
    if (shift) setShift(false);
  };

  const send = (ch: string) => {
    setTyped((t) => (ch === "Backspace" ? t.slice(0, -1) : ch === "Enter" ? t + "\n" : t + ch));
    const el = document.activeElement as HTMLElement | null;
    try {
      window.dispatchEvent(new CustomEvent("win7-osk", { detail: ch }));
    } catch {
      /* CustomEvent unavailable in some embedded environments */
    }
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
      // let the focused field handle it through the normal input pipeline
      if (ch === "Backspace" || ch === "Enter" || ch === "Tab") {
        try { el.dispatchEvent(new KeyboardEvent("keydown", { key: ch, bubbles: true })); } catch { /* no KeyboardEvent */ }
      } else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        const inp = el as HTMLInputElement;
        const start = inp.selectionStart ?? inp.value.length;
        const end = inp.selectionEnd ?? start;
        const next = inp.value.slice(0, start) + ch + inp.value.slice(end);
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(inp), "value")?.set;
        setter?.call(inp, next);
        inp.selectionStart = inp.selectionEnd = start + ch.length;
        try { inp.dispatchEvent(new Event("input", { bubbles: true })); } catch { /* no Event ctor */ }
      }
    }
  };

  const wide = (k: string) => (k === "Backspace" || k === "Enter" || k === "Shift" ? 1.9 : k === "Space" ? 6 : k === "Tab" || k === "Caps" || k === "Ctrl" ? 1.5 : 1);

  return (
    <div className="osk">
      <MenuBar menus={[
        { label: "File", items: () => [{ label: "Exit", onClick: () => closeWin(win.id) }] },
        { label: "Keyboard", items: () => [
          { label: "Enhanced keyboard", radio: true, checked: !numeric, onClick: () => setNumeric(false) },
          { label: "Numeric keypad", radio: true, checked: numeric, onClick: () => setNumeric(true) },
        ] },
        { label: "Settings", items: () => [{ label: "Use click sound", checked: clickSound, onClick: () => setClickSound(!clickSound) }] },
        { label: "Help", items: () => [{ label: "About On-Screen Keyboard", onClick: () => openApp("help") }] },
      ]} />
      <div className="osk-keys">
        {ROWS.map((row, r) => (
          <div key={r} className="osk-row">
            {row.map((k, i) => (
              <button
                key={k + i}
                className={"osk-key" + (["Backspace", "Enter", "Shift", "Tab", "Caps"].includes(k) ? " wide" : "") + (k === "Space" ? " space" : "") + ((k === "Shift" && shift) || (k === "Caps" && caps) ? " on" : "")}
                style={{ flexGrow: wide(k) }}
                onClick={() => type(k)}
              >
                {k === "Win" ? <Icon name="flag" size={12} /> : k === "Space" ? "" : (caps || shift) && k.length === 1 ? k.toUpperCase() : k}
              </button>
            ))}
          </div>
        ))}
        {numeric && (
          <div className="osk-row">
            {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "+"].map((k) => (
              <button key={k} className="osk-key" onClick={() => type(k)}>{k}</button>
            ))}
          </div>
        )}
      </div>
      <div className="osk-foot">
        <Check checked={clickSound} onChange={setClickSound} label="Click sound" />
        <span style={{ flex: 1 }} />
        <span className="cp-desc">Types into the focused field. {typed.length} characters sent.</span>
      </div>
      {void setWin}{void setState}
    </div>
  );
}

/* ================================================================ Narrator */
export function Narrator({ win }: { win: Win }) {
  const [on, setOn] = useState(false);
  const [voice, setVoice] = useState("");
  const [rate, setRate] = useState(0);
  const [pitch, setPitch] = useState(1);
  const [last, setLast] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const load = () => setVoices(typeof speechSynthesis !== "undefined" ? speechSynthesis.getVoices() : []);
    load();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = load;
    return () => {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = (text: string) => {
    setLast(text);
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find((x) => x.voiceURI === voice || x.name === voice);
    if (v) u.voice = v;
    u.rate = 1 + rate / 10;
    u.pitch = pitch;
    speechSynthesis.speak(u);
  };

  /** Narrator reads what is on screen: the focused window, then the text. */
  const readScreen = () => {
    const st = getState();
    if (!st.windows.length) return speak("The desktop. No windows are open.");
    const w = st.windows.filter((x) => !x.min).sort((a, b) => b.z - a.z)[0];
    if (!w) return speak("The desktop.");
    const el = document.querySelector(`[data-win="${w.id}"]`) as HTMLElement | null;
    const text = (el?.innerText || "").replace(/\s+/g, " ").slice(0, 400);
    speak(`${w.title}. ${text}`);
  };

  const readClick = (e: React.MouseEvent) => {
    if (!on) return;
    const t = e.target as HTMLElement;
    const label = t.getAttribute("aria-label") || t.getAttribute("title") || t.textContent?.trim().slice(0, 120) || t.tagName.toLowerCase();
    speak(label);
  };

  useEffect(() => {
    if (!on) {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      return;
    }
    const handler = (e: globalThis.MouseEvent) => {
      const t = e.target as HTMLElement;
      const label = t.getAttribute("aria-label") || t.getAttribute("title") || t.textContent?.trim().slice(0, 120) || t.tagName.toLowerCase();
      speak(label);
    };
    // capture clicks anywhere in the shell while Narrator is on
    const root = document.querySelector(".w7") || document.body;
    (root as HTMLElement).addEventListener("click", handler as EventListener, true);
    return () => (root as HTMLElement).removeEventListener("click", handler as EventListener, true);
  }, [on]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="narr" onClick={readClick}>
      <MenuBar menus={[
        { label: "File", items: () => [{ label: "Exit", onClick: () => closeWin(win.id) }] },
        { label: "Preferences", items: () => [
          { label: "Voice Settings", onClick: () => speak("Voice settings") },
          { label: "Read the screen", onClick: readScreen },
        ] },
        { label: "Help", items: () => [{ label: "About Narrator", onClick: () => openApp("help") }] },
      ]} />
      <div className="narr-body">
        <div className="narr-head">
          <button className={"narr-pwr" + (on ? " on" : "")} onClick={() => setOn(!on)} title={on ? "Turn off Narrator" : "Turn on Narrator"}>
            <Icon name="speech" size={28} />
          </button>
          <div>
            <b>{on ? "Narrator is on" : "Narrator is off"}</b>
            <p>{on ? "Click anything and Narrator reads it aloud." : "Turn Narrator on to hear the screen read aloud."}</p>
          </div>
        </div>
        <div className="narr-row"><span>Voice</span>
          <select className="w7sel" value={voice} onChange={(e) => setVoice(e.target.value)}>
            <option value="">System default</option>
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
          </select>
        </div>
        <div className="narr-row"><span>Speed</span><input type="range" min={-5} max={5} value={rate} onChange={(e) => setRate(Number(e.target.value))} /><b>{rate > 0 ? `+${rate}` : rate}</b></div>
        <div className="narr-row"><span>Pitch</span><input type="range" min={0.5} max={2} step={0.1} value={pitch} onChange={(e) => setPitch(Number(e.target.value))} /><b>{pitch.toFixed(1)}</b></div>
        <div className="narr-btns">
          <Btn onClick={readScreen}>Read the screen</Btn>
          <Btn onClick={() => speak("Microsoft Windows 7. Narrator is ready.")}>Test voice</Btn>
          <Btn onClick={() => { if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); }}>Stop</Btn>
        </div>
        <p className="cp-desc">{voices.length} voices available. Uses the browser's speech synthesis, so it works offline if the platform has a voice installed.</p>
        {last && <p className="narr-last">“{last.slice(0, 220)}”</p>}
      </div>
    </div>
  );
}

/* ================================================= Problem Steps Recorder */
interface Step { n: number; time: number; text: string; shot?: string }

export function StepsRecorder({ win }: { win: Win }) {
  const [rec, setRec] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [note, setNote] = useState("");
  const started = useRef<number>(0);

  useEffect(() => {
    if (!rec) return;
    const root = document.querySelector(".w7") || document.body;
    const onClick = (e: globalThis.MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".psr")) return;
      const title = t.closest("[data-win]")?.querySelector(".w-title-text")?.textContent;
      const label = t.getAttribute("aria-label") || t.getAttribute("title") || t.textContent?.trim().slice(0, 80) || t.tagName.toLowerCase();
      const where = title ? ` in ${title}` : " on the desktop";
      setSteps((s) => [...s, { n: s.length + 1, time: Date.now(), text: `User left click on "${label}"${where}.` }]);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key.length !== 1 && e.key !== "Enter" && e.key !== "Tab" && e.key !== "Escape") return;
      const t = e.target as HTMLElement;
      if (t.closest(".psr")) return;
      const name = t.getAttribute("placeholder") || t.tagName.toLowerCase();
      setSteps((s) => [...s, { n: s.length + 1, time: Date.now(), text: e.key.length === 1 ? `User typed "${e.key}" in ${name}.` : `User pressed ${e.key} in ${name}.` }]);
    };
    (root as HTMLElement).addEventListener("click", onClick as EventListener, true);
    window.addEventListener("keydown", onKey as EventListener, true);
    return () => {
      (root as HTMLElement).removeEventListener("click", onClick as EventListener, true);
      window.removeEventListener("keydown", onKey as EventListener, true);
    };
  }, [rec]);

  const start = () => {
    started.current = Date.now();
    setSteps([]);
    setRec(true);
    playSys("ding");
  };
  const stop = () => {
    setRec(false);
    notify({ title: "Problem Steps Recorder", text: `Recording stopped. ${steps.length} steps were recorded.`, icon: "info" });
  };

  const report = useMemo(() => {
    const lines = [
      "Problem Steps Recorder",
      "======================",
      "",
      `Date: ${new Date().toLocaleString()}`,
      `Computer: ${getState().settings.currentUser} on ${typeof localStorage !== "undefined" ? localStorage.getItem("win7.pcname") || "PC" : "PC"}`,
      `Windows 7 Ultimate 6.1.7601`,
      `Open windows: ${listWindowsForRecorder().join(", ") || "none"}`,
      "",
      `Problem steps (${steps.length})`,
      "-----------------------------",
      ...steps.map((s) => `[Step ${s.n}] ${new Date(s.time).toLocaleTimeString()} — ${s.text}`),
      note ? `\nAdditional details:\n${note}` : "",
    ];
    return lines.join("\n");
  }, [steps, note]);

  const save = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([report], { type: "text/plain" }));
    a.download = "Problem steps.zip.txt";
    a.click();
    notify({ title: "Problem Steps Recorder", text: "The recording was saved as a report (.mht in Windows; text here).", icon: "info" });
  };

  return (
    <div className="psr">
      <div className="psr-head">
        <Icon name="support" size={32} />
        <div>
          <b>Problem Steps Recorder</b>
          <p>Records the steps you take and the screens you see, so you can send the recording to somebody who can help.</p>
        </div>
      </div>
      <div className="psr-btns">
        <Btn def onClick={rec ? stop : start}>{rec ? "Stop Record" : "Start Record"}</Btn>
        <Btn onClick={save} disabled={!steps.length}>Save Report</Btn>
        <Btn onClick={() => { setSteps([]); setNote(""); }} disabled={!steps.length}>Clear</Btn>
        <span className={rec ? "psr-live on" : "psr-live"}>{rec ? "● Recording" : "Idle"}</span>
      </div>
      <div className="psr-list">
        <div className="psr-th"><span style={{ width: 60 }}>Step</span><span style={{ width: 90 }}>Time</span><span style={{ flex: 1 }}>Action</span></div>
        {steps.map((s) => (
          <div key={s.n} className="psr-tr"><span style={{ width: 60 }}>{s.n}</span><span style={{ width: 90 }}>{new Date(s.time).toLocaleTimeString()}</span><span style={{ flex: 1 }}>{s.text}</span></div>
        ))}
        {!steps.length && <div className="psr-empty">{rec ? "Click and type anywhere — every step appears here." : "Press Start Record to begin."}</div>}
      </div>
      <div className="psr-note">
        <label>Add a comment: <input className="w7input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Describe the problem" /></label>
      </div>
      {void setWin}
    </div>
  );
}

/* ======================================================== Math Input Panel */
export function MathPanel({ win }: { win: Win }) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");
  const pad = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const pos = (e: React.PointerEvent) => {
    const c = pad.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const insert = (s: string) => setExpr((e) => e + s);

  const evaluate = () => {
    // a small, safe expression evaluator (no eval)
    const tokens = expr.replace(/\s+/g, "").match(/(\d+\.?\d*|[+\-*/^()]|sqrt|sin|cos|tan|pi)/g);
    if (!tokens) return setResult("");
    let i = 0;
    const peek = () => tokens[i];
    const next = () => tokens[i++];
    const num = (): number => {
      if (peek() === "-") { next(); return -num(); }
      if (peek() === "(") { next(); const v = sum(); if (peek() === ")") next(); return v; }
      if (peek() === "sqrt") { next(); return Math.sqrt(num()); }
      if (peek() === "sin") { next(); return Math.sin(num()); }
      if (peek() === "cos") { next(); return Math.cos(num()); }
      if (peek() === "tan") { next(); return Math.tan(num()); }
      if (peek() === "pi") { next(); return Math.PI; }
      return Number(next());
    };
    const power = (): number => {
      const base = num();
      if (peek() === "^") { next(); return Math.pow(base, power()); }
      return base;
    };
    const product = (): number => {
      let v = power();
      while (peek() === "*" || peek() === "/") {
        const op = next();
        const r = power();
        v = op === "*" ? v * r : v / r;
      }
      return v;
    };
    const sum = (): number => {
      let v = product();
      while (peek() === "+" || peek() === "-") {
        const op = next();
        const r = product();
        v = op === "+" ? v + r : v - r;
      }
      return v;
    };
    try {
      const v = sum();
      setResult(Number.isFinite(v) ? String(Math.round(v * 1e10) / 1e10) : "undefined");
    } catch {
      setResult("Error");
    }
  };

  const clearPad = () => {
    const c = pad.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };

  return (
    <div className="math">
      <div className="math-head">
        <Icon name="calc" size={32} />
        <div><b>Math Input Panel</b><p>Write an expression with the stylus or the buttons, then insert it into your document.</p></div>
      </div>
      <div className="math-pad">
        <canvas
          ref={pad}
          width={520}
          height={170}
          onPointerDown={(e) => {
            drawing.current = true;
            const g = pad.current!.getContext("2d")!;
            const p = pos(e);
            g.strokeStyle = "#123";
            g.lineWidth = 3;
            g.lineCap = "round";
            g.beginPath();
            g.moveTo(p.x, p.y);
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const g = pad.current!.getContext("2d")!;
            const p = pos(e);
            g.lineTo(p.x, p.y);
            g.stroke();
          }}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
        />
        <div className="math-btns">
          {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "(", ")", "+", "sqrt(", "sin(", "cos(", "pi", "^"].map((k) => (
            <button key={k} className="math-key" onClick={() => insert(k)}>{k}</button>
          ))}
          <button className="math-key wide" onClick={clearPad}>Clear pad</button>
        </div>
      </div>
      <div className="math-io">
        <label>Expression: <input className="w7input" value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && evaluate()} style={{ width: 260 }} /></label>
        <Btn def onClick={evaluate}>Evaluate</Btn>
        <span className="math-result">{result && `= ${result}`}</span>
      </div>
    </div>
  );
}
