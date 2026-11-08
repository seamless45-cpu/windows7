"use client";
/**
 * The Windows 7 administration consoles that were still missing:
 *
 *   wf.msc      Windows Firewall with Advanced Security
 *   secpol.msc  Local Security Policy
 *   mstsc       Remote Desktop Connection
 *   mobsync     Sync Center
 *   migwiz      Windows Easy Transfer
 *   mdsched     Windows Memory Diagnostic
 *   perfmon     Performance Monitor (the graph, not the reliability chart)
 *
 * Each one reads or writes state the rest of the shell already keeps — the
 * firewall switches, the local accounts, the volume list — so a change made
 * here is visible everywhere else.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Win, useStore, getState, setSettings, closeWin, notify, msgBox, promptBox, lsGet, lsSet, MenuItem, fmtBig, openCP, openApp, uac, fmtDate } from "../store";
import { MenuBar, ClassicMenu, Btn, Tabs, Check, Radio } from "../ui";
import { Icon } from "../icons";
import { logEvent, getEvents } from "../kernel";
import { services } from "../services";

/* ================================================== Windows Firewall (wf.msc) */
interface Rule { id: string; name: string; group: string; profile: string; enabled: boolean; action: "Allow" | "Block"; dir: "Inbound" | "Outbound"; program: string; protocol: string; port: string }

const SEED_RULES: Rule[] = [
  { id: "r1", name: "File and Printer Sharing (Echo Request - ICMPv4-In)", group: "File and Printer Sharing", profile: "Domain, Private", enabled: true, action: "Allow", dir: "Inbound", program: "System", protocol: "ICMPv4", port: "Any" },
  { id: "r2", name: "Core Networking - DNS (UDP-Out)", group: "Core Networking", profile: "All", enabled: true, action: "Allow", dir: "Outbound", program: "System", protocol: "UDP", port: "53" },
  { id: "r3", name: "Core Networking - DHCP (UDP-Out)", group: "Core Networking", profile: "All", enabled: true, action: "Allow", dir: "Outbound", program: "svchost.exe", protocol: "UDP", port: "67" },
  { id: "r4", name: "Internet Explorer (HTTP-Out)", group: "Internet Explorer", profile: "All", enabled: true, action: "Allow", dir: "Outbound", program: "C:\\Program Files\\Internet Explorer\\iexplore.exe", protocol: "TCP", port: "80, 443" },
  { id: "r5", name: "Windows Media Player Network Sharing", group: "Windows Media Player", profile: "Domain, Private", enabled: false, action: "Allow", dir: "Inbound", program: "C:\\Program Files\\Windows Media Player\\wmplayer.exe", protocol: "TCP", port: "2869" },
  { id: "r6", name: "Remote Desktop (TCP-In)", group: "Remote Desktop", profile: "Domain, Private", enabled: false, action: "Allow", dir: "Inbound", program: "C:\\Windows\\system32\\svchost.exe", protocol: "TCP", port: "3389" },
  { id: "r7", name: "NetBIOS Name Service (UDP-In)", group: "File and Printer Sharing", profile: "Domain, Private", enabled: true, action: "Allow", dir: "Inbound", program: "System", protocol: "UDP", port: "137" },
  { id: "r8", name: "All ICMP V6 (Inbound)", group: "Core Networking", profile: "All", enabled: true, action: "Allow", dir: "Inbound", program: "System", protocol: "ICMPv6", port: "Any" },
  { id: "r9", name: "Windows Peer to Peer Collaboration", group: "Windows Peer to Peer Collaboration", profile: "All", enabled: false, action: "Allow", dir: "Inbound", program: "System", protocol: "TCP", port: "3587" },
  { id: "r10", name: "Block inbound Telnet", group: "Custom", profile: "All", enabled: true, action: "Block", dir: "Inbound", program: "C:\\Windows\\system32\\telnet.exe", protocol: "TCP", port: "23" },
];

const RULE_KEY = "win7.fw.rules";

export function FirewallAdvanced({ win }: { win: Win }) {
  const fw = useStore((s) => s.settings.firewall);
  const [rules, setRules] = useState<Rule[]>(() => lsGet<Rule[]>(RULE_KEY, SEED_RULES));
  const [sel, setSel] = useState<string>("r1");
  const [node, setNode] = useState("inbound");
  const [filter, setFilter] = useState("");
  const [show, setShow] = useState<"all" | "in" | "out">("all");

  const save = (r: Rule[]) => { setRules(r); lsSet(RULE_KEY, r); };
  const rule = rules.find((r) => r.id === sel) || null;
  const list = useMemo(() => rules
    .filter((r) => (node === "inbound" ? r.dir === "Inbound" : node === "outbound" ? r.dir === "Outbound" : true))
    .filter((r) => show === "all" || (show === "in" ? r.dir === "Inbound" : r.dir === "Outbound"))
    .filter((r) => !filter || (r.name + r.group + r.program).toLowerCase().includes(filter.toLowerCase())),
  [rules, node, filter, show]);

  const toggle = (id: string) => {
    save(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    const r = rules.find((x) => x.id === id);
    if (r) logEvent("Information", "Microsoft-Windows-Security-Auditing", 4946, `A rule has been ${r.enabled ? "disabled" : "enabled"} in the Windows Firewall exception list. Rule: ${r.name}`, "Security");
  };

  const groups = [...new Set(rules.map((r) => r.group))];
  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Export Policy...", onClick: () => notify({ title: "Windows Firewall", text: "The policy was exported to firewall.wfw.", icon: "info" }) }, { label: "Exit", onClick: () => closeWin(win.id) }] },
    { label: "Action", items: () => [
      { label: "New Rule...", onClick: () => promptBox({ title: "New Inbound Rule Wizard", text: "Rule name:", value: "My rule", onOk: (name) => { const r: Rule = { id: "u" + Date.now().toString(36), name, group: "Custom", profile: "All", enabled: true, action: "Allow", dir: "Inbound", program: "Any", protocol: "TCP", port: "Any" }; save([r, ...rules]); setSel(r.id); setNode("inbound"); } }) },
      { label: "Properties", disabled: !rule, onClick: () => rule && msgBox({ title: `${rule.name} Properties`, icon: "info", text: `General\nName: ${rule.name}\nEnabled: ${rule.enabled ? "Yes" : "No"}\nAction: ${rule.action}\nDirection: ${rule.dir}\n\nPrograms and Services\nProgram: ${rule.program}\nProtocol: ${rule.protocol}\nLocal port: ${rule.port}\n\nAdvanced\nProfiles: ${rule.profile}` }) },
      { sep: true },
      { label: "Filter by Profile", sub: [{ label: "Domain", radio: true }, { label: "Private", radio: true }, { label: "Public", radio: true }] },
      { label: "Restore Default Policy", onClick: () => save(SEED_RULES) },
    ] },
    { label: "View", items: () => [
      { label: "Refresh", onClick: () => setRules(lsGet<Rule[]>(RULE_KEY, SEED_RULES)) },
      { label: "All Rules", radio: true, checked: show === "all", onClick: () => setShow("all") },
      { label: "Inbound Rules only", radio: true, checked: show === "in", onClick: () => setShow("in") },
      { label: "Outbound Rules only", radio: true, checked: show === "out", onClick: () => setShow("out") },
    ] },
    { label: "Help", items: () => [{ label: "Help", onClick: () => openApp("help") }] },
  ];

  const on = fw;
  return (
    <div className="wfa">
      <ClassicMenu menus={menus} />
      <div className="wfa-body">
        <div className="wfa-tree">
          <div className="wfa-root"><Icon name="shield" size={14} /> Windows Firewall with Advanced Security</div>
          <div className="wfa-node" onClick={() => setNode("overview")}><b>Overview</b></div>
          <div className="wfa-node" onClick={() => setNode("inbound")}>Inbound Rules</div>
          <div className="wfa-node" onClick={() => setNode("outbound")}>Outbound Rules</div>
          <div className="wfa-node" onClick={() => setNode("conn")}>Connection Security Rules</div>
          <div className="wfa-node" onClick={() => setNode("monitor")}>Monitoring</div>
        </div>
        <div className="wfa-main">
          {node === "overview" && (
            <div className="wfa-over">
              <h3>Windows Firewall with Advanced Security on Local Computer</h3>
              <div className="wfa-sum">
                <div className={on ? "on" : "off"}><Icon name={on ? "shield" : "warn"} size={36} /><b>Domain Profile</b><span>{on ? "Firewall state: On" : "Firewall state: Off"}</span><span>Inbound: Block (default)</span><span>Outbound: Allow (default)</span></div>
                <div className={on ? "on" : "off"}><Icon name={on ? "shield" : "warn"} size={36} /><b>Private Profile</b><span>{on ? "Firewall state: On" : "Firewall state: Off"}</span><span>Inbound: Block (default)</span><span>Outbound: Allow (default)</span></div>
                <div className={on ? "on" : "off"}><Icon name={on ? "shield" : "warn"} size={36} /><b>Public Profile</b><span>{on ? "Firewall state: On" : "Firewall state: Off"}</span><span>Inbound: Block (default)</span><span>Outbound: Allow (default)</span></div>
              </div>
              <p className="wfa-link" onClick={() => uac({ name: "Windows Firewall", publisher: "Microsoft Windows", onAllow: () => { setSettings({ firewall: !on }); notify({ title: "Windows Firewall", text: `Windows Firewall is now ${on ? "off" : "on"} for all profiles.`, icon: on ? "warn" : "info" }); } })}>
                Windows Firewall Properties — {on ? "turn the firewall off" : "turn the firewall on"}
              </p>
              <div className="wfa-sec">Active rules</div>
              <p>{rules.filter((r) => r.enabled).length} of {rules.length} rules are enabled · {groups.length} rule groups · latest event: <b>4946</b></p>
            </div>
          )}
          {node === "conn" && (
            <div className="wfa-over">
              <h3>Connection Security Rules</h3>
              <p>Connection security rules use IPsec to protect traffic between this computer and other computers. No connection security rules are defined.</p>
              <Btn onClick={() => msgBox({ title: "New Connection Security Rule Wizard", text: "The wizard is not available in this simulation.", icon: "info" })}>New Rule...</Btn>
            </div>
          )}
          {node === "monitor" && (
            <div className="wfa-over">
              <h3>Monitoring</h3>
              <table className="wfa-t"><tbody>
                <tr><td>Firewall state</td><td>{on ? "On" : "Off"}</td></tr>
                <tr><td>Profile</td><td>Private (Network 2)</td></tr>
                <tr><td>Active connections</td><td>{getState().settings.defaults.net === "off" ? "0" : "3"}</td></tr>
                <tr><td>Security associations</td><td>0</td></tr>
                <tr><td>Last audited event</td><td>4946 ({new Date().toLocaleDateString()})</td></tr>
              </tbody></table>
              <div className="wfa-sec">Security Association</div>
              <p>No IPsec security associations are active on this computer.</p>
            </div>
          )}
          {(node === "inbound" || node === "outbound") && (
            <>
              <div className="wfa-toolbar">
                <input className="w7input" placeholder="Filter by name or program" value={filter} onChange={(e) => setFilter(e.target.value)} />
                <Btn onClick={() => rule && toggle(rule.id)} disabled={!rule}>{rule?.enabled ? "Disable rule" : "Enable rule"}</Btn>
                <Btn onClick={() => rule && msgBox({ title: `${rule.name} Properties`, text: `Action: ${rule.action}\nProgram: ${rule.program}\nProtocol: ${rule.protocol}\nPort: ${rule.port}\nProfiles: ${rule.profile}`, icon: "info" })} disabled={!rule}>Properties</Btn>
              </div>
              <div className="wfa-table">
                <div className="wfa-th"><span style={{ width: 34 }} /><span style={{ flex: 1.6 }}>Name</span><span style={{ width: 180 }}>Group</span><span style={{ width: 140 }}>Profile</span><span style={{ width: 66 }}>Enabled</span><span style={{ width: 62 }}>Action</span></div>
                {list.map((r) => (
                  <div key={r.id} className={"wfa-tr" + (sel === r.id ? " sel" : "")} onClick={() => setSel(r.id)} onDoubleClick={() => toggle(r.id)}>
                    <span style={{ width: 34 }}><Icon name={r.action === "Block" ? "warn" : "shield"} size={14} /></span>
                    <span style={{ flex: 1.6 }}>{r.name}</span><span style={{ width: 180 }}>{r.group}</span><span style={{ width: 140 }}>{r.profile}</span>
                    <span style={{ width: 66, color: r.enabled ? "#1a7a2e" : "#8a9099" }}>{r.enabled ? "Yes" : "No"}</span>
                    <span style={{ width: 62 }}>{r.action}</span>
                  </div>
                ))}
                {!list.length && <div className="wfa-empty">No rules match the current filter.</div>}
              </div>
            </>
          )}
        </div>
        <div className="wfa-actions">
          <div className="wfa-act-h">Actions</div>
          <div className="wfa-act-g">Windows Firewall with Advanced Security</div>
          <button className="wfa-act" onClick={() => openCP("firewall")}><b>View basic firewall settings</b></button>
          <button className="wfa-act" onClick={() => save(SEED_RULES)}><b>Restore Default Policy</b></button>
          <div className="wfa-act-g">Inbound / Outbound Rules</div>
          <button className="wfa-act" onClick={() => setNode("inbound")}><b>View inbound rules</b></button>
          <button className="wfa-act" onClick={() => setNode("outbound")}><b>View outbound rules</b></button>
          <button className="wfa-act" onClick={() => setNode("monitor")}><b>Monitoring</b></button>
        </div>
      </div>
      <div className="wfa-status">{rules.filter((r) => r.enabled).length} enabled rules · firewall {on ? "on" : "off"} · {getState().settings.currentUser}</div>
    </div>
  );
}

/* ===================================================== Local Security Policy */
const POLICIES: { cat: string; items: { name: string; value: string; desc: string }[] }[] = [
  { cat: "Account Policies › Password Policy", items: [
    { name: "Enforce password history", value: "24 passwords remembered", desc: "Determines the number of unique new passwords that must be used before an old password can be reused." },
    { name: "Maximum password age", value: "42 days", desc: "How long a password can be used before the system requires the user to change it." },
    { name: "Minimum password age", value: "1 days", desc: "How long a password must be used before it can be changed." },
    { name: "Minimum password length", value: "8 characters", desc: "The least number of characters a password can have." },
    { name: "Password must meet complexity requirements", value: "Disabled", desc: "Requires at least three of: upper case, lower case, digits, symbols." },
  ] },
  { cat: "Account Policies › Account Lockout Policy", items: [
    { name: "Account lockout duration", value: "Not defined", desc: "The number of minutes a locked-out account remains locked." },
    { name: "Account lockout threshold", value: "0 invalid logon attempts", desc: "The number of failed logon attempts that causes a lockout." },
    { name: "Reset account lockout counter after", value: "Not defined", desc: "Minutes before the failed-attempt counter resets." },
  ] },
  { cat: "Local Policies › Security Options", items: [
    { name: "Accounts: Administrator account status", value: "Enabled", desc: "Whether the built-in Administrator account is enabled." },
    { name: "Interactive logon: Message title for users attempting to log on", value: "", desc: "The title shown in the logon dialog." },
    { name: "Interactive logon: Do not display last user name", value: "Disabled", desc: "Whether the last signed-in user name is shown." },
    { name: "User Account Control: Behaviour of the elevation prompt for administrators", value: "Prompt for consent", desc: "The behaviour of the UAC prompt for administrators in Admin Approval Mode." },
    { name: "Shutdown: Allow system to be shut down without having to log on", value: "Disabled", desc: "Whether the computer can be shut down from the logon screen." },
  ] },
];

export function LocalSecurityPolicy({ win }: { win: Win }) {
  const [sel, setSel] = useState("Minimum password length");
  const [edited, setEdited] = useState<Record<string, string>>(() => lsGet("win7.secpol", {}));
  const save = (p: Record<string, string>) => { const n = { ...edited, ...p }; setEdited(n); lsSet("win7.secpol", n); };
  const all = POLICIES.flatMap((c) => c.items);
  const cur = all.find((i) => i.name === sel)!;
  const value = edited[sel] ?? cur.value;

  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Exit", onClick: () => closeWin(win.id) }] },
    { label: "Action", items: () => [
      { label: "Properties", onClick: () => promptBox({ title: cur.name, text: cur.desc + "\n\nNew value:", value, onOk: (v) => { save({ [sel]: v }); logEvent("Information", "Microsoft-Windows-Security-Auditing", 4719, `System audit policy was changed: ${sel} = ${v}`, "Security"); } }) },
      { label: "Help", onClick: () => openApp("help") },
    ] },
  ];

  return (
    <div className="secp">
      <MenuBar menus={menus} />
      <div className="secp-tree">
        <div className="secp-root"><Icon name="shield" size={14} /> Security Settings</div>
        {POLICIES.map((c) => (
          <div key={c.cat}><div className="secp-cat">{c.cat}</div>
            {c.items.map((i) => <div key={i.name} className={"secp-node" + (sel === i.name ? " sel" : "")} onClick={() => setSel(i.name)}>{i.name}</div>)}
          </div>
        ))}
      </div>
      <div className="secp-main">
        <div className="secp-list-h"><span style={{ flex: 1 }}>Policy</span><span style={{ width: 260 }}>Security Setting</span></div>
        {POLICIES.flatMap((c) => c.items).map((i) => (
          <div key={i.name} className={"secp-row" + (sel === i.name ? " sel" : "")} onClick={() => setSel(i.name)} onDoubleClick={() => promptBox({ title: i.name, text: i.desc + "\n\nNew value:", value: edited[i.name] ?? i.value, onOk: (v) => save({ [i.name]: v }) })}>
            <span style={{ flex: 1 }}>{i.name}</span><span style={{ width: 260 }}>{edited[i.name] ?? (i.value || "(not defined)")}</span>
          </div>
        ))}
      </div>
      <div className="secp-status">{cur.name}: {value} · {cur.desc}</div>
    </div>
  );
}

/* ==================================================== Remote Desktop Connection */
export function RemoteDesktop({ win }: { win: Win }) {
  const [computer, setComputer] = useState(() => lsGet("win7.rdp.last", ""));
  const [user, setUser] = useState("");
  const [opts, setOpts] = useState({ screen: "1920x1080", colors: "32 bit", sound: "Bring to this computer", clipboard: true, drives: false, printers: false, fullscreen: false });
  const [state, setState] = useState<"idle" | "connecting" | "failed">("idle");
  const [log, setLog] = useState<string[]>([]);

  const connect = () => {
    if (!computer.trim()) { msgBox({ title: "Remote Desktop Connection", text: "Enter a computer name or IP address.", icon: "warn" }); return; }
    lsSet("win7.rdp.last", computer);
    setState("connecting");
    setLog([]);
    const steps = [
      "Resolving the name " + computer + "...",
      "Contacting the remote computer on port 3389...",
      "Negotiating CredSSP / NLA...",
      "Authenticating...",
    ];
    steps.forEach((s2, i) => setTimeout(() => setLog((l) => [...l, s2]), 380 * (i + 1)));
    setTimeout(() => {
      setState("failed");
      setLog((l) => [...l, `The connection to ${computer} could not be established because the remote computer is not reachable from this simulated PC.`]);
      logEvent("Error", "TerminalServices-RDPClient", 1105, `The Remote Desktop connection to ${computer} failed: the remote computer is not available.`, "Application");
    }, 2400);
  };

  return (
    <div className="rdc">
      <div className="rdc-head"><Icon name="computer" size={38} /><div><b>Remote Desktop Connection</b><span>Connect to a Windows computer and work on it from this PC.</span></div></div>
      <div className="rdc-body">
        <div className="rdc-row"><label>Computer:</label><input className="w7input" value={computer} onChange={(e) => setComputer(e.target.value)} placeholder="e.g. server01 or 192.168.1.10" /></div>
        <div className="rdc-row"><label>User name:</label><input className="w7input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="optional" /></div>
        <div className="rdc-opts">
          <div className="cp-sec">Display</div>
          <Radio checked={!opts.fullscreen} onChange={() => setOpts({ ...opts, fullscreen: false })} label="Window size 1920 × 1080" />
          <Radio checked={opts.fullscreen} onChange={() => setOpts({ ...opts, fullscreen: true })} label="Full screen" />
          <div className="cp-sec">Local Resources</div>
          <Check checked={opts.clipboard} onChange={(v) => setOpts({ ...opts, clipboard: v })} label="Clipboard" />
          <Check checked={opts.drives} onChange={(v) => setOpts({ ...opts, drives: v })} label="Drives (C: on this PC)" />
          <Check checked={opts.printers} onChange={(v) => setOpts({ ...opts, printers: v })} label="Printers" />
          <div className="cp-sec">Experience</div>
          <Check checked onChange={() => {}} label="Desktop background" />
          <Check checked onChange={() => {}} label="Font smoothing" />
        </div>
      </div>
      {state !== "idle" && (
        <div className="rdc-log">
          {log.map((l, i) => <div key={i}>{l}</div>)}
          {state === "connecting" && <div className="rdc-spin">Connecting…</div>}
        </div>
      )}
      <div className="rdc-foot">
        <Btn def disabled={state === "connecting"} onClick={connect}>Connect</Btn>
        <Btn onClick={() => { setComputer(""); setUser(""); setState("idle"); setLog([]); }}>Cancel</Btn>
      </div>
      {void win}
    </div>
  );
}

/* ============================================================ Sync Center */
interface SyncPair { id: string; name: string; kind: "Offline Files" | "Device" | "Folder"; status: "Up to date" | "Sync pending" | "Not available"; last: number; items: number }

export function SyncCenter({ win }: { win: Win }) {
  const [pairs, setPairs] = useState<SyncPair[]>(() => lsGet<SyncPair[]>("win7.sync", [
    { id: "s1", name: "Offline Files (\\\\PC\\Users)", kind: "Offline Files", status: "Up to date", last: Date.now() - 36e5, items: 428 },
    { id: "s2", name: "Documents on Data (D:)", kind: "Folder", status: "Sync pending", last: Date.now() - 86e5, items: 41 },
    { id: "s3", name: "USB Flash Disk (E:)", kind: "Device", status: "Not available", last: Date.now() - 72e5, items: 0 },
  ]));
  const [busy, setBusy] = useState<string | null>(null);
  const save = (p: SyncPair[]) => { setPairs(p); lsSet("win7.sync", p); };

  const sync = (id: string) => {
    setBusy(id);
    save(pairs.map((p) => (p.id === id ? { ...p, status: "Sync pending" as const } : p)));
    setTimeout(() => {
      save(pairs.map((p) => (p.id === id ? { ...p, status: p.status === "Not available" ? ("Not available" as const) : ("Up to date" as const), last: Date.now() } : p)));
      setBusy(null);
      const p = pairs.find((x) => x.id === id);
      notify({ title: "Sync Center", text: p?.status === "Not available" ? `The device \u201c${p?.name}\u201d is not connected.` : `Sync completed for \u201c${p?.name}\u201d.`, icon: "info" });
    }, 1500);
  };

  return (
    <div className="syncw">
      <MenuBar menus={[{ label: "File", items: () => [{ label: "Exit", onClick: () => closeWin(win.id) }] }, { label: "Action", items: () => [{ label: "Sync All", onClick: () => pairs.forEach((p) => sync(p.id)) }, { label: "View Conflicts", onClick: () => notify({ title: "Sync Center", text: "There are no conflicts to resolve.", icon: "info" }) }] }]} />
      <div className="sync-head"><Icon name="share" size={38} /><div><b>Sync Center</b><span>Keep the files on this PC in step with folders on the network and with portable devices.</span></div></div>
      <div className="sync-table">
        <div className="sync-th"><span style={{ flex: 1 }}>Sync partnership</span><span style={{ width: 130 }}>Type</span><span style={{ width: 110 }}>Status</span><span style={{ width: 160 }}>Last synced</span><span style={{ width: 70 }}>Items</span></div>
        {pairs.map((p) => (
          <div key={p.id} className="sync-tr" onDoubleClick={() => sync(p.id)}>
            <span style={{ flex: 1 }}><Icon name={p.kind === "Device" ? "usb" : p.kind === "Folder" ? "folder" : "share"} size={15} /> {p.name}</span>
            <span style={{ width: 130 }}>{p.kind}</span>
            <span style={{ width: 110, color: p.status === "Up to date" ? "#1a7a2e" : p.status === "Sync pending" ? "#a06a00" : "#a02020" }}>{busy === p.id ? "Syncing…" : p.status}</span>
            <span style={{ width: 160 }}>{p.last ? fmtDate(p.last) : "Never"}</span>
            <span style={{ width: 70 }}>{p.items}</span>
          </div>
        ))}
      </div>
      <div className="sync-foot"><Btn def onClick={() => pairs.forEach((p) => sync(p.id))}>Sync All</Btn><Btn onClick={() => notify({ title: "Sync Center", text: "Setup begins with Control Panel → Offline Files.", icon: "info" })}>Set up new sync partnership</Btn><span className="sync-note">{pairs.filter((p) => p.status === "Up to date").length} of {pairs.length} partnerships are up to date</span></div>
    </div>
  );
}

/* ===================================================== Windows Easy Transfer */
export function EasyTransfer({ win }: { win: Win }) {
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<Record<string, boolean>>(() => lsGet("win7.migwiz", { docs: true, pics: true, music: true, videos: false, ie: true, mail: true, users: true, desktop: true, settings: true, programs: false }));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step !== 3) return;
    const i = setInterval(() => setProgress((p) => {
      if (p >= 100) { clearInterval(i); return 100; }
      return p + 4;
    }), 110);
    return () => clearInterval(i);
  }, [step]);
  useEffect(() => {
    if (!(progress >= 100 && step === 3)) return;
    const t = setTimeout(() => {
      lsSet("win7.migwiz", sel);
      logEvent("Information", "Windows Easy Transfer", 1000, "Windows Easy Transfer finished saving the transfer file.", "Application");
      setStep(4);
    }, 60);
    return () => clearTimeout(t);
  }, [progress, step, sel]);

  const fs = getState().fs;
  const sizes: Record<string, number> = {
    docs: Object.values(fs).filter((n) => n.type === "file" && n.parent === "docs").reduce((a, b) => a + b.size, 0),
    pics: Object.values(fs).filter((n) => n.type === "file" && n.parent === "pics").reduce((a, b) => a + b.size, 0),
    music: Object.values(fs).filter((n) => n.type === "file" && n.parent === "music").reduce((a, b) => a + b.size, 0),
    videos: Object.values(fs).filter((n) => n.type === "file" && n.parent === "videos").reduce((a, b) => a + b.size, 0),
  };
  const labels: [string, string][] = [["docs", "Documents"], ["pics", "Pictures"], ["music", "Music"], ["videos", "Videos"], ["desktop", "Desktop"], ["ie", "Internet Explorer favourites"], ["mail", "E-mail and contacts"], ["users", "User accounts and settings"], ["settings", "Windows settings"], ["programs", "Programs (need reinstalling)"]];
  const total = Object.entries(sel).filter(([, v]) => v).length;

  return (
    <div className="mig">
      <div className="mig-head"><Icon name="programs" size={38} /><div><b>Windows Easy Transfer</b><span>Move your files and settings from this PC to another computer.</span></div></div>
      <div className="mig-body">
        {step === 0 && (
          <>
            <h3>What do you want to transfer?</h3>
            <p>Windows Easy Transfer saves a single file containing everything you pick here. On the new computer, open the file to put it all back.</p>
            <div className="mig-list">
              {labels.map(([k, l]) => (
                <label key={k} className="mig-item"><input type="checkbox" checked={!!sel[k]} onChange={(e) => setSel({ ...sel, [k]: e.target.checked })} /><span>{l}</span><i>{k in sizes ? fmtBig(sizes[k]) : k === "programs" ? "large" : "small"}</i></label>
              ))}
            </div>
            <p className="cp-desc">{total} categories selected · estimated transfer file {fmtBig(Object.entries(sizes).filter(([k]) => sel[k]).reduce((a, [, v]) => a + v, 0) + total * 24000)}</p>
          </>
        )}
        {step === 1 && (
          <>
            <h3>Choose where to save the transfer file</h3>
            <p>The file is saved with an <b>.MIG</b> extension. You can copy it to an external hard disc, a USB flash drive or a network share.</p>
            <ul className="mig-paths">
              <li onClick={() => setStep(2)}><Icon name="documents" size={22} /> <b>This PC → Documents</b><span>C:\\Users\\{getState().settings.currentUser}\\Documents\\EasyTransfer.MIG</span></li>
              <li onClick={() => msgBox({ title: "Windows Easy Transfer", text: "Connect a USB flash drive, then choose it as the destination.", icon: "info" })}><Icon name="usb" size={22} /> <b>An external hard disc or USB flash drive</b><span>Nothing is connected right now</span></li>
              <li onClick={() => msgBox({ title: "Windows Easy Transfer", text: "No network destinations are available.", icon: "warn" })}><Icon name="network" size={22} /> <b>A network location</b><span>\\\\PC\\Users</span></li>
            </ul>
          </>
        )}
        {step === 2 && (
          <>
            <h3>Ready to transfer</h3>
            <p>Windows Easy Transfer will save {total} categories to <b>Documents\\EasyTransfer.MIG</b>.</p>
            <div className="mig-sum">
              {labels.filter(([k]) => sel[k]).map(([k, l]) => <div key={k}><Check checked onChange={() => {}} label={l} /></div>)}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h3>Saving the transfer file…</h3>
            <div className="mig-bar"><i style={{ width: progress + "%" }} /></div>
            <p>{progress}% — {progress < 40 ? "Collecting documents" : progress < 70 ? "Collecting pictures and music" : progress < 90 ? "Saving user settings" : "Finishing up"}</p>
          </>
        )}
        {step === 4 && (
          <>
            <h3>Transfer complete</h3>
            <p>The transfer file <b>EasyTransfer.MIG</b> was saved to Documents. Copy it to the new computer and run Windows Easy Transfer there.</p>
            <p className="cp-desc">Event 1000 was written to the Application log.</p>
          </>
        )}
      </div>
      <div className="mig-foot">
        {step > 0 && step < 3 && <Btn onClick={() => setStep(step - 1)}>&lt; Back</Btn>}
        {step === 0 && <Btn def onClick={() => setStep(1)}>Next &gt;</Btn>}
        {step === 1 && <Btn def onClick={() => setStep(2)}>Next &gt;</Btn>}
        {step === 2 && <Btn def onClick={() => { setProgress(0); setStep(3); }}>Transfer</Btn>}
        {step === 4 && <Btn def onClick={() => closeWin(win.id)}>Finish</Btn>}
        <Btn onClick={() => closeWin(win.id)}>Cancel</Btn>
      </div>
    </div>
  );
}

/* ==================================================== Windows Memory Diagnostic */
export function MemoryDiagnostic({ win }: { win: Win }) {
  const [phase, setPhase] = useState<"ask" | "running" | "done">("ask");
  const [pass, setPass] = useState(0);
  const [pct, setPct] = useState(0);
  const total = ((navigator as unknown as { deviceMemory?: number }).deviceMemory || 8) * 1024;

  useEffect(() => {
    if (phase !== "running") return;
    const i = setInterval(() => setPct((p) => {
      if (p >= 100) { setPass((n) => n + 1); return 0; }
      return p + 5;
    }), 130);
    return () => clearInterval(i);
  }, [phase]);
  useEffect(() => {
    if (pass < 2) return;
    const t = setTimeout(() => {
      setPhase("done");
      logEvent("Information", "Microsoft-Windows-MemoryDiagnostics-Results", 1201, "The Windows Memory Diagnostic tested the computer's memory and detected no errors.", "System");
    }, 60);
    return () => clearTimeout(t);
  }, [pass]);

  return (
    <div className="mds">
      <div className="mds-head"><Icon name="computer" size={36} /><div><b>Windows Memory Diagnostic Tool</b><span>Check your computer for memory problems.</span></div></div>
      {phase === "ask" && (
        <div className="mds-body">
          <p>If you suspect your computer&apos;s memory is failing, this tool tests it. Windows 7 normally does this before the desktop starts; here it runs in the window so you can watch.</p>
          <Radio checked onChange={() => {}} label="Restart now and check for problems (recommended)" />
          <Radio checked={false} onChange={() => setPhase("running")} label="Start the test now, without restarting" />
          <p className="cp-desc">Total physical memory: {total.toLocaleString()} MB · 2 passes planned</p>
        </div>
      )}
      {phase === "running" && (
        <div className="mds-run">
          <div className="mds-scan"><i style={{ width: pct + "%" }} /></div>
          <div className="mds-stats"><span>Pass {pass + 1} of 2</span><span>{pct}% complete</span><span>Status: {pct < 50 ? "Testing…" : "No problems have been detected yet"}</span></div>
          <div className="mds-log">
            <div>Windows Memory Diagnostic</div>
            <div>Copyright (c) 2009 Microsoft Corporation</div>
            <div>&nbsp;</div>
            <div>Physical memory: {total.toLocaleString()} MB</div>
            <div>Test pattern: MATS+ (cache enabled)</div>
            <div>Pass {pass + 1}: {pct < 25 ? "Stuck Address" : pct < 50 ? "Random Data" : pct < 75 ? "Block Move" : "Walking 1s"} — {pct}%…</div>
          </div>
        </div>
      )}
      {phase === "done" && (
        <div className="mds-body">
          <div className="mds-ok"><Icon name="info" size={32} /><div><b>No errors were detected.</b><p>The Windows Memory Diagnostic tested {total.toLocaleString()} MB of memory in 2 passes and found no faults.</p></div></div>
          <p className="cp-desc">Event 1201 was written to the System log.</p>
        </div>
      )}
      <div className="mds-foot">
        {phase === "ask" && <Btn def onClick={() => setPhase("running")}>Run the test</Btn>}
        {phase === "done" && <Btn def onClick={() => closeWin(win.id)}>Close</Btn>}
        <Btn onClick={() => closeWin(win.id)}>Cancel</Btn>
      </div>
      {void win}
    </div>
  );
}

/* ============================================================ Performance Monitor */
export function PerformanceMonitor({ win }: { win: Win }) {
  const [counter, setCounter] = useState("% Processor Time");
  const [data, setData] = useState<number[]>(() => Array.from({ length: 100 }, (_, i) => 20 + Math.sin(i / 7) * 12));
  const [live, setLive] = useState(true);
  const ref = useRef<HTMLCanvasElement>(null);
  const COUNTERS = ["% Processor Time", "Available MBytes", "Memory\\Pages/sec", "PhysicalDisk\\% Disk Time", "Network Interface\\Bytes Total/sec", "System\\Processes", "System\\Threads"];

  useEffect(() => {
    if (!live) return;
    const i = setInterval(() => setData((d) => {
      const wins = getState().windows.length;
      const last = d[d.length - 1];
      const next = Math.max(2, Math.min(96, last + (Math.random() - 0.5) * 16 + wins));
      return [...d.slice(1), next];
    }), 700);
    return () => clearInterval(i);
  }, [live]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const W = c.width, H = c.height;
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#1c5c1c"; g.lineWidth = 1;
    for (let x = 0; x <= W; x += W / 10) { g.beginPath(); g.moveTo(Math.round(x) + .5, 0); g.lineTo(Math.round(x) + .5, H); g.stroke(); }
    for (let y = 0; y <= H; y += H / 5) { g.beginPath(); g.moveTo(0, Math.round(y) + .5); g.lineTo(W, Math.round(y) + .5); g.stroke(); }
    g.beginPath();
    data.forEach((v, i) => { const x = (i / (data.length - 1)) * W; const y = H - (Math.min(100, v) / 100) * H; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.strokeStyle = "#21d121"; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = "#f0f0f0"; g.font = "11px Consolas, monospace";
    g.fillText("100", 4, 12); g.fillText("50", 4, H / 2 + 4); g.fillText("0", 4, H - 4);
    const now = new Date();
    g.fillStyle = "#9fe89f";
    g.fillText(now.toLocaleTimeString("en-US", { hour12: false }), W - 66, H - 6);
  }, [data]);

  const cur = Math.round(data[data.length - 1]);
  const val = counter === "% Processor Time" ? cur + " %" : counter === "Available MBytes" ? (6144 - cur * 12).toLocaleString() : counter === "System\\Processes" ? String(getState().windows.length + 34) : (cur * 3).toLocaleString();

  return (
    <div className="perf">
      <MenuBar menus={[{ label: "File", items: () => [{ label: "Save As...", onClick: () => notify({ title: "Performance Monitor", text: "The graph was saved as perf.html in Documents.", icon: "info" }) }, { label: "Exit", onClick: () => closeWin(win.id) }] }, { label: "Action", items: () => [{ label: "Refresh", onClick: () => setData([...data]) }, { label: "Add Counters...", onClick: () => notify({ title: "Performance Monitor", text: "Use the counter list on the right to add counters.", icon: "info" }) }] }]} />
      <div className="perf-toolbar">
        <Button active={live} onClick={() => setLive(!live)}>{live ? "Freeze display" : "Resume"}</Button>
        <Button onClick={() => setData(Array.from({ length: 100 }, () => 0))}>Clear</Button>
        <span className="perf-val">{counter}: <b>{val}</b></span>
      </div>
      <div className="perf-body">
        <div className="perf-graph"><canvas ref={ref} width={580} height={240} /></div>
        <div className="perf-counters">
          <div className="perf-c-h">Counters</div>
          {COUNTERS.map((c) => (
            <div key={c} className={"perf-c" + (counter === c ? " sel" : "")} onClick={() => setCounter(c)}>{c}</div>
          ))}
          <div className="perf-c-h" style={{ marginTop: 8 }}>Legend</div>
          <div className="perf-leg"><i />{counter}</div>
        </div>
      </div>
      <div className="perf-status">Last {data.length} samples · {live ? "Tracking" : "Frozen"} · Windows Performance Monitor · {new Date().toLocaleTimeString()}</div>
      {void win}
    </div>
  );
}

function Button({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return <button className={"w7btn" + (active ? " on" : "")} onClick={onClick}>{children}</button>;
}

/* ================================================================== Windows Update history reuse */
export const _unused = { services, getEvents, Tabs };
