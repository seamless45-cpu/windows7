"use client";
/**
 * Inbox programs that shipped with Windows 7 Ultimate but were missing here.
 *
 * These are the consoles the *Administrative Tools* folder and the printer /
 * display subsystems own, rather than the Control Panel property sheets:
 *
 *   printmgmt     Print Management (printmanagement.msc)
 *   compsvc       Component Services (dcomcnfg.exe)
 *   odbcad        ODBC Data Source Administrator (odbcad32.exe)
 *   sigverif      File Signature Verification (sigverif.exe)
 *   recdisc       Create a System Repair Disc (recdisc.exe)
 *   colorcpl      Color Management (colorcpl.exe)
 *   displayswitch Project to a second screen (displayswitch.exe, Win+P)
 *   netproj       Connect to a Network Projector (NetProj.exe)
 *
 * Everything they change is kept in localStorage or in the simulated file
 * system, so a printer added here shows up in Devices and Printers, a repair
 * disc really appears as a file, and the projector mode survives a reload.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Win, useStore, getState, lsGet, lsSet, mkfile, notify, msgBox, printDocument, openCP, closeWin, children, fmtSize } from "../store";
import { Icon } from "../icons";
import { Btn, Check, GroupBox, Radio, Spinner } from "../ui";
import { logEvent } from "../kernel";
import { playSys } from "../sound";

/* --------------------------------------------------------- shared chrome */
function Pane({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"inbox-pane " + className}>{children}</div>;
}
function Tree({ label, icon, depth = 0, onClick, on }: { label: string; icon?: string; depth?: number; onClick?: () => void; on?: boolean }) {
  return (
    <div className={"inbox-tree" + (on ? " on" : "")} style={{ paddingLeft: 6 + depth * 14 }} onClick={onClick}>
      {icon ? <Icon name={icon} size={16} /> : <span style={{ width: 16 }} />}
      <span>{label}</span>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="inbox-empty">{children}</div>;
}
function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="inbox-toolbar">{children}</div>;
}

/* ============================================ Print Management (mmc) */
interface Printer { name: string; driver: string; port: string; shared: boolean; def: boolean; jobs: number }
const PRINT_KEY = "win7.printers";
const DEFAULT_PRINTERS: Printer[] = [
  { name: "Microsoft XPS Document Writer", driver: "Microsoft XPS Document Writer v4", port: "XPSPort:", shared: false, def: true, jobs: 0 },
  { name: "Fax", driver: "Microsoft Shared Fax Driver", port: "SHRFAX:", shared: false, def: false, jobs: 0 },
];

export function PrintManagement({ win }: { win: Win }) {
  void win;
  const [printers, setPrinters] = useState<Printer[]>(() => lsGet<Printer[]>(PRINT_KEY, DEFAULT_PRINTERS));
  const [sel, setSel] = useState(printers[0]?.name ?? "");
  const [node, setNode] = useState("printers");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<null | string>(null);
  useEffect(() => { lsSet(PRINT_KEY, printers); }, [printers]);

  const cur = printers.find((p) => p.name === sel);
  const upd = (name: string, patch: Partial<Printer>) => setPrinters((ps) => ps.map((p) => (p.name === name ? { ...p, ...patch } : p)));
  const visible = printers.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.toLowerCase()));

  const addPrinter = () => {
    const n = `Printer ${printers.length + 1}`;
    setPrinters((ps) => [...ps, { name: n, driver: "Generic / Text Only", port: "PORTPROMPT:", shared: false, def: false, jobs: 0 }]);
    setSel(n);
    logEvent("Information", "Microsoft-Windows-PrintService", 808, `Printer ${n} was created on port PORTPROMPT:.`, "System");
    notify({ title: "Print Management", text: `${n} was added.`, icon: "info" });
  };
  const removePrinter = () => {
    if (!cur) return;
    if (cur.def) return msgBox({ title: "Print Management", text: "You cannot delete the default printer. Set another printer as the default first.", icon: "warn" });
    setPrinters((ps) => ps.filter((p) => p.name !== cur.name));
    setSel(printers.find((p) => p.name !== cur.name)?.name ?? "");
  };
  const setDefault = () => cur && setPrinters((ps) => ps.map((p) => ({ ...p, def: p.name === cur.name })));
  const testPage = () => cur && printDocument({ name: `${cur.name} test page`, body: `${cur.name}\nTest page\n\nPort: ${cur.port}\nDriver: ${cur.driver}` });
  const purge = () => { if (!cur) return; upd(cur.name, { jobs: 0 }); notify({ title: "Print Management", text: `The print queue for ${cur.name} was purged.`, icon: "info" }); };

  const driverRows: [string, string, string][] = [
    ["Microsoft XPS Document Writer v4", "Microsoft", "6.1.7601.17514"],
    ["Microsoft Shared Fax Driver", "Microsoft", "6.1.7601.17514"],
    ["Generic / Text Only", "Microsoft", "6.1.7600.16385"],
    ["HP LaserJet 4250 PCL 6", "Hewlett-Packard", "61.103.0.1"],
  ];

  return (
    <div className="inbox printmgmt">
      <div className="inbox-hd"><Icon name="printer" size={22} /><b>Print Management</b><span className="inbox-sub">printmanagement.msc</span></div>
      <div className="inbox-body">
        <div className="inbox-nav">
          <Tree label="Print Management" icon="cmg" />
          <Tree label="Custom Filters" icon="folder" depth={1} />
          <Tree label="All Printers" icon="printer" depth={1} on={node === "printers"} onClick={() => setNode("printers")} />
          <Tree label="All Drivers" icon="cd" depth={1} on={node === "drivers"} onClick={() => setNode("drivers")} />
          <Tree label="All Ports" icon="network" depth={1} on={node === "ports"} onClick={() => setNode("ports")} />
          <Tree label="Print Servers" icon="computer" />
          <Tree label="This PC (local)" icon="computer" depth={1} />
          <Tree label="Printers" icon="printer" depth={2} on={node === "printers"} onClick={() => setNode("printers")} />
        </div>
        <div className="inbox-main">
          <Toolbar>
            <input className="w7input" style={{ width: 200 }} placeholder="Filter by printer name" value={q} onChange={(e) => setQ(e.target.value)} />
            <Btn onClick={addPrinter}>Add Printer</Btn>
            <Btn onClick={setDefault} disabled={!cur || cur.def}>Set as Default</Btn>
            <Btn onClick={() => cur && openCP("devices")} disabled={!cur}>Printer Properties</Btn>
            <Btn onClick={removePrinter} disabled={!cur}>Delete</Btn>
          </Toolbar>
          {node === "printers" && (
            <>
              <table className="inbox-grid">
                <thead><tr><th>Printer Name</th><th>Driver</th><th>Port</th><th>Shared</th><th>Queue</th></tr></thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.name} className={sel === p.name ? "sel" : ""} onClick={() => setSel(p.name)} onDoubleClick={testPage}>
                      <td><Icon name="printer" size={16} /> {p.name}{p.def && <span className="inbox-tag">Default</span>}</td>
                      <td>{p.driver}</td><td>{p.port}</td><td>{p.shared ? "Shared" : "Not shared"}</td>
                      <td>{p.jobs ? `${p.jobs} document(s)` : "Idle"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && <Empty>No printers match the filter.</Empty>}
              <Toolbar>
                <Btn onClick={() => cur && upd(cur.name, { jobs: cur.jobs + 1 })} disabled={!cur}>Print Test Page (queue)</Btn>
                <Btn onClick={purge} disabled={!cur || !cur.jobs}>Purge Queue</Btn>
                <Btn onClick={testPage} disabled={!cur}>Send to XPS Writer</Btn>
              </Toolbar>
            </>
          )}
          {node === "drivers" && (
            <table className="inbox-grid">
              <thead><tr><th>Driver Name</th><th>Manufacturer</th><th>Version</th></tr></thead>
              <tbody>{driverRows.map(([n, m, v]) => <tr key={n}><td>{n}</td><td>{m}</td><td>{v}</td></tr>)}</tbody>
            </table>
          )}
          {node === "ports" && (
            <table className="inbox-grid">
              <thead><tr><th>Port</th><th>Type</th><th>Printer</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td>XPSPort:</td><td>Local Port</td><td>Microsoft XPS Document Writer</td><td>Available</td></tr>
                <tr><td>SHRFAX:</td><td>Local Port</td><td>Fax</td><td>Available</td></tr>
                <tr><td>PORTPROMPT:</td><td>Local Port</td><td>—</td><td>Available</td></tr>
                <tr><td>LPT1:</td><td>Parallel</td><td>—</td><td>Not present</td></tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="inbox-status">{printers.length} printer(s) · {busy ?? "Print Server: local"}</div>
    </div>
  );
}

/* =========================================== Component Services (dcomcnfg) */
/* Fixed start times: Date.now() during render is flagged as impure, and the
   values only need to look like a console column. */
const PROC_TIMES = ["10:42:11 AM", "11:27:03 AM"];

export function ComponentServices({ win }: { win: Win }) {
  void win;
  const [sel, setSel] = useState("root");
  const [open, setOpen] = useState<string[]>(["computers"]);
  const toggle = (k: string) => setOpen((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));
  const apps = [
    { name: "COM+ System Application", id: "{02D4B3F1-FD88-11D1-960D-00805FC79235}", status: "Running", type: "System Application" },
    { name: "COM+ Utilities", id: "{02D4B3F1-FD88-11D1-960D-00805FC79235}", status: "Running", type: "System Application" },
    { name: "Windows Management Instrumentation", id: "{AABBCC00-1122-3344-5566-778899AABBCC}", status: "Paused", type: "Server Application" },
  ];
  const dcom = [
    ["Windows Management and Instrumentation", "None", "Interactive User"],
    ["ShellServiceHost", "None", "Interactive User"],
    ["Print Spooler", "None", "System Account"],
    ["Machine Debug Manager", "None", "Interactive User"],
  ];
  return (
    <div className="inbox compsvc">
      <div className="inbox-hd"><Icon name="services" size={22} /><b>Component Services</b><span className="inbox-sub">dcomcnfg.exe</span></div>
      <div className="inbox-body">
        <div className="inbox-nav">
          <Tree label="Component Services" icon="cmg" on={sel === "root"} onClick={() => setSel("root")} />
          <Tree label="Computers" icon="computer" depth={1} onClick={() => toggle("computers")} on={sel === "computers"} />
          {open.includes("computers") && (
            <>
              <Tree label="My Computer" icon="computer" depth={2} on={sel === "mycomputer"} onClick={() => { setSel("mycomputer"); if (!open.includes("mycomputer")) toggle("mycomputer"); }} />
              {open.includes("mycomputer") && (
                <>
                  <Tree label="COM+ Applications" icon="folder" depth={3} on={sel === "complus"} onClick={() => setSel("complus")} />
                  <Tree label="DCOM Config" icon="folder" depth={3} on={sel === "dcom"} onClick={() => setSel("dcom")} />
                  <Tree label="Running Processes" icon="taskmgr" depth={3} on={sel === "proc"} onClick={() => setSel("proc")} />
                </>
              )}
            </>
          )}
          <Tree label="Services (Local)" icon="services" depth={1} on={sel === "svc"} onClick={() => setSel("svc")} />
        </div>
        <div className="inbox-main">
          {sel === "root" && (
            <div className="inbox-about">
              <h3>Welcome to Component Services</h3>
              <p>Component Services is the management console for COM+ applications, DCOM configuration and the Distributed Transaction Coordinator. Use the tree on the left to open a computer.</p>
              <ul>
                <li><b>COM+ Applications</b> — the server applications registered on this computer.</li>
                <li><b>DCOM Config</b> — the launch and access permissions for each DCOM server.</li>
                <li><b>Running Processes</b> — the COM+ processes that are alive right now.</li>
              </ul>
            </div>
          )}
          {sel === "complus" && (
            <table className="inbox-grid">
              <thead><tr><th>Name</th><th>Application ID</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>{apps.map((a) => (
                <tr key={a.name} onDoubleClick={() => msgBox({ title: a.name + " Properties", text: `Application ID: ${a.id}\nType: ${a.type}\nStatus: ${a.status}\n\nRun as: Interactive user\nAuthentication: Packet privacy\nImpersonation level: Impersonate`, icon: "info" })}>
                  <td><Icon name="folder" size={16} /> {a.name}</td><td>{a.id}</td><td>{a.type}</td><td>{a.status}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {sel === "dcom" && (
            <table className="inbox-grid">
              <thead><tr><th>DCOM Application</th><th>Authentication</th><th>Run as</th></tr></thead>
              <tbody>{dcom.map(([n, a, r]) => <tr key={n}><td><Icon name="file" size={16} /> {n}</td><td>{a}</td><td>{r}</td></tr>)}</tbody>
            </table>
          )}
          {sel === "proc" && (
            <table className="inbox-grid">
              <thead><tr><th>Process ID</th><th>Application</th><th>User</th><th>Start time</th></tr></thead>
              <tbody>
                <tr><td>1984</td><td>{"dllhost.exe /Processid:{02D4B3F1-FD88-11D1-960D-00805FC79235}"}</td><td>SYSTEM</td><td>{PROC_TIMES[0]}</td></tr>
                <tr><td>2216</td><td>{"dllhost.exe /Processid:{AABBCC00-1122-3344-5566-778899AABBCC}"}</td><td>{getState().settings.currentUser}</td><td>{PROC_TIMES[1]}</td></tr>
              </tbody>
            </table>
          )}
          {sel === "svc" && (
            <div className="inbox-about">
              <h3>Services (Local)</h3>
              <p>The same Service Control Manager the Services console shows. Stopping a service here changes what the shell can do.</p>
              <p><Btn def onClick={() => openCP("services")}>Open Services</Btn></p>
            </div>
          )}
          {(sel === "mycomputer" || sel === "computers") && <Empty>Expand <b>My Computer</b> to see the COM+ applications, DCOM configuration and running processes.</Empty>}
        </div>
      </div>
      <div className="inbox-status">Computer: My Computer · Connected to the local COM+ catalog</div>
    </div>
  );
}

/* ================================== ODBC Data Source Administrator */
interface Dsn { name: string; driver: string; server: string }
const ODBC_KEY = "win7.odbc";
const ODBC_DRIVERS = ["SQL Server", "SQL Server Native Client 10.0", "Microsoft Access Driver (*.mdb, *.accdb)", "Microsoft Excel Driver (*.xls)", "dBASE Files", "Text Files"];
const DEFAULT_DSN: Record<string, Dsn[]> = {
  User: [{ name: "dBASE Files", driver: "Microsoft dBASE Driver (*.dbf)", server: "" }, { name: "Excel Files", driver: "Microsoft Excel Driver (*.xls)", server: "" }],
  System: [{ name: "LocalServer", driver: "SQL Server", server: "localhost\\SQLEXPRESS" }],
  "File": [],
};

export function OdbcAdmin({ win }: { win: Win }) {
  void win;
  const [tab, setTab] = useState<"User" | "System" | "File">("User");
  const [all, setAll] = useState<Record<string, Dsn[]>>(() => lsGet(ODBC_KEY, DEFAULT_DSN));
  const [sel, setSel] = useState<string>("");
  const [form, setForm] = useState<null | { name: string; driver: string; server: string }>(null);
  useEffect(() => { lsSet(ODBC_KEY, all); }, [all]);
  const rows = all[tab] || [];
  const cur = rows.find((r) => r.name === sel);
  const commit = () => {
    if (!form || !form.name.trim()) return;
    setAll({ ...all, [tab]: [...rows.filter((r) => r.name !== form.name.trim()), { ...form, name: form.name.trim() }] });
    setSel(form.name.trim());
    setForm(null);
  };
  const remove = () => {
    if (!cur) return;
    setAll({ ...all, [tab]: rows.filter((r) => r.name !== cur.name) });
    setSel("");
  };
  const configure = (r: Dsn) => msgBox({
    title: `ODBC ${r.driver} Setup`,
    text: `Data Source Name: ${r.name}\nDescription:\nServer: ${r.server || "(local)"}\n\nAuthentication: Windows NT authentication\nDatabase: master\n\nUse ANSI quoted identifiers ✓\nUse ANSI nulls, padding and warnings ✓`,
    icon: "info",
  });
  return (
    <div className="inbox odbc">
      <div className="inbox-hd"><Icon name="drive" size={22} /><b>ODBC Data Source Administrator</b><span className="inbox-sub">odbcad32.exe</span></div>
      <div className="inbox-tabs">
        {(["User", "System", "File"] as const).map((t) => (
          <div key={t} className={"inbox-tab" + (tab === t ? " on" : "")} onClick={() => { setTab(t); setSel(""); }}>{t} DSN</div>
        ))}
        <div className="inbox-tab" onClick={() => setTab("File")} style={{ display: "none" }} />
      </div>
      <div className="inbox-main">
        <table className="inbox-grid">
          <thead><tr><th>Name</th><th>Driver</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={sel === r.name ? "sel" : ""} onClick={() => setSel(r.name)} onDoubleClick={() => configure(r)}>
                <td><Icon name="file" size={16} /> {r.name}</td><td>{r.driver}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>There are no {tab.toLowerCase()} data sources. Click Add to create one.</Empty>}
        <Toolbar>
          <Btn def onClick={() => setForm({ name: "", driver: ODBC_DRIVERS[0], server: "" })}>Add...</Btn>
          <Btn onClick={remove} disabled={!cur}>Remove</Btn>
          <Btn onClick={() => cur && configure(cur)} disabled={!cur}>Configure...</Btn>
        </Toolbar>
        {form && (
          <GroupBox title={tab + " Data Source"}>
            <p>Name: <input className="w7input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></p>
            <p>Driver: <select className="w7input" value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })}>{ODBC_DRIVERS.map((d) => <option key={d}>{d}</option>)}</select></p>
            <p>Server: <input className="w7input" value={form.server} placeholder="localhost" onChange={(e) => setForm({ ...form, server: e.target.value })} /></p>
            <p><Btn def onClick={commit}>OK</Btn> <Btn onClick={() => setForm(null)}>Cancel</Btn></p>
          </GroupBox>
        )}
        <div className="inbox-note">
          An ODBC data source describes how to reach a database. An <b>System DSN</b> is available to every user; a <b>User DSN</b> only to the account that created it.
        </div>
      </div>
      <div className="inbox-status">Drivers installed: {ODBC_DRIVERS.length} · {rows.length} {tab.toLowerCase()} data source(s)</div>
    </div>
  );
}

/* ===================================== File Signature Verification */
export function FileSignature({ win }: { win: Win }) {
  const [scanning, setScanning] = useState(false);
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState(false);
  const files = useMemo(() => [
    ["C:\\Windows\\System32\\ntoskrnl.exe", "Microsoft Windows", "Signed"],
    ["C:\\Windows\\System32\\kernel32.dll", "Microsoft Windows", "Signed"],
    ["C:\\Windows\\System32\\shell32.dll", "Microsoft Windows", "Signed"],
    ["C:\\Windows\\System32\\drivers\\tcpip.sys", "Microsoft Windows", "Signed"],
    ["C:\\Windows\\System32\\drivers\\rt640x64.sys", "Realtek Semiconductor", "Signed"],
    ["C:\\Windows\\System32\\drivers\\nvlddmkm.sys", "NVIDIA Corporation", "Signed"],
    ["C:\\Windows\\System32\\atl.dll", "Microsoft Corporation", "Signed"],
    ["C:\\Windows\\System32\\unknown.dll", "", "Not signed"],
  ], []);
  useEffect(() => {
    if (!scanning) return;
    const t = setInterval(() => setPct((p) => {
      if (p >= 100) { clearInterval(t); setScanning(false); setDone(true); playSys("notify"); return 100; }
      return p + 9;
    }), 110);
    return () => clearInterval(t);
  }, [scanning]);
  void win;
  return (
    <div className="inbox sigverif">
      <div className="inbox-hd"><Icon name="shield" size={22} /><b>File Signature Verification</b><span className="inbox-sub">sigverif.exe</span></div>
      <div className="inbox-main">
        <p>This tool verifies that the system files on this computer carry a valid digital signature. Unsigned files may have been replaced by another program.</p>
        <GroupBox title="Scan settings">
          <p>Files to scan: <b>System files</b> (C:\Windows)</p>
          <p>Signature verification log: {log ? "C:\\Windows\\sigverif.txt" : "(not written)"}</p>
          <Check checked={log} onChange={setLog} label="Save the results to a log file" />
        </GroupBox>
        {scanning ? (
          <div style={{ marginTop: 12 }}>
            <Spinner text={`Verifying ${pct}%…`} />
            <div className="inbox-bar"><i style={{ width: pct + "%" }} /></div>
          </div>
        ) : (
          <Toolbar>
            <Btn def onClick={() => { setDone(false); setPct(0); setScanning(true); }}>Start</Btn>
            <Btn onClick={() => msgBox({ title: "Advanced File Signature Verification Settings", text: "Search options:\n  ✓ Notify me if any system files are not signed\n  ✓ Look for other files that are not digitally signed\n\nSignature verification results are written to the log when enabled.", icon: "info" })}>Advanced</Btn>
          </Toolbar>
        )}
        {done && (
          <>
            <h4 style={{ margin: "14px 0 6px" }}>{files.filter(([, , s]) => s === "Not signed").length} file(s) are not digitally signed</h4>
            <table className="inbox-grid">
              <thead><tr><th>File</th><th>Signed by</th><th>Status</th></tr></thead>
              <tbody>{files.map(([f, by, s]) => (
                <tr key={f}><td>{f}</td><td>{by || "—"}</td><td className={s === "Signed" ? "" : "bad"}>{s}</td></tr>
              ))}</tbody>
            </table>
            {log && <div className="inbox-note">The verification log was saved to <code>C:\Windows\sigverif.txt</code>.</div>}
          </>
        )}
      </div>
      <div className="inbox-status">{done ? `${files.length} files scanned` : scanning ? "Scanning…" : "Ready"}</div>
    </div>
  );
}

/* ===================================== Create a System Repair Disc */
export function RecoveryDisc({ win }: { win: Win }) {
  const [label, setLabel] = useState("WIN7_RECOVERY");
  const [step, setStep] = useState<"form" | "burn" | "done">("form");
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (step !== "burn") return;
    const t = setInterval(() => setPct((p) => {
      if (p >= 100) { clearInterval(t); setStep("done"); return 100; }
      return p + 5;
    }), 90);
    return () => clearInterval(t);
  }, [step]);
  useEffect(() => {
    if (step !== "done") return;
    const body = "Windows 7 System Recovery Options\r\n\r\nThis disc can start this computer and open the recovery tools:\r\n  Startup Repair\r\n  System Restore\r\n  System Image Recovery\r\n  Windows Memory Diagnostic\r\n  Command Prompt\r\n";
    mkfile("docs", `${label}.iso.txt`, body, 4096);
    logEvent("Information", "Microsoft-Windows-Kernel-General", 34, `The system repair disc "${label}" was created.`, "System");
    playSys("notify");
    notify({ title: "Create a System Repair Disc", text: `The repair disc image ${label} was written to Documents.`, icon: "info" });
  }, [step, label]);
  void win;
  return (
    <div className="inbox recdisc">
      <div className="inbox-hd"><Icon name="cd" size={22} /><b>Create a System Repair Disc</b><span className="inbox-sub">recdisc.exe</span></div>
      <div className="inbox-main">
        {step === "form" && (
          <>
            <p>A system repair disc can start this computer and give you access to the Windows Recovery Environment, so you can repair Windows if a serious error occurs.</p>
            <GroupBox title="Drive">
              <p>Drive: <b>DVD RW Drive (E:)</b> — 4.38 GB free</p>
              <p>Disc label: <input className="w7input" style={{ width: 180 }} value={label} onChange={(e) => setLabel(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 16))} /></p>
              <p className="inbox-note">Insert a blank CD or DVD in the drive, then click Create disc.</p>
            </GroupBox>
            <div className="dlg-foot" style={{ justifyContent: "flex-start", marginTop: 10 }}>
              <Btn def onClick={() => { setPct(0); setStep("burn"); }}>Create disc</Btn>
              <Btn onClick={() => closeWin(win.id)}>Cancel</Btn>
            </div>
          </>
        )}
        {step === "burn" && (
          <>
            <p>Creating the system repair disc…</p>
            <Spinner text={`Writing ${label} — ${pct}%`} />
            <div className="inbox-bar"><i style={{ width: pct + "%" }} /></div>
            <p className="inbox-note">Do not remove the disc, and do not turn off the computer while the disc is being created.</p>
          </>
        )}
        {step === "done" && (
          <>
            <p><b>The system repair disc was created successfully.</b></p>
            <table className="cp-t"><tbody>
              <tr><td>Label:</td><td>{label}</td></tr>
              <tr><td>Image:</td><td>Documents\{label}.iso.txt</td></tr>
              <tr><td>Tools:</td><td>Startup Repair, System Restore, System Image Recovery, Memory Diagnostic, Command Prompt</td></tr>
            </tbody></table>
            <div className="dlg-foot" style={{ justifyContent: "flex-start", marginTop: 10 }}>
              <Btn def onClick={() => closeWin(win.id)}>Close</Btn>
              <Btn onClick={() => { setStep("form"); setPct(0); }}>Create another disc</Btn>
            </div>
          </>
        )}
      </div>
      <div className="inbox-status">{step === "done" ? "Disc created" : step === "burn" ? "Writing…" : "Ready"}</div>
    </div>
  );
}

/* ================================================ Color Management */
interface Profile { name: string; device: string; def: boolean }
const COLOR_KEY = "win7.colorprofiles";
const DEFAULT_PROFILES: Profile[] = [
  { name: "sRGB Color Space Profile.icm", device: "Generic PnP Monitor", def: true },
  { name: "scRGB Color Space Profile.icm", device: "Generic PnP Monitor", def: false },
  { name: "Agfa:Swop Standard.icm", device: "Microsoft XPS Document Writer", def: true },
];
export function ColorManagement({ win }: { win: Win }) {
  void win;
  const [profiles, setProfiles] = useState<Profile[]>(() => lsGet<Profile[]>(COLOR_KEY, DEFAULT_PROFILES));
  const [device, setDevice] = useState("Generic PnP Monitor");
  const [sel, setSel] = useState("");
  const [tab, setTab] = useState<"Devices" | "All Profiles" | "Advanced">("Devices");
  useEffect(() => { lsSet(COLOR_KEY, profiles); }, [profiles]);
  const devices = ["Generic PnP Monitor", "Microsoft XPS Document Writer"];
  const shown = tab === "All Profiles" ? profiles : profiles.filter((p) => p.device === device);
  const cur = shown.find((p) => p.name === sel);
  const add = () => {
    const n = `Custom Profile ${profiles.length + 1}.icm`;
    setProfiles((ps) => [...ps, { name: n, device, def: !ps.some((p) => p.device === device && p.def) }]);
    setSel(n);
  };
  const setDef = () => cur && setProfiles((ps) => ps.map((p) => (p.device === cur.device ? { ...p, def: p.name === cur.name } : p)));
  const remove = () => cur && setProfiles((ps) => ps.filter((p) => p.name !== cur.name));
  return (
    <div className="inbox colorcpl">
      <div className="inbox-hd"><Icon name="display" size={22} /><b>Color Management</b><span className="inbox-sub">colorcpl.exe</span></div>
      <div className="inbox-tabs">
        {(["Devices", "All Profiles", "Advanced"] as const).map((t) => (
          <div key={t} className={"inbox-tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}</div>
        ))}
      </div>
      <div className="inbox-main">
        {tab !== "Advanced" ? (
          <>
            {tab === "Devices" && (
              <p>Device: <select className="w7input" value={device} onChange={(e) => { setDevice(e.target.value); setSel(""); }}>{devices.map((d) => <option key={d}>{d}</option>)}</select></p>
            )}
            <table className="inbox-grid">
              <thead><tr><th>Profile</th><th>Device</th><th>Default</th></tr></thead>
              <tbody>{shown.map((p) => (
                <tr key={p.name + p.device} className={sel === p.name ? "sel" : ""} onClick={() => setSel(p.name)}>
                  <td><Icon name="file" size={16} /> {p.name}</td><td>{p.device}</td><td>{p.def ? "Default" : ""}</td>
                </tr>
              ))}</tbody>
            </table>
            {!shown.length && <Empty>No colour profiles are associated with this device.</Empty>}
            <Toolbar>
              <Btn onClick={add}>Add...</Btn>
              <Btn onClick={setDef} disabled={!cur || cur.def}>Set as Default Profile</Btn>
              <Btn onClick={remove} disabled={!cur || cur.def}>Remove</Btn>
              <Btn onClick={() => msgBox({ title: "Associate Color Profile", text: "Select a colour profile to associate with this device.\n\nWindows uses the profile to keep colours consistent between the screen and a printer.", icon: "info" })}>Associate...</Btn>
            </Toolbar>
          </>
        ) : (
          <div className="inbox-about">
            <h3>Windows Color System Defaults</h3>
            <table className="cp-t"><tbody>
              <tr><td>Device profile:</td><td>sRGB Color Space Profile.icm</td></tr>
              <tr><td>Viewing conditions model:</td><td>Windows Color System defaults</td></tr>
              <tr><td>Rendering intent:</td><td>Perceptual (photo images)</td></tr>
              <tr><td>Advanced color:</td><td>Use Windows display calibration ✓</td></tr>
            </tbody></table>
            <p><Btn onClick={() => openCP("dccw")}>Open Display Color Calibration</Btn></p>
            <p><Btn onClick={() => msgBox({ title: "Change System Defaults", text: "The system defaults were reloaded from the Windows Color System profile store.", icon: "info" })}>Change system defaults...</Btn></p>
          </div>
        )}
      </div>
      <div className="inbox-status">{profiles.length} profile(s) installed</div>
    </div>
  );
}

/* ================================== Project to a second screen (Win+P) */
const DISPLAY_MODES = [
  { id: "pc", label: "Computer only", glyph: "▭", desc: "Use only this PC's display." },
  { id: "duplicate", label: "Duplicate", glyph: "▭▭", desc: "Show the same thing on both displays." },
  { id: "extend", label: "Extend", glyph: "▭|▭", desc: "Stretch the desktop across both displays." },
  { id: "projector", label: "Projector only", glyph: "▭", desc: "Use only the projector or second screen." },
] as const;

export function DisplaySwitch({ win }: { win: Win }) {
  const [mode, setMode] = useState<string>(() => lsGet("win7.display.mode", "pc"));
  const [detected, setDetected] = useState(false);
  const pick = (id: string) => {
    if (!detected && id !== "pc") {
      msgBox({ title: "Display", text: "No projector or second display was detected.\n\nConnect a cable to the external display port, then press Win+P again.", icon: "warn" });
      return;
    }
    lsSet("win7.display.mode", id);
    setMode(id);
    logEvent("Information", "Microsoft-Windows-DisplaySwitch", 1, `The display mode was changed to "${DISPLAY_MODES.find((m) => m.id === id)!.label}".`, "System");
    playSys("notify");
    notify({ title: "Display", text: `Display mode: ${DISPLAY_MODES.find((m) => m.id === id)!.label}`, icon: "info" });
  };
  return (
    <div className="inbox displayswitch">
      <div className="inbox-main">
        <div className="ds-modes">
          {DISPLAY_MODES.map((m) => (
            <div key={m.id} className={"ds-mode" + (mode === m.id ? " on" : "")} onClick={() => pick(m.id)} title={m.desc}>
              <span className="ds-glyph">{m.glyph}</span>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
        <p className="inbox-note">
          Windows looks for a second display when you choose any mode other than <b>Computer only</b>.
          {detected ? " A second display is connected." : " No second display is connected right now."}
        </p>
        <div className="dlg-foot" style={{ justifyContent: "flex-start" }}>
          <Btn def onClick={() => { setDetected(true); notify({ title: "Display", text: "A second display was detected on the external port.", icon: "info" }); }}>Detect</Btn>
          <Btn onClick={() => { setDetected(false); lsSet("win7.display.mode", "pc"); setMode("pc"); }}>Reset</Btn>
          <Btn onClick={() => closeWin(win.id)}>Close</Btn>
        </div>
        <p><a onClick={() => openCP("display")}>Adjust screen resolution</a> · <a onClick={() => openCP("dccw")}>Display Color Calibration</a></p>
      </div>
      <div className="inbox-status">{DISPLAY_MODES.find((m) => m.id === mode)!.label}</div>
    </div>
  );
}

/* =============================== Connect to a Network Projector */
const PROJECTORS = [
  { name: "CONF-RM-201", model: "Epson PowerLite 1930", secure: false },
  { name: "LOBBY-PROJ", model: "BenQ MX722", secure: true },
  { name: "MEETING-A", model: "Optoma X316", secure: true },
];
export function NetworkProjector({ win }: { win: Win }) {
  const [scanning, setScanning] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [pass, setPass] = useState("");
  const [state, setState] = useState<"idle" | "connecting" | "connected">("idle");
  useEffect(() => {
    const t = setTimeout(() => setScanning(false), 1200);
    return () => clearTimeout(t);
  }, []);
  const proj = PROJECTORS.find((p) => p.name === sel) || null;
  const connect = () => {
    if (!proj) return;
    if (proj.secure && pass.length < 4) return;
    setState("connecting");
    setTimeout(() => {
      setState("connected");
      lsSet("win7.display.mode", "duplicate");
      logEvent("Information", "Microsoft-Windows-NetworkProjector", 100, `Connected to the network projector ${proj.name}.`, "System");
      playSys("notify");
      notify({ title: "Network Projector", text: `Connected to ${proj.name}. Your display is being duplicated.`, icon: "info" });
    }, 1300);
  };
  return (
    <div className="inbox netproj">
      <div className="inbox-hd"><Icon name="network" size={22} /><b>Connect to a Network Projector</b><span className="inbox-sub">NetProj.exe</span></div>
      <div className="inbox-main">
        {state === "connected" && proj ? (
          <>
            <p><b>Connected to {proj.name} ({proj.model}).</b></p>
            <p className="inbox-note">Your desktop is being duplicated on the projector. Press Win+P to change the projection mode, or disconnect below.</p>
            <div className="dlg-foot" style={{ justifyContent: "flex-start" }}>
              <Btn def onClick={() => { setState("idle"); lsSet("win7.display.mode", "pc"); notify({ title: "Network Projector", text: `Disconnected from ${proj.name}.`, icon: "info" }); }}>Disconnect</Btn>
              <Btn onClick={() => closeWin(win.id)}>Close</Btn>
            </div>
          </>
        ) : (
          <>
            <p>Windows can search your network for projectors that are ready to receive a connection.</p>
            {scanning ? <Spinner text="Searching the network for projectors…" /> : (
              <>
                <table className="inbox-grid">
                  <thead><tr><th>Projector</th><th>Model</th><th>Security</th></tr></thead>
                  <tbody>{PROJECTORS.map((p) => (
                    <tr key={p.name} className={sel === p.name ? "sel" : ""} onClick={() => setSel(p.name)}>
                      <td><Icon name="network" size={16} /> {p.name}</td><td>{p.model}</td><td>{p.secure ? "Passcode required" : "Open"}</td>
                    </tr>
                  ))}</tbody>
                </table>
                {proj?.secure && <p>Passcode: <input className="w7input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} style={{ width: 140 }} /></p>}
                <Toolbar>
                  <Btn def onClick={connect} disabled={!proj || state === "connecting" || (proj.secure && pass.length < 4)}>{state === "connecting" ? "Connecting…" : "Connect"}</Btn>
                  <Btn onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 900); }}>Search again</Btn>
                  <Btn onClick={() => closeWin(win.id)}>Cancel</Btn>
                </Toolbar>
                <div className="inbox-note">Enter the projector&apos;s network address, or pick one of the projectors found on the network.</div>
                <p><input className="w7input" style={{ width: 220 }} placeholder="\\ \\projector\path or host name" onChange={(e) => { const n = e.target.value.trim().toUpperCase(); const hit = PROJECTORS.find((p) => p.name === n); if (hit) setSel(hit.name); }} /></p>
              </>
            )}
          </>
        )}
      </div>
      <div className="inbox-status">{state === "connected" ? "Connected" : scanning ? "Searching…" : `${PROJECTORS.length} projector(s) found`}</div>
    </div>
  );
}

/* ================================ Printers folder view (shell reuse) */
/** A tiny helper so other programs can show a printer in the shell's style. */
export function printerSummary() {
  const ps = lsGet<Printer[]>(PRINT_KEY, DEFAULT_PRINTERS);
  return { count: ps.length, def: ps.find((p) => p.def)?.name ?? "none", size: fmtSize(0) };
}
void children;
void useStore;
