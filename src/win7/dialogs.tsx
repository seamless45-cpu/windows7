"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Win, closeWin, setWin, useStore, getState, setState, msgBox, openApp, runCommand, lsGet, lsSet, children, extOf, kindOf, pathOf, fmtDate, fmtSize, fmtBig, emptyTrash, trashed, setSettings,
  notify, mkdir, FsNode, uid, Installed,
} from "./store";
import { APPS } from "./registry";
import { Icon, nodeIcon } from "./icons";
import { Btn, Tabs, Check, GroupBox, InlineEdit } from "./ui";
import { playSys } from "./sound";
import { useAutoFocus } from "./softKeyboard";

export function emptyRecycle() {
  const n = trashed().length;
  if (!n) return msgBox({ title: "Recycle Bin", text: "The Recycle Bin is already empty.", icon: "info" });
  msgBox({
    title: "Delete Multiple Items",
    text: `Are you sure you want to permanently delete these ${n} items?`,
    icon: "question",
    buttons: ["Yes", "No"],
    onResult: (b) => {
      if (b !== "Yes") return;
      openApp("progress", { title: "Deleting", text: `Deleting ${n} items from the Recycle Bin`, ms: 1100, icon: "recycle", onDone: emptyTrash }, { title: "Deleting" });
    },
  });
}

/* ------------------------------------------------------------- MsgBox */
export function MsgBox({ win }: { win: Win }) {
  const p = win.props || {};
  const buttons: string[] = Array.isArray(p.buttons) && p.buttons.length ? p.buttons : ["OK"];
  const done = (b: string) => {
    closeWin(win.id, true);
    setTimeout(() => p.onResult?.(b), 0);
  };
  return (
    <div className="dlg">
      <div className="dlg-main">
        <Icon name={p.icon === "warn" ? "warn" : p.icon || "info"} size={40} />
        <div className="dlg-text">{p.text || ""}</div>
      </div>
      <div className="dlg-foot">
        {buttons.map((b, i) => (
          <Btn key={b} def={i === 0} onClick={() => done(b)}>{b}</Btn>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- UAC */
export function Uac({ win }: { win: Win }) {
  const p = win.props;
  const [more, setMore] = useState(false);
  return (
    <div className="uac">
      <div className="uac-head">
        <b>Do you want to allow the following program to make changes to this computer?</b>
      </div>
      <div className="uac-body">
        <Icon name="shield" size={48} />
        <div>
          <div className="uac-name">{p.name}</div>
          <div>Verified publisher: <b>{p.publisher || "Microsoft Windows"}</b></div>
          <div style={{ color: "#555" }}>File origin: Hard drive on this computer</div>
        </div>
      </div>
      {more && <div className="uac-more">Program location: {p.path || "C:\\Windows\\System32\\" + String(p.name).replace(/\s/g, "") + ".exe"}</div>}
      <div className="uac-foot">
        <a onClick={() => setMore(!more)}>{more ? "Hide details" : "Show details"}</a>
        <div>
          <Btn def onClick={() => { closeWin(win.id, true); playSys("ding"); p.onAllow?.(); }}>Yes</Btn>
          <Btn onClick={() => closeWin(win.id, true)}>No</Btn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Progress */
export function Progress({ win }: { win: Win }) {
  const p = win.props;
  const [v, setV] = useState(0);
  const parent = useRef<string | null>(null);
  useEffect(() => {
    const st = getState();
    const par = st.windows.filter((w) => !APPS[w.app].noTask && !w.closing).sort((a, b) => b.z - a.z)[0];
    parent.current = par?.id || null;
    const t0 = performance.now();
    const ms = p.ms || 1000;
    let raf = 0;
    let fin = false;
    const tick = () => {
      const x = Math.min(1, (performance.now() - t0) / ms);
      setV(x);
      if (parent.current) setWin(parent.current, { progress: x });
      if (x >= 1) {
        fin = true;
        if (parent.current) setWin(parent.current, { progress: null });
        closeWin(win.id, true);
        p.onDone?.();
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (!fin && parent.current) setWin(parent.current, { progress: null });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="dlg">
      <div className="dlg-main col">
        <div className="prog-anim">
          <Icon name="folder" size={32} />
          <div className="prog-flyers"><Icon name="file" size={22} /><Icon name="txt" size={22} /><Icon name="image" size={22} /></div>
          <Icon name={p.icon || "folder"} size={32} />
        </div>
        <div className="dlg-text">{p.text || ""}</div>
        <div className="pbar"><div style={{ width: v * 100 + "%" }} /></div>
        <div style={{ color: "#444", fontSize: 11 }}>{Math.round(v * 100)}% complete</div>
      </div>
      <div className="dlg-foot"><Btn onClick={() => closeWin(win.id, true)}>Cancel</Btn></div>
    </div>
  );
}

/* ------------------------------------------------------------ InputBox */
export function InputBox({ win }: { win: Win }) {
  const p = win.props;
  const [v, setV] = useState(p.value || "");
  // Focused for typing, but without summoning a mobile keyboard.
  const autoRef = useAutoFocus<HTMLInputElement>();
  const ok = () => {
    closeWin(win.id, true);
    p.onOk?.(v);
  };
  return (
    <div className="dlg">
      <div className="dlg-main col">
        <div>{p.text}</div>
        <input ref={autoRef} className="w7input" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ok()} />
      </div>
      <div className="dlg-foot"><Btn def onClick={ok}>OK</Btn><Btn onClick={() => closeWin(win.id, true)}>Cancel</Btn></div>
    </div>
  );
}

/* ----------------------------------------------------------------- Run */
export function Run({ win }: { win: Win }) {
  const [v, setV] = useState("");
  const runRef = useAutoFocus<HTMLInputElement>();
  const hist = lsGet<string[]>("win7.runhist", []);
  const go = () => {
    if (!v.trim()) return;
    lsSet("win7.runhist", [v, ...hist.filter((h) => h !== v)].slice(0, 12));
    closeWin(win.id, true);
    setTimeout(() => runCommand(v), 30);
  };
  return (
    <div className="dlg run">
      <div className="dlg-main" style={{ alignItems: "flex-start" }}>
        <Icon name="run" size={40} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 12px" }}>Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label>Open:</label>
            <input ref={runRef} className="w7input" list="run-hist" style={{ flex: 1 }} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
            <datalist id="run-hist">{hist.map((h) => <option key={h} value={h} />)}</datalist>
          </div>
        </div>
      </div>
      <div className="dlg-foot">
        <Btn def onClick={go}>OK</Btn>
        <Btn onClick={() => closeWin(win.id, true)}>Cancel</Btn>
        <Btn onClick={() => openFileDialog({ mode: "open", title: "Browse", onDone: (id) => id && setV(pathOf(id)) })}>Browse...</Btn>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Winver */
export function Winver({ win }: { win: Win }) {
  const u = useStore((s) => s.settings.currentUser);
  return (
    <div className="dlg winver">
      <div className="winver-banner"><Icon name="flag" size={52} /><div><span>Windows</span><sup>7</sup><em>Ultimate</em></div></div>
      <div className="dlg-main col" style={{ gap: 8 }}>
        <div>Microsoft Windows<br />Version 6.1 (Build 7601: Service Pack 1)<br />Copyright © 2009 Microsoft Corporation. All rights reserved.</div>
        <div style={{ color: "#333" }}>The Windows 7 Ultimate operating system and its user interface are protected by trademark and other pending or existing intellectual property rights.<br /><br />This product is licensed under the Microsoft Software License Terms to:<br /><b>{u}</b></div>
      </div>
      <div className="dlg-foot"><Btn def onClick={() => closeWin(win.id)}>OK</Btn></div>
    </div>
  );
}

/* --------------------------------------------------------------- Setup */
export function Setup({ win }: { win: Win }) {
  const name: string = win.props.name || "Sample Program";
  const [step, setStep] = useState(0);
  const [v, setV] = useState(0);
  const [agree, setAgree] = useState(false);
  useEffect(() => {
    if (step !== 2) return;
    const i = setInterval(() => setV((x) => Math.min(100, x + 4 + Math.random() * 5)), 200);
    return () => clearInterval(i);
  }, [step]);
  useEffect(() => {
    if (v >= 100 && step === 2) {
      const s = getState().settings;
      const entry: Installed = { id: uid(), name, publisher: "Sample Software Inc.", size: (2 + Math.random() * 40).toFixed(1) + " MB", date: new Date().toLocaleDateString("en-US"), version: "1.0.0" };
      setSettings({ installed: [...s.installed.filter((x) => x.name !== name), entry] });
      setStep(3);
      notify({ title: "Installation complete", text: name + " was installed successfully.", icon: "info" });
    }
  }, [v, step, name]);
  const steps = [
    <div key="0"><h3>Welcome to the {name} Setup Wizard</h3><p>This wizard will guide you through the installation of {name} on your computer.</p><p>Click Next to continue, or Cancel to exit Setup.</p></div>,
    <div key="1"><h3>License Agreement</h3><textarea readOnly className="w7input" style={{ width: "100%", height: 90 }} value={"END-USER LICENSE AGREEMENT\n\nThis is a simulated installer. No files will be written to your computer. By continuing you accept these simulated terms."} /><Check checked={agree} onChange={setAgree} label="I accept the terms in the License Agreement" /></div>,
    <div key="2"><h3>Installing {name}</h3><p>Please wait while Setup installs {name}...</p><div className="pbar"><div style={{ width: v + "%" }} /></div><p style={{ color: "#555" }}>Copying new files... {Math.round(v)}%</p></div>,
    <div key="3"><h3>Completed the {name} Setup Wizard</h3><p>{name} has been successfully installed. It now appears in Programs and Features.</p></div>,
  ];
  return (
    <div className="dlg">
      <div className="dlg-main" style={{ alignItems: "flex-start" }}>
        <Icon name="setup" size={64} />
        <div style={{ flex: 1 }}>{steps[step]}</div>
      </div>
      <div className="dlg-foot">
        {step < 2 && <Btn def disabled={step === 1 && !agree} onClick={() => setStep(step + 1)}>Next &gt;</Btn>}
        {step === 3 && <Btn def onClick={() => closeWin(win.id, true)}>Finish</Btn>}
        {step < 3 && <Btn onClick={() => closeWin(win.id, true)}>Cancel</Btn>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Properties */
function sizeOf(id: string, fs: Record<string, FsNode>): { size: number; files: number; folders: number } {
  let size = 0, files = 0, folders = 0;
  const walk = (i: string) => {
    for (const c of Object.values(fs)) {
      if (c.parent !== i || c.trash) continue;
      if (c.type === "folder") {
        folders++;
        walk(c.id);
      } else {
        files++;
        size += c.size;
      }
    }
  };
  walk(id);
  return { size, files, folders };
}

export function Props({ win }: { win: Win }) {
  const t = win.props as { kind: "fs"; id: string } | { kind: "sys"; key: string };
  const fs = useStore((s) => s.fs);
  const [tab, setTab] = useState("General");
  const [shared, setShared] = useState(false);
  const [rb, setRb] = useState<"dedicate" | "use" | "none">(() => lsGet("win7.readyboost", "none"));
  const n = t.kind === "fs" ? fs[t.id] : null;
  const [hidden, setHidden] = useState(!!n?.hidden);
  const [ro, setRo] = useState(false);
  const apply = () => {
    if (n) setState({ fs: { ...getState().fs, [n.id]: { ...n, hidden } } });
    // ReadyBoost and sharing are per-device settings in Windows; keep them in
    // the shell's local storage rather than in the virtual file system.
    lsSet("win7.readyboost", rb);
    if (shared && n) lsSet("win7.shared." + n.id, "1");
  };
  if (t.kind === "sys") {
    const items = trashed(fs);
    const total = items.reduce((a, b) => a + b.size, 0);
    return (
      <div className="dlg props">
        <div className="props-body">
          <div className="props-head"><Icon name="recycle" size={32} /><b>Recycle Bin</b></div>
          <hr />
          <p>Items in Recycle Bin: {items.length}<br />Total size: {fmtBig(total)}</p>
          <GroupBox title="Settings for selected location"><p>Maximum size of Recycle Bin: 20,480 MB</p></GroupBox>
        </div>
        <div className="dlg-foot"><Btn def onClick={() => closeWin(win.id, true)}>OK</Btn><Btn onClick={() => closeWin(win.id, true)}>Cancel</Btn></div>
      </div>
    );
  }
  if (!n) return <div className="dlg"><div className="dlg-main">Item no longer exists.</div></div>;
  const isDrive = n.parent === null;
  const info = n.type === "folder" ? sizeOf(n.id, fs) : null;
  const used = (n.total || 0) - (n.free || 0);
  return (
    <div className="dlg props">
      <Tabs tabs={isDrive ? ["General", "Tools", "Hardware", "Sharing", "ReadyBoost", "Previous Versions"] : ["General", "Security", "Details", "Previous Versions"]} value={tab} onChange={setTab} />
      <div className="props-body">
        {tab === "General" && (
          <>
            <div className="props-head"><Icon name={nodeIcon(n)} size={32} /><span className="props-name">{n.name}</span></div>
            <hr />
            <table className="props-t"><tbody>
              <tr><td>Type:</td><td>{kindOf(n)}{n.type === "file" && extOf(n.name) ? ` (.${extOf(n.name)})` : ""}</td></tr>
              {!isDrive && <tr><td>Location:</td><td>{pathOf(n.parent as string)}</td></tr>}
              {isDrive ? (
                <>
                  <tr><td>File system:</td><td>NTFS</td></tr>
                  <tr><td>Used space:</td><td>{used.toLocaleString()} bytes ({fmtBig(used)})</td></tr>
                  <tr><td>Free space:</td><td>{(n.free || 0).toLocaleString()} bytes ({fmtBig(n.free || 0)})</td></tr>
                  <tr><td>Capacity:</td><td>{(n.total || 0).toLocaleString()} bytes ({fmtBig(n.total || 0)})</td></tr>
                </>
              ) : (
                <>
                  <tr><td>Size:</td><td>{info ? `${fmtBig(info.size)} (${info.size.toLocaleString()} bytes)` : `${fmtBig(n.size)} (${n.size.toLocaleString()} bytes)`}</td></tr>
                  {info && <tr><td>Contains:</td><td>{info.files} Files, {info.folders} Folders</td></tr>}
                  <tr><td>Created:</td><td>{fmtDate(n.created)}</td></tr>
                  <tr><td>Modified:</td><td>{fmtDate(n.modified)}</td></tr>
                </>
              )}
            </tbody></table>
            {isDrive ? (
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <svg width="100" height="80" viewBox="0 0 100 80"><ellipse cx="50" cy="44" rx="40" ry="26" fill="#d8a9f7" stroke="#555" /><path d={`M50 44 L90 44 A40 26 0 ${used / (n.total || 1) > 0.5 ? 1 : 0} 1 ${50 + 40 * Math.cos(2 * Math.PI * (used / (n.total || 1)))} ${44 + 26 * Math.sin(2 * Math.PI * (used / (n.total || 1)))}Z`} fill="#4a7cf0" stroke="#555" /></svg>
                <div>Drive {n.letter}</div>
              </div>
            ) : (
              <>
                <hr />
                <div className="props-attr">Attributes: <Check checked={ro} onChange={setRo} label="Read-only" /> <Check checked={hidden} onChange={setHidden} label="Hidden" /></div>
              </>
            )}
          </>
        )}
        {tab === "Security" && <div><p>Object name: {pathOf(n.id)}</p><GroupBox title="Group or user names:"><div>SYSTEM<br />Administrators (PC\Administrators)<br />{getState().settings.currentUser} (PC\{getState().settings.currentUser})</div></GroupBox></div>}
        {tab === "Details" && <table className="props-t"><tbody><tr><td>Name</td><td>{n.name}</td></tr><tr><td>Item type</td><td>{kindOf(n)}</td></tr><tr><td>Folder path</td><td>{pathOf(n.id)}</td></tr><tr><td>Size</td><td>{fmtSize(n.size)}</td></tr><tr><td>Date created</td><td>{fmtDate(n.created)}</td></tr><tr><td>Date modified</td><td>{fmtDate(n.modified)}</td></tr><tr><td>Owner</td><td>{getState().settings.currentUser}</td></tr></tbody></table>}
        {tab === "Tools" && (
          <div>
            <GroupBox title="Error-checking">
              <p>This option will check the volume for errors.</p>
              <Btn onClick={() => msgBox({ title: "Windows", text: "Your disk was successfully scanned. Windows found no errors.", icon: "info" })}>Check now...</Btn>
            </GroupBox>
            <GroupBox title="Defragmentation">
              <p>This option will defragment files on this volume.</p>
              <Btn onClick={() => openApp("cleanmgr")}>Defragment now...</Btn>
            </GroupBox>
            <GroupBox title="Backup">
              <p>This option will back up files on this volume.</p>
              <Btn onClick={() => openApp("backup")}>Back up now...</Btn>
            </GroupBox>
          </div>
        )}
        {tab === "Hardware" && (
          <GroupBox title="All disk drives">
            <table className="props-t"><tbody>
              <tr><td>Type:</td><td>Disk drives</td></tr>
              <tr><td>Manufacturer:</td><td>(Standard disk drives)</td></tr>
              <tr><td>Location:</td><td>System Reserved</td></tr>
              <tr><td>Device type:</td><td>Disk drives</td></tr>
              <tr><td>Device status:</td><td>This device is working properly.</td></tr>
            </tbody></table>
          </GroupBox>
        )}
        {tab === "Sharing" && (
          <GroupBox title="Network File and Folder Sharing">
            <p>Not shared</p>
            <Btn onClick={() => setShared(true)}>Advanced Sharing...</Btn>
            {shared && <p className="props-note">Shared as <b>{n.name.replace(/[():\\/]/g, "")}</b> — permissions: Everyone (Read).</p>}
          </GroupBox>
        )}
        {tab === "ReadyBoost" && (
          <GroupBox title="ReadyBoost">
            <p>ReadyBoost can speed up your computer by using storage space on most USB flash drives and flash memory cards.</p>
            <p>
              <label style={{ display: "block" }}><input type="radio" name="rb" checked={rb === "dedicate"} onChange={() => setRb("dedicate")} /> Dedicate this device to ReadyBoost</label>
              <label style={{ display: "block" }}><input type="radio" name="rb" checked={rb === "use"} onChange={() => setRb("use")} /> Use this device</label>
              <label style={{ display: "block" }}><input type="radio" name="rb" checked={rb === "none"} onChange={() => setRb("none")} /> Do not use this device</label>
            </p>
            <p className="props-note">{rb === "none" ? "ReadyBoost is not enabled on this device." : `Reserved for system speed: ${rb === "dedicate" ? "all available" : "4,096"} MB of the free space on this device.`}</p>
          </GroupBox>
        )}
        {(tab === "Previous Versions") && (
          <div>
            <p>Previous versions come from restore points or from Windows Backup. This simulation keeps neither, so there is nothing to restore here.</p>
            <table className="props-t"><tbody><tr><td colSpan={2} style={{ color: "#666" }}>There are no previous versions available.</td></tr></tbody></table>
            <p><Btn disabled>Open</Btn> <Btn disabled>Copy...</Btn> <Btn disabled>Restore...</Btn></p>
          </div>
        )}
      </div>
      <div className="dlg-foot">
        <Btn def onClick={() => { apply(); closeWin(win.id, true); }}>OK</Btn>
        <Btn onClick={() => closeWin(win.id, true)}>Cancel</Btn>
        <Btn onClick={apply}>Apply</Btn>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ FileDialog */
export interface FileDlgOpts {
  mode: "open" | "save";
  title?: string;
  exts?: string[];
  name?: string;
  start?: string;
  onDone: (id: string | null, name: string, dir: string) => void;
}
export function openFileDialog(o: FileDlgOpts) {
  openApp("filedlg", o, { title: o.title || (o.mode === "open" ? "Open" : "Save As"), w: 640, h: 440 });
}

const PLACES: [string, string, string][] = [["desk", "Desktop", "desktop"], ["docs", "Documents", "docs"], ["pics", "Pictures", "pictures"], ["music", "Music", "music"], ["vids", "Videos", "videos"], ["dl", "Downloads", "downloads"], ["c", "Local Disk (C:)", "drive"], ["d", "Data (D:)", "drive"]];

export function FileDialog({ win }: { win: Win }) {
  const p = win.props as FileDlgOpts;
  const fs = useStore((s) => s.fs);
  const [dir, setDir] = useState(p.start || "docs");
  const [sel, setSel] = useState<string | null>(null);
  const [name, setName] = useState(p.name || "");
  const [filter, setFilter] = useState(p.exts ? "typed" : "all");
  const nameRef = useAutoFocus<HTMLInputElement>();
  const [mk, setMk] = useState<string | null>(null);
  const items = children(dir, fs)
    .filter((n) => n.type === "folder" || filter === "all" || !p.exts || p.exts.includes(extOf(n.name)))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
  const finish = (id: string | null, nm: string) => {
    closeWin(win.id, true);
    setTimeout(() => p.onDone(id, nm, dir), 0);
  };
  const go = () => {
    const nm = name.trim();
    if (!nm) return;
    const ex = children(dir, fs).find((n) => n.name.toLowerCase() === nm.toLowerCase());
    if (ex?.type === "folder") {
      setDir(ex.id);
      setName("");
      return;
    }
    if (p.mode === "open") {
      if (!ex) return msgBox({ title: p.title || "Open", text: `${nm}\nFile not found.\nCheck the file name and try again.`, icon: "warn" });
      return finish(ex.id, ex.name);
    }
    let fname = nm;
    if (p.exts && !extOf(fname)) fname += "." + p.exts[0];
    const ex2 = children(dir, fs).find((n) => n.name.toLowerCase() === fname.toLowerCase());
    if (ex2)
      return msgBox({ title: "Confirm Save As", text: `${fname} already exists.\nDo you want to replace it?`, icon: "warn", buttons: ["Yes", "No"], onResult: (b) => b === "Yes" && finish(ex2.id, fname) });
    finish(null, fname);
  };
  const crumbs: FsNode[] = [];
  for (let n: FsNode | undefined = fs[dir]; n; n = n.parent ? fs[n.parent] : undefined) crumbs.unshift(n);
  return (
    <div className="fdlg">
      <div className="fdlg-bar">
        <Btn onClick={() => fs[dir]?.parent && setDir(fs[dir].parent as string)} style={{ minWidth: 28 }}>▲</Btn>
        <div className="fdlg-crumbs">{crumbs.map((c, i) => <span key={c.id} onClick={() => setDir(c.id)}>{i > 0 && " ▸ "}{c.letter || c.name}</span>)}</div>
        <Btn onClick={() => setMk("New folder")}>New folder</Btn>
      </div>
      <div className="fdlg-main">
        <div className="fdlg-nav">
          {PLACES.map(([id, label, ic]) => (
            <div key={id} className={"fdlg-place" + (dir === id ? " sel" : "")} onClick={() => setDir(id)}><Icon name={ic} size={16} />{label}</div>
          ))}
        </div>
        <div className="fdlg-list">
          {mk !== null && (
            <div className="fdlg-row"><Icon name="folder" size={16} /><InlineEdit value={mk} folder onDone={(v) => { setMk(null); if (v) { const id = mkdir(dir, v); setDir(id); } }} /></div>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className={"fdlg-row" + (sel === n.id ? " sel" : "")}
              onClick={() => { setSel(n.id); if (n.type === "file") setName(n.name); }}
              onDoubleClick={() => (n.type === "folder" ? (setDir(n.id), setSel(null)) : finish(p.mode === "open" ? n.id : n.id, n.name))}
            >
              <Icon name={nodeIcon(n)} size={16} /><span className="fdlg-n">{n.name}</span><span className="fdlg-k">{kindOf(n)}</span><span className="fdlg-d">{fmtDate(n.modified)}</span>
            </div>
          ))}
          {!items.length && <div style={{ color: "#777", padding: 10 }}>This folder is empty.</div>}
        </div>
      </div>
      <div className="fdlg-foot">
        <div className="fdlg-f">
          <label>File name:</label>
          <input ref={nameRef} className="w7input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
          <Btn def onClick={go}>{p.mode === "open" ? "Open" : "Save"}</Btn>
        </div>
        <div className="fdlg-f">
          <label>{p.mode === "open" ? "Files of type:" : "Save as type:"}</label>
          <select className="w7input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {p.exts && <option value="typed">{p.exts.map((e) => "*." + e).join("; ")}</option>}
            <option value="all">All Files (*.*)</option>
          </select>
          <Btn onClick={() => closeWin(win.id, true)}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}
