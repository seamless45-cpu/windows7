"use client";
/**
 * System Diagnostics ("msinfo32" style) — the window onto the simulated kernel:
 * the boot log, the loaded drivers with their service groups and start types,
 * the services services.exe started, and the tools to reproduce a real
 * Windows 7 failure (force a driver to fail on the next boot, or bug check now).
 */
import React, { useMemo, useState } from "react";
import { Win, useStore, setState, getState, reboot, bugCheck, notify, lsGet, lsSet, msgBox } from "../store";
import { MenuBar, Btn, Tabs } from "../ui";
import { Icon } from "../icons";
import { DRIVERS, SERVICES, BOOT_STAGES, bootKernel, BUGCHECKS, type StopCode } from "../kernel";

const GROUPS = ["Boot Bus Extender", "System Bus Extender", "SCSI miniport", "Port", "Primary disk", "File system", "Keyboard", "Pointer", "Network", "Display"];
const START_LABEL = { 0: "Boot", 1: "System", 3: "Manual" } as const;

export function SystemDiagnostics({ win }: { win: Win }) {
  const [tab, setTab] = useState("Boot");
  const broken = useStore((s) => s.brokenDriver);
  const safeMode = useStore((s) => s.safeMode);
  const [sel, setSel] = useState<string | null>(null);
  const [stop, setStop] = useState<StopCode>("0x0000007B");

  const boot = useMemo(() => bootKernel({ safeMode, brokenDriver: broken || undefined }), [safeMode, broken]);
  const log = boot.lines;

  return (
    <div className="kern">
      <MenuBar
        menus={[
          { label: "File", items: () => [{ label: "Export boot log...", onClick: () => { const t = log.map((l) => `[${String(l.t).padStart(5)} ms] ${l.stage}: ${l.text}`).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type: "text/plain" })); a.download = "bootlog.txt"; a.click(); notify({ title: "System Diagnostics", text: "bootlog.txt was saved.", icon: "info" }); } }, { sep: true }, { label: "Exit", onClick: () => win && setState({ windows: getState().windows.filter((w) => w.id !== win.id) }) }] },
          { label: "Action", items: () => [
            { label: "Restart", onClick: () => reboot() },
            { label: "Restart in Safe Mode", checked: safeMode, onClick: () => reboot({ safeMode: true }) },
            { label: "Restart Normally", onClick: () => { setState({ brokenDriver: null }); reboot(); } },
            { sep: true },
            { label: "Bug check now…", onClick: () => msgBox({ title: "Bug check", text: "The system will bug check with the selected stop code. Unsaved work in this simulation is not real, so nothing is lost.", icon: "warn", buttons: ["Bug check", "Cancel"], onResult: (b) => b === "Bug check" && bugCheck(stop) }) },
          ] },
          { label: "Help", items: () => [{ label: "About System Diagnostics", onClick: () => notify({ title: "System Diagnostics", text: "Models the Windows 7 boot: bootmgr → winload → ntoskrnl → smss → wininit → services → winlogon.", icon: "info" }) }] },
        ]}
      />
      <Tabs tabs={["Boot", "Drivers", "Services", "Failures"]} value={tab} onChange={setTab} />
      <div className="kern-body">
        {tab === "Boot" && (
          <div className="kern-boot">
            <div className="kern-head">
              <Icon name="taskmgr" size={32} />
              <div>
                <b>Boot state: {boot.ok ? "completed" : `failed — ${BUGCHECKS[boot.stop!].title}`}</b>
                <p className="cp-desc">Simulated total boot time {boot.ms} ms · {log.length} kernel log lines{safeMode ? " · Safe Mode" : ""}{broken ? ` · forced failure: ${broken}` : ""}</p>
              </div>
            </div>
            <div className="kern-stages">
              {BOOT_STAGES.filter((s) => s.stage !== "ready").map((s) => (
                <div key={s.stage} className="kern-stage">
                  <span className="kern-dot" />
                  <b>{s.label}</b>
                  <span className="cp-desc">{s.lines.length} events · {s.ms} ms</span>
                </div>
              ))}
            </div>
            <pre className="kern-log">{log.map((l) => `[${String(l.t).padStart(5)}] ${l.stage.padEnd(9)} ${l.text}`).join("\n")}</pre>
          </div>
        )}
        {tab === "Drivers" && (
          <div className="kern-table">
            <div className="kern-th"><span style={{ width: 120 }}>Service</span><span style={{ flex: 1 }}>Display name</span><span style={{ width: 150 }}>Group</span><span style={{ width: 60 }}>Start</span><span style={{ width: 70 }}>Status</span></div>
            {DRIVERS.map((d) => {
              const isBroken = broken === d.name;
              const ok = boot.ok || boot.failed?.name !== d.name;
              return (
                <div key={d.name} className={"kern-tr" + (sel === d.name ? " sel" : "") + (isBroken ? " bad" : "")} onClick={() => setSel(d.name)}>
                  <span style={{ width: 120 }}>{d.name}</span>
                  <span style={{ flex: 1 }}>{d.display}</span>
                  <span style={{ width: 150 }}>{d.group}</span>
                  <span style={{ width: 60 }}>{START_LABEL[d.start]}</span>
                  <span style={{ width: 70 }}>{ok ? "Running" : "Failed"}</span>
                </div>
              );
            })}
            <div className="kern-foot">
              <Btn onClick={() => { if (!sel) return; setState({ brokenDriver: sel }); msgBox({ title: "System Diagnostics", text: `${sel} will fail to load on the next boot, producing a bug check. Restart to see it.`, icon: "warn", buttons: ["Restart now", "Later"], onResult: (b) => b === "Restart now" && reboot() }); }} disabled={!sel}>Force failure on next boot</Btn>
              <Btn onClick={() => setState({ brokenDriver: null })} disabled={!broken}>Clear forced failure</Btn>
            </div>
          </div>
        )}
        {tab === "Services" && (
          <div className="kern-table">
            <div className="kern-th"><span style={{ width: 120 }}>Name</span><span style={{ flex: 1 }}>Description</span><span style={{ width: 80 }}>Status</span></div>
            {SERVICES.map(([n, d, auto]) => (
              <div key={n} className="kern-tr"><span style={{ width: 120 }}>{n}</span><span style={{ flex: 1 }}>{d}</span><span style={{ width: 80 }}>{auto ? (safeMode && n.startsWith("Themes") ? "Stopped" : "Running") : "Manual"}</span></div>
            ))}
          </div>
        )}
        {tab === "Failures" && (
          <div className="kern-fail">
            <p>Windows 7 reports a kernel stop with a bug check code. Pick one to reproduce it exactly — the blue screen prints the code, the driver and the crash-dump progress, then reboots.</p>
            {(Object.keys(BUGCHECKS) as StopCode[]).map((c) => (
              <label key={c} className={"kern-code" + (stop === c ? " on" : "")}>
                <input type="radio" name="stop" checked={stop === c} onChange={() => setStop(c)} />
                <b>{c}</b> {BUGCHECKS[c].title}
                <span>{BUGCHECKS[c].reason}</span>
              </label>
            ))}
            <div className="kern-foot">
              <Btn onClick={() => bugCheck(stop)}>Bug check now</Btn>
              <Btn onClick={() => { reboot(); }}>Restart</Btn>
            </div>
            <p className="cp-desc">Also reachable from Run: <b>sysdiag</b>, and from Control Panel → System and Security → System Diagnostics. Windows' own shortcut is <b>msinfo32</b>.</p>
          </div>
        )}
      </div>
      {void lsGet}{void lsSet}
    </div>
  );
}

export const DRIVER_GROUPS = GROUPS;
