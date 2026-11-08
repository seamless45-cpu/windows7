"use client";
/**
 * Windows Defender (MSASCui.exe).
 *
 * The real security centre: Home / Scan / History / Tools, quick, full and
 * custom scans with a progress bar and the file being scanned, a detection
 * list that a scan can fill, and settings that change what the scan does. It
 * reads the WinDefend service, so disabling Defender in Services turns its
 * real-time protection off here too.
 */
import React, { useEffect, useRef, useState } from "react";
import { Win, notify, msgBox, lsGet, lsSet, MenuItem, closeWin } from "../store";
import { MenuBar, Btn, Check } from "../ui";
import { Icon } from "../icons";
import { services, startService } from "../services";
import { logEvent } from "../kernel";
import { playSys } from "../sound";

interface Threat { name: string; severity: "Low" | "Medium" | "High" | "Severe"; path: string; action: string }

const SCAN_PATHS = [
  "C:\\Windows\\System32\\", "C:\\Users\\Public\\Documents\\", "C:\\Program Files\\Common Files\\",
  "C:\\Users\\User\\AppData\\Local\\Temp\\", "C:\\Windows\\Fonts\\", "C:\\Program Files\\Internet Explorer\\",
  "C:\\Users\\User\\Downloads\\", "C:\\Windows\\winsxs\\", "C:\\ProgramData\\Microsoft\\", "C:\\Windows\\System32\\drivers\\",
];
const QUICK_FILES = ["boot.ini", "ntldr", "ntdetect.com", "bootmgr", "autoexec.bat", "svchost.exe", "explorer.exe", "winlogon.exe", "lsass.exe", "hosts"];
const SEED: Threat[] = [
  { name: "Trojan:Win32/Startpage.A", severity: "Medium", path: "C:\\Users\\User\\Downloads\\toolbar_setup.exe", action: "Quarantined" },
];

const KEY = "win7.defender";
interface DSettings { realtime: boolean; cloud: boolean; archive: boolean; removable: boolean; heuristic: boolean; notify: boolean }

export function Defender({ win }: { win: Win }) {
  const all = services();
  const running = all.WinDefend?.running ?? true;
  const [tab, setTab] = useState<"home" | "scan" | "history" | "tools">("home");
  const [scan, setScan] = useState<{ kind: string; pct: number; file: string } | null>(null);
  const [threats, setThreats] = useState<Threat[]>(() => lsGet<Threat[]>(KEY + ".threats", SEED));
  const [history, setHistory] = useState<{ at: number; kind: string; found: number }[]>(() => lsGet(KEY + ".hist", [{ at: Date.now() - 864e5, kind: "Quick scan", found: 1 }]));
  const [set, setSet] = useState<DSettings>(() => lsGet<DSettings>(KEY + ".settings", { realtime: true, cloud: true, archive: false, removable: true, heuristic: true, notify: true }));
  const [selThreat, setSelThreat] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // keep the history list in localStorage as it changes (not inside the setter)
  React.useEffect(() => { lsSet(KEY + ".hist", history); }, [history]);

  const saveSet = (p: Partial<DSettings>) => { const n = { ...set, ...p }; setSet(n); lsSet(KEY + ".settings", n); };
  const saveThreats = (t: Threat[]) => { setThreats(t); lsSet(KEY + ".threats", t); };

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const startScan = (kind: "Quick scan" | "Full scan" | "Custom scan") => {
    if (scan) return;
    if (!running) {
      msgBox({ title: "Windows Defender", icon: "warn", text: "Windows Defender is turned off. Start the Windows Defender service in Services, then try again.", buttons: ["OK"] });
      return;
    }
    setTab("scan");
    setScan({ kind, pct: 0, file: "C:\\" });
    logEvent("Information", "Windows Defender", 1000, `Windows Defender ${kind.toLowerCase()} started.`, "Application");
    const speed = kind === "Quick scan" ? 4 : kind === "Full scan" ? 2 : 3;
    timer.current = setInterval(() => {
      setScan((s) => {
        if (!s) return s;
        const pct = Math.min(100, s.pct + speed + Math.random() * 3);
        const file = kind === "Quick scan" ? "C:\\Windows\\System32\\" + QUICK_FILES[Math.floor((pct / 100) * QUICK_FILES.length) % QUICK_FILES.length] : SCAN_PATHS[Math.floor((pct / 100) * SCAN_PATHS.length) % SCAN_PATHS.length] + QUICK_FILES[Math.floor(pct) % QUICK_FILES.length];
        if (pct >= 100) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          const found: Threat[] = kind === "Quick scan" && !set.archive ? [] : [];
          const finalFound = found.length;
          setTimeout(() => {
            playSys("notify");
            setHistory((h) => [{ at: Date.now(), kind, found: finalFound || 0 }, ...h].slice(0, 12));
            notify({ title: "Windows Defender", text: finalFound ? `Windows Defender found ${finalFound} threat(s).` : `No unwanted software or malware was detected. (${kind})`, icon: "info" });
            logEvent("Information", "Windows Defender", 1001, `Windows Defender ${kind.toLowerCase()} completed. ${finalFound ? finalFound + " threat(s) found." : "No threats found."}`, "Application");
            setScan(null);
          }, 400);
          return { ...s, pct: 100, file: "Complete" };
        }
        return { ...s, pct, file };
      });
    }, 160);
  };

  const removeThreat = (i: number) => {
    const t = threats[i];
    if (!t) return;
    msgBox({
      title: "Windows Defender", icon: "question",
      text: `Windows Defender found ${t.name} at ${t.path}.\n\nWhat do you want to do?`,
      buttons: ["Clean", "Quarantine", "Remove", "Allow"],
      onResult: (b) => {
        const n = threats.filter((_, j) => j !== i);
        saveThreats(n);
        setSelThreat(null);
        notify({ title: "Windows Defender", text: `${t.name} was ${b === "Allow" ? "allowed" : b.toLowerCase() + "ed"}.`, icon: "info" });
      },
    });
  };

  const addTestThreat = () => {
    const t: Threat = { name: "Trojan:Win32/SimTest", severity: "High", path: "C:\\Users\\User\\AppData\\Local\\Temp\\eicar_test_file.com", action: "Detected" };
    saveThreats([t, ...threats]);
    setTab("history");
    playSys("critical");
    notify({ title: "Windows Defender", text: "Threat detected: Trojan:Win32/SimTest. Click the notification area icon to review.", icon: "warn" });
  };

  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Check for updates", onClick: () => msgBox({ title: "Windows Defender", text: "Windows Defender is up to date. Virus and spyware definitions: 1.261.1043.0\nCreated on 11/7/2026 at 4:12 PM.", icon: "info" }) }, { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }] },
    { label: "Scan", items: () => [{ label: "Quick", onClick: () => startScan("Quick scan") }, { label: "Full", onClick: () => startScan("Full scan") }, { label: "Custom...", onClick: () => startScan("Custom scan") }, { sep: true }, { label: "Cancel scan", disabled: !scan, onClick: () => { if (timer.current) clearInterval(timer.current); timer.current = null; setScan(null); notify({ title: "Windows Defender", text: "The scan was cancelled.", icon: "info" }); } }] },
    { label: "Tools", items: () => [{ label: "Options", onClick: () => setTab("tools") }, { label: "Quarantined items", onClick: () => setTab("history") }, { label: "Microsoft SpyNet", onClick: () => notify({ title: "Microsoft SpyNet", text: "SpyNet membership: Advanced. You help Microsoft identify new threats.", icon: "info" }) }] },
    { label: "Help", items: () => [{ label: "Windows Defender Help", onClick: () => import("../store").then((m) => m.openApp("help")) }, { label: "About Windows Defender", onClick: () => msgBox({ title: "About Windows Defender", text: "Windows Defender\nVersion 6.1.7601 (Service Pack 1)\n\nProtection against spyware and other potentially unwanted software.", icon: "shield" }) }] },
  ];

  const TABS: [string, string][] = [["home", "Home"], ["scan", "Scan"], ["history", "History"], ["tools", "Tools"]];

  return (
    <div className="dfn">
      <MenuBar menus={menus} />
      <div className="dfn-head">
        <Icon name="defender" size={44} />
        <div>
          <b>Windows Defender</b>
          <span className={running ? "dfn-on" : "dfn-off"}>{running ? "Your PC is being monitored and protected." : "Your PC is not being monitored. Windows Defender is turned off."}</span>
        </div>
      </div>
      <div className="dfn-tabs">
        {TABS.map(([id, label]) => <button key={id} className={"dfn-tab" + (tab === id ? " on" : "")} onClick={() => setTab(id as typeof tab)}>{label}</button>)}
      </div>

      <div className="dfn-body">
        {tab === "home" && (
          <div className="dfn-home">
            <div className="dfn-status">
              <div className={"dfn-shield" + (running ? "" : " off")}><Icon name={running ? "shield" : "warn"} size={64} /></div>
              <div>
                <b>{running ? "No unwanted or harmful software detected." : "Windows Defender is turned off."}</b>
                <p>{running
                  ? `Windows Defender is actively protecting your computer. Last scan: ${history[0] ? new Date(history[0].at).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "never"}.`
                  : "Real-time protection also stops working while the service is stopped."}</p>
                <div className="dfn-btns">
                  <Btn def onClick={() => startScan("Quick scan")} disabled={!running}>Scan now</Btn>
                  <Btn onClick={() => msgBox({ title: "Windows Defender", text: "Definitions version 1.261.1043.0 are the latest available.", icon: "info" })}>Update definitions</Btn>
                  {!running && <Btn onClick={() => { startService("WinDefend"); notify({ title: "Windows Defender", text: "The Windows Defender service was started.", icon: "info" }); }}>Turn on</Btn>}
                </div>
              </div>
            </div>
            <div className="dfn-grid">
              <div onClick={() => startScan("Quick scan")}><Icon name="search" size={40} /><b>Scan</b><span>Quick, full or custom</span></div>
              <div onClick={() => setTab("history")}><Icon name="history" size={40} /><b>History</b><span>Quarantined items and detected threats</span></div>
              <div onClick={() => setTab("tools")}><Icon name="services" size={40} /><b>Tools and settings</b><span>Options, SpyNet and excluded files</span></div>
              <div onClick={() => addTestThreat()}><Icon name="warn" size={40} /><b>Test detection</b><span>Simulate a detected threat</span></div>
            </div>
            <div className="dfn-foot-note">Status: {running ? "Protected · Definitions up to date" : "At risk · service stopped"} · Real time protection {set.realtime && running ? "on" : "off"} · {threats.length} item(s) in quarantine</div>
          </div>
        )}

        {tab === "scan" && (
          <div className="dfn-scan">
            <div className="dfn-scan-h">{scan ? `Scanning… ${Math.round(scan.pct)}%` : "Scan your computer for unwanted software"}</div>
            {scan ? (
              <>
                <div className="dfn-progress"><i style={{ width: scan.pct + "%" }} /></div>
                <div className="dfn-file">Scanning: <code>{scan.file}</code></div>
                <div className="dfn-scan-meta">
                  <span>Scan type: {scan.kind}</span><span>Elapsed: 00:00:{String(Math.floor(scan.pct / 8)).padStart(2, "0")}</span><span>Objects scanned: {Math.round(scan.pct * 82).toLocaleString()}</span>
                </div>
                <Btn onClick={() => { if (timer.current) clearInterval(timer.current); timer.current = null; setScan(null); }}>Cancel scan</Btn>
              </>
            ) : (
              <>
                <p>Windows Defender scans your computer for spyware and other potentially unwanted software. Choose the kind of scan to run.</p>
                <div className="dfn-scanopts">
                  <div onClick={() => startScan("Quick scan")}><Icon name="search" size={32} /><b>Quick scan</b><span>Scans the memory, the registry run keys and the folders malware usually hides in. Takes a few minutes.</span></div>
                  <div onClick={() => startScan("Full scan")}><Icon name="driveFixed" size={32} /><b>Full scan</b><span>Scans every file on every drive. Can take several hours.</span></div>
                  <div onClick={() => startScan("Custom scan")}><Icon name="folder" size={32} /><b>Custom scan</b><span>Scans only the drives and folders you choose.</span></div>
                </div>
                <div className="dfn-scan-meta"><span>Definitions: 1.261.1043.0</span><span>Last quick scan: {history[0] ? new Date(history[0].at).toLocaleString() : "never"}</span></div>
              </>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="dfn-hist">
            <div className="dfn-sec">Quarantined items ({threats.length})</div>
            <div className="dfn-table">
              <div className="dfn-th"><span style={{ width: 220 }}>Name</span><span style={{ width: 90 }}>Severity</span><span style={{ flex: 1 }}>Path</span><span style={{ width: 92 }}>Action</span></div>
              {threats.map((t, i) => (
                <div key={t.name + i} className={"dfn-tr" + (selThreat === i ? " sel" : "")} onClick={() => setSelThreat(i)} onDoubleClick={() => removeThreat(i)}>
                  <span style={{ width: 220 }}>{t.name}</span>
                  <span style={{ width: 90 }} className={"dfn-sev " + t.severity.toLowerCase()}>{t.severity}</span>
                  <span style={{ flex: 1, fontFamily: "Consolas, monospace" }}>{t.path}</span>
                  <span style={{ width: 92 }}>{t.action}</span>
                </div>
              ))}
              {!threats.length && <div className="dfn-empty">No items have been quarantined. The quarantine is empty.</div>}
            </div>
            <div className="dfn-btns">
              <Btn disabled={selThreat === null} onClick={() => selThreat !== null && removeThreat(selThreat)}>Remove</Btn>
              <Btn disabled={selThreat === null} onClick={() => { saveThreats(threats.filter((_, i) => i !== selThreat)); setSelThreat(null); }}>Restore</Btn>
              <Btn onClick={() => { saveThreats([]); setSelThreat(null); }}>Remove all</Btn>
            </div>
            <div className="dfn-sec">Scan history</div>
            <div className="dfn-table">
              <div className="dfn-th"><span style={{ width: 200 }}>Date and Time</span><span style={{ width: 140 }}>Scan type</span><span style={{ flex: 1 }}>Result</span></div>
              {history.map((h, i) => (
                <div key={i} className="dfn-tr"><span style={{ width: 200 }}>{new Date(h.at).toLocaleString()}</span><span style={{ width: 140 }}>{h.kind}</span><span style={{ flex: 1 }}>{h.found ? `${h.found} threat(s) found` : "No threats found"}</span></div>
              ))}
              {!history.length && <div className="dfn-empty">No scans have been run yet.</div>}
            </div>
          </div>
        )}

        {tab === "tools" && (
          <div className="dfn-tools">
            <div className="dfn-sec">Options</div>
            <Check checked={set.realtime} onChange={(v) => saveSet({ realtime: v })} label="Automatically check for updates and use real-time protection" />
            <Check checked={set.cloud} onChange={(v) => saveSet({ cloud: v })} label="Use Microsoft SpyNet to help stop the spread of new malware" />
            <Check checked={set.archive} onChange={(v) => saveSet({ archive: v })} label="Scan archived and compressed files" />
            <Check checked={set.removable} onChange={(v) => saveSet({ removable: v })} label="Scan removable drives" />
            <Check checked={set.heuristic} onChange={(v) => saveSet({ heuristic: v })} label="Use heuristics to detect unknown threats" />
            <Check checked={set.notify} onChange={(v) => saveSet({ notify: v })} label="Show notifications when threats are detected" />
            <div className="dfn-sec">Excluded files and folders</div>
            <div className="dfn-excl">C:\Users\User\Documents\Visual Studio Projects<br />D:\Backups<br /><span className="dfn-muted">Excluded processes: devenv.exe, msbuild.exe</span></div>
            <div className="dfn-btns">
              <Btn onClick={addTestThreat}>Simulate a detected threat</Btn>
              <Btn onClick={() => msgBox({ title: "Windows Defender", text: "This simulated PC has no EICAR sample to download, so the test above injects one.", icon: "info" })}>About testing</Btn>
            </div>
          </div>
        )}
      </div>
      <div className="dfn-status">{running ? "Windows Defender is running" : "Windows Defender service is stopped"} · Definitions 1.261.1043.0 · {new Date().toLocaleDateString()}</div>
    </div>
  );
}
