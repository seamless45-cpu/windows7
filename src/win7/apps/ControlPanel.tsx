"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Win, useStore, getState, setState, setSettings, openApp, openCP, msgBox, uac, notify, restart, lsGet, lsSet, children, setWin, promptBox, progressDialog, fmtBig, Settings, resetAll,
  runCommand, view,
} from "../store";
import { Icon, nodeIcon } from "../icons";
import { GlassBar, Btn, Tabs, Check, Radio, GroupBox, Slider, useNow, fmtTime, fmtLongDate, nowTz } from "../ui";
import { WALLPAPERS, COLORS, USER_PICS, userPic } from "../data";
import { Mobility, Reliability, AnytimeUpgrade } from "./Utilities";
import { playSys, playPreview, SCHEMES, SOUND_EVENTS, isNoSounds, type SysSound } from "../sound";
import { wpStyle } from "../fileops";
import { listMedia, addMedia, removeMedia, mediaUrl, prettySize, prettyDur, WP_FITS, type MediaMeta } from "../media";

interface PageDef { title: string; icon: string; cat: string }
const CATS: { id: string; title: string; icon: string; items: string[]; links: [string, string][] }[] = [
  { id: "cat-system", title: "System and Security", icon: "security", items: ["actioncenter", "firewall", "system", "wupdate", "power", "devmgr", "reliability", "anytime", "eventvwr", "cleanmgr", "sysdiag"], links: [["Review your computer's status", "actioncenter"], ["Back up your computer", "wupdate"], ["Find and fix problems", "actioncenter"], ["View event logs", "eventvwr"], ["Free up disk space", "cleanmgr"]] },
  { id: "cat-network", title: "Network and Internet", icon: "netcat", items: ["network", "inetopts"], links: [["View network status and tasks", "network"], ["Choose homegroup and sharing options", "network"]] },
  { id: "cat-hardware", title: "Hardware and Sound", icon: "hardware", items: ["devices", "sound", "power", "mouse", "keyboard", "mobility"], links: [["View devices and printers", "devices"], ["Add a device", "devices"], ["Adjust commonly used mobility settings", "power"]] },
  { id: "cat-programs", title: "Programs", icon: "programs", items: ["programs", "defaultprogs", "features", "gadgets", "games"], links: [["Uninstall a program", "programs"], ["Default Programs", "defaultprogs"]] },
  { id: "cat-users", title: "User Accounts and Family Safety", icon: "users", items: ["users"], links: [["Add or remove user accounts", "users"], ["Set up parental controls for any user", "users"]] },
  { id: "cat-appearance", title: "Appearance and Personalization", icon: "appearance", items: ["personalization", "display", "taskbar", "folderopts", "fonts", "aero"], links: [["Change the theme", "personalization"], ["Change desktop background", "wallpaper"], ["Adjust screen resolution", "display"]] },
  { id: "cat-clock", title: "Clock, Language, and Region", icon: "clock", items: ["datetime", "region"], links: [["Change keyboards or other input methods", "region"], ["Change display language", "region"]] },
  { id: "cat-ease", title: "Ease of Access", icon: "ease", items: ["ease"], links: [["Let Windows suggest settings", "ease"], ["Optimize visual display", "ease"]] },
];
const PAGES: Record<string, PageDef> = {
  actioncenter: { title: "Action Center", icon: "actioncenter", cat: "cat-system" },
  eventvwr: { title: "Event Viewer", icon: "history", cat: "cat-system" },
  cleanmgr: { title: "Disk Cleanup", icon: "drive", cat: "cat-system" },
  sysdiag: { title: "System Diagnostics", icon: "taskmgr", cat: "cat-system" },
  features: { title: "Windows Features", icon: "programs", cat: "cat-programs" },
  firewall: { title: "Windows Firewall", icon: "firewall", cat: "cat-system" },
  system: { title: "System", icon: "system", cat: "cat-system" },
  wupdate: { title: "Windows Update", icon: "update", cat: "cat-system" },
  power: { title: "Power Options", icon: "power", cat: "cat-system" },
  devmgr: { title: "Device Manager", icon: "devmgr", cat: "cat-system" },
  network: { title: "Network and Sharing Center", icon: "netcat", cat: "cat-network" },
  inetopts: { title: "Internet Options", icon: "inetopts", cat: "cat-network" },
  devices: { title: "Devices and Printers", icon: "devices", cat: "cat-hardware" },
  sound: { title: "Sound", icon: "sound", cat: "cat-hardware" },
  mouse: { title: "Mouse", icon: "mouse", cat: "cat-hardware" },
  keyboard: { title: "Keyboard", icon: "keyboard", cat: "cat-hardware" },
  programs: { title: "Programs and Features", icon: "programs", cat: "cat-programs" },
  defaultprogs: { title: "Default Programs", icon: "defaultprogs", cat: "cat-programs" },
  gadgets: { title: "Desktop Gadgets", icon: "gadgets", cat: "cat-programs" },
  users: { title: "User Accounts", icon: "users", cat: "cat-users" },
  personalization: { title: "Personalization", icon: "appearance", cat: "cat-appearance" },
  wallpaper: { title: "Desktop Background", icon: "appearance", cat: "cat-appearance" },
  wincolor: { title: "Window Color and Appearance", icon: "appearance", cat: "cat-appearance" },
  screensaver: { title: "Screen Saver Settings", icon: "display", cat: "cat-appearance" },
  deskicons: { title: "Desktop Icon Settings", icon: "desktop", cat: "cat-appearance" },
  display: { title: "Display", icon: "display", cat: "cat-appearance" },
  taskbar: { title: "Taskbar and Start Menu", icon: "taskbar", cat: "cat-appearance" },
  folderopts: { title: "Folder Options", icon: "folderopts", cat: "cat-appearance" },
  fonts: { title: "Fonts", icon: "fonts", cat: "cat-appearance" },
  datetime: { title: "Date and Time", icon: "clock", cat: "cat-clock" },
  region: { title: "Region and Language", icon: "region", cat: "cat-clock" },
  ease: { title: "Ease of Access Center", icon: "ease", cat: "cat-ease" },
  mobility: { title: "Windows Mobility Center", icon: "power", cat: "cat-system" },
  reliability: { title: "Reliability Monitor", icon: "history", cat: "cat-system" },
  aero: { title: "Change the visuals and sounds on your computer", icon: "appearance", cat: "cat-appearance" },
  games: { title: "Games", icon: "gamecenter", cat: "cat-programs" },
  anytime: { title: "Windows Anytime Upgrade", icon: "trust", cat: "cat-system" },
};
const ALL_ITEMS = ["actioncenter", "eventvwr", "cleanmgr", "sysdiag", "features", "anytime", "datetime", "defaultprogs", "devmgr", "devices", "display", "ease", "folderopts", "fonts", "gadgets", "games", "inetopts", "keyboard", "mobility", "mouse", "network", "personalization", "power", "programs", "region", "reliability", "sound", "system", "taskbar", "wupdate", "users", "firewall", "aero"];

const elevate = (name: string, fn: () => void) => uac({ name, publisher: "Microsoft Windows", onAllow: fn });

/* ------------------------------------------------------------ helper UI */
function Head({ title, desc }: { title: string; desc?: string }) {
  return (
    <>
      <h1 className="cp-h1">{title}</h1>
      {desc && <p className="cp-desc">{desc}</p>}
    </>
  );
}
function Sel<T extends string | number>({ value, onChange, opts }: { value: T; onChange: (v: T) => void; opts: [T, string][] }) {
  return (
    <select className="w7input" value={value} onChange={(e) => onChange((typeof value === "number" ? Number(e.target.value) : e.target.value) as T)}>
      {opts.map(([v, l]) => <option key={String(v)} value={v}>{l}</option>)}
    </select>
  );
}

/* ----------------------------------------------------------------- pages */
function System() {
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 4;
  const [name, setName] = useState(lsGet("win7.pcname", "PC"));
  return (
    <div>
      <Head title="View basic information about your computer" />
      <div className="cp-sec">Windows edition</div>
      <div className="cp-flex"><Icon name="flag" size={72} /><div><b>Windows 7 Ultimate</b><br />Copyright © 2009 Microsoft Corporation. All rights reserved.<br />Service Pack 1<br /><a onClick={() => openCP("wupdate")}>Get more features with a new edition of Windows 7</a></div></div>
      <div className="cp-sec">System</div>
      <table className="cp-t"><tbody>
        <tr><td>Rating:</td><td><b>7.4</b> Windows Experience Index</td></tr>
        <tr><td>Processor:</td><td>Virtual CPU @ 3.40GHz ({cores} cores)</td></tr>
        <tr><td>Installed memory (RAM):</td><td>{mem.toFixed(2)} GB ({(mem * 0.99).toFixed(2)} GB usable)</td></tr>
        <tr><td>System type:</td><td>64-bit Operating System</td></tr>
        <tr><td>Pen and Touch:</td><td>{navigator.maxTouchPoints > 0 ? "Touch Support with " + navigator.maxTouchPoints + " Touch Points" : "No Pen or Touch Input is available for this Display"}</td></tr>
      </tbody></table>
      <div className="cp-sec">Computer name, domain, and workgroup settings</div>
      <table className="cp-t"><tbody>
        <tr><td>Computer name:</td><td>{name}</td></tr>
        <tr><td>Full computer name:</td><td>{name}</td></tr>
        <tr><td>Workgroup:</td><td>WORKGROUP</td></tr>
      </tbody></table>
      <p><a onClick={() => elevate("System Properties", () => promptBox({ title: "Computer Name", text: "Type a new computer name:", value: name, onOk: (v) => { if (v.trim()) { setName(v.trim()); lsSet("win7.pcname", v.trim()); notify({ title: "Computer name", text: "Computer renamed to " + v.trim(), icon: "info" }); } } }))}>Change settings</a></p>
      <div className="cp-sec">Windows activation</div>
      <div className="cp-flex"><Icon name="shield" size={32} />Windows is activated<br />Product ID: 00426-OEM-8992662-00006</div>
    </div>
  );
}

const DEVICES: [string, string[]][] = [
  ["Computer", ["ACPI x64-based PC"]], ["Disk drives", ["ST3500418AS ATA Device", "Generic USB Flash Disk"]], ["Display adapters", ["Standard VGA Graphics Adapter"]],
  ["DVD/CD-ROM drives", ["Virtual CD/DVD-ROM ATA Device"]], ["Keyboards", ["Standard PS/2 Keyboard"]], ["Mice and other pointing devices", ["HID-compliant mouse"]],
  ["Network adapters", ["Realtek PCIe GBE Family Controller", "Microsoft Virtual WiFi Miniport Adapter"]], ["Processors", ["Virtual CPU @ 3.40GHz", "Virtual CPU @ 3.40GHz"]],
  ["Sound, video and game controllers", ["High Definition Audio Device"]], ["Universal Serial Bus controllers", ["Intel(R) USB 3.0 eXtensible Host Controller", "USB Root Hub"]],
];
function DevMgr() {
  const dis = useStore((s) => s.settings.deviceDisabled);
  const [open, setOpen] = useState<string[]>(["Network adapters"]);
  const [sel, setSel] = useState<string | null>(null);
  const [scan, setScan] = useState(false);
  const toggle = (d: string) => elevate("Device Manager", () => setSettings({ deviceDisabled: dis.includes(d) ? dis.filter((x) => x !== d) : [...dis, d] }));
  return (
    <div className="devmgr">
      <div className="cp-toolbar"><Btn onClick={() => { setScan(true); setTimeout(() => { setScan(false); notify({ title: "Device Manager", text: "Scan complete. No new hardware found.", icon: "info" }); }, 1400); }}>Scan for hardware changes</Btn><Btn disabled={!sel} onClick={() => sel && toggle(sel)}>{sel && dis.includes(sel) ? "Enable" : "Disable"}</Btn><Btn disabled={!sel} onClick={() => sel && msgBox({ title: sel + " Properties", text: `Device status:\nThis device ${dis.includes(sel) ? "is disabled." : "is working properly."}\n\nManufacturer: Microsoft\nDriver version: 6.1.7600.16385`, icon: "info" })}>Properties</Btn>{scan && <span className="busy"><i className="busy-ring" /> Scanning...</span>}</div>
      <div className="dm-tree">
        <div className="dm-row"><Icon name="computer" size={16} /> <b>{lsGet("win7.pcname", "PC")}</b></div>
        {DEVICES.map(([cat, devs]) => (
          <div key={cat}>
            <div className="dm-row" style={{ paddingLeft: 14 }} onClick={() => setOpen(open.includes(cat) ? open.filter((o) => o !== cat) : [...open, cat])}>{open.includes(cat) ? "▾" : "▸"} <Icon name="devmgr" size={14} /> {cat}</div>
            {open.includes(cat) && devs.map((d, i) => (
              <div key={d + i} className={"dm-row dev" + (sel === d ? " sel" : "")} style={{ paddingLeft: 48 }} onClick={() => setSel(d)} onDoubleClick={() => msgBox({ title: d + " Properties", text: `This device ${dis.includes(d) ? "is disabled." : "is working properly."}`, icon: "info" })} onContextMenu={(e) => { e.preventDefault(); setSel(d); import("../store").then((m) => m.showMenu(e, [{ label: dis.includes(d) ? "Enable" : "Disable", onClick: () => toggle(d) }, { label: "Uninstall", onClick: () => elevate("Device Manager", () => notify({ title: "Device Manager", text: d + " cannot be uninstalled in this simulation.", icon: "warn" })) }, { sep: true }, { label: "Properties", bold: true, onClick: () => msgBox({ title: d + " Properties", text: "This device is working properly.", icon: "info" }) }])); }}>
                <Icon name="devmgr" size={14} /> {d} {dis.includes(d) && <span style={{ color: "#a00" }}>(disabled)</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function WUpdate() {
  const s = useStore((st) => st.settings);
  const [st, setSt] = useState<"idle" | "checking" | "found" | "installing" | "done">("idle");
  const [v, setV] = useState(0);
  const history = lsGet<string[]>("win7.wuhist", ["Security Update for Windows 7 (KB2813347) — Successful", "Update for Internet Explorer 8 (KB2598845) — Successful"]);
  useEffect(() => {
    if (st !== "installing") return;
    const i = setInterval(() => setV((x) => { if (x >= 100) { clearInterval(i); return x; } return x + 6; }), 250);
    return () => clearInterval(i);
  }, [st]);
  useEffect(() => {
    if (v >= 100 && st === "installing") {
      setSt("done");
      lsSet("win7.wuhist", ["Windows 7 Service Pack 1 (KB976932) — Successful", "Security Update for Windows 7 (KB3000483) — Successful", ...history]);
      notify({ title: "Windows Update", text: "Updates were installed. Restart your computer to finish.", icon: "info" });
    }
  }, [v, st]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <Head title="Windows Update" desc="Download and install updates to keep your computer secure." />
      <div className="cp-flex" style={{ gap: 14, padding: "10px 0" }}>
        <Icon name={st === "found" ? "warn" : "shield"} size={56} />
        <div style={{ flex: 1 }}>
          {st === "idle" && <><b style={{ fontSize: 15 }}>Windows is up to date</b><p>No updates are currently selected. Last checked: today.</p></>}
          {st === "checking" && <><b style={{ fontSize: 15 }}>Checking for updates...</b><div className="pbar" style={{ width: 300, marginTop: 8 }}><div style={{ width: "60%" }} /></div></>}
          {st === "found" && <><b style={{ fontSize: 15 }}>Download and install updates for your computer</b><p>3 important updates are available (48.2 MB).</p></>}
          {st === "installing" && <><b style={{ fontSize: 15 }}>Installing updates...</b><div className="pbar" style={{ width: 300, marginTop: 8 }}><div style={{ width: Math.min(100, v) + "%" }} /></div></>}
          {st === "done" && <><b style={{ fontSize: 15 }}>Restart your computer to finish installing important updates</b></>}
        </div>
        {(st === "idle") && <Btn onClick={() => { setSt("checking"); setTimeout(() => setSt("found"), 2200); }}>Check for updates</Btn>}
        {st === "found" && <Btn def onClick={() => elevate("Windows Update", () => { setV(0); setSt("installing"); })}>Install updates</Btn>}
        {st === "done" && <Btn def onClick={() => restart()}>Restart now</Btn>}
      </div>
      <GroupBox title="Important updates">
        {["Windows 7 Service Pack 1 (KB976932)", "Security Update for Windows 7 (KB3000483)", "Update for Microsoft .NET Framework (KB2736422)"].map((u) => <div key={u}><Icon name="update" size={14} /> {u}</div>)}
      </GroupBox>
      <GroupBox title="Change settings">
        {[["auto", "Install updates automatically (recommended)"], ["download", "Download updates but let me choose whether to install them"], ["notify", "Check for updates but let me choose whether to download and install them"], ["never", "Never check for updates (not recommended)"]].map(([k, l]) => <div key={k}><Radio checked={s.autoUpdate === k} onChange={() => setSettings({ autoUpdate: k })} label={l} /></div>)}
      </GroupBox>
      <div className="cp-sec">Update history</div>
      {history.slice(0, 6).map((h) => <div key={h} style={{ padding: "1px 0" }}>{h}</div>)}
    </div>
  );
}

function Firewall() {
  const fw = useStore((s) => s.settings.firewall);
  return (
    <div>
      <Head title="Help protect your computer with Windows Firewall" desc="Windows Firewall can help prevent hackers or malicious software from gaining access to your computer through the Internet or a network." />
      <div className={"fw-box " + (fw ? "on" : "off")}>
        <Icon name="shield" size={48} />
        <div>
          <b>Home or work (private) networks</b> {fw ? "Connected" : "Not protected"}
          <table className="cp-t"><tbody>
            <tr><td>Windows Firewall state:</td><td>{fw ? "On" : "Off"}</td></tr>
            <tr><td>Incoming connections:</td><td>{fw ? "Block all connections to programs that are not on the list of allowed programs" : "Allow all"}</td></tr>
            <tr><td>Active home or work (private) networks:</td><td>Network 2</td></tr>
            <tr><td>Notification state:</td><td>Notify me when Windows Firewall blocks a new program</td></tr>
          </tbody></table>
        </div>
      </div>
      <p><Btn def onClick={() => elevate("Windows Firewall", () => { setSettings({ firewall: !fw }); notify({ title: "Windows Firewall", text: fw ? "Windows Firewall is now turned off. Your computer may be at risk." : "Windows Firewall is turned on.", icon: fw ? "warn" : "info" }); })}>{fw ? "Turn Windows Firewall off" : "Turn Windows Firewall on"}</Btn> <Btn onClick={() => msgBox({ title: "Windows Firewall", text: "Settings were restored to default values.", icon: "info" })}>Restore defaults</Btn></p>
    </div>
  );
}

function Power() {
  const p = useStore((s) => s.settings.power);
  const plans: [string, string, string][] = [["balanced", "Balanced (recommended)", "Automatically balances performance with energy consumption on capable hardware."], ["saver", "Power saver", "Saves energy by reducing your computer's performance where possible."], ["high", "High performance", "Favors performance, but may use more energy."]];
  const times: [number, string][] = [[1, "1 minute"], [5, "5 minutes"], [10, "10 minutes"], [15, "15 minutes"], [30, "30 minutes"], [60, "1 hour"], [0, "Never"]];
  return (
    <div>
      <Head title="Select a power plan" desc="Power plans can help you maximize your computer's performance or conserve energy." />
      {plans.map(([k, n, d]) => (
        <div key={k} className="plan"><Radio checked={p.plan === k} onChange={() => setSettings({ power: { ...p, plan: k } })} label={<b>{n}</b>} /><div className="cp-desc" style={{ marginLeft: 22 }}>{d}</div></div>
      ))}
      <GroupBox title="Edit plan settings">
        <table className="cp-t"><tbody>
          <tr><td>Turn off the display:</td><td><Sel value={p.display} onChange={(v) => setSettings({ power: { ...p, display: v } })} opts={times} /></td></tr>
          <tr><td>Put the computer to sleep:</td><td><Sel value={p.sleep} onChange={(v) => setSettings({ power: { ...p, sleep: v } })} opts={times} /></td></tr>
        </tbody></table>
        <p className="cp-desc">The computer goes to sleep after the selected idle time. Click or press a key to wake it.</p>
      </GroupBox>
    </div>
  );
}

function SoundPage({ nav }: { nav: (p: string) => void }) {
  void nav;
  const s = useStore((st) => st.settings);
  const [tab, setTab] = useState("Sounds");
  const [ev, setEv] = useState<SysSound>("logon");
  return (
    <div className="cp-dialog">
      <Tabs tabs={["Playback", "Recording", "Sounds", "Communications"]} value={tab} onChange={setTab} />
      <div className="cp-tabbody">
        {tab === "Playback" && (
          <div>
            <p>Select a playback device below to modify its settings:</p>
            <div className="dev-card sel"><Icon name="audio" size={40} /><div><b>Speakers</b><br />High Definition Audio Device<br />Default Device</div></div>
            <p>Master volume: <Slider value={s.volume} onChange={(v) => setSettings({ volume: v, muted: false })} style={{ width: 220 }} /> {s.muted ? "Muted" : s.volume + "%"}</p>
            <Check checked={s.muted} onChange={(v) => setSettings({ muted: v })} label="Mute" />
            <p><Btn onClick={() => playSys("ding")}>Test</Btn></p>
          </div>
        )}
        {tab === "Recording" && <div><div className="dev-card sel"><Icon name="recorder" size={40} /><div><b>Microphone</b><br />High Definition Audio Device<br />Default Device</div></div><p><Btn onClick={() => openApp("recorder")}>Open Sound Recorder</Btn></p></div>}
        {tab === "Sounds" && (
          <div className="sound-page">
            <p>A sound scheme is a set of sounds applied to events in Windows and programs. You can select Windows Default, one of the extra schemes, or No Sounds.</p>
            <p>
              Sound Scheme:{" "}
              <Sel value={s.soundScheme} onChange={(v) => setSettings({ soundScheme: v })} opts={SCHEMES.map((x) => [x, x]) as [string, string][]} />
              {s.soundScheme !== "Windows Default" && s.soundScheme !== "No Sounds" ? <span className="dim"> (modified)</span> : null}
            </p>
            <div className="sound-grid">
              <div className="ev-list">
                <div className="ev-head">Program Events</div>
                {SOUND_EVENTS.map((e) => (
                  <div key={e.key} className={"ev-row" + (ev === e.key ? " sel" : "")} onClick={() => setEv(e.key)}>
                    <Icon name="audio" size={14} /> {e.label}
                  </div>
                ))}
              </div>
              <div className="ev-side">
                <p className="dim">Sounds:</p>
                <div className="ev-sound">{SOUND_EVENTS.find((e) => e.key === ev)?.label}</div>
                <p><Btn onClick={() => playPreview(s.soundScheme, ev)} disabled={isNoSounds(s.soundScheme)}>Test</Btn></p>
                <p className="dim">Click an event to select it, then press Test to hear it in the current scheme.</p>
                <p className="dim">Schemes: {SCHEMES.length - 1} sound schemes plus No Sounds.</p>
              </div>
            </div>
            <p><Check checked={!s.muted} onChange={(v) => setSettings({ muted: !v })} label="Play Windows Startup sound" /></p>
          </div>
        )}
        {tab === "Communications" && <div><p>When Windows detects communications activity:</p><Radio checked label="Do nothing" onChange={() => {}} /><br /><Radio checked={false} label="Reduce the volume of other sounds by 80%" onChange={() => {}} /></div>}
      </div>
    </div>
  );
}

const THEMES: { name: string; theme: Settings["theme"]; wp: string; color: string; group: string; sound: string }[] = [
  { name: "Windows 7", theme: "aero", wp: "win7", color: "sky", group: "Aero Themes", sound: "Windows Default" },
  { name: "Architecture", theme: "aero", wp: "architecture", color: "slate", group: "Aero Themes", sound: "Cityscape" },
  { name: "Landscapes", theme: "aero", wp: "landscape", color: "leaf", group: "Aero Themes", sound: "Landscape" },
  { name: "Dusk", theme: "aero", wp: "dusk", color: "pumpkin", group: "Aero Themes", sound: "Delta" },
  { name: "Harmony", theme: "aero", wp: "harmony", color: "violet", group: "Aero Themes", sound: "Raga" },
  { name: "Coast", theme: "aero", wp: "coast", color: "sea", group: "Aero Themes", sound: "Sonata" },
  { name: "Windows 7 Basic", theme: "basic", wp: "win7", color: "twilight", group: "Basic and High Contrast Themes", sound: "Windows Default" },
  { name: "Windows Classic", theme: "classic", wp: "bluesolid", color: "twilight", group: "Basic and High Contrast Themes", sound: "No Sounds" },
  { name: "High Contrast #1", theme: "hc", wp: "blacksolid", color: "smoke", group: "Basic and High Contrast Themes", sound: "No Sounds" },
];
function Personalization({ nav }: { nav: (p: string) => void }) {
  const s = useStore((st) => st.settings);
  const cur = THEMES.find((t) => t.theme === s.theme && t.wp === s.wallpaper && t.color === s.colorKey);
  return (
    <div>
      <Head title="Change the visuals and sounds on your computer" desc="Click a theme to change the desktop background, window color, sounds, and screen saver all at once." />
      {["Aero Themes", "Basic and High Contrast Themes"].map((g) => (
        <div key={g}>
          <div className="cp-sec">{g}</div>
          <div className="theme-grid">
            {THEMES.filter((t) => t.group === g).map((t) => (
              <div key={t.name} className={"theme-card" + (cur?.name === t.name ? " sel" : "")} onClick={() => setSettings({ theme: t.theme, wallpaper: t.wp, colorKey: t.color, soundScheme: t.sound, transparency: t.theme === "aero" ? true : s.transparency })}>
                <div className={"theme-prev t-" + t.theme} style={wpStyle(t.wp, "fill")}>
                  <div className="tp-win" style={{ background: t.theme === "aero" ? `rgba(${COLORS.find((c) => c.key === t.color)!.rgb.join(",")},.7)` : undefined }}><i /></div>
                </div>
                {t.name}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="cp-bottom">
        {[["wallpaper", "Desktop Background", "appearance"], ["wincolor", "Window Color", "appearance"], ["sound", "Sounds", "sound"], ["screensaver", "Screen Saver", "display"]].map(([p, l, ic]) => (
          <div key={p} className="cp-bt" onClick={() => nav(p)}><Icon name={ic} size={32} /><span>{l}</span></div>
        ))}
      </div>
    </div>
  );
}

function Wallpaper() {
  const s = useStore((st) => st.settings);
  const fs = useStore((st) => st.fs);
  const pics = children("pics", fs).filter((n) => n.type === "file" && n.content?.startsWith("data:image"));
  const [media, setMedia] = useState<MediaMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => setMedia(listMedia()), []);
  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener("win7-media-changed", on);
    return () => window.removeEventListener("win7-media-changed", on);
  }, [refresh]);

  const upload = async (files: FileList | File[] | null) => {
    if (!files || !files.length) return;
    setErr("");
    setBusy(true);
    try {
      let last: MediaMeta | null = null;
      for (const f of Array.from(files)) {
        if (!/^(image|video)\//.test(f.type)) {
          setErr(`"${f.name}" is not a photo or video.`);
          continue;
        }
        last = await addMedia(f);
      }
      refresh();
      window.dispatchEvent(new Event("win7-media-changed"));
      if (last) setSettings({ wallpaper: "media:" + last.id });
    } catch {
      setErr("That file could not be saved — it may be too large for this browser.");
    } finally {
      setBusy(false);
    }
  };

  const del = async (m: MediaMeta) => {
    await removeMedia(m.id);
    if (s.wallpaper === "media:" + m.id) setSettings({ wallpaper: "win7" });
    refresh();
    window.dispatchEvent(new Event("win7-media-changed"));
  };

  return (
    <div>
      <Head title="Choose your desktop background" desc="Click a picture to make it your desktop background, or add your own photo or video." />
      <div
        className={"wp-drop" + (drag ? " drag" : "")}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
      >
        <Icon name="photos" size={32} />
        <div>
          <b>Add a photo or video</b>
          <p>Drop a file here, or <a onClick={() => fileRef.current?.click()}>browse your computer</a>. JPG, PNG, GIF, WebP, MP4, WebM and MOV · kept in this browser only.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { upload(e.target.files); e.currentTarget.value = ""; }}
        />
      </div>
      {busy && <p className="cp-desc">Adding your file…</p>}
      {err && <p className="cp-err">{err}</p>}

      {media.length > 0 && (
        <>
          <div className="cp-sec">Your backgrounds</div>
          <div className="wp-grid">
            {media.map((m) => (
              <div
                key={m.id}
                className={"wp-item media" + (s.wallpaper === "media:" + m.id ? " sel" : "") + (m.kind === "video" ? " is-video" : "")}
                title={`${m.name} — ${m.w}×${m.h}${m.kind === "video" ? ` · ${prettyDur(m.duration)}` : ""} · ${prettySize(m.size)}`}
                onClick={() => setSettings({ wallpaper: "media:" + m.id })}
              >
                <MediaThumb id={m.id} kind={m.kind} />
                <span className="wp-badge">{m.kind === "video" ? "▶ " + (prettyDur(m.duration) || "Video") : "Photo"}</span>
                <button className="wp-del" title="Remove" onClick={(e) => { e.stopPropagation(); del(m); }}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="cp-sec">Windows backgrounds</div>
      <div className="wp-grid">
        {WALLPAPERS.map((w) => <div key={w.key} className={"wp-item" + (s.wallpaper === w.key ? " sel" : "")} style={wpStyle(w.key, "fill")} title={w.name} onClick={() => setSettings({ wallpaper: w.key })} />)}
        {pics.map((p) => <div key={p.id} className={"wp-item" + (s.wallpaper === "fs:" + p.id ? " sel" : "")} style={{ backgroundImage: `url("${p.content}")` }} title={p.name} onClick={() => setSettings({ wallpaper: "fs:" + p.id })} />)}
      </div>
      <p>
        Picture position:{" "}
        <Sel
          value={s.wpPos}
          onChange={(v) => setSettings({ wpPos: v as typeof s.wpPos })}
          opts={s.wallpaper.startsWith("media:") ? WP_FITS.map((f) => [f.key, f.label]) as [string, string][] : [["fill", "Fill"], ["fit", "Fit"], ["stretch", "Stretch"], ["tile", "Tile"], ["center", "Center"]]}
        />{" "}
        <span className="cp-desc">
          {s.wallpaper.startsWith("media:") ? "(Stretch is not offered — it distorts photos and videos.)" : "(applies to pictures from your Pictures library)"}
        </span>
      </p>
      {s.wallpaper.startsWith("media:") && (
        <p><Check checked={s.wpSound} onChange={(v) => setSettings({ wpSound: v })} label="Play audio from the video background" /></p>
      )}
    </div>
  );
}

/** Small preview of a stored background (object URL is created on demand). */
function MediaThumb({ id, kind }: { id: string; kind: "image" | "video" }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    mediaUrl(id).then((u) => live && setUrl(u));
    return () => { live = false; };
  }, [id]);
  if (!url) return <div className="wp-thumb-empty" />;
  return kind === "video" ? <video src={url} muted playsInline preload="metadata" className="wp-thumb" /> : <img src={url} alt="" className="wp-thumb" />;
}

function WinColor() {
  const s = useStore((st) => st.settings);
  return (
    <div>
      <Head title="Change the color of your window borders, Start menu, and taskbar" />
      <div className="color-grid">
        {COLORS.map((c) => <div key={c.key} title={c.name} className={"color-sw" + (s.colorKey === c.key ? " sel" : "")} style={{ background: `rgb(${c.rgb.join(",")})` }} onClick={() => setSettings({ colorKey: c.key, theme: s.theme === "classic" || s.theme === "hc" ? "aero" : s.theme })} />)}
      </div>
      <p><Check checked={s.transparency} onChange={(v) => setSettings({ transparency: v })} label="Enable transparency" disabled={s.theme !== "aero"} /></p>
      <p>Color intensity: <Slider value={s.intensity} onChange={(v) => setSettings({ intensity: v })} style={{ width: 240 }} /> {s.intensity}%</p>
      <p>Current color: <b>{COLORS.find((c) => c.key === s.colorKey)?.name}</b>. Theme: <b>{{ aero: "Windows 7 (Aero)", basic: "Windows 7 Basic", classic: "Windows Classic", hc: "High Contrast" }[s.theme]}</b></p>
      <p><Btn onClick={() => setSettings({ theme: "aero", transparency: true })}>Switch to Aero</Btn> <Btn onClick={() => setSettings({ theme: "basic" })}>Switch to Basic</Btn></p>
    </div>
  );
}

function ScreenSaver() {
  const s = useStore((st) => st.settings);
  return (
    <div className="cp-dialog">
      <div className="cp-tabbody">
        <p>Screen saver: <Sel value={s.screensaver} onChange={(v) => setSettings({ screensaver: v })} opts={[["none", "(None)"], ["bubbles", "Bubbles"], ["ribbons", "Ribbons"], ["photos", "Photos"], ["blank", "Blank"]]} /> <Btn disabled={s.screensaver === "none"} onClick={() => setState({ screensaverOn: true })}>Preview</Btn></p>
        <p>Wait: <input className="w7input" type="number" min={1} max={60} value={s.ssWait} onChange={(e) => setSettings({ ssWait: Math.max(1, +e.target.value || 1) })} style={{ width: 60 }} /> minutes <Check checked={false} onChange={() => {}} label="On resume, display logon screen" /></p>
        <p className="cp-desc">The screen saver starts after the computer has been idle for the selected time.</p>
      </div>
    </div>
  );
}

function DeskIcons() {
  const s = useStore((st) => st.settings);
  const set = (k: string, v: boolean) => setSettings({ sysIcons: { ...s.sysIcons, [k]: v } });
  return (
    <div className="cp-dialog">
      <div className="cp-tabbody">
        <GroupBox title="Desktop icons">
          {[["computer", "Computer"], ["user", "User's Files"], ["network", "Network"], ["recycle", "Recycle Bin"], ["cpanel", "Control Panel"]].map(([k, l]) => <div key={k}><Check checked={!!s.sysIcons[k]} onChange={(v) => set(k, v)} label={l} /></div>)}
        </GroupBox>
        <p><Check checked={s.showIcons} onChange={(v) => setSettings({ showIcons: v })} label="Show desktop icons" /></p>
        <p>Icon size: <Sel value={s.iconSize} onChange={(v) => setSettings({ iconSize: v })} opts={[["large", "Large icons"], ["medium", "Medium icons"], ["small", "Small icons"]]} /></p>
        <p><Btn onClick={() => setSettings({ sysIcons: { computer: true, user: true, network: true, recycle: true, cpanel: true } })}>Restore Default</Btn></p>
      </div>
    </div>
  );
}

const RES = ["800x600", "1024x768", "1280x720", "1366x768", "1600x900", "1920x1080"];
function Display() {
  const s = useStore((st) => st.settings);
  const [res, setRes] = useState(s.resolution === "native" ? "1366x768" : s.resolution);
  const [dpi, setDpi] = useState(s.dpi);
  const apply = () => {
    const old = { resolution: s.resolution, dpi: s.dpi };
    setSettings({ resolution: res, dpi });
    setTimeout(() => msgBox({ title: "Display Settings", text: "Do you want to keep these display settings?\nReverting to previous display settings in 15 seconds.", icon: "question", buttons: ["Keep changes", "Revert"], onResult: (b) => b === "Revert" && setSettings(old) }), 400);
  };
  return (
    <div>
      <Head title="Make it easier to read what's on your display" desc="You can change the size of text and other items on your screen." />
      <div className="cp-flex" style={{ gap: 20 }}>
        <div style={{ flex: 1 }}>
          {[100, 125, 150].map((d) => <div key={d}><Radio checked={dpi === d} onChange={() => setDpi(d)} label={d === 100 ? "Smaller - 100% (default)" : d === 125 ? "Medium - 125%" : "Larger - 150%"} /></div>)}
          <div className="cp-sec">Screen resolution</div>
          <table className="cp-t"><tbody>
            <tr><td>Display:</td><td>1. Generic PnP Monitor</td></tr>
            <tr><td>Resolution:</td><td><Sel value={res} onChange={setRes} opts={[["native", "Native (fit window)"], ...RES.map((r) => [r, r.replace("x", " × ") + (r === "1366x768" ? " (Recommended)" : "")] as [string, string])]} /></td></tr>
            <tr><td>Orientation:</td><td><Sel value="l" onChange={() => {}} opts={[["l", "Landscape"], ["p", "Portrait"]]} /></td></tr>
          </tbody></table>
          <p><Btn def onClick={apply}>Apply</Btn> <Btn onClick={() => msgBox({ title: "Identify", text: "1", icon: "info" })}>Identify</Btn> <Btn onClick={() => msgBox({ title: "Display", text: "No other displays were detected.", icon: "info" })}>Detect</Btn></p>
        </div>
        <div className="monitor"><div className="monitor-screen" style={{ aspectRatio: res === "native" ? "16/9" : res.replace("x", "/") }}>{res === "native" ? "Native" : res}</div></div>
      </div>
    </div>
  );
}

function Mouse() {
  const s = useStore((st) => st.settings);
  const [tab, setTab] = useState("Buttons");
  const [speed, setSpeed] = useState(lsGet("win7.dbl", 50));
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState(0);
  return (
    <div className="cp-dialog">
      <Tabs tabs={["Buttons", "Pointers", "Pointer Options"]} value={tab} onChange={setTab} />
      <div className="cp-tabbody">
        {tab === "Buttons" && (
          <div>
            <GroupBox title="Double-click speed">
              <p>Double-click the folder to test your setting. If the folder does not open or close, try using a slower setting.</p>
              <div className="cp-flex">Speed: Slow <Slider value={speed} onChange={(v) => { setSpeed(v); lsSet("win7.dbl", v); }} style={{ width: 150 }} /> Fast
                <span style={{ marginLeft: 20 }} onClick={() => { const now = Date.now(); if (now - last < 900 - speed * 7) { setOpen(!open); setLast(0); } else setLast(now); }}><Icon name={open ? "folder" : "drive"} size={40} /></span>
              </div>
            </GroupBox>
          </div>
        )}
        {tab === "Pointers" && (
          <div>
            <p>Scheme: <Sel value={s.pointer} onChange={(v) => setSettings({ pointer: v })} opts={[["aero", "Windows Aero (system scheme)"], ["large", "Windows Aero (extra large)"], ["black", "Windows Black (system scheme)"]]} /></p>
            <div className="ptr-prev" style={{ cursor: s.pointer === "large" ? "zoom-in" : "default" }}>Move your mouse here to preview the pointer scheme.</div>
          </div>
        )}
        {tab === "Pointer Options" && (
          <div>
            <GroupBox title="Motion"><div className="cp-flex">Select a pointer speed: Slow <Slider value={50} onChange={() => {}} style={{ width: 150 }} /> Fast</div></GroupBox>
            <GroupBox title="Visibility">
              <Check checked={s.trails} onChange={(v) => setSettings({ trails: v })} label="Display pointer trails" />
            </GroupBox>
          </div>
        )}
      </div>
    </div>
  );
}

function Keyboard() {
  const s = useStore((st) => st.settings);
  const [blink, setBlink] = useState(lsGet("win7.blink", 50));
  const [delay, setDelay] = useState(lsGet("win7.kdelay", 50));
  return (
    <div className="cp-dialog">
      <Tabs tabs={["Speed", "Hardware"]} value="Speed" onChange={() => {}} />
      <div className="cp-tabbody">
        <GroupBox title="Character repeat">
          <p>Repeat delay: Long <Slider value={delay} onChange={(v) => { setDelay(v); lsSet("win7.kdelay", v); }} style={{ width: 150 }} /> Short</p>
          <textarea className="w7input" style={{ width: "100%", height: 50 }} placeholder="Click here and hold down a key to test repeat rate" />
        </GroupBox>
        <GroupBox title="Cursor blink rate">
          <div className="cp-flex">Slow <Slider value={blink} onChange={(v) => { setBlink(v); lsSet("win7.blink", v); }} style={{ width: 150 }} /> Fast <span className="caret-demo" style={{ animationDuration: 2.2 - blink * 0.02 + "s" }} /></div>
        </GroupBox>
        <GroupBox title="Key click"><Check checked={s.keyClick} onChange={(v) => setSettings({ keyClick: v })} label="Play a click sound when typing" /></GroupBox>
      </div>
    </div>
  );
}

function DateTime() {
  const s = useStore((st) => st.settings);
  const now = useNow(1000);
  const zones: [string, string][] = [["local", "(Local) — this computer's time zone"], ["-480", "(UTC-08:00) Pacific Time (US & Canada)"], ["-300", "(UTC-05:00) Eastern Time (US & Canada)"], ["0", "(UTC) Dublin, Edinburgh, Lisbon, London"], ["60", "(UTC+01:00) Berlin, Paris, Madrid"], ["330", "(UTC+05:30) Chennai, Mumbai, New Delhi"], ["540", "(UTC+09:00) Osaka, Tokyo"], ["600", "(UTC+10:00) Sydney"]];
  const val = s.tz === null ? "local" : String(s.tz);
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState("");
  const [t, setT] = useState("");
  return (
    <div className="cp-dialog">
      <Tabs tabs={["Date and Time", "Additional Clocks", "Internet Time"]} value="Date and Time" onChange={() => {}} />
      <div className="cp-tabbody">
        <div className="cp-flex" style={{ gap: 20, alignItems: "flex-start" }}>
          <div>
            <b style={{ fontSize: 20, fontWeight: 400 }}>{fmtTime(now, s, true)}</b>
            <div>{fmtLongDate(now, s)}</div>
            <p><Btn onClick={() => elevate("Date and Time", () => { const n = nowTz(s.tz); setD(n.toISOString().slice(0, 10)); setT(`${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`); setEdit(true); })}>Change date and time...</Btn></p>
            {edit && (
              <GroupBox title="Date and Time Settings">
                <input type="date" className="w7input" value={d} onChange={(e) => setD(e.target.value)} /> <input type="time" className="w7input" value={t} onChange={(e) => setT(e.target.value)} />
                <p><Btn def onClick={() => { const target = new Date(`${d}T${t}:00`).getTime(); const real = Date.now(); const off = Math.round((target - real) / 60000) + (-new Date().getTimezoneOffset()); const utcOff = off; setSettings({ tz: utcOff }); setEdit(false); }}>OK</Btn> <Btn onClick={() => setEdit(false)}>Cancel</Btn></p>
              </GroupBox>
            )}
          </div>
          <Clock />
        </div>
        <GroupBox title="Time zone">
          <Sel value={val} onChange={(v) => setSettings({ tz: v === "local" ? null : Number(v) })} opts={zones} />
          <p className="cp-desc">Changing the time zone updates the taskbar clock, calendar and clock gadget immediately.</p>
        </GroupBox>
        <Check checked={s.clock24} onChange={(v) => setSettings({ clock24: v })} label="Use 24-hour time" />
      </div>
    </div>
  );
}
function Clock() {
  const tz = useStore((s) => s.settings.tz);
  const [, t] = useState(0);
  useEffect(() => { const i = setInterval(() => t((x) => x + 1), 1000); return () => clearInterval(i); }, []);
  const d = nowTz(tz);
  return (
    <svg width="110" height="110" viewBox="0 0 130 130"><circle cx="65" cy="65" r="60" fill="#f4f7fb" stroke="#6b7b92" strokeWidth="3" />{Array.from({ length: 12 }, (_, i) => <line key={i} x1="65" y1="12" x2="65" y2="19" stroke="#234" strokeWidth="2.500" transform={`rotate(${i * 30} 65 65)`} />)}<line x1="65" y1="65" x2="65" y2="34" stroke="#123" strokeWidth="5" strokeLinecap="round" transform={`rotate(${(d.getHours() % 12) * 30 + d.getMinutes() / 2} 65 65)`} /><line x1="65" y1="65" x2="65" y2="20" stroke="#123" strokeWidth="3" strokeLinecap="round" transform={`rotate(${d.getMinutes() * 6} 65 65)`} /><line x1="65" y1="72" x2="65" y2="16" stroke="#c22" strokeWidth="1.500" transform={`rotate(${d.getSeconds() * 6} 65 65)`} /></svg>
  );
}

function Region() {
  const s = useStore((st) => st.settings);
  const now = useNow(1000);
  return (
    <div className="cp-dialog">
      <Tabs tabs={["Formats", "Location", "Keyboards and Languages", "Administrative"]} value="Formats" onChange={() => {}} />
      <div className="cp-tabbody">
        <p>Format: <Sel value={s.region} onChange={(v) => setSettings({ region: v })} opts={[["en-US", "English (United States)"], ["en-GB", "English (United Kingdom)"], ["de-DE", "Deutsch (Deutschland)"], ["fr-FR", "Français (France)"], ["ja-JP", "日本語 (日本)"], ["es-ES", "Español (España)"]]} /></p>
        <GroupBox title="Date and time formats">
          <table className="cp-t"><tbody>
            <tr><td>Short date:</td><td>{now.toLocaleDateString(s.region)}</td></tr>
            <tr><td>Long date:</td><td>{fmtLongDate(now, s)}</td></tr>
            <tr><td>Time:</td><td>{fmtTime(now, s, true)}</td></tr>
            <tr><td>Number:</td><td>{(123456789.12).toLocaleString(s.region)}</td></tr>
            <tr><td>Currency:</td><td>{(1234.5).toLocaleString(s.region, { style: "currency", currency: s.region === "en-GB" ? "GBP" : s.region === "ja-JP" ? "JPY" : s.region.startsWith("en") ? "USD" : "EUR" })}</td></tr>
          </tbody></table>
        </GroupBox>
        <Check checked={s.clock24} onChange={(v) => setSettings({ clock24: v })} label="24-hour clock" />
      </div>
    </div>
  );
}

function Users() {
  const s = useStore((st) => st.settings);
  const me = s.users.find((u) => u.name === s.currentUser)!;
  const [view2, setView2] = useState<"main" | "pic" | "manage">("main");
  const upd = (name: string, patch: Partial<typeof me>) => setSettings({ users: s.users.map((u) => (u.name === name ? { ...u, ...patch } : u)) });
  if (view2 === "pic")
    return (
      <div>
        <Head title="Choose a new picture for your account" />
        <div className="pic-grid">{USER_PICS.map((p) => <img key={p} src={userPic(p)} alt="" className={me.pic === p ? "sel" : ""} onClick={() => upd(me.name, { pic: p })} />)}</div>
        <p><Btn onClick={() => setView2("main")}>Back</Btn></p>
      </div>
    );
  if (view2 === "manage")
    return (
      <div>
        <Head title="Choose the account you would like to change" />
        <div className="cp-flex" style={{ flexWrap: "wrap", gap: 16 }}>
          {s.users.map((u) => (
            <div key={u.name} className="acct-card" onContextMenu={(e) => e.preventDefault()}>
              <img src={userPic(u.pic)} alt="" /><div><b>{u.name}</b><br />{u.admin ? "Administrator" : "Standard user"}{u.pass ? <><br />Password protected</> : null}
                {u.name !== s.currentUser && <><br /><a onClick={() => elevate("User Accounts", () => { setSettings({ users: s.users.filter((x) => x.name !== u.name) }); })}>Delete the account</a></>}</div>
            </div>
          ))}
          <div className="acct-card add" onClick={() => elevate("User Accounts", () => promptBox({ title: "Create New Account", text: "Type a name for the new standard user account:", onOk: (v) => { v = v.trim(); if (!v || s.users.some((u) => u.name.toLowerCase() === v.toLowerCase())) return msgBox({ title: "User Accounts", text: "That account name is invalid or already in use.", icon: "warn" }); setSettings({ users: [...s.users, { name: v, pic: USER_PICS[s.users.length % USER_PICS.length], admin: false }] }); } }))}><b>+ Create a new account</b></div>
        </div>
        <p><Btn onClick={() => setView2("main")}>Back</Btn></p>
      </div>
    );
  return (
    <div>
      <Head title="Make changes to your user account" />
      <div className="cp-flex" style={{ gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p><a onClick={() => promptBox({ title: me.pass ? "Change your password" : "Create a password", text: "Type a new password (leave blank to remove):", onOk: (v) => { upd(me.name, { pass: v || undefined }); notify({ title: "User Accounts", text: v ? "Your password has been set." : "Your password has been removed.", icon: "info" }); } })}>{me.pass ? "Change your password" : "Create a password for your account"}</a></p>
          {me.pass && <p><a onClick={() => { upd(me.name, { pass: undefined }); }}>Remove your password</a></p>}
          <p><a onClick={() => setView2("pic")}>Change your picture</a></p>
          <p><a onClick={() => promptBox({ title: "Change your account name", text: "Type a new account name:", value: me.name, onOk: (v) => { v = v.trim(); if (!v) return; setSettings({ users: s.users.map((u) => (u.name === me.name ? { ...u, name: v } : u)), currentUser: v }); } })}>Change your account name</a></p>
          <p><a onClick={() => setView2("manage")}>Manage another account</a></p>
        </div>
        <div className="acct-card big"><img src={userPic(me.pic)} alt="" /><div><b>{me.name}</b><br />{me.admin ? "Administrator" : "Standard user"}<br />{me.pass ? "Password protected" : ""}</div></div>
      </div>
    </div>
  );
}

function Fonts() {
  const fs = useStore((s) => s.fs);
  const list = [...children("c_fonts", fs).map((f) => f.name.replace(/\.ttf$/, "")), "Segoe UI", "Georgia", "Courier New", "Comic Sans MS", "Impact", "Trebuchet MS"];
  const [sel, setSel] = useState(list[0]);
  return (
    <div>
      <Head title="Preview, delete, show, or hide the fonts installed on your computer" />
      <div className="font-grid">{list.map((f) => <div key={f} className={"font-card" + (sel === f ? " sel" : "")} onClick={() => setSel(f)} style={{ fontFamily: f }}><span>Abc</span><small style={{ fontFamily: "Segoe UI" }}>{f}</small></div>)}</div>
      <div className="font-prev" style={{ fontFamily: sel }}><b>{sel}</b><div style={{ fontSize: 28 }}>The quick brown fox jumps over the lazy dog</div><div style={{ fontSize: 16 }}>ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</div></div>
    </div>
  );
}

function DefaultProgs() {
  const s = useStore((st) => st.settings);
  const set = (k: string, v: string) => setSettings({ defaults: { ...s.defaults, [k]: v } });
  return (
    <div>
      <Head title="Choose the programs that Windows uses by default" desc="These choices decide which program opens when you open a file." />
      <table className="cp-t wide"><tbody>
        <tr><td>Web browser</td><td><Sel value={s.defaults.browser} onChange={(v) => set("browser", v)} opts={[["ie", "Internet Explorer"]]} /></td></tr>
        <tr><td>Music files</td><td><Sel value={s.defaults.music} onChange={(v) => set("music", v)} opts={[["wmp", "Windows Media Player"]]} /></td></tr>
        <tr><td>Pictures</td><td><Sel value={s.defaults.photos} onChange={(v) => set("photos", v)} opts={[["photos", "Windows Photo Viewer"], ["paint", "Paint"]]} /></td></tr>
        <tr><td>Text documents</td><td><Sel value={s.defaults.text} onChange={(v) => set("text", v)} opts={[["notepad", "Notepad"], ["wordpad", "WordPad"]]} /></td></tr>
      </tbody></table>
      <p className="cp-desc">The selected program is used when you double-click a file of that type.</p>
    </div>
  );
}

function FolderOpts() {
  const f = useStore((s) => s.settings.folder);
  const set = (p: Partial<typeof f>) => setSettings({ folder: { ...f, ...p } });
  return (
    <div className="cp-dialog">
      <Tabs tabs={["General", "View", "Search"]} value="View" onChange={() => {}} />
      <div className="cp-tabbody">
        <GroupBox title="Advanced settings">
          <div><Check checked={f.showHidden} onChange={(v) => set({ showHidden: v })} label="Show hidden files, folders, and drives" /></div>
          <div><Check checked={!f.showExt} onChange={(v) => set({ showExt: !v })} label="Hide extensions for known file types" /></div>
          <div><Check checked={f.navPane} onChange={(v) => set({ navPane: v })} label="Show navigation pane in new Explorer windows" /></div>
          <div><Check checked={f.details} onChange={(v) => set({ details: v })} label="Show details pane in new Explorer windows" /></div>
          <div><Check checked={f.preview} onChange={(v) => set({ preview: v })} label="Show preview pane in new Explorer windows" /></div>
        </GroupBox>
        <p className="cp-desc">Open Explorer windows pick up these options after you reopen them. Hidden files and extensions apply immediately on the Desktop.</p>
      </div>
    </div>
  );
}

function InetOpts() {
  const s = useStore((st) => st.settings);
  const [home, setHome] = useState(s.ie.home);
  const [tab, setTab] = useState("General");
  return (
    <div className="cp-dialog">
      <Tabs tabs={["General", "Security", "Privacy", "Content", "Connections", "Programs", "Advanced"]} value={tab} onChange={setTab} />
      <div className="cp-tabbody">
        {tab === "General" ? (
          <>
            <GroupBox title="Home page">
              <p>To create home page tabs, type each address on its own line.</p>
              <input className="w7input" style={{ width: "100%" }} value={home} onChange={(e) => setHome(e.target.value)} />
              <p><Btn onClick={() => setHome("about:home")}>Use default</Btn> <Btn onClick={() => setHome("about:blank")}>Use blank</Btn> <Btn def onClick={() => { setSettings({ ie: { ...s.ie, home } }); notify({ title: "Internet Options", text: "Home page saved.", icon: "info" }); }}>Apply</Btn></p>
            </GroupBox>
            <GroupBox title="Browsing history">
              <p>Delete temporary files, history, cookies, saved passwords, and web form information. ({s.ie.history.length} pages in history)</p>
              <Btn onClick={() => { setSettings({ ie: { ...s.ie, history: [] } }); msgBox({ title: "Delete Browsing History", text: "Your browsing history was deleted.", icon: "info" }); }}>Delete...</Btn>
            </GroupBox>
          </>
        ) : (
          <p className="cp-desc">{tab} settings use the recommended defaults for this simulated browser.</p>
        )}
      </div>
    </div>
  );
}

function Programs() {
  const s = useStore((st) => st.settings);
  const [sel, setSel] = useState<string | null>(null);
  const item = s.installed.find((i) => i.id === sel);
  return (
    <div>
      <Head title="Uninstall or change a program" desc="To uninstall a program, select it from the list and then click Uninstall." />
      <div className="cp-toolbar"><Btn disabled={!item} onClick={() => item && elevate("Programs and Features", () => msgBox({ title: "Programs and Features", text: `Are you sure you want to uninstall ${item.name}?`, icon: "question", buttons: ["Yes", "No"], onResult: (b) => b === "Yes" && progressDialog({ title: "Uninstalling", text: "Uninstalling " + item.name, ms: 1800, onDone: () => { setSettings({ installed: getState().settings.installed.filter((i) => i.id !== item.id) }); setSel(null); notify({ title: "Programs and Features", text: item.name + " was uninstalled.", icon: "info" }); } }) }))}>Uninstall</Btn><Btn onClick={() => openApp("explorer", { path: "dl" })}>Install a program…</Btn></div>
      <table className="cp-list"><thead><tr><th>Name</th><th>Publisher</th><th>Installed On</th><th>Size</th><th>Version</th></tr></thead><tbody>
        {s.installed.map((i) => <tr key={i.id} className={sel === i.id ? "sel" : ""} onClick={() => setSel(i.id)}><td>{i.name}</td><td>{i.publisher}</td><td>{i.date}</td><td>{i.size}</td><td>{i.version}</td></tr>)}
      </tbody></table>
      <p className="cp-desc">{s.installed.length} programs installed. Run an installer from your Downloads folder (setup_sample.exe) to add one.</p>
    </div>
  );
}

function Network() {
  const s = useStore((st) => st.settings);
  const online = s.defaults.net !== "off";
  return (
    <div>
      <Head title="View your basic network information and set up connections" />
      <div className="net-map">
        <div><Icon name="computer" size={48} /><br />PC<br /><small>(This computer)</small></div>
        <div className={"net-line" + (online ? "" : " down")} />
        <div><Icon name="network" size={48} /><br />Network 2</div>
        <div className={"net-line" + (online ? "" : " down")} />
        <div><Icon name="ie" size={48} /><br />Internet</div>
      </div>
      <div className="cp-sec">View your active networks</div>
      <table className="cp-t"><tbody>
        <tr><td>Network 2</td><td>Access type: <b>{online ? "Internet" : "No network access"}</b></td></tr>
        <tr><td>Home network</td><td>Connections: {online ? "Local Area Connection" : "None"}</td></tr>
      </tbody></table>
      <p><Btn onClick={() => { setSettings({ defaults: { ...s.defaults, net: online ? "off" : "on" } }); notify({ title: "Network", text: online ? "Local Area Connection disabled." : "Local Area Connection enabled.", icon: online ? "warn" : "info" }); }}>{online ? "Disable connection" : "Enable connection"}</Btn> <Btn onClick={() => msgBox({ title: "Local Area Connection Status", text: `Connection\nIPv4 Connectivity: ${online ? "Internet" : "No network access"}\nSpeed: 1.0 Gbps\nDuration: 02:14:07\n\nActivity\nBytes sent: 12,408,221\nBytes received: 98,114,903`, icon: "info" })}>Status</Btn> <Btn onClick={() => runCommand("ipconfig")}>Details</Btn></p>
    </div>
  );
}

function ActionCenter() {
  const s = useStore((st) => st.settings);
  const notifs = useStore((st) => st.notifications);
  return (
    <div>
      <Head title="Review recent messages and resolve problems" desc="Action Center has detected no issues with your computer." />
      <div className="cp-sec">Security</div>
      <table className="cp-t wide"><tbody>
        <tr><td>Network firewall</td><td className={s.firewall ? "ok" : "bad"}>{s.firewall ? "On" : "Off — turn on now"}</td></tr>
        <tr><td>Windows Update</td><td className="ok">{s.autoUpdate === "never" ? "Never check (not recommended)" : "Install updates automatically"}</td></tr>
        <tr><td>Virus protection</td><td className="ok">Windows Defender is turned on</td></tr>
        <tr><td>User Account Control</td><td className="ok">{{ always: "Always notify", default: "Notify me only when programs try to make changes", never: "Never notify" }[s.uac]}</td></tr>
      </tbody></table>
      <GroupBox title="UAC level"><Sel value={s.uac} onChange={(v) => elevate("User Account Control", () => setSettings({ uac: v }))} opts={[["always", "Always notify"], ["default", "Default — notify when programs make changes"], ["never", "Never notify"]]} /></GroupBox>
      <div className="cp-sec">Maintenance</div>
      <p>Check for solutions to problem reports: <a onClick={() => msgBox({ title: "Problem Reports", text: "No new solutions were found.", icon: "info" })}>Check for solutions</a></p>
      <div className="cp-sec">Recent messages ({notifs.length})</div>
      {notifs.slice(0, 8).map((n) => <div key={n.id} className="cp-flex" style={{ padding: "3px 0" }}><Icon name={n.icon === "error" ? "error" : n.icon === "warn" ? "warn" : "info"} size={18} /> <b>{n.title}</b> — {n.text}</div>)}
      {!notifs.length && <p className="cp-desc">No messages.</p>}
      <p><a onClick={() => setState({ notifications: [] })}>Clear messages</a> · <a onClick={() => confirmReset()}>Reset this simulated PC…</a></p>
    </div>
  );
}
function confirmReset() {
  msgBox({ title: "Reset Windows 7", text: "This removes all saved files, settings and wallpapers from this browser and restores the original system. Continue?", icon: "warn", buttons: ["Reset", "Cancel"], onResult: (b) => b === "Reset" && resetAll() });
}

function Devices() {
  const items: [string, string, string][] = [["PC", "computer", "Computer"], ["Generic PnP Monitor", "display", "Monitor"], ["Standard PS/2 Keyboard", "keyboard", "Keyboard"], ["HID-compliant mouse", "mouse", "Mouse"], ["Speakers", "sound", "Speakers"], ["Microsoft XPS Document Writer", "printer", "Printer"], ["Fax", "printer", "Fax"], ["Generic USB Flash Disk", "drive", "Storage"]];
  const [sel, setSel] = useState("");
  return (
    <div>
      <Head title="Devices and Printers" />
      <div className="cp-sec">Devices ({items.length})</div>
      <div className="dev-grid">{items.map(([n, ic, t]) => <div key={n} className={"dev-it" + (sel === n ? " sel" : "")} onClick={() => setSel(n)} onDoubleClick={() => msgBox({ title: n + " Properties", text: `${n}\nCategory: ${t}\nStatus: This device is working properly.`, icon: "info" })}><Icon name={ic} size={48} /><span>{n}</span></div>)}</div>
      <p><Btn onClick={() => msgBox({ title: "Add a device", text: "Searching for devices...\nNo new devices were found.", icon: "info" })}>Add a device</Btn> <Btn onClick={() => msgBox({ title: "Add a printer", text: "No printers were found on the network.", icon: "info" })}>Add a printer</Btn></p>
    </div>
  );
}

function TaskbarPage() {
  const s = useStore((st) => st.settings);
  const t = s.taskbar;
  const set = (p: Partial<typeof t>) => setSettings({ taskbar: { ...t, ...p } });
  const [tab, setTab] = useState("Taskbar");
  return (
    <div className="cp-dialog">
      <Tabs tabs={["Taskbar", "Start Menu", "Toolbars"]} value={tab} onChange={setTab} />
      <div className="cp-tabbody">
        {tab === "Taskbar" && (
          <>
            <GroupBox title="Taskbar appearance">
              <div><Check checked={t.lock} onChange={(v) => set({ lock: v })} label="Lock the taskbar" /></div>
              <div><Check checked={t.autohide} onChange={(v) => set({ autohide: v })} label="Auto-hide the taskbar" /></div>
              <div><Check checked={t.small} onChange={(v) => set({ small: v })} label="Use small icons" /></div>
              <p>Taskbar location on screen: <Sel value={t.pos} onChange={(v) => set({ pos: v })} opts={[["bottom", "Bottom"], ["top", "Top"], ["left", "Left"], ["right", "Right"]]} /></p>
              <p>Taskbar buttons: <Sel value={t.combine} onChange={(v) => set({ combine: v })} opts={[["always", "Always combine, hide labels"], ["never", "Never combine"]]} /></p>
            </GroupBox>
            <GroupBox title="Preview desktop with Aero Peek"><Check checked={t.peek} onChange={(v) => set({ peek: v })} label="Use Aero Peek to preview the desktop" /></GroupBox>
          </>
        )}
        {tab === "Start Menu" && <GroupBox title="Start menu"><p>Power button action: Shut down</p><p><Btn onClick={() => setSettings({ recent: [] })}>Clear recent programs list</Btn></p><p><Btn onClick={() => setSettings({ pinned: ["ie", "explorer", "wmp"] })}>Reset pinned taskbar programs</Btn></p></GroupBox>}
        {tab === "Toolbars" && <p className="cp-desc">Select which toolbars to add to the taskbar. (Address, Links and Desktop toolbars are not available in this version.)</p>}
        <GroupBox title="Notification area"><p className="cp-desc">Hidden icons: {s.hiddenTray.length + 3}. Click the ▲ arrow on the taskbar to view them.</p></GroupBox>
      </div>
    </div>
  );
}

function Ease() {
  const s = useStore((st) => st.settings);
  const mag = useStore((st) => st.mag);
  return (
    <div>
      <Head title="Make your computer easier to use" desc="Quick access to common tools" />
      <div className="ease-grid">
        <div onClick={() => { setState({ mag: { on: !mag.on, level: mag.level } }); if (!mag.on) openApp("magnifier"); }}><Icon name="magnifier" size={40} /><b>{mag.on ? "Stop Magnifier" : "Start Magnifier"}</b></div>
        <div onClick={() => setSettings(s.theme === "hc" ? { theme: "aero", wallpaper: "win7" } : { theme: "hc", wallpaper: "blacksolid" })}><Icon name="display" size={40} /><b>{s.theme === "hc" ? "Turn off High Contrast" : "Turn on High Contrast"}</b></div>
        <div onClick={() => setSettings({ highContrastText: !s.highContrastText })}><Icon name="fonts" size={40} /><b>{s.highContrastText ? "Normal text size" : "Make text bigger"}</b></div>
        <div onClick={() => { try { const u = new SpeechSynthesisUtterance("Welcome to Windows 7. Narrator is now reading the screen."); speechSynthesis.speak(u); } catch { msgBox({ title: "Narrator", text: "Speech is not supported in this browser.", icon: "warn" }); } }}><Icon name="sound" size={40} /><b>Start Narrator</b></div>
        <div onClick={() => openApp("cmd")}><Icon name="keyboard" size={40} /><b>Start On-Screen Keyboard</b></div>
      </div>
    </div>
  );
}

function AeroPage() {
  const s = useStore((st) => st.settings);
  const a = s.aero;
  const set = (p: Partial<typeof a>) => setSettings({ aero: { ...a, ...p } });
  return (
    <div>
      <Head title="Change the visuals and sounds on your computer" desc="Windows Aero makes your desktop easier to read and more pleasant to use." />
      <GroupBox title="Aero effects">
        <div><Check checked={s.transparency} onChange={(v) => setSettings({ transparency: v })} label="Enable transparency" /></div>
        <div><Check checked={a.animations} onChange={(v) => set({ animations: v })} label="Animate windows when minimizing and maximizing" /></div>
        <div><Check checked={a.shadows} onChange={(v) => set({ shadows: v })} label="Show shadows under windows" /></div>
        <div><Check checked={a.taskbarAnim} onChange={(v) => set({ taskbarAnim: v })} label="Animate controls and elements inside windows" /></div>
        <div><Check checked={a.smoothScroll} onChange={(v) => set({ smoothScroll: v })} label="Use smooth scrolling for lists" /></div>
        <div><Check checked={s.shake} onChange={(v) => setSettings({ shake: v })} label="Enable Aero Shake (shake a window to minimize the others)" /></div>
        <div><Check checked={s.snapAssist} onChange={(v) => setSettings({ snapAssist: v })} label="Enable Snap Assist after snapping a window" /></div>
      </GroupBox>
      <GroupBox title="Desktop background slideshow">
        <div><Check checked={s.wpShuffle} onChange={(v) => setSettings({ wpShuffle: v })} label="Rotate the desktop background automatically" /></div>
        <p>Change picture every <Sel value={s.wpInterval} onChange={(v) => setSettings({ wpInterval: Number(v) })} opts={[[1, "1 minute"], [5, "5 minutes"], [10, "10 minutes"], [30, "30 minutes"], [60, "1 hour"]]} /></p>
      </GroupBox>
      <GroupBox title="Sound scheme">
        <Sel value={s.soundScheme} onChange={(v) => setSettings({ soundScheme: v })} opts={SCHEMES.map((x) => [x, x]) as [string, string][]} />
      </GroupBox>
      <p><Btn onClick={() => setSettings({ theme: s.theme === "aero" ? "basic" : "aero" })}>Switch to Windows {s.theme === "aero" ? "7 Basic" : "Aero"}</Btn></p>
    </div>
  );
}

function GamesPage() {
  const plays = lsGet<Record<string, number>>("win7.games.plays", {});
  const list: [string, string, string][] = [["solitaire", "Solitaire", "solitaire"], ["spider", "Spider Solitaire", "spider"], ["hearts", "Hearts", "hearts"], ["minesweeper", "Minesweeper", "mines"]];
  return (
    <div>
      <Head title="Games" desc="Play the games that come with Windows 7." />
      {list.map(([id, name, ic]) => (
        <div key={id} className="cp-item" onClick={() => openApp(id)}>
          <Icon name={ic} size={36} />
          <div><a className="cp-cat-t">{name}</a><div className="cp-desc">{plays[id] ? `${plays[id]} time(s) played` : "Never played"}</div></div>
        </div>
      ))}
      <p><Btn onClick={() => openApp("gamecenter")}>Open Games Explorer</Btn></p>
    </div>
  );
}

/* --------------------------------------------------------------- shell */
const COMP: Record<string, (p: { nav: (p: string) => void }) => React.ReactNode> = {
  system: () => <System />, devmgr: () => <DevMgr />, wupdate: () => <WUpdate />, firewall: () => <Firewall />, power: () => <Power />, sound: (p) => <SoundPage nav={p.nav} />,
  personalization: (p) => <Personalization nav={p.nav} />, wallpaper: () => <Wallpaper />, wincolor: () => <WinColor />, screensaver: () => <ScreenSaver />, deskicons: () => <DeskIcons />, display: () => <Display />,
  mouse: () => <Mouse />, keyboard: () => <Keyboard />, datetime: () => <DateTime />, region: () => <Region />, users: () => <Users />, fonts: () => <Fonts />, defaultprogs: () => <DefaultProgs />,
  folderopts: () => <FolderOpts />, inetopts: () => <InetOpts />, programs: () => <Programs />, network: () => <Network />, actioncenter: () => <ActionCenter />, devices: () => <Devices />,
  taskbar: () => <TaskbarPage />, ease: () => <Ease />, mobility: () => <Mobility />, reliability: () => <Reliability />,
  aero: () => <AeroPage />, games: () => <GamesPage />, anytime: () => <AnytimeUpgrade />,
  // these open their own tools, which is what the real Control Panel does
  eventvwr: () => <CPLaunch app="eventvwr" text="Event Viewer shows the System, Application and Security logs. Open it to read the events this PC has recorded." />,
  cleanmgr: () => <CPLaunch app="cleanmgr" text="Disk Cleanup frees space by removing temporary files, thumbnails, crash dumps and the contents of the Recycle Bin." />,
  sysdiag: () => <CPLaunch app="sysdiag" text="System Diagnostics shows the kernel boot log, the drivers that loaded, the services that started, and lets you reproduce a bug check." />,
  features: () => <CPLaunch app="features" text="Turn Windows features on or off, and see everything this simulated PC can do." />,
};

function CPLaunch({ app, text }: { app: string; text: string }) {
  return (
    <div>
      <Head title={ALL_TITLES[app] || app} desc={text} />
      <p><Btn def onClick={() => openApp(app)}>Open {ALL_TITLES[app] || app}</Btn></p>
    </div>
  );
}
const ALL_TITLES = Object.fromEntries([...ALL_ITEMS, "eventvwr", "cleanmgr", "sysdiag", "features"].map((i) => [i, PAGES[i]?.title || i])) as Record<string, string>;

const SIDE: Record<string, [string, string][]> = {
  system: [["Device Manager", "devmgr"], ["Windows Update", "wupdate"], ["Action Center", "actioncenter"], ["Reliability Monitor", "reliability"]],
  personalization: [["Change desktop icons", "deskicons"], ["Change mouse pointers", "mouse"], ["Change your account picture", "users"], ["Change the visuals and sounds", "aero"]],
  display: [["Adjust resolution", "display"], ["Personalization", "personalization"]],
  wupdate: [["Check for updates", "wupdate"], ["Change settings", "wupdate"]],
  sound: [["Manage audio devices", "sound"]],
  reliability: [["Action Center", "actioncenter"], ["Windows Update", "wupdate"]],
  mobility: [["Power Options", "power"], ["Display", "display"]],
};

export function ControlPanel({ win }: { win: Win }) {
  const [hist, setHist] = useState<string[]>([win.props.page || "home"]);
  const [hi, setHi] = useState(0);
  const [mode, setMode] = useState<"cat" | "small">("cat");
  const [q, setQ] = useState("");
  const page = hist[hi];
  const nav = (p: string) => {
    if (p === "gadgets") return openApp("gadgets");
    if (p === page) return;
    const h = [...hist.slice(0, hi + 1), p];
    setHist(h);
    setHi(h.length - 1);
    setQ("");
  };
  useEffect(() => {
    const p = win.props.page || "home";
    if (win.props.nonce && p !== hist[hi]) {
      const h = [...hist.slice(0, hi + 1), p];
      setHist(h);
      setHi(h.length - 1);
    }
  }, [win.props.nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  const cat = CATS.find((c) => c.id === page);
  const def = PAGES[page];
  const title = page === "home" ? "Control Panel" : cat ? cat.title : def?.title || "Control Panel";
  useEffect(() => {
    setWin(win.id, { title });
  }, [title, win.id]);
  const crumbs: [string, string][] = [["Control Panel", "home"]];
  if (cat) crumbs.push([cat.title, cat.id]);
  else if (def) {
    const c = CATS.find((x) => x.id === def.cat)!;
    if (page !== "wallpaper" && page !== "wincolor" && page !== "screensaver" && page !== "deskicons") crumbs.push([c.title, c.id]);
    else crumbs.push([c.title, c.id], ["Personalization", "personalization"]);
    crumbs.push([def.title, page]);
  }
  const Body = COMP[page];
  const results = q.trim() ? ALL_ITEMS.filter((i) => PAGES[i].title.toLowerCase().includes(q.toLowerCase())) : null;
  void view;
  return (
    <div className="cpanel">
      <GlassBar winId={win.id}>
        <div className="ex-navbar">
          <div className="ex-navbtns">
            <button className="navbtn" disabled={hi === 0} onClick={() => setHi(hi - 1)}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 2L4 8l6 6" stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" /></svg></button>
            <button className="navbtn fwd" disabled={hi >= hist.length - 1} onClick={() => setHi(hi + 1)}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 2l6 6-6 6" stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" /></svg></button>
          </div>
          <div className="ex-addr">
            <Icon name="controlpanel" size={16} />
            <div className="ex-crumbs">{crumbs.map(([l, p], i) => <React.Fragment key={p + i}><span className="crumb" onClick={() => nav(p)}>{l}</span><span className="crumb-sep">▸</span></React.Fragment>)}</div>
          </div>
          <div className="ex-search"><input placeholder="Search Control Panel" value={q} onChange={(e) => setQ(e.target.value)} />{q ? <span className="ex-clear" onClick={() => setQ("")}>✕</span> : <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="5.500" cy="5.500" r="4" fill="none" stroke="#5a7aa8" strokeWidth="1.600" /><path d="M8.500 8.500L13 13" stroke="#5a7aa8" strokeWidth="2" /></svg>}</div>
        </div>
      </GlassBar>
      <div className="cp-body">
        <div className="cp-side">
          <div className="cp-side-h">Tasks</div>
          <a onClick={() => nav("home")}>Control Panel Home</a>
          {(SIDE[page] || []).map(([l, p]) => <a key={l} onClick={() => nav(p)}>{l}</a>)}
          <a onClick={() => openApp("help")}>Help and Support</a>
          <div className="cp-side-h" style={{ marginTop: 14 }}>See also</div>
          <a onClick={() => nav("actioncenter")}>Action Center</a>
          <a onClick={() => nav("wupdate")}>Windows Update</a>
          <a onClick={() => nav("system")}>System</a>
        </div>
        <div className="cp-main">
          {results ? (
            <div><Head title={`Search results (${results.length})`} /><div className="cp-small">{results.map((i) => <div key={i} className="cp-sm-it" onClick={() => nav(i)}><Icon name={PAGES[i].icon} size={24} />{PAGES[i].title}</div>)}</div></div>
          ) : page === "home" ? (
            <div>
              <div className="cp-home-h"><b>Adjust your computer&apos;s settings</b><span>View by: <a className={mode === "cat" ? "on" : ""} onClick={() => setMode("cat")}>Category</a> | <a className={mode === "small" ? "on" : ""} onClick={() => setMode("small")}>Small icons</a></span></div>
              {mode === "cat" ? (
                <div className="cp-cats">
                  {CATS.map((c) => (
                    <div key={c.id} className="cp-cat">
                      <div onClick={() => nav(c.id)}><Icon name={c.icon} size={48} /></div>
                      <div><a className="cp-cat-t" onClick={() => nav(c.id)}>{c.title}</a>{c.links.map(([l, p]) => <div key={l}><a onClick={() => nav(p)}>{l}</a></div>)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cp-small">{ALL_ITEMS.map((i) => <div key={i} className="cp-sm-it" onClick={() => nav(i)}><Icon name={PAGES[i].icon} size={24} />{PAGES[i].title}</div>)}</div>
              )}
            </div>
          ) : cat ? (
            <div>
              <Head title={cat.title} />
              {cat.items.map((i) => <div key={i} className="cp-item" onClick={() => nav(i)}><Icon name={PAGES[i].icon} size={36} /><div><a className="cp-cat-t">{PAGES[i].title}</a></div></div>)}
            </div>
          ) : Body ? (
            Body({ nav })
          ) : (
            <p>This page is unavailable.</p>
          )}
        </div>
      </div>
      {void nodeIcon}
    </div>
  );
}
