"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Win, useStore, getState, setWin, setGuard, closeWin, msgBox, mkfile, writeFile, lsGet, lsSet, openApp, MenuItem, setState, uid, notify, extOf,
} from "../store";
import { MenuBar, Btn, Check } from "../ui";
import { openFileDialog } from "../dialogs";
import { Icon } from "../icons";

function recent(app: string, id: string) {
  const l = lsGet<string[]>("win7.jl." + app, []);
  lsSet("win7.jl." + app, [id, ...l.filter((x) => x !== id)].slice(0, 8));
}

/* ================================================================ Notepad */
export function Notepad({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const initial = win.props.file && fs[win.props.file] ? fs[win.props.file] : null;
  const [fileId, setFileId] = useState<string | null>(initial?.id || null);
  const [text, setText] = useState(initial?.content?.startsWith("data:") ? "" : initial?.content || "");
  const [saved, setSaved] = useState(text);
  const [wrap, setWrap] = useState(true);
  const [status, setStatus] = useState(true);
  const [pos, setPos] = useState({ ln: 1, col: 1 });
  const [dlg, setDlg] = useState<null | "find" | "replace" | "goto" | "font">(null);
  const [find, setFind] = useState("");
  const [rep, setRep] = useState("");
  const [mc, setMc] = useState(false);
  const [goto, setGoto] = useState("1");
  const [font, setFont] = useState({ family: "Consolas", size: 14 });
  const ta = useRef<HTMLTextAreaElement>(null);
  const st = useRef({ text, saved, fileId });
  st.current = { text, saved, fileId };

  const name = fileId ? fs[fileId]?.name || "Untitled" : "Untitled";
  useEffect(() => setWin(win.id, { title: `${name} - Notepad` }), [name, win.id]);
  useEffect(() => {
    if (initial) recent("notepad", initial.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAs = useCallback((then?: () => void) => {
    openFileDialog({
      mode: "save", exts: ["txt"], name: "*.txt", start: "docs", title: "Save As",
      onDone: (id, nm, dir) => {
        const t = st.current.text;
        let nid = id;
        if (nid) writeFile(nid, t);
        else nid = mkfile(dir, nm, t);
        setFileId(nid);
        setSaved(t);
        st.current.saved = t;
        recent("notepad", nid);
        then?.();
      },
    });
  }, []);
  const save = useCallback((then?: () => void) => {
    const { fileId: f, text: t } = st.current;
    if (f && getState().fs[f]) {
      writeFile(f, t);
      setSaved(t);
      st.current.saved = t;
      then?.();
    } else saveAs(then);
  }, [saveAs]);

  const ask = useCallback((next: () => void) => {
    if (st.current.text === st.current.saved) return next();
    const nm = st.current.fileId ? getState().fs[st.current.fileId]?.name : "Untitled";
    msgBox({ title: "Notepad", text: `Do you want to save changes to ${nm}?`, icon: "warn", buttons: ["Save", "Don't Save", "Cancel"], onResult: (b) => { if (b === "Save") save(next); else if (b === "Don't Save") next(); } });
  }, [save]);

  useEffect(() => {
    setGuard(win.id, () => {
      if (st.current.text === st.current.saved) return false;
      ask(() => closeWin(win.id, true));
      return true;
    });
    return () => setGuard(win.id, null);
  }, [win.id, ask]);

  const upd = () => {
    const el = ta.current;
    if (!el) return;
    const before = el.value.slice(0, el.selectionStart);
    const lines = before.split("\n");
    setPos({ ln: lines.length, col: lines[lines.length - 1].length + 1 });
  };
  const sel = () => ta.current && ta.current.value.slice(ta.current.selectionStart, ta.current.selectionEnd);
  const findNext = (back = false) => {
    const el = ta.current;
    if (!el || !find) return setDlg("find");
    const hay = mc ? el.value : el.value.toLowerCase();
    const nd = mc ? find : find.toLowerCase();
    let i = back ? hay.lastIndexOf(nd, el.selectionStart - 1) : hay.indexOf(nd, el.selectionEnd);
    if (i < 0) i = back ? hay.lastIndexOf(nd) : hay.indexOf(nd);
    if (i < 0) return msgBox({ title: "Notepad", text: `Cannot find "${find}"`, icon: "info" });
    el.focus();
    el.setSelectionRange(i, i + find.length);
    upd();
  };
  const replaceOne = () => {
    const el = ta.current;
    if (!el) return;
    const s = sel() || "";
    if ((mc ? s : s.toLowerCase()) === (mc ? find : find.toLowerCase()) && find) {
      el.setRangeText(rep, el.selectionStart, el.selectionEnd, "end");
      setText(el.value);
    }
    findNext();
  };
  const replaceAll = () => {
    if (!find) return;
    const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), mc ? "g" : "gi");
    const n = (text.match(re) || []).length;
    setText(text.replace(re, rep.replace(/\$/g, "$$$$")));
    msgBox({ title: "Notepad", text: `Replaced ${n} occurrence(s).`, icon: "info" });
  };
  const exec = (c: string) => {
    ta.current?.focus();
    document.execCommand(c);
    setText(ta.current?.value || "");
  };
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      const el = ta.current!;
      el.focus();
      el.setRangeText(t, el.selectionStart, el.selectionEnd, "end");
      setText(el.value);
    } catch {
      msgBox({ title: "Notepad", text: "Clipboard access was blocked by the browser. Use Ctrl+V.", icon: "warn" });
    }
  };

  const menus = [
    { label: "File", items: (): MenuItem[] => [
      { label: "New", shortcut: "Ctrl+N", onClick: () => ask(() => { setText(""); setSaved(""); setFileId(null); }) },
      { label: "New Window", onClick: () => openApp("notepad") },
      { label: "Open...", shortcut: "Ctrl+O", onClick: () => ask(() => openFileDialog({ mode: "open", exts: ["txt", "log", "ini", "bat", "js", "css", "md"], start: "docs", onDone: (id) => { const n = id && getState().fs[id]; if (n) { setFileId(n.id); const c = n.content?.startsWith("data:") ? "" : n.content || ""; setText(c); setSaved(c); recent("notepad", n.id); } } })) },
      { label: "Save", shortcut: "Ctrl+S", onClick: () => save() },
      { label: "Save As...", onClick: () => saveAs() },
      { sep: true },
      { label: "Page Setup...", onClick: () => msgBox({ title: "Page Setup", text: "Paper: Letter\nOrientation: Portrait\nMargins (inches): 0.75", icon: "info" }) },
      { label: "Print...", shortcut: "Ctrl+P", onClick: () => msgBox({ title: "Print", text: "No printer is installed. Install a printer using Devices and Printers in Control Panel.", icon: "warn" }) },
      { sep: true },
      { label: "Exit", onClick: () => closeWin(win.id) },
    ] },
    { label: "Edit", items: (): MenuItem[] => [
      { label: "Undo", shortcut: "Ctrl+Z", onClick: () => exec("undo") },
      { sep: true },
      { label: "Cut", shortcut: "Ctrl+X", onClick: () => exec("cut") },
      { label: "Copy", shortcut: "Ctrl+C", onClick: () => exec("copy") },
      { label: "Paste", shortcut: "Ctrl+V", onClick: paste },
      { label: "Delete", shortcut: "Del", onClick: () => { const el = ta.current; if (el) { el.setRangeText("", el.selectionStart, el.selectionEnd, "end"); setText(el.value); } } },
      { sep: true },
      { label: "Find...", shortcut: "Ctrl+F", onClick: () => setDlg("find") },
      { label: "Find Next", shortcut: "F3", onClick: () => findNext() },
      { label: "Replace...", shortcut: "Ctrl+H", onClick: () => setDlg("replace") },
      { label: "Go To...", shortcut: "Ctrl+G", disabled: wrap, onClick: () => setDlg("goto") },
      { sep: true },
      { label: "Select All", shortcut: "Ctrl+A", onClick: () => { ta.current?.focus(); ta.current?.select(); } },
      { label: "Time/Date", shortcut: "F5", onClick: () => { const el = ta.current; if (!el) return; const d = new Date(); el.setRangeText(d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " " + d.toLocaleDateString(), el.selectionStart, el.selectionEnd, "end"); setText(el.value); } },
    ] },
    { label: "Format", items: (): MenuItem[] => [
      { label: "Word Wrap", checked: wrap, onClick: () => setWrap(!wrap) },
      { label: "Font...", onClick: () => setDlg("font") },
    ] },
    { label: "View", items: (): MenuItem[] => [{ label: "Status Bar", checked: status && !wrap, disabled: wrap, onClick: () => setStatus(!status) }] },
    { label: "Help", items: (): MenuItem[] => [
      { label: "View Help", onClick: () => openApp("help") },
      { sep: true },
      { label: "About Notepad", onClick: () => msgBox({ title: "About Notepad", text: "Microsoft® Windows\nVersion 6.1 (Build 7601: Service Pack 1)\nCopyright © 2009 Microsoft Corporation", icon: "info" }) },
    ] },
  ];

  const keys = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    else if (e.ctrlKey && e.key.toLowerCase() === "f") { e.preventDefault(); setDlg("find"); }
    else if (e.ctrlKey && e.key.toLowerCase() === "h") { e.preventDefault(); setDlg("replace"); }
    else if (e.ctrlKey && e.key.toLowerCase() === "o") { e.preventDefault(); menus[0].items()[2].onClick?.(); }
    else if (e.ctrlKey && e.key.toLowerCase() === "n") { e.preventDefault(); menus[0].items()[0].onClick?.(); }
    else if (e.ctrlKey && e.key.toLowerCase() === "g" && !wrap) { e.preventDefault(); setDlg("goto"); }
    else if (e.key === "F3") { e.preventDefault(); findNext(e.shiftKey); }
    else if (e.key === "F5") { e.preventDefault(); menus[1].items()[11].onClick?.(); }
  };

  return (
    <div className="np" onKeyDown={keys}>
      <MenuBar menus={menus} />
      <textarea
        ref={ta}
        className="np-text"
        spellCheck={false}
        value={text}
        wrap={wrap ? "soft" : "off"}
        style={{ fontFamily: `${font.family}, monospace`, fontSize: font.size, whiteSpace: wrap ? "pre-wrap" : "pre" }}
        onChange={(e) => { setText(e.target.value); upd(); }}
        onKeyUp={upd}
        onClick={upd}
        onContextMenu={(e) => e.stopPropagation()}
        autoFocus
      />
      {status && !wrap && <div className="np-status"><span>Ln {pos.ln}, Col {pos.col}</span></div>}
      {dlg && (dlg === "find" || dlg === "replace") && (
        <div className="np-dlg" onKeyDown={(e) => e.stopPropagation()}>
          <div className="np-dlg-t">{dlg === "find" ? "Find" : "Replace"}<span onClick={() => setDlg(null)}>✕</span></div>
          <div className="np-dlg-b">
            <label>Find what:</label><input className="w7input" autoFocus value={find} onChange={(e) => setFind(e.target.value)} onKeyDown={(e) => e.key === "Enter" && findNext()} />
            {dlg === "replace" && <><label>Replace with:</label><input className="w7input" value={rep} onChange={(e) => setRep(e.target.value)} /></>}
            <Check checked={mc} onChange={setMc} label="Match case" />
            <div className="np-dlg-btns"><Btn def onClick={() => findNext()}>Find Next</Btn>{dlg === "replace" && <><Btn onClick={replaceOne}>Replace</Btn><Btn onClick={replaceAll}>Replace All</Btn></>}<Btn onClick={() => setDlg(null)}>Cancel</Btn></div>
          </div>
        </div>
      )}
      {dlg === "goto" && (
        <div className="np-dlg">
          <div className="np-dlg-t">Go To Line<span onClick={() => setDlg(null)}>✕</span></div>
          <div className="np-dlg-b"><label>Line number:</label><input className="w7input" autoFocus value={goto} onChange={(e) => setGoto(e.target.value)} />
            <div className="np-dlg-btns"><Btn def onClick={() => { const n = Math.max(1, parseInt(goto) || 1); const ls = text.split("\n"); if (n > ls.length) return msgBox({ title: "Notepad - Goto Line", text: "The line number is beyond the total number of lines", icon: "warn" }); const off = ls.slice(0, n - 1).reduce((a, l) => a + l.length + 1, 0); ta.current?.focus(); ta.current?.setSelectionRange(off, off); upd(); setDlg(null); }}>Go To</Btn><Btn onClick={() => setDlg(null)}>Cancel</Btn></div></div>
        </div>
      )}
      {dlg === "font" && (
        <div className="np-dlg">
          <div className="np-dlg-t">Font<span onClick={() => setDlg(null)}>✕</span></div>
          <div className="np-dlg-b">
            <label>Font:</label>
            <select className="w7input" value={font.family} onChange={(e) => setFont({ ...font, family: e.target.value })}>{["Consolas", "Courier New", "Lucida Console", "Arial", "Segoe UI", "Times New Roman", "Verdana", "Georgia"].map((f) => <option key={f}>{f}</option>)}</select>
            <label>Size:</label>
            <select className="w7input" value={font.size} onChange={(e) => setFont({ ...font, size: +e.target.value })}>{[9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map((f) => <option key={f}>{f}</option>)}</select>
            <div className="np-sample" style={{ fontFamily: font.family, fontSize: font.size }}>AaBbYyZz</div>
            <div className="np-dlg-btns"><Btn def onClick={() => setDlg(null)}>OK</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================ WordPad */
export function WordPad({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const ed = useRef<HTMLDivElement>(null);
  const [fileId, setFileId] = useState<string | null>(win.props.file || null);
  const [dirty, setDirty] = useState(false);
  const [fmt, setFmt] = useState({ b: false, i: false, u: false });
  const [zoom, setZoom] = useState(100);
  const st = useRef({ dirty, fileId });
  st.current = { dirty, fileId };
  const name = fileId ? fs[fileId]?.name || "Document" : "Document";
  useEffect(() => setWin(win.id, { title: `${name} - WordPad` }), [name, win.id]);

  const load = (id: string | null) => {
    const n = id ? getState().fs[id] : null;
    if (!ed.current) return;
    const c = n?.content || "";
    ed.current.innerHTML = c.startsWith("<") ? c : c.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
    setFileId(id);
    setDirty(false);
    if (id) recent("wordpad", id);
  };
  useEffect(() => load(win.props.file || null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAs = (then?: () => void) =>
    openFileDialog({ mode: "save", exts: ["rtf"], name: "Document.rtf", start: "docs", onDone: (id, nm, dir) => {
      const html = ed.current?.innerHTML || "";
      const nid = id ? (writeFile(id, html), id) : mkfile(dir, nm, html);
      setFileId(nid);
      setDirty(false);
      st.current.dirty = false;
      recent("wordpad", nid);
      then?.();
    } });
  const save = (then?: () => void) => {
    const f = st.current.fileId;
    if (f && getState().fs[f]) {
      writeFile(f, ed.current?.innerHTML || "");
      setDirty(false);
      st.current.dirty = false;
      then?.();
    } else saveAs(then);
  };
  const ask = (next: () => void) => {
    if (!st.current.dirty) return next();
    msgBox({ title: "WordPad", text: `Save changes to ${name}?`, icon: "warn", buttons: ["Save", "Don't Save", "Cancel"], onResult: (b) => b === "Save" ? save(next) : b === "Don't Save" && next() });
  };
  useEffect(() => {
    setGuard(win.id, () => {
      if (!st.current.dirty) return false;
      ask(() => closeWin(win.id, true));
      return true;
    });
    return () => setGuard(win.id, null);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const cmd = (c: string, v?: string) => {
    ed.current?.focus();
    document.execCommand(c, false, v);
    setDirty(true);
    refresh();
  };
  const refresh = () => setFmt({ b: document.queryCommandState("bold"), i: document.queryCommandState("italic"), u: document.queryCommandState("underline") });
  const fileMenu = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    import("../store").then((m) => m.showMenu({ x: r.left / m.view.scale, y: r.bottom / m.view.scale }, [
      { label: "New", onClick: () => ask(() => { if (ed.current) ed.current.innerHTML = ""; setFileId(null); setDirty(false); }) },
      { label: "Open", onClick: () => ask(() => openFileDialog({ mode: "open", exts: ["rtf", "doc", "txt"], start: "docs", onDone: (id) => id && load(id) })) },
      { label: "Save", onClick: () => save() },
      { label: "Save as", onClick: () => saveAs() },
      { sep: true },
      { label: "Print", onClick: () => msgBox({ title: "Print", text: "No printer is installed.", icon: "warn" }) },
      { label: "Page setup", onClick: () => msgBox({ title: "Page Setup", text: "Paper: Letter, Portrait", icon: "info" }) },
      { sep: true },
      { label: "About WordPad", onClick: () => msgBox({ title: "About WordPad", text: "Windows 7 WordPad\nVersion 6.1 (Build 7601)", icon: "info" }) },
      { label: "Exit", onClick: () => closeWin(win.id) },
    ]));
  };
  const find = () => {
    const q = prompt("Find what:");
    if (q) (window as unknown as { find: (s: string) => boolean }).find(q);
  };
  const Tb = ({ label, on, fn, title }: { label: React.ReactNode; on?: boolean; fn: () => void; title: string }) => (
    <button className={"rb-btn" + (on ? " on" : "")} title={title} onMouseDown={(e) => e.preventDefault()} onClick={fn}>{label}</button>
  );
  return (
    <div className="wp">
      <div className="ribbon-tabs"><div className="rt-file" onClick={fileMenu}>File ▾</div><div className="rt sel">Home</div><div className="rt">View</div></div>
      <div className="ribbon">
        <div className="rg"><div className="rg-body">
          <Tb label={<><Icon name="file" size={24} /><br />Paste</>} title="Paste" fn={async () => { try { const t = await navigator.clipboard.readText(); cmd("insertText", t); } catch { msgBox({ title: "WordPad", text: "Use Ctrl+V to paste.", icon: "info" }); } }} />
          <div><Tb label="✂ Cut" title="Cut" fn={() => cmd("cut")} /><Tb label="⎘ Copy" title="Copy" fn={() => cmd("copy")} /></div>
        </div><div className="rg-t">Clipboard</div></div>
        <div className="rg"><div className="rg-body col">
          <div>
            <select className="w7input" onChange={(e) => cmd("fontName", e.target.value)} defaultValue="Calibri">{["Calibri", "Arial", "Times New Roman", "Courier New", "Verdana", "Georgia", "Segoe UI"].map((f) => <option key={f}>{f}</option>)}</select>
            <select className="w7input" defaultValue="3" onChange={(e) => cmd("fontSize", e.target.value)}>{[["1", "8"], ["2", "10"], ["3", "12"], ["4", "14"], ["5", "18"], ["6", "24"], ["7", "36"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <div>
            <Tb label={<b>B</b>} on={fmt.b} title="Bold" fn={() => cmd("bold")} /><Tb label={<i>I</i>} on={fmt.i} title="Italic" fn={() => cmd("italic")} /><Tb label={<u>U</u>} on={fmt.u} title="Underline" fn={() => cmd("underline")} /><Tb label={<s>abc</s>} title="Strikethrough" fn={() => cmd("strikeThrough")} />
            <input type="color" title="Text color" defaultValue="#000000" onChange={(e) => cmd("foreColor", e.target.value)} className="rb-color" />
            <input type="color" title="Highlight" defaultValue="#ffff00" onChange={(e) => cmd("hiliteColor", e.target.value)} className="rb-color" />
          </div>
        </div><div className="rg-t">Font</div></div>
        <div className="rg"><div className="rg-body col">
          <div><Tb label="• List" title="Bullets" fn={() => cmd("insertUnorderedList")} /><Tb label="1. List" title="Numbering" fn={() => cmd("insertOrderedList")} /></div>
          <div><Tb label="⇤" title="Align left" fn={() => cmd("justifyLeft")} /><Tb label="↔" title="Center" fn={() => cmd("justifyCenter")} /><Tb label="⇥" title="Align right" fn={() => cmd("justifyRight")} /><Tb label="☰" title="Justify" fn={() => cmd("justifyFull")} /></div>
        </div><div className="rg-t">Paragraph</div></div>
        <div className="rg"><div className="rg-body">
          <Tb label={<><Icon name="clock" size={24} /><br />Date/time</>} title="Insert date and time" fn={() => cmd("insertText", new Date().toLocaleString())} />
          <Tb label={<><Icon name="image" size={24} /><br />Picture</>} title="Insert picture" fn={() => openFileDialog({ mode: "open", exts: ["jpg", "png", "bmp", "svg"], start: "pics", onDone: (id) => { const n = id ? getState().fs[id] : null; if (n?.content) cmd("insertHTML", `<img src="${n.content}" style="max-width:300px">`); } })} />
        </div><div className="rg-t">Insert</div></div>
        <div className="rg"><div className="rg-body col">
          <Tb label="🔍 Find" title="Find" fn={find} /><Tb label="Select all" title="Select all" fn={() => cmd("selectAll")} />
        </div><div className="rg-t">Editing</div></div>
      </div>
      <div className="wp-page-wrap">
        <div ref={ed} className="wp-page" contentEditable suppressContentEditableWarning spellCheck={false} style={{ zoom: zoom / 100 }} onInput={() => setDirty(true)} onKeyUp={refresh} onMouseUp={refresh} onContextMenu={(e) => e.stopPropagation()} />
      </div>
      <div className="wp-status"><span>{dirty ? "Modified" : "Saved"}</span><div style={{ flex: 1 }} /><span>{zoom}%</span><input type="range" className="w7range" min={50} max={200} value={zoom} onChange={(e) => setZoom(+e.target.value)} style={{ width: 120 }} /></div>
    </div>
  );
}

/* ============================================================= Calculator */
const FACT = (n: number): number => (n < 0 || n !== Math.floor(n) || n > 170 ? NaN : n <= 1 ? 1 : n * FACT(n - 1));
function evalTokens(tokens: string[]): number {
  const prec: Record<string, number> = { "+": 1, "-": 1, "×": 2, "÷": 2, mod: 2, "^": 3 };
  const out: number[] = [];
  const ops: string[] = [];
  const apply = () => {
    const o = ops.pop()!;
    const b = out.pop()!;
    const a = out.pop()!;
    if (a === undefined || b === undefined) throw new Error("Invalid input");
    switch (o) {
      case "+": out.push(a + b); break;
      case "-": out.push(a - b); break;
      case "×": out.push(a * b); break;
      case "÷": if (b === 0) throw new Error(a === 0 ? "Result is undefined" : "Cannot divide by zero"); out.push(a / b); break;
      case "mod": out.push(a % b); break;
      case "^": out.push(Math.pow(a, b)); break;
    }
  };
  for (const t of tokens) {
    if (t === "(") ops.push(t);
    else if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") apply();
      ops.pop();
    } else if (prec[t]) {
      while (ops.length && ops[ops.length - 1] !== "(" && (prec[ops[ops.length - 1]] > prec[t] || (prec[ops[ops.length - 1]] === prec[t] && t !== "^"))) apply();
      ops.push(t);
    } else out.push(parseFloat(t));
  }
  while (ops.length) {
    if (ops[ops.length - 1] === "(") ops.pop();
    else apply();
  }
  return out.length ? out[out.length - 1] : 0;
}
const fmtNum = (n: number) => (Number.isFinite(n) ? String(parseFloat(n.toPrecision(14))) : "Invalid input");

export function Calculator({ win }: { win: Win }) {
  const [sci, setSci] = useState(false);
  const [tokens, setTokens] = useState<string[]>([]);
  const [entry, setEntry] = useState("0");
  const [fresh, setFresh] = useState(true);
  const [mem, setMem] = useState(0);
  const [deg, setDeg] = useState(true);
  const [inv, setInv] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hist, setHist] = useState<string[]>([]);
  const [showHist, setShowHist] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setWin(win.id, { w: sci ? 548 : 262, h: showHist ? 480 : sci ? 392 : 392 }), [sci, win.id, showHist]);
  const cur = () => parseFloat(entry);
  const digit = (d: string) => { if (err) clear(); setEntry(fresh || entry === "0" ? d : entry.length < 16 ? entry + d : entry); setFresh(false); };
  const dot = () => { if (fresh) { setEntry("0."); setFresh(false); } else if (!entry.includes(".")) setEntry(entry + "."); };
  const clear = () => { setTokens([]); setEntry("0"); setFresh(true); setErr(null); };
  const partial = (t: string[]) => { try { const x = [...t]; if (/[+\-×÷^]|mod/.test(x[x.length - 1] || "") && x[x.length - 1] !== ")") x.pop(); return x.length ? fmtNum(evalTokens(x)) : null; } catch { return null; } };
  const op = (o: string) => {
    if (err) return;
    let t = [...tokens];
    if (fresh && t.length && !["(", ")"].includes(t[t.length - 1]) && t[t.length - 1] !== ")") {
      if (/[+\-×÷^]|mod/.test(t[t.length - 1])) t[t.length - 1] = o;
      else t.push(o);
    } else {
      if (t[t.length - 1] !== ")") t.push(entry);
      t.push(o);
    }
    setTokens(t);
    setFresh(true);
    if (!sci) { const p = partial(t); if (p) setEntry(p); }
  };
  const paren = (p: "(" | ")") => {
    const t = [...tokens];
    if (p === "(") t.push("(");
    else { if (t[t.length - 1] !== ")") t.push(entry); t.push(")"); }
    setTokens(t);
    setFresh(true);
  };
  const equals = () => {
    if (err) return;
    const t = [...tokens];
    if (!t.length) return setFresh(true);
    if (t[t.length - 1] !== ")") t.push(entry);
    try {
      const r = evalTokens(t);
      const s = fmtNum(r);
      setHist((h) => [t.join(" ") + " = " + s, ...h].slice(0, 20));
      setEntry(s);
      setTokens([]);
      setFresh(true);
    } catch (e) {
      setErr((e as Error).message);
      setTokens([]);
    }
  };
  const un = (f: (x: number) => number) => { if (err) return; const r = f(cur()); if (!Number.isFinite(r)) { setErr(r !== r ? "Invalid input" : "Overflow"); return; } setEntry(fmtNum(r)); setFresh(true); };
  const rad = (x: number) => (deg ? (x * Math.PI) / 180 : x);
  const unrad = (x: number) => (deg ? (x * 180) / Math.PI : x);
  const percent = () => { const prev = tokens.length >= 2 ? parseFloat(tokens[tokens.length - 2]) : 0; un((x) => (prev * x) / 100); };
  const back = () => { if (fresh || err) return; setEntry(entry.length > 1 ? entry.slice(0, -1) : "0"); };
  const sign = () => setEntry(entry.startsWith("-") ? entry.slice(1) : entry === "0" ? entry : "-" + entry);

  useEffect(() => { ref.current?.focus(); }, []);
  const key = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (/^[0-9]$/.test(k)) digit(k);
    else if (k === ".") dot();
    else if (k === "+") op("+");
    else if (k === "-") op("-");
    else if (k === "*") op("×");
    else if (k === "/") { e.preventDefault(); op("÷"); }
    else if (k === "Enter" || k === "=") { e.preventDefault(); equals(); }
    else if (k === "Backspace") back();
    else if (k === "Escape") clear();
    else if (k === "Delete") { setEntry("0"); setFresh(true); }
    else if (k === "%") percent();
    else if (k === "(" && sci) paren("(");
    else if (k === ")" && sci) paren(")");
    else if (e.ctrlKey && k.toLowerCase() === "c") navigator.clipboard?.writeText(entry).catch(() => {});
    else if (e.ctrlKey && k.toLowerCase() === "l") setMem(0);
    else if (e.ctrlKey && k.toLowerCase() === "m") setMem(cur());
    else if (e.ctrlKey && k.toLowerCase() === "r") { setEntry(fmtNum(mem)); setFresh(true); }
    else if (e.ctrlKey && k.toLowerCase() === "p") setMem(mem + cur());
    else if (e.ctrlKey && k.toLowerCase() === "q") setMem(mem - cur());
    else if (e.ctrlKey && k.toLowerCase() === "v") navigator.clipboard?.readText().then((t) => { const n = parseFloat(t); if (!isNaN(n)) { setEntry(fmtNum(n)); setFresh(true); } }).catch(() => {});
  };

  const B = ({ l, f, cls = "" }: { l: React.ReactNode; f: () => void; cls?: string }) => <button className={"cb2 " + cls} onClick={() => { f(); ref.current?.focus(); }}>{l}</button>;
  const menus = [
    { label: "View", items: (): MenuItem[] => [{ label: "Standard", checked: !sci, radio: true, onClick: () => { setSci(false); clear(); } }, { label: "Scientific", checked: sci, radio: true, onClick: () => { setSci(true); clear(); } }, { sep: true }, { label: "History", checked: showHist, onClick: () => setShowHist(!showHist) }] },
    { label: "Edit", items: (): MenuItem[] => [{ label: "Copy", shortcut: "Ctrl+C", onClick: () => navigator.clipboard?.writeText(entry).catch(() => {}) }, { label: "Paste", shortcut: "Ctrl+V", onClick: () => navigator.clipboard?.readText().then((t) => { const n = parseFloat(t); if (!isNaN(n)) { setEntry(fmtNum(n)); setFresh(true); } }).catch(() => {}) }, { sep: true }, { label: "Clear history", onClick: () => setHist([]) }] },
    { label: "Help", items: (): MenuItem[] => [{ label: "View Help", onClick: () => openApp("help") }, { sep: true }, { label: "About Calculator", onClick: () => msgBox({ title: "About Calculator", text: "Windows 7 Calculator\nVersion 6.1 (Build 7601)", icon: "info" }) }] },
  ];
  const display = err ?? (entry.length > 18 ? Number(entry).toExponential(8) : entry);
  return (
    <div className="calc" ref={ref} tabIndex={0} onKeyDown={key}>
      <MenuBar menus={menus} />
      <div className="calc-disp">
        <div className="calc-expr">{tokens.join(" ")}</div>
        <div className="calc-num">{display}</div>
      </div>
      <div className="calc-mem"><span>{mem !== 0 ? "M" : ""}</span></div>
      <div className="calc-body">
        {sci && (
          <div className="calc-sci">
            <div className="calc-radio"><label><input type="radio" checked={deg} onChange={() => setDeg(true)} /> Degrees</label><label><input type="radio" checked={!deg} onChange={() => setDeg(false)} /> Radians</label><label><input type="checkbox" checked={inv} onChange={(e) => setInv(e.target.checked)} /> Inv</label></div>
            <div className="calc-grid c5">
              <B l="(" f={() => paren("(")} cls="s" /><B l=")" f={() => paren(")")} cls="s" /><B l="mod" f={() => op("mod")} cls="s" /><B l="n!" f={() => un(FACT)} cls="s" /><B l="π" f={() => { setEntry(String(Math.PI)); setFresh(true); }} cls="s" />
              <B l={inv ? "asin" : "sin"} f={() => un((x) => (inv ? unrad(Math.asin(x)) : Math.sin(rad(x))))} cls="s" /><B l={inv ? "acos" : "cos"} f={() => un((x) => (inv ? unrad(Math.acos(x)) : Math.cos(rad(x))))} cls="s" /><B l={inv ? "atan" : "tan"} f={() => un((x) => (inv ? unrad(Math.atan(x)) : Math.tan(rad(x))))} cls="s" /><B l={inv ? "10ˣ" : "log"} f={() => un((x) => (inv ? Math.pow(10, x) : Math.log10(x)))} cls="s" /><B l={inv ? "eˣ" : "ln"} f={() => un((x) => (inv ? Math.exp(x) : Math.log(x)))} cls="s" />
              <B l="x²" f={() => un((x) => x * x)} cls="s" /><B l="x³" f={() => un((x) => x * x * x)} cls="s" /><B l="xʸ" f={() => op("^")} cls="s" /><B l="e" f={() => { setEntry(String(Math.E)); setFresh(true); }} cls="s" /><B l="Exp" f={() => un((x) => x * 1)} cls="s" />
            </div>
          </div>
        )}
        <div className="calc-main">
          <div className="calc-grid c5 mem">
            <B l="MC" f={() => setMem(0)} cls="m" /><B l="MR" f={() => { setEntry(fmtNum(mem)); setFresh(true); }} cls="m" /><B l="MS" f={() => setMem(cur())} cls="m" /><B l="M+" f={() => setMem(mem + cur())} cls="m" /><B l="M-" f={() => setMem(mem - cur())} cls="m" />
          </div>
          <div className="calc-grid c5">
            <B l="←" f={back} cls="o" /><B l="CE" f={() => { setEntry("0"); setFresh(true); setErr(null); }} cls="o" /><B l="C" f={clear} cls="o" /><B l="±" f={sign} cls="o" /><B l="√" f={() => un(Math.sqrt)} cls="o" />
            <B l="7" f={() => digit("7")} /><B l="8" f={() => digit("8")} /><B l="9" f={() => digit("9")} /><B l="/" f={() => op("÷")} cls="o" /><B l="%" f={percent} cls="o" />
            <B l="4" f={() => digit("4")} /><B l="5" f={() => digit("5")} /><B l="6" f={() => digit("6")} /><B l="*" f={() => op("×")} cls="o" /><B l="1/x" f={() => un((x) => 1 / x)} cls="o" />
            <B l="1" f={() => digit("1")} /><B l="2" f={() => digit("2")} /><B l="3" f={() => digit("3")} /><B l="-" f={() => op("-")} cls="o" /><B l="=" f={equals} cls="eq" />
            <B l="0" f={() => digit("0")} cls="zero" /><B l="." f={dot} /><B l="+" f={() => op("+")} cls="o" />
          </div>
        </div>
      </div>
      {showHist && <div className="calc-hist"><b>History</b>{hist.length ? hist.map((h, i) => <div key={i}>{h}</div>) : <div style={{ color: "#777" }}>There&apos;s no history yet.</div>}</div>}
    </div>
  );
}

/* ============================================================= Char Map */
const SUBSETS: Record<string, [number, number]> = { "Latin": [0x20, 0x17f], "Greek": [0x370, 0x3ff], "Cyrillic": [0x400, 0x4ff], "Arrows": [0x2190, 0x21ff], "Mathematical Operators": [0x2200, 0x22ff], "Box Drawing": [0x2500, 0x257f], "Currency Symbols": [0x20a0, 0x20bf], "Miscellaneous Symbols": [0x2600, 0x26ff], "Dingbats": [0x2700, 0x27bf] };
export function CharMap() {
  const [font, setFont] = useState("Arial");
  const [sub, setSub] = useState("Latin");
  const [sel, setSel] = useState(0x41);
  const [copy, setCopy] = useState("");
  const [lo, hi] = SUBSETS[sub];
  const chars = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((c) => !(c >= 0x7f && c < 0xa0));
  return (
    <div className="cm">
      <div className="cm-top">
        <label>Font:</label>
        <select className="w7input" value={font} onChange={(e) => setFont(e.target.value)}>{["Arial", "Segoe UI", "Times New Roman", "Courier New", "Verdana", "Georgia", "Consolas"].map((f) => <option key={f}>{f}</option>)}</select>
        <label style={{ marginLeft: 12 }}>Group by:</label>
        <select className="w7input" value={sub} onChange={(e) => { setSub(e.target.value); setSel(SUBSETS[e.target.value][0]); }}>{Object.keys(SUBSETS).map((f) => <option key={f}>{f}</option>)}</select>
      </div>
      <div className="cm-grid" style={{ fontFamily: font }}>
        {chars.map((c) => <div key={c} className={"cm-cell" + (sel === c ? " sel" : "")} onClick={() => setSel(c)} onDoubleClick={() => setCopy(copy + String.fromCodePoint(c))}>{String.fromCodePoint(c)}</div>)}
      </div>
      <div className="cm-zoom" style={{ fontFamily: font }}>{String.fromCodePoint(sel)}</div>
      <div className="cm-bot">
        <label>Characters to copy:</label>
        <input className="w7input" value={copy} onChange={(e) => setCopy(e.target.value)} style={{ flex: 1 }} />
        <Btn def onClick={() => setCopy(copy + String.fromCodePoint(sel))}>Select</Btn>
        <Btn onClick={() => { navigator.clipboard?.writeText(copy).then(() => notify({ title: "Character Map", text: "Copied to clipboard.", icon: "info" })).catch(() => msgBox({ title: "Character Map", text: "Clipboard access was blocked.", icon: "warn" })); }}>Copy</Btn>
      </div>
      <div className="cm-status">U+{sel.toString(16).toUpperCase().padStart(4, "0")}: {String.fromCodePoint(sel)}</div>
    </div>
  );
}

/* ============================================================ Sticky Notes */
interface Note { text: string; color: string }
const NOTE_COLORS = ["#fff59a", "#ffc4e1", "#c5f0a4", "#b5ddff", "#e3c7ff", "#ffd8a8"];
export function StickyNotes({ win }: { win: Win }) {
  const [id] = useState<string>(() => {
    if (win.props.noteId) return win.props.noteId as string;
    const notes = lsGet<Record<string, Note>>("win7.sticky", {});
    const open = getState().windows.filter((w) => w.app === "sticky" && w.id !== win.id).map((w) => w.props?.noteId);
    const free = win.props.fresh ? [] : Object.keys(notes).filter((k) => !open.includes(k));
    if (free.length) {
      free.slice(1).forEach((k) => setTimeout(() => openApp("sticky", { noteId: k }), 50));
      return free[0];
    }
    const nid = uid();
    lsSet("win7.sticky", { ...notes, [nid]: { text: "", color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)] } });
    return nid;
  });
  const [note, setNote] = useState<Note>(() => lsGet<Record<string, Note>>("win7.sticky", {})[id] || { text: "", color: NOTE_COLORS[0] });
  const save = (n: Note) => {
    setNote(n);
    lsSet("win7.sticky", { ...lsGet<Record<string, Note>>("win7.sticky", {}), [id]: n });
  };
  useEffect(() => setWin(win.id, { props: { ...win.props, noteId: id }, title: "Sticky Notes" }), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="sticky" style={{ background: note.color }}>
      <div className="sticky-bar win-drag" style={{ background: note.color }}>
        <span className="sb-btn" title="New note" onClick={() => openApp("sticky", { fresh: true })}>+</span>
        <span style={{ flex: 1 }} />
        <span className="sb-btn" title="Change color" onClick={() => save({ ...note, color: NOTE_COLORS[(NOTE_COLORS.indexOf(note.color) + 1) % NOTE_COLORS.length] })}>●</span>
        <span className="sb-btn" title="Delete note" onClick={() => msgBox({ title: "Sticky Notes", text: "Are you sure you want to delete this note?", icon: "warn", buttons: ["Yes", "No"], onResult: (b) => { if (b === "Yes") { const all = lsGet<Record<string, Note>>("win7.sticky", {}); delete all[id]; lsSet("win7.sticky", all); closeWin(win.id, true); } } })}>✕</span>
      </div>
      <textarea className="sticky-text" value={note.text} placeholder="Type a note..." onChange={(e) => save({ ...note, text: e.target.value })} onContextMenu={(e) => e.stopPropagation()} />
    </div>
  );
}

/* ============================================================== Magnifier */
export function Magnifier({ win }: { win: Win }) {
  const mag = useStore((s) => s.mag);
  const [invert, setInvert] = useState(false);
  useEffect(() => {
    setState({ mag: { on: true, level: getState().mag.level < 1.5 ? 2 : getState().mag.level } });
    return () => setState({ mag: { on: false, level: getState().mag.level } });
  }, []);
  useEffect(() => {
    const el = document.querySelector(".mag-wrap") as HTMLElement | null;
    if (el) el.style.filter = invert ? "invert(1) hue-rotate(180deg)" : "";
    return () => { if (el) el.style.filter = ""; };
  }, [invert]);
  void win;
  return (
    <div className="mgf">
      <Icon name="magnifier" size={32} />
      <Btn onClick={() => setState({ mag: { ...mag, level: Math.max(1, mag.level - 0.5) } })} style={{ minWidth: 30 }}>−</Btn>
      <b style={{ width: 50, textAlign: "center" }}>{Math.round(mag.level * 100)}%</b>
      <Btn onClick={() => setState({ mag: { ...mag, level: Math.min(8, mag.level + 0.5) } })} style={{ minWidth: 30 }}>+</Btn>
      <Check checked={invert} onChange={setInvert} label="Invert colors" />
      <span style={{ color: "#555" }}>Full screen view. Move the mouse to pan.</span>
      {void extOf}
    </div>
  );
}
