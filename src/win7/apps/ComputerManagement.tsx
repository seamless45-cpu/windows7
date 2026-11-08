"use client";
/**
 * Computer Management (compmgmt.msc) and a proper Device Manager
 * (devmgmt.msc) tree.
 *
 * Computer Management is the MMC console that groups the other snap-ins: the
 * System Tools (Event Viewer, Shared Folders, Local Users and Groups, Device
 * Manager, Task Scheduler), Storage (Disk Management) and Services and
 * Applications. Opening a node really opens the matching program, and Disk
 * Management draws the volumes from the simulated drives.
 */
import React, { useState } from "react";
import { Win, useStore, getState, setSettings, openApp, openCP, msgBox, notify, MenuItem, lsGet, fmtBig } from "../store";
import { MenuBar, Btn } from "../ui";
import { Icon } from "../icons";

/* ------------------------------------------------------------ Device Manager */
const DEVICE_TREE: [string, string[]][] = [
  ["Computer", ["ACPI x64-based PC"]],
  ["Disk drives", ["ST3500418AS ATA Device", "Generic USB Flash Disk"]],
  ["Display adapters", ["Standard VGA Graphics Adapter"]],
  ["DVD/CD-ROM drives", ["HL-DT-ST DVDRAM GH22NS50 ATA Device"]],
  ["Human Interface Devices", ["USB Input Device", "HID-compliant mouse"]],
  ["Keyboards", ["Standard PS/2 Keyboard"]],
  ["Mice and other pointing devices", ["HID-compliant mouse"]],
  ["Monitors", ["Generic PnP Monitor"]],
  ["Network adapters", ["Realtek PCIe GBE Family Controller", "Intel(R) WiFi Link 5100 AGN"]],
  ["Ports (COM & LPT)", ["Communications Port (COM1)"]],
  ["Processors", ["Intel(R) Core(TM) i5 CPU  650 @ 3.20GHz"]],
  ["Sound, video and game controllers", ["High Definition Audio Device"]],
  ["System devices", ["ACPI Fixed Feature Button", "High precision event timer", "Microsoft ACPI-Compliant System", "PCI bus", "System CMOS/real time clock"]],
  ["Universal Serial Bus controllers", ["Generic USB Hub", "Standard Enhanced PCI to USB Host Controller", "USB Composite Device"]],
];

export function DeviceManager({ win }: { win: Win }) {
  const dis = useStore((s) => s.settings.deviceDisabled);
  const [open, setOpen] = useState<string[]>(["Computer", "Display adapters", "Network adapters", "Sound, video and game controllers"]);
  const [sel, setSel] = useState<string | null>("Standard VGA Graphics Adapter");
  const [scan, setScan] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const elevate = (fn: () => void) => import("../store").then((m) => m.uac({ name: "Device Manager", publisher: "Microsoft Windows", onAllow: fn }));
  const toggle = (d: string) => elevate(() => setSettings({ deviceDisabled: dis.includes(d) ? dis.filter((x) => x !== d) : [...dis, d] }));
  const uninstall = (d: string) => msgBox({ title: "Confirm Device Uninstall", icon: "warn", text: `Warning: You are about to uninstall ${d} from your computer.\n\nThis will remove the driver. Are you sure?`, buttons: ["OK", "Cancel"], onResult: (b) => { if (b === "OK") notify({ title: "Device Manager", text: `${d} was removed. Scan for hardware changes to reinstall it.`, icon: "info" }); } });
  const props = (d?: string) => {
    const dev = d || sel;
    if (!dev) return;
    msgBox({
      title: `${dev} Properties`, icon: "info",
      text: `General\nDevice type:  ${DEVICE_TREE.find(([, ds]) => ds.includes(dev))?.[0] || "System device"}\nManufacturer:  Microsoft\nLocation:  PCI bus 0, device 2, function 0\n\nDevice status\nThis device ${dis.includes(dev) ? "is disabled. (Code 22)" : "is working properly."}\n\nDriver\nProvider:  Microsoft\nDate:  6/21/2006\nVersion:  6.1.7600.16385\nDigital Signer:  Microsoft Windows`,
    });
  };

  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Exit", onClick: () => import("../store").then((m) => m.closeWin(win.id)) }] },
    { label: "Action", items: () => [
      { label: "Scan for hardware changes", onClick: () => { setScan(true); setTimeout(() => { setScan(false); notify({ title: "Device Manager", text: "Scan complete. No new hardware found.", icon: "info" }); }, 1400); } },
      { sep: true },
      { label: "Properties", disabled: !sel, onClick: () => props() },
      { label: dis.includes(sel || "") ? "Enable" : "Disable", disabled: !sel, onClick: () => sel && toggle(sel) },
      { label: "Uninstall", disabled: !sel, onClick: () => sel && uninstall(sel) },
    ] },
    { label: "View", items: () => [{ label: "Show hidden devices", checked: showHidden, onClick: () => setShowHidden(!showHidden) }, { sep: true }, { label: "Devices by type", radio: true, checked: true }, { label: "Devices by connection", radio: true }, { label: "Resources by type", radio: true }] },
    { label: "Help", items: () => [{ label: "Help Topics", onClick: () => openApp("help") }, { label: "About", onClick: () => openApp("winver") }] },
  ];

  const tree = showHidden ? [...DEVICE_TREE, ["Non-Plug and Play Drivers", ["AFD Networking Support Environment", "Beep", "Null"]] as [string, string[]]] : DEVICE_TREE;

  return (
    <div className="devmgr">
      <MenuBar menus={menus} />
      <div className="cp-toolbar">
        <Btn onClick={() => { setScan(true); setTimeout(() => { setScan(false); notify({ title: "Device Manager", text: "Scan complete. No new hardware found.", icon: "info" }); }, 1400); }}>Scan for hardware changes</Btn>
        <Btn disabled={!sel} onClick={() => sel && toggle(sel)}>{sel && dis.includes(sel) ? "Enable device" : "Disable device"}</Btn>
        <Btn disabled={!sel} onClick={() => props()}>Properties</Btn>
        <Btn disabled={!sel} onClick={() => sel && uninstall(sel)}>Uninstall</Btn>
        {scan && <span className="busy"><i className="busy-ring" /> Scanning Plug and Play hardware...</span>}
      </div>
      <div className="dm-tree">
        <div className="dm-row head"><Icon name="computer" size={16} /> <b>{lsGet("win7.pcname", "PC")}</b></div>
        {tree.map(([cat, devs]) => (
          <div key={cat}>
            <div className="dm-row" style={{ paddingLeft: 14 }} onClick={() => setOpen(open.includes(cat) ? open.filter((o) => o !== cat) : [...open, cat])}>
              <span className="dm-tri">{open.includes(cat) ? "▾" : "▸"}</span> <Icon name="devmgr" size={14} /> {cat}
            </div>
            {open.includes(cat) && devs.map((d, i) => (
              <div key={d + i} className={"dm-row dev" + (sel === d ? " sel" : "")} style={{ paddingLeft: 48 }} onClick={() => setSel(d)} onDoubleClick={() => props(d)}
                onContextMenu={(e) => { e.preventDefault(); setSel(d); import("../store").then((m) => m.showMenu(e, [{ label: dis.includes(d) ? "Enable" : "Disable", onClick: () => toggle(d) }, { label: "Uninstall", onClick: () => uninstall(d) }, { label: "Scan for hardware changes", onClick: () => notify({ title: "Device Manager", text: "No new hardware found.", icon: "info" }) }, { sep: true }, { label: "Properties", bold: true, onClick: () => props(d) }])); }}>
                <Icon name="devmgr" size={14} /> {d} {dis.includes(d) && <span className="dm-off">(disabled)</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="dm-foot">{dis.length ? `${dis.length} device(s) disabled` : "All devices are working properly"} · {tree.reduce((a, [, d]) => a + d.length, 0)} devices</div>
    </div>
  );
}

/* ------------------------------------------------------ Computer Management */
type Node = { id: string; label: string; icon: string; depth: number; group?: string };
const NODES: Node[] = [
  { id: "root", label: "Computer Management (Local)", icon: "computer", depth: 0 },
  { id: "sys", label: "System Tools", icon: "folder", depth: 1, group: "g" },
  { id: "task", label: "Task Scheduler", icon: "taskmgr", depth: 2 },
  { id: "eventvwr", label: "Event Viewer", icon: "history", depth: 2 },
  { id: "shared", label: "Shared Folders", icon: "share", depth: 2, group: "g" },
  { id: "shares", label: "Shares", icon: "folder", depth: 3 },
  { id: "sessions", label: "Sessions", icon: "users", depth: 3 },
  { id: "openfiles", label: "Open Files", icon: "file", depth: 3 },
  { id: "users", label: "Local Users and Groups", icon: "users", depth: 2, group: "g" },
  { id: "lusers", label: "Users", icon: "user", depth: 3 },
  { id: "lgroups", label: "Groups", icon: "users", depth: 3 },
  { id: "perf", label: "Performance", icon: "reliability", depth: 2, group: "g" },
  { id: "monitor", label: "Monitoring Tools", icon: "folder", depth: 3 },
  { id: "resmon", label: "Resource Monitor", icon: "taskmgr", depth: 4 },
  { id: "perflog", label: "Performance Monitor", icon: "reliability", depth: 4 },
  { id: "devmgr", label: "Device Manager", icon: "devmgr", depth: 2 },
  { id: "storage", label: "Storage", icon: "folder", depth: 1, group: "g" },
  { id: "diskmgmt", label: "Disk Management", icon: "drive", depth: 2 },
  { id: "svcapp", label: "Services and Applications", icon: "folder", depth: 1, group: "g" },
  { id: "services", label: "Services", icon: "services", depth: 2 },
  { id: "wmi", label: "WMI Control", icon: "shield", depth: 2 },
];

const USERS = [
  ["Administrator", "Full name", "Built-in account for administering the computer/domain"],
  ["Guest", "Full name", "Built-in account for guest access to the computer/domain"],
];
const GROUPS = [
  ["Administrators", "A group whose members have complete and unrestricted access to the computer"],
  ["Backup Operators", "Members can back up and restore files on the computer"],
  ["Guests", "Guests have the same access as members of the Users group by default"],
  ["Power Users", "Power Users have more access than Users but less than Administrators"],
  ["Users", "Users are prevented from making accidental or intentional system-wide changes"],
];

export function ComputerManagement({ win }: { win: Win }) {
  const s = useStore((st) => st.settings);
  const [sel, setSel] = useState("root");
  const [open, setOpen] = useState<string[]>(["sys", "storage", "svcapp"]);
  const [extended, setExtended] = useState(true);

  // a node is visible when every enclosing group node is expanded
  const visible: Node[] = [];
  {
    const stack: Node[] = [];
    for (const n of NODES) {
      while (stack.length && stack[stack.length - 1].depth >= n.depth) stack.pop();
      const hidden = stack.some((g) => !open.includes(g.id));
      if (!hidden) visible.push(n);
      if (n.group) stack.push(n);
    }
  }

  const act = (id: string) => {
    if (id === "task") return openApp("tasksched");
    if (id === "eventvwr") return openApp("eventvwr");
    if (id === "devmgr") return openApp("devmgr");
    if (id === "services") return openApp("services");
    if (id === "resmon") return openApp("resmon");
    if (id === "perflog") return openApp("reliability");
    if (id === "diskmgmt") return setSel("diskmgmt");
    return setSel(id);
  };

  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Exit", onClick: () => import("../store").then((m) => m.closeWin(win.id)) }] },
    { label: "Action", items: () => [{ label: "Refresh", onClick: () => notify({ title: "Computer Management", text: "The console was refreshed.", icon: "info" }) }, { sep: true }, { label: "Help", onClick: () => openApp("help") }] },
    { label: "View", items: () => [{ label: "Standard", radio: true, checked: !extended, onClick: () => setExtended(false) }, { label: "Custom", radio: true, checked: extended, onClick: () => setExtended(true) }] },
  ];

  const drives = Object.values(getState().fs).filter((n) => n.letter);

  return (
    <div className="cmg">
      <MenuBar menus={menus} />
      <div className="cmg-body">
        <div className="cmg-tree">
          <div className="cmg-tree-h"><Icon name="computer" size={14} /> {lsGet("win7.pcname", "PC")}</div>
          {visible.map((n) => (n.group ? (
            <div key={n.id} className="cmg-node grp" style={{ paddingLeft: 6 + n.depth * 14 }} onClick={() => setOpen(open.includes(n.id) ? open.filter((o) => o !== n.id) : [...open, n.id])}>
              <span className="cmg-tri">{open.includes(n.id) ? "▾" : "▸"}</span><Icon name={n.icon} size={14} /> {n.label}
            </div>
          ) : (
            <div key={n.id} className={"cmg-node" + (sel === n.id ? " sel" : "")} style={{ paddingLeft: 6 + n.depth * 14 }} onClick={() => act(n.id)} onDoubleClick={() => act(n.id)}>
              <Icon name={n.icon} size={14} /> {n.label}
            </div>
          )))}
        </div>

        <div className="cmg-main">
          {sel === "root" && (
            <div className="cmg-home">
              <h3>Computer Management</h3>
              <p>Use the tools in this console to manage the local computer. The three snap-ins Windows 7 groups here are <b>System Tools</b>, <b>Storage</b> and <b>Services and Applications</b>; double-click any node on the left to open it.</p>
              <div className="cmg-tiles">
                {[["Task Scheduler", "taskmgr", "tasksched"], ["Event Viewer", "history", "eventvwr"], ["Device Manager", "devmgr", "devmgr"], ["Disk Management", "drive", "diskmgmt"], ["Services", "services", "services"], ["Resource Monitor", "taskmgr", "resmon"]].map(([label, icon, id]) => (
                  <div key={id} className="cmg-tile" onClick={() => act(id)}><Icon name={icon} size={40} /><b>{label}</b></div>
                ))}
              </div>
            </div>
          )}
          {sel === "shared" && <div className="cmg-note">Shared Folders shows the shares, sessions and open files on this computer. Select a node to see its contents.</div>}
          {sel === "shares" && (
            <div className="cmg-table"><div className="cmg-th"><span style={{ flex: 1 }}>Share Name</span><span style={{ width: 220 }}>Folder Path</span><span style={{ width: 90 }}>Type</span></div>
              {[["ADMIN$", "C:\\Windows", "Windows"], ["C$", "C:\\", "Windows"], ["IPC$", "", "Windows"], ["Users", "C:\\Users", "Windows"]].map(([n, p, t]) => (
                <div key={n} className="cmg-tr"><span style={{ flex: 1 }}>{n}</span><span style={{ width: 220 }}>{p}</span><span style={{ width: 90 }}>{t}</span></div>
              ))}
            </div>
          )}
          {sel === "sessions" && (
            <div className="cmg-table"><div className="cmg-th"><span style={{ flex: 1 }}>User</span><span style={{ width: 90 }}>Computer</span><span style={{ width: 110 }}>Connected</span><span style={{ width: 80 }}>Open Files</span></div>
              <div className="cmg-tr"><span style={{ flex: 1 }}>{s.currentUser}</span><span style={{ width: 90 }}>PC</span><span style={{ width: 110 }}>00:04:12</span><span style={{ width: 80 }}>0</span></div>
            </div>
          )}
          {sel === "openfiles" && <div className="cmg-note">No files are open by remote users.</div>}
          {sel === "users" && <div className="cmg-note">Local Users and Groups is only available while the computer is not joined to a domain. This PC is in a workgroup (<b>WORKGROUP</b>).</div>}
          {sel === "lusers" && (
            <div className="cmg-table"><div className="cmg-th"><span style={{ width: 160 }}>Name</span><span style={{ flex: 1 }}>Full Name</span><span style={{ flex: 1.4 }}>Description</span></div>
              {[...USERS, [s.currentUser, "Full name", "Local administrator account"]].map(([n, f, d]) => (
                <div key={n} className="cmg-tr"><span style={{ width: 160 }}><Icon name="user" size={14} /> {n}</span><span style={{ flex: 1 }}>{f}</span><span style={{ flex: 1.4 }}>{d}</span></div>
              ))}
            </div>
          )}
          {sel === "lgroups" && (
            <div className="cmg-table"><div className="cmg-th"><span style={{ width: 180 }}>Name</span><span style={{ flex: 1 }}>Description</span></div>
              {GROUPS.map(([n, d]) => <div key={n} className="cmg-tr"><span style={{ width: 180 }}><Icon name="users" size={14} /> {n}</span><span style={{ flex: 1 }}>{d}</span></div>)}
            </div>
          )}
          {sel === "perf" && <div className="cmg-note">Performance collects the Monitoring Tools. Open <b>Resource Monitor</b> for live CPU, memory, disk and network graphs, or <b>Performance Monitor</b> for the reliability chart.</div>}
          {sel === "monitor" && <div className="cmg-note">Monitoring Tools contains Resource Monitor and Performance Monitor.</div>}
          {sel === "wmi" && <div className="cmg-note">Windows Management Instrumentation (WMI) Control manages the WMI settings for this computer. The default namespace is <code>root\cimv2</code>.</div>}
          {sel === "diskmgmt" && (
            <div className="cmg-disk">
              <div className="cmg-disk-vol">
                {drives.map((d) => {
                  const used = (d.total || 0) - (d.free || 0);
                  const pct = d.total ? Math.round((used / d.total) * 100) : 0;
                  return (
                    <div key={d.id} className="cmg-vol" onClick={() => openCP("system")}>
                      <div className="cmg-vol-h"><Icon name="driveFixed" size={16} /> ({(d.letter || "C:")[0]}) {d.label || "Local Disk"}</div>
                      <div className="cmg-vol-bar"><i style={{ width: pct + "%", background: pct > 85 ? "#d0342c" : pct > 60 ? "#e8a33d" : "#2f7fd0" }} /></div>
                      <div className="cmg-vol-d">{fmtBig(used)} used of {fmtBig(d.total || 0)} ({pct}%) · {fmtBig(d.free || 0)} free</div>
                      <div className="cmg-vol-d">File system: NTFS · Healthy (System, Active, Primary Partition)</div>
                    </div>
                  );
                })}
              </div>
              <div className="cmg-disk-g">
                <div className="cmg-disk-row"><span>Disk 0</span><div className="cmg-disk-strip"><b style={{ width: "12%" }}>System Reserved 100 MB</b><i style={{ width: "88%" }}>C: 232.79 GB NTFS</i></div></div>
                <div className="cmg-disk-row"><span>Disk 1</span><div className="cmg-disk-strip"><i style={{ width: "100%" }}>D: 465.66 GB NTFS</i></div></div>
              </div>
              <div className="cmg-disk-tools">
                <Btn onClick={() => notify({ title: "Disk Management", text: "Disk 0 is healthy. No action is required.", icon: "info" })}>Refresh</Btn>
                <Btn onClick={() => msgBox({ title: "Disk Management", text: "This operation is not supported on the simulated disk.", icon: "warn" })}>Shrink Volume...</Btn>
                <Btn onClick={() => msgBox({ title: "Disk Management", text: "There is no unallocated space on this disk.", icon: "warn" })}>New Simple Volume...</Btn>
              </div>
            </div>
          )}
          {sel === "svcapp" && <div className="cmg-note">Services and Applications groups the Services snap-in and the WMI Control.</div>}
        </div>

        {extended && (
          <div className="cmg-actions">
            <div className="cmg-act-h">Actions</div>
            <div className="cmg-act-g">Computer Management (Local)</div>
            <button className="cmg-act" onClick={() => notify({ title: "Computer Management", text: "Connected to " + lsGet("win7.pcname", "PC") + ".", icon: "info" })}><b>Connect to another computer...</b></button>
            <button className="cmg-act" onClick={() => openCP("system")}><b>Properties</b></button>
            <div className="cmg-act-g">Selected Node</div>
            <button className="cmg-act" onClick={() => act(sel)}><b>Open</b></button>
            <button className="cmg-act" onClick={() => openApp("help")}><b>Help</b></button>
          </div>
        )}
      </div>
      <div className="cmg-status">Computer Management · {lsGet("win7.pcname", "PC")} · {s.currentUser} · Windows 7 Ultimate</div>
    </div>
  );
}

/* ------------------------------------------------------- Local Users and Groups */
export function LocalUsers({ win }: { win: Win }) {
  const s = useStore((st) => st.settings);
  const [tab, setTab] = useState<"Users" | "Groups">("Users");
  const [sel, setSel] = useState<string | null>(null);
  const users: [string, string, string][] = [
    ["Administrator", "Built-in account for administering the computer/domain", "Password never expires"],
    ["Guest", "Built-in account for guest access to the computer/domain", "Password not required"],
    [s.currentUser, "Local administrator account", "Password never expires"],
  ];
  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Exit", onClick: () => import("../store").then((m) => m.closeWin(win.id)) }] },
    { label: "Action", items: () => [
      { label: "New User...", onClick: () => notify({ title: "Local Users and Groups", text: "New local users are created in Control Panel → User Accounts.", icon: "info" }) },
      { label: "Set Password...", disabled: !sel, onClick: () => notify({ title: "Local Users and Groups", text: "The password for the selected account cannot be reset here in this simulation.", icon: "warn" }) },
      { label: "Properties", disabled: !sel, onClick: () => notify({ title: sel || "", text: "Account is active. Member of: Administrators, Users.", icon: "info" }) },
      { sep: true },
      { label: "Refresh", onClick: () => playSysDing() },
    ] },
    { label: "Help", items: () => [{ label: "Help", onClick: () => openApp("help") }] },
  ];
  return (
    <div className="lusm">
      <MenuBar menus={menus} />
      <div className="lusm-tree">
        <div className="lusm-root"><Icon name="computer" size={14} /> Local Users and Groups (Local)</div>
        {(["Users", "Groups"] as const).map((t) => (
          <div key={t} className={"lusm-node" + (tab === t ? " sel" : "")} onClick={() => { setTab(t); setSel(null); }}>
            <Icon name={t === "Users" ? "user" : "users"} size={14} /> {t}
          </div>
        ))}
      </div>
      <div className="lusm-main">
        <div className="lusm-th"><span style={{ width: 170 }}>Name</span><span style={{ width: 160 }}>Full Name</span><span style={{ flex: 1 }}>Description</span></div>
        {tab === "Users" && users.map(([n, d, f]) => (
          <div key={n} className={"lusm-tr" + (sel === n ? " sel" : "")} onClick={() => setSel(n)} onDoubleClick={() => notify({ title: n, text: `${d}\n\n${f}\nMember of: Administrators`, icon: "info" })}>
            <span style={{ width: 170 }}><Icon name="user" size={14} /> {n}</span><span style={{ width: 160 }}>{n === s.currentUser ? n : ""}</span><span style={{ flex: 1 }}>{d}</span>
          </div>
        ))}
        {tab === "Groups" && GROUPS.map(([n, d]) => (
          <div key={n} className={"lusm-tr" + (sel === n ? " sel" : "")} onClick={() => setSel(n)}>
            <span style={{ width: 170 }}><Icon name="users" size={14} /> {n}</span><span style={{ width: 160 }} /><span style={{ flex: 1 }}>{d}</span>
          </div>
        ))}
      </div>
      <div className="lusm-status">{tab === "Users" ? users.length + " local users" : GROUPS.length + " local groups"} · {lsGet("win7.pcname", "PC")} · Workgroup: WORKGROUP</div>
    </div>
  );
}

const playSysDing = () => import("../sound").then((m) => m.playSys("ding"));
