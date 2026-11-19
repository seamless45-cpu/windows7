"use client";
/**
 * Windows Features — the Control Panel list of optional features, plus a
 * directory of the Windows 7 capabilities this simulation implements, with the
 * shortcut to each one so they can be found.
 */
import React, { useMemo, useState } from "react";
import { Win, openApp, openCP, setSettings, notify, lsGet, lsSet } from "../store";
import { Btn, Check } from "../ui";
import { Icon } from "../icons";

interface Feature { name: string; on: boolean; desc: string; group: string; optional?: boolean }

const FEATURES: Feature[] = [
  { name: "Windows Search", on: true, desc: "Indexes files and e-mail so searching is fast.", group: "Windows Search" },
  { name: "Internet Explorer 8", on: true, desc: "The web browser included with Windows 7.", group: "Programs" },
  { name: "Windows Media Player", on: true, desc: "Play music, videos and Internet radio.", group: "Programs" },
  { name: "Windows DVD Maker", on: true, desc: "Create DVD slide shows with your photos and videos.", group: "Programs" },
  { name: "Windows Journal", on: true, desc: "Take handwritten notes on a tablet PC.", group: "Programs" },
  { name: "XPS Viewer", on: true, desc: "View and sign XPS documents.", group: "Programs" },
  { name: "Games", on: true, desc: "Solitaire, Spider Solitaire, Hearts, Minesweeper, FreeCell, Mahjong Titans, Chess Titans and Purble Place.", group: "Programs" },
  { name: "Windows Gadget Platform", on: true, desc: "Clock, Calendar, CPU Meter, Weather, Slideshow, Picture Puzzle and Feed Headlines.", group: "Programs" },
  { name: "Snipping Tool", on: true, desc: "Capture a snip of your screen.", group: "Programs" },
  { name: "Windows Firewall", on: true, desc: "Block unauthorised traffic on networks.", group: "System" },
  { name: "Windows Defender", on: true, desc: "Scan for spyware and unwanted software.", group: "System" },
  { name: "BitLocker Drive Encryption", on: false, desc: "Encrypt your hard drive (requires TPM).", group: "System", optional: true },
  { name: "Telnet Client", on: false, desc: "Command-line Telnet client.", group: "System", optional: true },
  { name: "Windows PowerShell", on: true, desc: "A task automation framework. Open it from Run → powershell.", group: "System" },
  { name: "Remote Assistance", on: true, desc: "Offer or receive help over the network.", group: "System" },
  { name: "HomeGroup", on: false, desc: "Share libraries and printers with a home network.", group: "Network", optional: true },
];

/** Everything the simulated Windows 7 can do, with the way to reach it. */
const CAPABILITIES: { name: string; icon: string; where: string; go?: () => void; note?: string }[] = [
  { name: "Aero Peek, Snap, Shake and Flip 3D", icon: "gadgets", where: "Taskbar / Win+Tab / drag a window to an edge", note: "Hover the far-right sliver for Peek; shake a window to minimise the others." },
  { name: "Jump Lists and live thumbnails", icon: "explorer", where: "Right-click (or hover) a taskbar button" },
  { name: "Start menu search", icon: "search", where: "Start → Search programs and files" },
  { name: "Libraries", icon: "docs", where: "Explorer → Documents / Pictures / Music libraries" },
  { name: "Aero themes, colours and glass", icon: "controlpanel", where: "Control Panel → Personalization", go: () => openCP("personalization") },
  { name: "Photo and video wallpapers", icon: "photos", where: "Control Panel → Personalization → Desktop Background", go: () => openCP("desktop") },
  { name: "Sound schemes (14 of them)", icon: "sound", where: "Control Panel → Sound → Sounds", go: () => openCP("sound") },
  { name: "Gadgets", icon: "gadget", where: "Right-click the desktop → Gadgets", go: () => openApp("gadgets") },
  { name: "Task Manager", icon: "taskmgr", where: "Ctrl+Shift+Esc or the taskbar menu", go: () => openApp("taskmgr") },
  { name: "Event Viewer", icon: "history", where: "Run → eventvwr", go: () => openApp("eventvwr") },
  { name: "Disk Cleanup", icon: "drive", where: "Run → cleanmgr", go: () => openApp("cleanmgr") },
  { name: "Registry Editor", icon: "cmd", where: "Run → regedit", go: () => openApp("regedit") },
  { name: "Services and System Configuration", icon: "services", where: "Run → services.msc / msconfig", go: () => openApp("services") },
  { name: "Task Scheduler", icon: "tasksched", where: "Run → taskschd.msc", go: () => openApp("tasksched") },
  { name: "Resource Monitor", icon: "resmon", where: "Run → resmon", go: () => openApp("resmon") },
  { name: "Computer Management and Device Manager", icon: "cmg", where: "Run → compmgmt.msc / devmgmt.msc", go: () => openApp("compmgmt") },
  { name: "Disk Management", icon: "diskmgmt", where: "Run → diskmgmt.msc", go: () => openApp("diskmgmt") },
  { name: "Windows PowerShell", icon: "powershell", where: "Run → powershell", go: () => openApp("powershell") },
  { name: "System Restore", icon: "sysrestore", where: "Run → rstrui", go: () => openApp("sysrestore") },
  { name: "Windows Defender", icon: "defender", where: "Run → MSASCui / Control Panel → System and Security", go: () => openApp("defender") },
  { name: "Calendar and Local Users and Groups", icon: "calendar", where: "Run → calendar / lusrmgr.msc", go: () => openApp("calendar") },
  { name: "On-Screen Keyboard, Narrator, Steps Recorder, Math Input Panel", icon: "osk", where: "Accessories → Ease of Access / Control Panel → Ease of Access", go: () => openApp("osk") },
  { name: "Kernel boot log, drivers and bug checks", icon: "taskmgr", where: "Run → sysdiag", go: () => openApp("sysdiag") },
  { name: "User Account Control", icon: "shield", where: "Control Panel → User Accounts" },
  { name: "Recycle Bin with restore", icon: "recycle", where: "Desktop → Recycle Bin" },
  { name: "Snipping Tool", icon: "snip", where: "Start → All Programs → Accessories", go: () => openApp("snip") },
  { name: "Sticky Notes", icon: "sticky2", where: "Start → All Programs → Accessories", go: () => openApp("sticky2") },
  { name: "Windows Media Player", icon: "wmp", where: "Start → Windows Media Player", go: () => openApp("wmp") },
  { name: "Paint, WordPad, Notepad, Calculator", icon: "paint", where: "Start → All Programs → Accessories" },
  { name: "Games: FreeCell, Mahjong, Chess Titans, Purble Place", icon: "freecell", where: "Start → Games", go: () => openApp("gamecenter") },
  { name: "Screensavers, pointers and high contrast", icon: "display", where: "Control Panel → Personalization" },
  { name: "RTF documents and PNG pictures", icon: "wordpad", where: "WordPad / Paint → Save as", go: () => openApp("wordpad") },
  { name: "Console MODE and COLOR", icon: "cmd", where: "Command Prompt → MODE CON: COLS=120 LINES=40", go: () => openApp("cmd") },
  { name: "Gadget options (time zone, slide show, weather, feeds)", icon: "gadgets", where: "Right-click a desktop gadget → Options", go: () => openApp("gadgets") },
];

export function WindowsFeatures({ win }: { win: Win }) {
  const [state, setState] = useState<Record<string, boolean>>(() => lsGet("win7.features", Object.fromEntries(FEATURES.map((f) => [f.name, f.on]))));
  const [sel, setSel] = useState<string | null>("Windows Search");
  const [tab, setTab] = useState<"features" | "wins">("features");
  const groups = useMemo(() => [...new Set(FEATURES.map((f) => f.group))], []);
  const cur = FEATURES.find((f) => f.name === sel);

  const toggle = (name: string) => setState((s) => ({ ...s, [name]: !s[name] }));

  const apply = () => {
    lsSet("win7.features", state);
    // turning Themes or Windows Search off really changes the shell
    const searchOff = state["Windows Search"] === false;
    if (searchOff) notify({ title: "Windows Features", text: "Windows Search is now off. Start-menu search results will be limited.", icon: "info" });

    notify({ title: "Windows Features", text: "Windows completed the requested changes.", icon: "info" });
  };

  return (
    <div className="feat">
      <div className="feat-head">
        <Icon name="programs" size={36} />
        <div>
          <b>Turn Windows features on or off</b>
          <p>To turn a feature on, select its check box. To turn it off, clear its check box.</p>
        </div>
        <span style={{ flex: 1 }} />
        <div className="feat-tabs">
          <button className={"feat-tab" + (tab === "features" ? " on" : "")} onClick={() => setTab("features")}>Windows features</button>
          <button className={"feat-tab" + (tab === "wins" ? " on" : "")} onClick={() => setTab("wins")}>What this PC can do</button>
        </div>
      </div>
      {tab === "features" ? (
        <div className="feat-body">
          <div className="feat-list">
            {groups.map((g) => (
              <div key={g}>
                <div className="feat-group">{g}</div>
                {FEATURES.filter((f) => f.group === g).map((f) => (
                  <div key={f.name} className={"feat-row" + (sel === f.name ? " sel" : "")} onClick={() => setSel(f.name)}>
                    <Check checked={!!state[f.name]} onChange={() => toggle(f.name)} label="" />
                    <span>{f.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="feat-side">
            <Icon name="info" size={28} />
            <b>{cur?.name}</b>
            <p>{cur?.desc}</p>
            {cur?.optional && <p className="cp-desc">This feature is not part of the base installation.</p>}
            <Btn def onClick={apply}>OK</Btn>
            <Btn onClick={() => win && openApp("help")}>Help</Btn>
          </div>
        </div>
      ) : (
        <div className="feat-body one">
          <div className="feat-wins">
            {CAPABILITIES.map((c) => (
              <div key={c.name} className="feat-cap">
                <Icon name={c.icon} size={28} />
                <div>
                  <b>{c.name}</b>
                  <p>{c.where}</p>
                  {c.note && <p className="cp-desc">{c.note}</p>}
                </div>
                {c.go && <button className="feat-go" onClick={c.go}>Open</button>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="feat-foot">
        <span className="cp-desc">Windows 7 Ultimate · build 7601 · {Object.values(state).filter(Boolean).length} features enabled</span>
        <span style={{ flex: 1 }} />
        {tab === "features" && <><Btn def onClick={apply}>OK</Btn><Btn onClick={() => setState(Object.fromEntries(FEATURES.map((f) => [f.name, f.on])))}>Cancel</Btn></>}
      </div>
    </div>
  );
}
