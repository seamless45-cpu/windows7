"use client";
/**
 * The last few Windows 7 inbox programs that had no home yet:
 *
 *  - Getting Started (the Welcome Center window that greets a new installation)
 *  - Display Color Calibration (dccw.exe, the gamma / brightness / contrast wizard)
 *  - Windows PowerShell ISE (the tabbed script editor with an output pane)
 *  - Windows Contacts (the address book that writes .contact files)
 */
import { useMemo, useState } from "react";
import { getState, mkfile, notify, msgBox, openApp, lsGet, lsSet } from "../store";
import { Icon } from "../icons";
import { Btn } from "../ui";

/* ================================================== Getting Started */
const TASKS: [string, string, string, () => void][] = [
  ["Personalize Windows", "Change the theme, the desktop background, the window colour and the sounds.", "appearance", () => openApp("controlpanel", { page: "personalization" })],
  ["Add new users to this computer", "Create an account for everyone who shares this PC.", "users", () => openApp("controlpanel", { page: "users" })],
  ["Transfer files and settings from another computer", "Windows Easy Transfer moves your documents and settings.", "programs", () => openApp("migwiz")],
  ["Go online to find out what's new in Windows 7", "Open Internet Explorer to read about the new features.", "ie", () => openApp("ie")],
  ["Back up your files", "Set up a backup so your documents survive a disk failure.", "backup", () => openApp("backup")],
  ["Rate and improve your computer's performance", "Run the Windows Experience Index assessment.", "taskmgr", () => openApp("wei")],
  ["Set up a homegroup", "Share pictures, music, printers with the other PCs in your home.", "homegroup", () => openApp("homegroup")],
  ["Keep your computer up to date", "Turn on automatic updates from Windows Update.", "update", () => openApp("controlpanel", { page: "wupdate" })],
];

export function GettingStarted() {
  const s = getState().settings;
  const done = lsGet<string[]>("win7.gettingstarted", []);
  const [checked, setChecked] = useState<string[]>(done);
  const toggle = (label: string) => {
    const next = checked.includes(label) ? checked.filter((l) => l !== label) : [...checked, label];
    setChecked(next);
    lsSet("win7.gettingstarted", next);
  };
  return (
    <div className="gs">
      <div className="gs-head">
        <div className="gs-orb"><Icon name="start-orb" size={54} /></div>
        <div>
          <h1>Getting started with Windows 7</h1>
          <p>Hello {s.currentUser}. This page lists the things most people want to set up first — tick each one as you finish it.</p>
        </div>
      </div>
      <div className="gs-progress"><div className="gs-bar"><i style={{ width: (checked.length / TASKS.length) * 100 + "%" }} /></div><span>{checked.length} of {TASKS.length} done</span></div>
      <div className="gs-list">
        {TASKS.map(([label, desc, icon, run]) => (
          <div key={label} className="gs-row">
            <input type="checkbox" checked={checked.includes(label)} onChange={() => toggle(label)} />
            <Icon name={icon} size={34} />
            <div className="gs-meta"><b>{label}</b><span>{desc}</span></div>
            <Btn onClick={run}>Do it</Btn>
          </div>
        ))}
      </div>
      <div className="gs-foot">
        <span>Windows 7 Ultimate · Build 7601</span>
        <div style={{ marginLeft: "auto" }}><Btn onClick={() => { lsSet("win7.gettingstarted", []); setChecked([]); }}>Reset the checklist</Btn></div>
      </div>
    </div>
  );
}

/* ================================================== Display Color Calibration */
export function ColorCalibration() {
  const [step, setStep] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [bright, setBright] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [colorBal, setColorBal] = useState(50);
  const STEPS = ["Welcome", "Set the gamma", "Set the brightness", "Set the contrast", "Adjust colour balance", "Finish"];
  const apply = () => {
    lsSet("win7.dccw", { gamma, bright, contrast, colorBal, at: new Date().toISOString() });
    notify({ title: "Display Color Calibration", text: "Your display calibration has been saved.", icon: "info" });
    setStep(5);
  };
  return (
    <div className="dccw">
      <div className="dccw-head">
        <Icon name="display" size={38} />
        <div><b>Display Color Calibration</b><span>{STEPS[step]}</span></div>
        <em>Step {step + 1} of {STEPS.length}</em>
      </div>
      <div className="dccw-body">
        {step === 0 && (
          <>
            <p>This wizard helps you calibrate the colour, gamma, brightness and contrast of your display. You can skip any step, but for best results set your monitor to its native resolution first.</p>
            <ul className="dccw-list">
              <li>Set your monitor to its native resolution, if it is an LCD.</li>
              <li>Make sure the room lighting is the lighting you normally use.</li>
              <li>Clean the screen and disable any screen saver.</li>
            </ul>
          </>
        )}
        {step === 1 && (
          <>
            <p>Gamma adjusts the way colours blend on screen. Look at the two halves of the sample below and move the slider until they look identical.</p>
            <div className="dccw-sample" style={{ background: `linear-gradient(90deg, rgba(0,0,0,${0.55 * gamma}), rgba(0,0,0,${0.55 * gamma}))` }}>
              <div style={{ flex: 1, background: `rgba(120,120,120,${0.4 + (gamma - 1) * 0.3})` }} />
              <div style={{ flex: 1, background: "repeating-linear-gradient(90deg, #7b7b7b 0 3px, #6f6f6f 3px 6px)" }} />
            </div>
            <div className="dccw-ctl"><span>Gamma {gamma.toFixed(2)}</span><input type="range" min={0.6} max={1.6} step={0.02} value={gamma} onChange={(e) => setGamma(Number(e.target.value))} /></div>
          </>
        )}
        {step === 2 && (
          <>
            <p>Brightness controls how dark the shadows look. Move the slider until you can just make out the shirt in the sample.</p>
            <div className="dccw-sample" style={{ background: `rgb(${bright * 0.6}, ${bright * 0.6}, ${bright * 0.62})` }}>
              <div className="dccw-shirt" style={{ opacity: 0.25 + bright / 220 }} />
            </div>
            <div className="dccw-ctl"><span>Brightness {bright}%</span><input type="range" min={0} max={100} value={bright} onChange={(e) => setBright(Number(e.target.value))} /></div>
          </>
        )}
        {step === 3 && (
          <>
            <p>Contrast controls how bright the highlights look. If the bright areas lose detail, lower the contrast.</p>
            <div className="dccw-sample" style={{ background: `linear-gradient(90deg, #111 ${50 - contrast / 2}%, #fff ${50 + contrast / 2}%)` }} />
            <div className="dccw-ctl"><span>Contrast {contrast}%</span><input type="range" min={0} max={100} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} /></div>
          </>
        )}
        {step === 4 && (
          <>
            <p>Move the sliders until the grey bars below look neutral grey.</p>
            <div className="dccw-bars">
              {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ background: `rgb(${128 + (i - 2) * 18 + (colorBal - 50) * 0.4}, ${128 + (i - 2) * 18}, ${128 + (i - 2) * 18 - (colorBal - 50) * 0.4})` }} />)}
            </div>
            <div className="dccw-ctl"><span>Colour balance {colorBal}</span><input type="range" min={0} max={100} value={colorBal} onChange={(e) => setColorBal(Number(e.target.value))} /></div>
          </>
        )}
        {step === 5 && (
          <>
            <p>The calibration has been saved. Windows now uses the calibrated profile for this display.</p>
            <div className="dccw-done">
              {[["Gamma", gamma.toFixed(2)], ["Brightness", bright + "%"], ["Contrast", contrast + "%"], ["Colour balance", String(colorBal)]].map(([k, v]) => (
                <div key={k}><span>{k}</span><b>{v}</b></div>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="dccw-foot">
        <Btn onClick={() => setStep(0)} disabled={step === 0}>Back</Btn>
        {step < 5 ? <Btn def onClick={() => (step === 4 ? apply() : setStep(step + 1))}>{step === 4 ? "Finish" : "Next"}</Btn> : <Btn def onClick={() => setStep(0)}>Calibrate again</Btn>}
        <Btn onClick={() => setStep(5)}>Cancel</Btn>
        <span className="dccw-hint">{step < 5 ? "You can skip any step and adjust it later." : ""}</span>
      </div>
    </div>
  );
}

/* ================================================== PowerShell ISE */
const ISE_SAMPLES: [string, string][] = [
  ["Untitled1.ps1", `# Get the ten largest files in the Documents library\nGet-ChildItem ~\\Documents -Recurse -File |\n    Sort-Object Length -Descending |\n    Select-Object -First 10 Name, @{n='MB';e={[math]::Round($_.Length/1MB,2)}}\n`],
  ["Untitled2.ps1", `# Which services are not running?\nGet-Service | Where-Object Status -ne 'Running' |\n    Select-Object Name, Status, DisplayName\n`],
];
export function PowerShellISE() {
  const [tabs, setTabs] = useState(ISE_SAMPLES.map(([n, s]) => ({ name: n, src: s })));
  const [cur, setCur] = useState(0);
  const [out, setOut] = useState<string[]>(["Windows PowerShell ISE", "Copyright (C) Microsoft Corporation. All rights reserved.", ""]);
  const [running, setRunning] = useState(false);
  const src = tabs[cur]?.src || "";

  const run = () => {
    setRunning(true);
    setOut((o) => [...o, `PS C:\\Users\\${getState().settings.currentUser}> ` + src.split("\n").filter(Boolean)[0]?.slice(0, 70)]);
    const t = setTimeout(() => {
      const st = getState();
      const files = Object.values(st.fs).filter((n) => n.type === "file" && !n.trash);
      const big = files.sort((a, b) => b.size - a.size).slice(0, 10);
      const services = ["WinDefend", "WSearch", "wuauserv", "Spooler", "Themes", "AudioSrv"].filter((s2, i) => i % 2 === 0);
      setOut((o) => [
        ...o,
        ...big.map((f) => `${f.name.padEnd(24)} ${(f.size / 1e6).toFixed(2)}`),
        "",
        "Name            Status    DisplayName",
        "----            ------    -----------",
        ...services.map((s2) => `${s2.padEnd(15)} Running   ${s2}`),
        "",
        `PS C:\\Users\\${getState().settings.currentUser}> `,
      ]);
      setRunning(false);
    }, 520);
    void t;
  };
  const save = () => {
    const name = prompt("Save script as:", tabs[cur]?.name || "script.ps1");
    if (!name) return;
    mkfile("docs", name, src);
    notify({ title: "Windows PowerShell ISE", text: `${name} was saved to Documents.`, icon: "info" });
  };

  return (
    <div className="ise">
      <div className="ise-menu">
        {["File", "Edit", "View", "Tools", "Help"].map((m) => <span key={m} className="ise-m">{m}</span>)}
        <span className="ise-run"><Btn def onClick={run} disabled={running}>{running ? "Running…" : "► Run Script"}</Btn></span>
      </div>
      <div className="ise-tabs">
        {tabs.map((t, i) => (
          <div key={t.name + i} className={"ise-tab" + (i === cur ? " on" : "")} onClick={() => setCur(i)}>
            {t.name}<b onClick={(e) => { e.stopPropagation(); if (tabs.length === 1) return; setTabs(tabs.filter((_, j) => j !== i)); setCur(Math.max(0, cur - 1)); }}>✕</b>
          </div>
        ))}
        <div className="ise-new" onClick={() => { setTabs([...tabs, { name: `Untitled${tabs.length + 1}.ps1`, src: "# New script\n" }]); setCur(tabs.length); }}>+</div>
      </div>
      <div className="ise-editor">
        <div className="ise-gutter">{src.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}</div>
        <textarea
          spellCheck={false}
          value={src}
          onChange={(e) => setTabs(tabs.map((t, i) => (i === cur ? { ...t, src: e.target.value } : t)))}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "F5") { e.preventDefault(); run(); } }}
        />
      </div>
      <div className="ise-out">
        <div className="ise-out-h">Output</div>
        <pre>{out.join("\n")}</pre>
      </div>
      <div className="ise-status">
        <span>Ln {src.split("\n").length}, Col 1</span>
        <span>F5 to run</span>
        <div style={{ marginLeft: "auto" }}><Btn onClick={save}>Save</Btn></div>
      </div>
    </div>
  );
}

/* ================================================== Windows Contacts */
type Contact = { id: string; first: string; last: string; email: string; phone: string; company: string; note: string };
const C_KEY = "win7.contacts";
const SEED: Contact[] = [
  { id: "ct1", first: "Alicia", last: "Navarro", email: "alicia.navarro@contoso.com", phone: "+1 (425) 555-0142", company: "Contoso Ltd.", note: "Design lead" },
  { id: "ct2", first: "Ben", last: "Okafor", email: "ben.okafor@fabrikam.com", phone: "+1 (425) 555-0199", company: "Fabrikam Inc.", note: "" },
  { id: "ct3", first: "Chen", last: "Wei", email: "chen.wei@example.com", phone: "+66 38 555 010", company: "—", note: "University friend" },
];
export function WindowsContacts() {
  const [list, setList] = useState<Contact[]>(() => lsGet<Contact[]>(C_KEY, SEED));
  const [sel, setSel] = useState<string | null>(list[0]?.id || null);
  const [q, setQ] = useState("");
  const cur = list.find((c) => c.id === sel);
  const shown = useMemo(() => list.filter((c) => (c.first + " " + c.last + " " + c.email).toLowerCase().includes(q.toLowerCase())), [list, q]);
  const save = (next: Contact[]) => { setList(next); lsSet(C_KEY, next); };
  const update = (patch: Partial<Contact>) => { if (!cur) return; save(list.map((c) => (c.id === cur.id ? { ...c, ...patch } : c))); };

  const add = () => {
    const c: Contact = { id: "ct" + Date.now().toString(36), first: "New", last: "Contact", email: "", phone: "", company: "", note: "" };
    save([...list, c]);
    setSel(c.id);
  };
  const exportToDocs = () => {
    if (!cur) return;
    mkfile("docs", `${cur.first} ${cur.last}.contact`, `BEGIN:VCARD\nVERSION:3.0\nN:${cur.last};${cur.first}\nFN:${cur.first} ${cur.last}\nEMAIL:${cur.email}\nTEL:${cur.phone}\nORG:${cur.company}\nEND:VCARD\n`, 900);
    notify({ title: "Windows Contacts", text: `${cur.first} ${cur.last}.contact was saved to Documents.`, icon: "info" });
  };

  return (
    <div className="wc">
      <div className="wc-bar">
        <Btn onClick={add}>New contact</Btn>
        <Btn onClick={() => cur && msgBox({ title: "Windows Contacts", text: `Delete ${cur.first} ${cur.last}?`, icon: "warn", buttons: ["Delete", "Cancel"], onResult: (b) => { if (b !== "Delete") return; const next = list.filter((c) => c.id !== cur.id); save(next); setSel(next[0]?.id || null); } })} disabled={!cur}>Delete</Btn>
        <Btn onClick={exportToDocs} disabled={!cur}>Export</Btn>
        <input className="w7input wc-search" placeholder="Search contacts" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="wc-body">
        <div className="wc-list">
          {shown.map((c) => (
            <div key={c.id} className={"wc-item" + (sel === c.id ? " sel" : "")} onClick={() => setSel(c.id)}>
              <Icon name="user" size={26} />
              <div><b>{c.first} {c.last}</b><span>{c.company || c.email}</span></div>
            </div>
          ))}
          {!shown.length && <div className="wc-empty">No contacts match “{q}”.</div>}
        </div>
        <div className="wc-detail">
          {cur ? (
            <>
              <div className="wc-card">
                <Icon name="user" size={62} />
                <div><b>{cur.first} {cur.last}</b><span>{cur.company}</span></div>
              </div>
              {([["first", "First name"], ["last", "Last name"], ["email", "E-mail"], ["phone", "Phone"], ["company", "Company"], ["note", "Notes"]] as [keyof Contact, string][]).map(([k, l]) => (
                <div key={k} className="wc-row"><span>{l}:</span>
                  {k === "note"
                    ? <textarea className="w7input" value={cur.note} onChange={(e) => update({ note: e.target.value })} />
                    : <input className="w7input" value={String(cur[k] ?? "")} onChange={(e) => update({ [k]: e.target.value } as Partial<Contact>)} />}
                </div>
              ))}
              <div className="wc-actions">
                <Btn onClick={() => { if (!cur.email) return msgBox({ title: "Windows Mail", text: "This contact has no e-mail address.", icon: "warn" }); openApp("ie", { url: "mailto:" + cur.email }); }}>Send e-mail</Btn>
                <Btn onClick={() => openApp("wfs", { to: cur.email })}>Send fax</Btn>
              </div>
            </>
          ) : <div className="wc-empty">Select a contact, or create a new one.</div>}
        </div>
      </div>
      <div className="wc-status">{shown.length} contact{shown.length === 1 ? "" : "s"} · stored in {getState().settings.currentUser}&apos;s Contacts folder</div>
    </div>
  );
}
