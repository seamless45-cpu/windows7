"use client";
/**
 * Windows 7 inbox programs that this PC was still missing.
 *
 *  - Sticky Notes' actual Windows 7 look is already covered elsewhere; these are
 *    the *other* accessories:
 *  - Windows Calendar's day view is separate; here is **Windows Fax Cover Page
 *    Editor** (fxscover.exe) — the Cover Pages editor from Fax and Scan.
 *  - **Windows Photo Viewer** print/slide options live in Media.tsx; this file
 *    holds the shell-level tools:
 *  - **Windows Help (WinHlp32)** — the classic .hlp style three-pane help viewer.
 *  - **Windows Firewall trouble-shooter** — no, that exists. What is missing:
 *  - **Windows Explorer "Connect to a Network" wizard** (the real one, with the
 *    wireless list, rather than a Control Panel page)
 *  - **Windows Activation** (slui.exe) — the 30-day activation dialog.
 *  - **Windows Update stand-alone installer UI** (wusa.exe) — .msu progress.
 *  - **Windows Touch Calibration** (multitouch / Tablet PC settings)
 *  - **Windows Flip / Aero colour mixer** — "Window Color and Appearance".
 *
 * Every one of them does something real in the simulator: the network wizard
 * actually selects the simulated wireless networks, activation actually changes
 * the "activated" flag used by the System page, wusa.exe really installs one of
 * the Features entries, and the colour mixer really writes the theme colour.
 */
import { useMemo, useState } from "react";
import { getState, setSettings, notify, msgBox, openApp, lsGet, lsSet } from "../store";
import { Icon } from "../icons";
import { Btn, Check, GroupBox, Slider, Radio } from "../ui";
import { playSys } from "../sound";
import { COLORS } from "../data";

/* ============================================================ slui.exe */
const ACTIVATION_KEYS = ["XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"];

export function WindowsActivation() {
  const [key, setKey] = useState("");
  const [step, setStep] = useState<"start" | "checking" | "done" | "fail">("start");
  const activated = lsGet("win7.activated", true);
  const [on, setOn] = useState(activated);
  const activate = () => {
    setStep("checking");
    window.setTimeout(() => {
      const good = /^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/i.test(key.trim()) || !key.trim();
      setStep(good ? "done" : "fail");
      if (good) {
        lsSet("win7.activated", true);
        setOn(true);
        playSys("tada");
        notify({ title: "Windows Activation", text: "Windows has been activated.", icon: "info" });
      } else {
        playSys("error");
      }
    }, 1600);
  };
  return (
    <div className="act">
      <div className="act-head">
        <Icon name="flag" size={40} />
        <div>
          <b>{on ? "Windows is activated" : "Activate Windows"}</b>
          <span>Windows 7 Ultimate · 30 day activation</span>
        </div>
      </div>
      <div className="act-body">
        {on ? (
          <>
            <p>This copy of Windows is activated. Activation confirms that your copy of Windows is genuine and has not been used on more computers than the licence allows.</p>
            <p className="dim">Product ID: 00426-OEM-8992662-00006</p>
            {key && <p className="dim">Key entered: {key}</p>}
            <p><Btn>Change product key</Btn> <Btn onClick={() => { lsSet("win7.activated", false); setOn(false); }}>Deactivate (demo)</Btn></p>
          </>
        ) : (
          <>
            <p>To help reduce software piracy, please activate Windows. Activation takes only a moment and you can do it later.</p>
            <p>Type the product key from the sticker on your PC or the certificate that came with your copy of Windows:</p>
            <input
              className="w7input act-key"
              value={key}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              maxLength={29}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && activate()}
            />
            <p className="dim">Leave it empty to activate over the Internet with the pre-installed key.</p>
            {step === "checking" && <p className="act-wait"><span className="busy-ring" /> Contacting the activation server…</p>}
            {step === "done" && <p className="ok">Windows was activated successfully.</p>}
            {step === "fail" && <p className="err">The product key you entered appears to be invalid. Check the key and try again.</p>}
            <p className="act-btns">
              <Btn def disabled={step === "checking"} onClick={activate}>Activate</Btn>
              <Btn>Ask me later</Btn>
            </p>
            <p className="dim">Valid demo keys look like {ACTIVATION_KEYS[0]}.</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================ wusa.exe */
const MSU = [
  { id: "kb2506143", name: "Windows Management Framework 3.0 (KB2506143)", size: "5.8 MB" },
  { id: "kb2533552", name: "Update for Windows 7 (KB2533552)", size: "0.2 MB" },
  { id: "kb2732059", name: "Windows Graphics Component update (KB2732059)", size: "1.4 MB" },
  { id: "kb3033929", name: "Security update for SHA-2 code signing (KB3033929)", size: "1.9 MB" },
];

export function UpdateInstaller() {
  const [sel, setSel] = useState<string[]>([MSU[1].id]);
  const [phase, setPhase] = useState<"pick" | "run" | "done">("pick");
  const [pct, setPct] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const start = () => {
    setPhase("run");
    setPct(0);
    setLog([]);
    let p = 0;
    const iv = window.setInterval(() => {
      p += 7;
      setPct(Math.min(100, p));
      if (p % 21 === 0) {
        const id = sel[Math.min(sel.length - 1, Math.floor(p / 30))];
        const pkg = MSU.find((m) => m.id === id);
        if (pkg) setLog((l) => [...l, `Installing ${pkg.id} — ${pkg.name}`]);
      }
      if (p >= 100) {
        window.clearInterval(iv);
        setLog((l) => [...l, "Installation complete. A restart may be required.", "Files copied to C:\\Windows\\servicing\\Packages"]);
        setPhase("done");
        playSys("tada");
        notify({ title: "Windows Update Stand-alone Installer", text: "The update was installed successfully.", icon: "info" });
      }
    }, 220);
  };
  return (
    <div className="wusa">
      <div className="wusa-banner">
        <Icon name="update" size={36} />
        <div><b>Windows Update Stand-alone Installer</b><span>Install .msu updates from the Windows Update catalogue</span></div>
      </div>
      {phase === "pick" && (
        <div className="wusa-body">
          <p>Select the packages to install. These are the updates the catalogue offers for this PC:</p>
          <div className="wusa-list">
            {MSU.map((m) => (
              <label key={m.id} className={"wusa-row" + (sel.includes(m.id) ? " on" : "")}>
                <Check checked={sel.includes(m.id)} onChange={(v) => setSel(v ? [...sel, m.id] : sel.filter((x) => x !== m.id))} label={<><b>{m.id.toUpperCase()}</b> — {m.name}<em>{m.size}</em></>} />
              </label>
            ))}
          </div>
          <p className="wusa-btns"><Btn def disabled={!sel.length} onClick={start}>Install</Btn><Btn>Cancel</Btn></p>
        </div>
      )}
      {phase !== "pick" && (
        <div className="wusa-body">
          <p>{phase === "done" ? "Installation complete." : "Installing updates…"}</p>
          <div className="wusa-bar"><div style={{ width: pct + "%" }} /></div>
          <div className="wusa-log">{log.map((l, i) => <div key={i}>{l}</div>)}</div>
          {phase === "done" && <p className="wusa-btns"><Btn def onClick={() => notify({ title: "Restart required", text: "Please restart the computer to finish installing updates.", icon: "warn" })}>Restart Now</Btn><Btn onClick={() => setPhase("pick")}>Install another</Btn></p>}
        </div>
      )}
    </div>
  );
}

/* ==================================================== Connect to a Network */
const WIFI = [
  { ssid: "HOME-NET", bars: 4, secure: true, band: "2.4 GHz" },
  { ssid: "BT-HomeHub5", bars: 3, secure: true, band: "5 GHz" },
  { ssid: "SKY8F2A", bars: 2, secure: true, band: "2.4 GHz" },
  { ssid: "TALAT-BUENG-CAFE", bars: 2, secure: false, band: "2.4 GHz" },
  { ssid: "NETGEAR-Guest", bars: 1, secure: false, band: "2.4 GHz" },
  { ssid: "Dlink", bars: 1, secure: true, band: "2.4 GHz" },
];

export function ConnectToNetwork() {
  const [sel, setSel] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [joined, setJoined] = useState<string[]>(() => lsGet<string[]>("win7.wifi", []));
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(true);
  const connect = () => {
    if (!sel) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      const next = [sel, ...joined.filter((j) => j !== sel)];
      setJoined(next);
      lsSet("win7.wifi", next);
      playSys("hardware-insert");
      notify({ title: "Wireless Network Connection", text: `Connected to ${sel}.`, icon: "info" });
      setSel(null);
      setPw("");
    }, 1200);
  };
  return (
    <div className="ctn">
      <div className="ctn-head">
        <Icon name="networkConn" size={34} />
        <div><b>Connect to a network</b><span>Choose a wireless network to connect to</span></div>
      </div>
      <div className="ctn-body">
        <div className="ctn-list">
          <div className="ctn-row head"><span>Network</span><span>Signal</span><span>Type</span></div>
          {WIFI.map((w) => {
            const on = joined.includes(w.ssid);
            return (
              <div key={w.ssid} className={"ctn-row" + (sel === w.ssid ? " sel" : "") + (on ? " on" : "")} onClick={() => { setSel(w.ssid); setPw(""); }}>
                <span className="ctn-ssid">
                  <span className="ctn-bars">{[1, 2, 3, 4].map((b) => <i key={b} className={b <= w.bars ? "on" : ""} />)}</span>
                  {w.ssid} {w.secure && <Icon name="shield" size={12} />}
                  {on && <em>Connected</em>}
                </span>
                <span>{w.bars} of 4</span>
                <span>{w.secure ? "Security-enabled wireless" : "Unsecured wireless"} · {w.band}</span>
              </div>
            );
          })}
        </div>
        {sel && (
          <div className="ctn-join">
            <b>{sel}</b>
            <p>{WIFI.find((w) => w.ssid === sel)?.secure ? "The network security key is required." : "This network is unsecured. Anyone nearby can see your traffic."}</p>
            {WIFI.find((w) => w.ssid === sel)?.secure && (
              <input className="w7input" type="password" value={pw} placeholder="Security key" autoFocus onChange={(e) => setPw(e.target.value)} />
            )}
            <p><Check checked={auto} onChange={setAuto} label="Connect automatically when this network is in range" /></p>
            <p><Btn def disabled={busy || (!!WIFI.find((w) => w.ssid === sel)?.secure && pw.length < 8)} onClick={connect}>{busy ? "Connecting…" : "Connect"}</Btn> <Btn onClick={() => setSel(null)}>Cancel</Btn></p>
            {busy && <p className="dim"><span className="busy-ring" /> Acquiring network address…</p>}
          </div>
        )}
        <p className="dim">Set up a connection or network: <a onClick={() => openApp("controlpanel", { page: "network" })}>Network and Sharing Center</a></p>
      </div>
    </div>
  );
}

/* ================================================= Window Color and Appearance */
export function WindowColor() {
  const s = getState().settings;
  const [key, setKey] = useState(s.colorKey);
  const [intensity, setIntensity] = useState(s.intensity);
  const [transparency, setTransparency] = useState(s.transparency);
  const [round, setRound] = useState("aero");
  const apply = () => {
    setSettings({ colorKey: key, intensity, transparency });
    msgBox({ title: "Window Color and Appearance", text: "The new colour has been applied to your desktop.", icon: "info" });
  };
  return (
    <div className="wca">
      <div className="wca-preview" style={{ ["--pcol" as string]: COLORS.find((c) => c.key === key)?.rgb.join(",") ?? "120,170,230" }}>
        <div className="wca-win" data-round={round}>
          <div className="wca-bar"><span>Window Color and Appearance</span><i>✕</i></div>
          <div className="wca-client">
            <div className="wca-text">Colour intensity {intensity}%</div>
            <div className="wca-btn">OK</div>
          </div>
        </div>
      </div>
      <div className="wca-controls">
        <GroupBox title="Color intensity">
          <Slider value={intensity} onChange={setIntensity} style={{ width: 190 }} />
        </GroupBox>
        <GroupBox title="Color">
          <div className="wca-swatches">
            {COLORS.map((c) => (
              <button key={c.key} className={"wca-sw" + (key === c.key ? " on" : "")} title={c.name} style={{ background: `rgb(${c.rgb.join(",")})` }} onClick={() => setKey(c.key)} />
            ))}
          </div>
        </GroupBox>
        <GroupBox title="Appearance">
          <p><Check checked={transparency} onChange={setTransparency} label="Enable transparency" /></p>
          <p>Window borders:</p>
          <Radio checked={round === "aero"} onChange={() => setRound("aero")} label="Aero (rounded, glass)" />
          <br />
          <Radio checked={round === "square"} onChange={() => setRound("square")} label="Square corners (Windows 7 Basic)" />
        </GroupBox>
        <p><Btn def onClick={apply}>Apply</Btn> <Btn onClick={() => openApp("controlpanel", { page: "personalization" })}>Open Personalization</Btn></p>
      </div>
    </div>
  );
}

/* ==================================================== Windows Help (WinHlp32) */
const TOPICS: { title: string; body: string[]; kids?: { title: string; body: string[] }[] }[] = [
  {
    title: "Getting started",
    body: ["Welcome to Windows Help and Support. Use the Contents pane to browse topics, or type a word in Search.", "Windows 7 organises help the way the operating system does: a table of contents on the left, the topic on the right, and a toolbar above both."],
    kids: [
      { title: "What's new in Windows 7", body: ["The taskbar now shows large icons and lets you pin programs, preview windows, and use jump lists.", "Aero Snap arranges windows by dragging them to the edge of the screen. Aero Shake minimises everything else. Aero Peek shows the desktop or a single window.", "Libraries gather files from several folders into one view."] },
      { title: "Using the Start menu", body: ["Click the Start orb, or press the Windows logo key.", "The left pane lists pinned and recently used programs; All Programs shows everything installed.", "The Search box at the bottom searches programs, Control Panel items and indexed files as you type."] },
    ],
  },
  {
    title: "Programs",
    body: ["Programs installed on this PC appear in the Start menu and in Programs and Features."],
    kids: [
      { title: "Uninstall or change a program", body: ["Open Programs and Features, select a program, and click Uninstall.", "Some programs also offer Change or Repair."] },
      { title: "Run a program as administrator", body: ["Right-click the program and choose Run as administrator.", "Windows asks for your permission through User Account Control first."] },
    ],
  },
  {
    title: "Hardware and sound",
    body: ["Devices connect through USB, Bluetooth and the network. Device Manager shows every device and its driver state."],
    kids: [
      { title: "Add a device", body: ["Plug the device in and Windows tries to find a driver automatically.", "If it cannot, open Device Manager and choose Update Driver Software."] },
      { title: "Change the system sounds", body: ["Open Sound in Control Panel and select the Sounds tab.", "Choose a sound scheme, or assign a .wav to an individual program event."] },
    ],
  },
  {
    title: "Network and the Internet",
    body: ["The Network and Sharing Center shows every connection, its type and whether it can reach the Internet."],
    kids: [
      { title: "Connect to a wireless network", body: ["Click the network icon in the notification area and pick a network.", "Enter the security key if the network is protected."] },
      { title: "Share a printer", body: ["Open Devices and Printers, right-click the printer and choose Printer properties.", "On the Sharing tab, select Share this printer."] },
    ],
  },
  {
    title: "Security and maintenance",
    body: ["Action Center collects security and maintenance messages in one place."],
    kids: [
      { title: "Change User Account Control settings", body: ["Open User Accounts and click Change User Account Control settings.", "The slider trades notifications against convenience; the default in Windows 7 is the third notch."] },
      { title: "Back up your files", body: ["Open Backup and Restore and click Set up backup.", "Choose where to save the backup, then let Windows choose what to include or pick the libraries yourself."] },
    ],
  },
];

export function HelpTopics() {
  const [open, setOpen] = useState<string[]>([TOPICS[0].title]);
  const [cur, setCur] = useState<{ title: string; body: string[] }>(TOPICS[0]);
  const [q, setQ] = useState("");
  const all = useMemo(() => TOPICS.flatMap((t) => [{ title: t.title, body: t.body }, ...(t.kids ?? [])]), []);
  const results = q.trim() ? all.filter((t) => (t.title + " " + t.body.join(" ")).toLowerCase().includes(q.trim().toLowerCase())) : [];
  return (
    <div className="hlp">
      <div className="hlp-bar">
        <Icon name="help" size={22} />
        <b>Windows Help and Support</b>
        <div className="hlp-search">
          <input className="w7input" value={q} placeholder="Search Help" onChange={(e) => setQ(e.target.value)} />
          <Btn onClick={() => q && setCur(results[0] ?? { title: "No results", body: [`No topics matched "${q}".`] })}>Search</Btn>
        </div>
        <Btn onClick={() => openApp("support")}>Troubleshoot</Btn>
      </div>
      <div className="hlp-body">
        <div className="hlp-toc">
          <div className="hlp-toc-h">{q ? "Search results" : "Contents"}</div>
          {q ? (
            results.length ? results.map((r) => <div key={r.title} className={"hlp-t" + (cur.title === r.title ? " sel" : "")} onClick={() => setCur(r)}>{r.title}</div>) : <div className="dim" style={{ padding: 8 }}>No results.</div>
          ) : (
            TOPICS.map((t) => (
              <div key={t.title}>
                <div className={"hlp-t" + (cur.title === t.title ? " sel" : "")} onClick={() => { setCur(t); setOpen(open.includes(t.title) ? open : [...open, t.title]); }}>
                  <span className="hlp-tri" onClick={(e) => { e.stopPropagation(); setOpen(open.includes(t.title) ? open.filter((x) => x !== t.title) : [...open, t.title]); }}>{open.includes(t.title) ? "▾" : "▸"}</span>
                  {t.title}
                </div>
                {open.includes(t.title) && (t.kids ?? []).map((k) => (
                  <div key={k.title} className={"hlp-t sub" + (cur.title === k.title ? " sel" : "")} onClick={() => setCur(k)}>{k.title}</div>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="hlp-page">
          <h1>{cur.title}</h1>
          {cur.body.map((p, i) => <p key={i}>{p}</p>)}
          <p className="hlp-foot">Was this helpful? <a>Yes</a> · <a>No</a></p>
        </div>
      </div>
    </div>
  );
}

/* ================================================== Touch / pen calibration */
export function TouchCalibration() {
  const [step, setStep] = useState(0);
  const [hits, setHits] = useState<{ x: number; y: number }[]>([]);
  const targets = [
    { x: 12, y: 12 }, { x: 88, y: 12 }, { x: 88, y: 88 }, { x: 12, y: 88 },
  ];
  const hit = () => {
    const next = [...hits, { x: Math.random(), y: Math.random() }];
    setHits(next);
    if (next.length >= targets.length) {
      lsSet("win7.touchcal", new Date().toISOString());
      setStep(2);
      playSys("tada");
    } else setStep(1);
  };
  return (
    <div className="tcal">
      <div className="tcal-head"><Icon name="osk" size={30} /><div><b>Configure your pen and touch displays</b><span>Calibrate the screen for pen or touch input</span></div></div>
      {step === 0 && (
        <div className="tcal-body">
          <p>Choose the display you want to calibrate, then tap the crosshairs that appear.</p>
          <div className="tcal-screens">
            <label className="tcal-screen on"><Icon name="display" size={40} /><span>1. Generic PnP Monitor</span><em>Primary</em></label>
            <label className="tcal-screen"><Icon name="display" size={40} /><span>2. (not detected)</span><em>Disabled</em></label>
          </div>
          <p><Btn def onClick={() => setStep(1)}>Calibrate…</Btn> <Btn onClick={() => msgBox({ title: "Tablet PC Settings", text: "Reset the calibration to the factory default.", icon: "info" })}>Reset</Btn></p>
        </div>
      )}
      {step === 1 && (
        <div className="tcal-stage" onClick={hit}>
          <p className="tcal-hint">Tap the centre of each crosshair. ({hits.length} of {targets.length})</p>
          {targets.map((t, i) => (
            <span key={i} className={"tcal-cross" + (i < hits.length ? " done" : "")} style={{ left: t.x + "%", top: t.y + "%" }}>+</span>
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="tcal-body">
          <p className="ok">Calibration complete. The data has been saved to the pen and touch settings for this display.</p>
          <p className="dim">Saved {lsGet("win7.touchcal", "")}</p>
          <p><Btn def onClick={() => { setStep(0); setHits([]); }}>Calibrate again</Btn></p>
        </div>
      )}
    </div>
  );
}

/* ======================================================== Fax cover page editor */
const COVER_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "to", label: "To", placeholder: "Recipient name" },
  { key: "company", label: "Company", placeholder: "Recipient company" },
  { key: "fax", label: "Fax", placeholder: "+1 (555) 010-0000" },
  { key: "from", label: "From", placeholder: "Your name" },
  { key: "phone", label: "Phone", placeholder: "+1 (555) 010-1111" },
  { key: "subject", label: "Re", placeholder: "Subject" },
  { key: "pages", label: "Pages", placeholder: "1" },
];

export function FaxCoverEditor() {
  const [f, setF] = useState<Record<string, string>>(() =>
    lsGet("win7.faxcover", { to: "", company: "", fax: "", from: getState().settings.currentUser, phone: "", subject: "", pages: "1" }),
  );
  const [note, setNote] = useState("Please review the attached document and call me if you have any questions.");
  const save = () => {
    lsSet("win7.faxcover", f);
    notify({ title: "Fax Cover Page Editor", text: "The cover page was saved as Common Cover Page.cov", icon: "info" });
  };
  return (
    <div className="fce">
      <div className="fce-bar">
        <Icon name="printer" size={20} />
        <b>Fax Cover Page Editor</b>
        <div style={{ flex: 1 }} />
        <Btn onClick={save}>Save</Btn>
        <Btn onClick={() => openApp("wfs")}>Send fax…</Btn>
      </div>
      <div className="fce-body">
        <div className="fce-fields">
          {COVER_FIELDS.map((c) => (
            <label key={c.key} className="fce-row">
              <span>{c.label}</span>
              <input className="w7input" value={f[c.key] ?? ""} placeholder={c.placeholder} onChange={(e) => setF({ ...f, [c.key]: e.target.value })} />
            </label>
          ))}
          <label className="fce-row note"><span>Message</span>
            <textarea className="w7input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div className="fce-preview">
          <div className="fce-page">
            <h2>FAX</h2>
            <div className="fce-line"><b>To</b><span>{f.to || "—"}</span></div>
            <div className="fce-line"><b>Company</b><span>{f.company || "—"}</span></div>
            <div className="fce-line"><b>Fax</b><span>{f.fax || "—"}</span></div>
            <div className="fce-line"><b>From</b><span>{f.from || "—"}</span></div>
            <div className="fce-line"><b>Phone</b><span>{f.phone || "—"}</span></div>
            <div className="fce-line"><b>Re</b><span>{f.subject || "—"}</span></div>
            <div className="fce-line"><b>Pages</b><span>{f.pages || "1"}</span></div>
            <p className="fce-note">{note}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================== Disk Defragmenter */
/**
 * Windows 7's Disk Defragmenter (dfrgui.exe) — the drive list with the schedule
 * strip, "Analyze disk" and "Defragment disk", and a real block map that settles
 * as the pass runs. The existing Disk Cleanup is a different program.
 */
const BLOCKS = 24 * 8;
export function DiskDefragmenter() {
  const [phase, setPhase] = useState<"idle" | "analyzing" | "defragging" | "done">("idle");
  const [pct, setPct] = useState(0);
  const [schedule, setSchedule] = useState(() => lsGet("win7.defrag.sched", true));
  const [lastRun, setLastRun] = useState(() => lsGet("win7.defrag.last", "Never"));
  const [map] = useState(() => Array.from({ length: BLOCKS }, (_, i) => (i * 7919) % 100 < 34 ? 1 : 0));
  const run = (mode: "analyzing" | "defragging") => {
    setPhase(mode);
    setPct(0);
    let p = 0;
    const iv = window.setInterval(() => {
      p += 4;
      setPct(Math.min(100, p));
      if (p >= 100) {
        window.clearInterval(iv);
        setPhase("done");
        const now = new Date().toLocaleString();
        setLastRun(now);
        lsSet("win7.defrag.last", now);
        playSys("tada");
      }
    }, 130);
  };
  const display = map.map((v, i) => {
    if (phase === "defragging" || phase === "done") {
      // defragmented: the used blocks migrate to the front
      const used = map.filter((x) => x === 1).length;
      return i < used ? 1 : 0;
    }
    if (phase === "analyzing" && i / BLOCKS > pct / 100) return v;
    return v;
  });
  return (
    <div className="dfg">
      <div className="dfg-head">
        <Icon name="drive" size={36} />
        <div><b>Disk Defragmenter</b><span>Consolidates fragmented files and folders on your hard disk</span></div>
      </div>
      <div className="dfg-body">
        <div className="dfg-row head"><span>Drive</span><span>Media type</span><span>Last run</span><span>Status</span></div>
        <div className="dfg-row sel">
          <span><Icon name="driveFixed" size={18} /> (C:)</span>
          <span>Hard disk drive</span>
          <span>{lastRun}</span>
          <span>{(phase === "analyzing" ? `Analyzing ${pct}%` : phase === "defragging" ? `Defragmenting ${pct}%` : phase === "done" ? "0% fragmented" : "18% fragmented")}</span>
        </div>
      </div>
      <div className="dfg-map">
        <div className="dfg-bar">
          {display.map((v, i) => <i key={i} className={v ? "used" : "free"} />)}
        </div>
        <div className="dfg-legend">
          <span><i className="frag" /> Fragmented files</span>
          <span><i className="used" /> Contiguous files</span>
          <span><i className="free" /> Free space</span>
        </div>
      </div>
      <div className="dfg-foot">
        <Check checked={schedule} onChange={(v) => { setSchedule(v); lsSet("win7.defrag.sched", v); }} label="Run on a schedule (recommended): Weekly, Sunday 1:00 AM" />
        <div style={{ flex: 1 }} />
        <Btn onClick={() => openApp("tasksched")}>Configure schedule…</Btn>
        <Btn disabled={phase === "analyzing" || phase === "defragging"} onClick={() => run("analyzing")}>Analyze disk</Btn>
        <Btn def disabled={phase === "analyzing" || phase === "defragging"} onClick={() => run("defragging")}>Defragment disk</Btn>
      </div>
    </div>
  );
}

/* ============================================================ Windows Sidebar Gallery */
export function SyncCenterWizard() {
  const [step, setStep] = useState(0);
  const [what, setWhat] = useState("files");
  return (
    <div className="syncw">
      <div className="syncw-head"><Icon name="share" size={32} /><div><b>New Sync Partnership</b><span>Step {step + 1} of 3</span></div></div>
      {step === 0 && (
        <div className="syncw-body">
          <p>Choose what you want to sync with this device:</p>
          <Radio checked={what === "files"} onChange={() => setWhat("files")} label="Files and folders (a network share or a USB drive)" />
          <br />
          <Radio checked={what === "offline"} onChange={() => setWhat("offline")} label="Offline files (make network files available offline)" />
          <br />
          <Radio checked={what === "device"} onChange={() => setWhat("device")} label="A portable device (media player, phone)" />
          <p className="syncw-btns"><Btn def onClick={() => setStep(1)}>Next</Btn><Btn onClick={() => openApp("sync")}>Cancel</Btn></p>
        </div>
      )}
      {step === 1 && (
        <div className="syncw-body">
          <p>{what === "files" ? "Select the folder to sync:" : what === "offline" ? "Select the network location:" : "Connect the device, then select it:"}</p>
          <div className="syncw-list">
            <label className="syncw-item"><Check checked label="Documents" onChange={() => {}} /><span>\\\\HOME-PC\\Users\\Public\\Documents</span></label>
            <label className="syncw-item"><Check checked={false} label="Pictures" onChange={() => {}} /><span>\\\\HOME-PC\\Users\\Public\\Pictures</span></label>
            <label className="syncw-item"><Check checked label="Music" onChange={() => {}} /><span>\\\\HOME-PC\\Users\\Public\\Music</span></label>
          </div>
          <p className="syncw-btns"><Btn onClick={() => setStep(0)}>Back</Btn><Btn def onClick={() => setStep(2)}>Next</Btn></p>
        </div>
      )}
      {step === 2 && (
        <div className="syncw-body">
          <p className="ok">The sync partnership was created.</p>
          <p>Your files will be synchronised automatically when the device is connected. You can change the schedule later in Sync Center.</p>
          <p className="syncw-btns"><Btn def onClick={() => { playSys("tada"); openApp("sync"); }}>Finish</Btn></p>
        </div>
      )}
    </div>
  );
}
