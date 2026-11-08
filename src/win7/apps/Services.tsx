"use client";
/**
 * Services (services.msc) and System Configuration (msconfig).
 *
 * Both are real managers, not mock-ups: changing a service's state here changes
 * what the shell can do (Themes off → Windows 7 Basic, Audio off → silence),
 * writes Service Control Manager events to the Windows Event Log, and the
 * startup list decides what comes up with the next login.
 */
import React, { useState } from "react";
import { Win, getState, openApp, setWin, closeWin, notify, MenuItem, setSettings } from "../store";
import { MenuBar, Btn, Tabs, Check } from "../ui";
import { Icon } from "../icons";
import {
  SERVICE_DEFS, isMicrosoft, services, startService, stopService, restartService, setStartType,
  STARTUP_ITEMS, startupState, setStartup, type StartType,
} from "../services";
import { playSys } from "../sound";

/* =============================================================== Services */
export function Services({ win }: { win: Win }) {
  const [, force] = useState(0);
  const [sel, setSel] = useState<string>("AudioSrv");
  const [tab, setTab] = useState("Extended");
  const st = services();
  const svc = SERVICE_DEFS.find((d) => d.key === sel)!;
  const cur = st[sel];
  const rerender = () => force((n) => n + 1);

  const act = (fn: () => boolean) => {
    const ok = fn();
    rerender();
    if (ok) playSys("ding");
  };
  const setType = (type: StartType) => { setStartType(sel, type); rerender(); };

  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Export List...", onClick: () => notify({ title: "Services", text: "The list of services was exported.", icon: "info" }) }, { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }] },
    { label: "Action", items: () => [
      { label: "Start", disabled: cur.running, onClick: () => act(() => startService(sel)) },
      { label: "Stop", disabled: !cur.running, onClick: () => act(() => stopService(sel)) },
      { label: "Restart", disabled: !cur.running, onClick: () => { restartService(sel); rerender(); } },
      { sep: true },
      { label: "Properties", onClick: () => notify({ title: svc.display, text: `${svc.desc}\n\nStart type: ${cur.start}\nStatus: ${cur.running ? "Started" : "Stopped"}`, icon: "info" }) },
      { sep: true },
      { label: "Refresh", onClick: rerender },
      { label: "Help", onClick: () => openApp("help") },
    ] },
    { label: "View", items: () => [{ label: "Extended", radio: true, checked: tab === "Extended", onClick: () => setTab("Extended") }, { label: "Standard", radio: true, checked: tab === "Standard", onClick: () => setTab("Standard") }] },
  ];

  return (
    <div className="svc">
      <MenuBar menus={menus} />
      <div className="svc-body">
        <div className="svc-left">
          <div className="svc-tree-h"><Icon name="computer" size={14} /> Services (Local)</div>
          <div className="svc-table">
            <div className="svc-th"><span style={{ width: 200 }}>Name</span><span style={{ width: 120 }}>Status</span><span style={{ width: 170 }}>Startup Type</span><span style={{ flex: 1 }}>Log On As</span></div>
            {SERVICE_DEFS.map((d) => {
              const s = st[d.key];
              return (
                <div key={d.key} className={"svc-tr" + (sel === d.key ? " sel" : "")} onClick={() => setSel(d.key)} onDoubleClick={() => (s.running ? stopService(d.key) : startService(d.key)) || rerender()}>
                  <span style={{ width: 200 }}>{d.display}</span>
                  <span style={{ width: 120, color: s.running ? "#1a7a2e" : "#555" }}>{s.running ? "Started" : ""}</span>
                  <span style={{ width: 170 }}>{s.start}</span>
                  <span style={{ flex: 1 }}>{["LocalSystem", "NT AUTHORITY\\LocalService", "NT AUTHORITY\\NetworkService"][d.key.length % 3]}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="svc-side">
          <b>{svc.display}</b>
          <p>{svc.desc}</p>
          <div className="svc-btns">
            <Btn disabled={cur.running} onClick={() => act(() => startService(sel))}>Start</Btn>
            <Btn disabled={!cur.running} onClick={() => act(() => stopService(sel))}>Stop</Btn>
            <Btn disabled={!cur.running} onClick={() => { restartService(sel); rerender(); }}>Restart</Btn>
          </div>
          <dl className="svc-dl">
            <dt>Service name</dt><dd>{svc.key}</dd>
            <dt>Display name</dt><dd>{svc.display}</dd>
            <dt>Startup type</dt>
            <dd>
              <select className="w7sel" value={cur.start} onChange={(e) => setType(e.target.value as StartType)}>
                <option>Automatic</option>
                <option>Automatic (Delayed Start)</option>
                <option>Manual</option>
                <option>Disabled</option>
              </select>
            </dd>
            <dt>Log On As</dt><dd>Local System account</dd>
            <dt>Depends on</dt><dd>{svc.depends.length ? svc.depends.join(", ") : "—"}</dd>
          </dl>
          <p className="cp-desc">Stopping Themes switches the desktop to Windows 7 Basic; stopping Windows Audio silences the sound scheme. Changes are written to the Event Log as Service Control Manager 7036.</p>
        </div>
      </div>
      <div className="svc-status">{SERVICE_DEFS.length} services · {Object.values(st).filter((s) => s.running).length} running · {cur.running ? "Extended / Standard" : "Standard"}</div>
      {void setWin}
    </div>
  );
}

/* =============================================================== msconfig */
export function MsConfig({ win }: { win: Win }) {
  const [tab, setTab] = useState("General");
  const [boot, setBoot] = useState(() => ({
    safe: getState().safeMode,
    bootlog: false,
    nogui: false,
    basevideo: false,
    timeout: 30,
  }));
  const [startup, setStartupState] = useState(startupState);
  const [hideMs, setHideMs] = useState(true);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const apply = () => {
    for (const item of STARTUP_ITEMS) setStartup(item.key, startup[item.key]);
    notify({ title: "System Configuration", text: "You may need to restart your computer for the changes to take effect.", icon: "info" });
  };

  return (
    <div className="msc">
      <MenuBar menus={[{ label: "File", items: () => [{ label: "Exit", onClick: () => closeWin(win.id) }] }, { label: "Help", items: () => [{ label: "About System Configuration", onClick: () => openApp("winver") }] }]} />
      <Tabs tabs={["General", "Boot", "Services", "Startup", "Tools"]} value={tab} onChange={setTab} />
      <div className="msc-body">
        {tab === "General" && (
          <div>
            <p><b>Startup selection</b></p>
            {[
              ["Normal startup", "Load all device drivers and services", false],
              ["Diagnostic startup", "Load basic devices and services only", true],
              ["Selective startup", "Choose which services and startup programs start", false],
            ].map(([label, desc]) => (
              <label key={String(label)} className="msc-radio">
                <input type="radio" name="msc-start" defaultChecked={label === "Normal startup"} onChange={() => { if (label === "Diagnostic startup") { setSettings({ theme: "basic" }); } }} />
                <span><b>{label}</b><em>{desc}</em></span>
              </label>
            ))}
          </div>
        )}
        {tab === "Boot" && (
          <div className="msc-boot">
            <table className="msc-table"><thead><tr><th>Boot Option</th><th>Value</th></tr></thead><tbody>
              <tr><td>Timeout</td><td><input className="w7input" style={{ width: 60 }} value={boot.timeout} onChange={(e) => setBoot({ ...boot, timeout: Number(e.target.value) || 0 })} /> seconds</td></tr>
              <tr><td>OS boot information (bootlog)</td><td><input type="checkbox" checked={boot.bootlog} onChange={(e) => setBoot({ ...boot, bootlog: e.target.checked })} /></td></tr>
              <tr><td>No GUI boot</td><td><input type="checkbox" checked={boot.nogui} onChange={(e) => setBoot({ ...boot, nogui: e.target.checked })} /></td></tr>
              <tr><td>Base video</td><td><input type="checkbox" checked={boot.basevideo} onChange={(e) => setBoot({ ...boot, basevideo: e.target.checked })} /></td></tr>
              <tr><td>Safe boot</td><td><input type="checkbox" checked={boot.safe} onChange={(e) => setBoot({ ...boot, safe: e.target.checked })} /></td></tr>
            </tbody></table>
            <p className="cp-desc">Safe boot loads only the boot-start drivers and Windows 7 Basic. It is applied on the next restart, exactly like the real Boot tab.</p>
            <Btn onClick={() => { import("../store").then((m) => m.setState({ safeMode: boot.safe, brokenDriver: null })); notify({ title: "System Configuration", text: "The boot options will apply the next time you restart.", icon: "info" }); }}>Apply</Btn>
          </div>
        )}
        {tab === "Services" && (
          <div className="msc-svc">
            <div className="msc-svc-bar">
              <label><input type="checkbox" checked={hideMs} onChange={(e) => setHideMs(e.target.checked)} /> Hide all Microsoft services</label>
              <span style={{ flex: 1 }} />
              <span className="cp-desc">{SERVICE_DEFS.filter((d) => services()[d.key].start !== "Disabled").length} enabled</span>
              <Btn onClick={() => { SERVICE_DEFS.forEach((d) => setStartType(d.key, d.start)); rerender(); }}>Enable all</Btn>
              <Btn onClick={() => { SERVICE_DEFS.forEach((d) => setStartType(d.key, "Disabled")); rerender(); }}>Disable all</Btn>
            </div>
            <div className="msc-list">
              {SERVICE_DEFS.filter((d) => !hideMs || !isMicrosoft(d)).map((d) => {
                const s = services()[d.key];
                return (
                  <div key={d.key} className="msc-row">
                    <span style={{ width: 24 }}><input type="checkbox" checked={s.start !== "Disabled"} onChange={(e) => { setStartType(d.key, e.target.checked ? d.start : "Disabled"); rerender(); }} /></span>
                    <span style={{ width: 230 }}>{d.display}</span>
                    <span style={{ width: 150 }}>{d.start}</span>
                    <span style={{ width: 90 }} className={s.running ? "msc-on" : "msc-off"}>{s.running ? "Running" : "Stopped"}</span>
                    <span className="msc-vendor">{d.vendor || "Microsoft Corporation"}</span>
                  </div>
                );
              })}
            </div>
            <p className="cp-desc">Clearing a box sets the service to Disabled, exactly as msconfig does; services that are stopped here start again after the next restart. The Themes and Windows Audio services also change the desktop appearance when they stop.</p>
          </div>
        )}
        {tab === "Startup" && (
          <div>
            <div className="msc-table">
              <div className="msc-head"><span style={{ width: 40 }} /><span style={{ width: 180 }}>Startup Item</span><span style={{ width: 180 }}>Manufacturer</span><span style={{ flex: 1 }}>Command</span><span style={{ width: 60 }}>Location</span></div>
              {STARTUP_ITEMS.map((i) => (
                <div key={i.key} className="msc-row">
                  <span style={{ width: 40 }}><input type="checkbox" checked={startup[i.key]} onChange={(e) => { setStartupState({ ...startup, [i.key]: e.target.checked }); }} /></span>
                  <span style={{ width: 180 }}>{i.name}</span>
                  <span style={{ width: 180 }}>{i.publisher}</span>
                  <span style={{ flex: 1 }} className="msc-cmd">{i.command}</span>
                  <span style={{ width: 60 }}>{i.hk}</span>
                </div>
              ))}
            </div>
            <p className="cp-desc">Disabling an item stops it starting with the next login. Windows Sidebar is the gadget platform, so turning it off leaves the gadgets on the desktop but stops them updating at login.</p>
          </div>
        )}
        {tab === "Tools" && (
          <div className="msc-tools">
            {[
              ["About Windows", "winver"], ["Change UAC settings", ""], ["Command Prompt", "cmd"], ["Event Viewer", "eventvwr"],
              ["Registry Editor", "regedit"], ["System Information", "sysdiag"], ["Task Manager", "taskmgr"], ["Windows Features", "features"],
            ].map(([label, app]) => (
              <div key={label} className="msc-tool">
                <span>{label}</span>
                <Btn onClick={() => (app ? openApp(app) : import("../store").then((m) => m.openCP("users")))}>Launch</Btn>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="msc-foot">
        <span className="cp-desc">System Configuration · {SERVICE_DEFS.length} services · {STARTUP_ITEMS.filter((i) => startup[i.key]).length} startup items</span>
        <span style={{ flex: 1 }} />
        <Btn def onClick={apply}>OK</Btn>
        <Btn onClick={() => closeWin(win.id)}>Cancel</Btn>
      </div>
      {void rerender}
    </div>
  );
}
