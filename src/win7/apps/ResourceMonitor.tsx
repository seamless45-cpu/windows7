"use client";
/**
 * Resource Monitor (resmon.exe).
 *
 * The five tabs Windows 7 has — Overview, CPU, Memory, Disk, Network — with the
 * live graphs drawn on a canvas and the process lists that sit under them. The
 * numbers come from the windows that are actually open plus the system
 * processes, so opening a program really appears in the CPU and Memory lists.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Win, useStore, getState, closeWin, MenuItem, notify } from "../store";
import { MenuBar } from "../ui";
import { APPS } from "../registry";
import { playSys } from "../sound";

const SYS: [string, string, number, number][] = [
  ["System", "SYSTEM", 600, 24],
  ["smss.exe", "SYSTEM", 420, 0],
  ["csrss.exe", "SYSTEM", 3100, 0],
  ["wininit.exe", "SYSTEM", 980, 0],
  ["services.exe", "SYSTEM", 4600, 2],
  ["lsass.exe", "SYSTEM", 6100, 1],
  ["svchost.exe", "SYSTEM", 9400, 3],
  ["svchost.exe", "NETWORK SERVICE", 6800, 1],
  ["audiodg.exe", "LOCAL SERVICE", 12400, 2],
  ["dwm.exe", "PC\\User", 21800, 7],
  ["explorer.exe", "PC\\User", 58400, 2],
  ["SearchIndexer.exe", "SYSTEM", 17200, 0],
  ["spoolsv.exe", "SYSTEM", 5200, 0],
];

function useTicker(ms = 1000) {
  const [n, setN] = useState(0);
  useEffect(() => { const i = setInterval(() => setN((x) => x + 1), ms); return () => clearInterval(i); }, [ms]);
  return n;
}

/** A 60-sample scrolling graph with the Resource Monitor's grid. */
function Spark({ data, color = "#2f8f2f", max = 100, h = 62 }: { data: number[]; color?: string; max?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#fdfdfd"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#dfe6ee"; g.lineWidth = 1;
    for (let x = 0; x <= W; x += W / 6) { g.beginPath(); g.moveTo(Math.round(x) + 0.5, 0); g.lineTo(Math.round(x) + 0.5, H); g.stroke(); }
    for (let y = 0; y <= H; y += H / 4) { g.beginPath(); g.moveTo(0, Math.round(y) + 0.5); g.lineTo(W, Math.round(y) + 0.5); g.stroke(); }
    g.beginPath();
    data.forEach((v, i) => { const x = (i / (data.length - 1)) * W; const y = H - (Math.min(max, Math.max(0, v)) / max) * H; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.strokeStyle = color; g.lineWidth = 1.4; g.stroke();
    g.lineTo(W, H); g.lineTo(0, H); g.closePath();
    g.fillStyle = color + "2e"; g.fill();
  }, [data, color, max]);
  return <canvas ref={ref} width={230} height={h} className="rsc-graph" />;
}

const Bar = ({ label, pct, color = "#2f8f2f", detail }: { label: string; pct: number; color?: string; detail: string }) => (
  <div className="rsc-bar">
    <span className="rsc-bar-l">{label}</span>
    <span className="rsc-bar-t"><i style={{ width: Math.min(100, pct) + "%", background: color }} /></span>
    <span className="rsc-bar-v">{detail}</span>
  </div>
);

export function ResourceMonitor({ win }: { win: Win }) {
  const windows = useStore((s) => s.windows);
  const s = useStore((st) => st.settings);
  const [tab, setTab] = useState("Overview");
  const [sel, setSel] = useState<string | null>(null);
  const tick = useTicker(1000);

  const cpu = useMemo(() => {
    const seed = Array.from({ length: 60 }, (_, i) => 4 + Math.sin(i / 6) * 3);
    return seed.map((v, i) => Math.max(1, Math.min(96, v + ((i * 7 + tick) % 11) - 4 + windows.length * 0.9)));
  }, [tick, windows.length]);
  const mem = useMemo(() => {
    const seed = Array.from({ length: 60 }, (_, i) => 41 + Math.cos(i / 9) * 2.5);
    return seed.map((v, i) => Math.min(92, v + ((i * 5 + tick) % 7) * 0.4 + windows.length * 1.4));
  }, [tick, windows.length]);
  const disk = useMemo(() => Array.from({ length: 60 }, (_, i) => Math.max(0, ((i * 13 + tick * 7) % 47) + (windows.length * 1.5))), [tick, windows.length]);
  const net = useMemo(() => Array.from({ length: 60 }, (_, i) => (s.defaults.net === "off" ? 0 : Math.max(0, ((i * 11 + tick * 5) % 38)))), [tick, s.defaults.net]);

  const procs = useMemo(() => {
    const open = windows.filter((w) => !APPS[w.app].noTask && !w.closing).map((w) => ({ name: APPS[w.app].exe || w.app + ".exe", wins: 1, title: w.title }));
    return [
      ...SYS.map(([n, u, m, c]) => ({ name: n, user: u, mem: m, cpu: c, count: 1, title: "" })),
      ...open.map((o, i) => ({ name: o.name, user: "PC\\" + s.currentUser, mem: 9000 + i * 3200, cpu: 1 + (i % 4), count: 1, title: o.title })),
      { name: "resmon.exe", user: "PC\\" + s.currentUser, mem: 14200, cpu: 1, count: 1, title: "Resource Monitor" },
    ];
  }, [windows, s.currentUser]);

  const cpuNow = Math.round(cpu[59]);
  const memNow = Math.round(mem[59]);
  const diskNow = Math.round(disk[59]);
  const netNow = Math.round(net[59] * 12.4);
  const totalMB = ((navigator as unknown as { deviceMemory?: number }).deviceMemory || 8) * 1024;

  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Save As...", onClick: () => notify({ title: "Resource Monitor", text: "The resource data was saved to Documents.", icon: "info" }) }, { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }] },
    { label: "Monitor", items: () => [{ label: "Start Monitoring", checked: true }, { label: "Stop Monitoring", onClick: () => notify({ title: "Resource Monitor", text: "Monitoring is paused.", icon: "info" }) }, { sep: true }, { label: "Clear Filter", disabled: !sel, onClick: () => setSel(null) }] },
    { label: "View", items: () => [{ label: "Refresh Now", onClick: () => playSys("ding") }, { label: "Help", onClick: () => notify({ title: "Resource Monitor", text: "Select a process to filter the other tabs.", icon: "info" }) }] },
  ];

  const procTable = (cols: [string, number][], rows: { key: string; cells: React.ReactNode[] }[]) => (
    <div className="rsc-table">
      <div className="rsc-th">{cols.map(([h, w]) => <span key={h} style={{ width: w }}>{h}</span>)}</div>
      {rows.map((r) => (
        <div key={r.key} className={"rsc-tr" + (sel === r.key ? " sel" : "")} onClick={() => setSel(r.key)} onContextMenu={(e) => { e.preventDefault(); setSel(r.key); import("../store").then((m) => m.showMenu(e, [{ label: "Search Online", onClick: () => notify({ title: "Resource Monitor", text: "No browser is available for this search.", icon: "warn" }) }, { label: "View Message Log", onClick: () => notify({ title: "Resource Monitor", text: "Nothing has been logged for this process.", icon: "info" }) }, { sep: true }, { label: "Filter", disabled: true }])); }}>
          {r.cells.map((c, i) => <span key={i} style={{ width: cols[i][1] }}>{c}</span>)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="rsc">
      <MenuBar menus={menus} />
      <div className="rsc-tabs">
        {["Overview", "CPU", "Memory", "Disk", "Network"].map((t) => <button key={t} className={"rsc-tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      <div className="rsc-body">
        {tab === "Overview" && (
          <div className="rsc-over">
            <div className="rsc-col">
              <div className="rsc-sec">CPU — {cpuNow}% Utilized</div>
              <Spark data={cpu} />
              <div className="rsc-sec">Disk — {diskNow}% Highest Activity</div>
              <Spark data={disk} color="#8a5bd0" />
            </div>
            <div className="rsc-col">
              <div className="rsc-sec">Memory — {memNow}% Used</div>
              <Spark data={mem} color="#b8860b" />
              <div className="rsc-sec">Network — {netNow} Kbps</div>
              <Spark data={net} color="#2c7bd0" />
            </div>
            <div className="rsc-col wide">
              <div className="rsc-sec">Processes with Activity</div>
              {procTable([["Image", 150], ["PID", 56], ["CPU", 50], ["Commit (KB)", 84], ["Working Set (KB)", 108]], procs.slice(0, 9).map((p, i) => ({
                key: p.name + i,
                cells: [p.name, String(i * 4 + 312), p.cpu + "%", (p.mem * 1.2 | 0).toLocaleString(), p.mem.toLocaleString()],
              })))}
            </div>
          </div>
        )}

        {tab === "CPU" && (
          <div className="rsc-pane">
            <div className="rsc-graphs">
              <div className="rsc-gwrap"><div className="rsc-gtitle">CPU - Total {cpuNow}%</div><Spark data={cpu} h={80} /></div>
              <div className="rsc-gwrap"><div className="rsc-gtitle">Service CPU Usage</div><Spark data={cpu.map((v) => v * 0.4)} h={80} color="#2c7bd0" /></div>
            </div>
            <div className="rsc-sec">Processes</div>
            {procTable([["Image", 170], ["PID", 56], ["Description", 160], ["Status", 70], ["Threads", 60], ["CPU", 46], ["Average CPU", 78]], procs.map((p, i) => ({
              key: p.name + i,
              cells: [p.name, String(i * 4 + 312), p.name.replace(/\.exe$/, "") + " host process", "Running", String(4 + (i % 22)), p.cpu + "%", (p.cpu / 3).toFixed(2)],
            })))}
            <div className="rsc-sec">Services</div>
            {procTable([["Name", 150], ["PID", 56], ["Description", 200], ["Status", 70], ["Group", 100]], [
              { key: "sv1", cells: ["AudioSrv", "1136", "Windows Audio", "Running", "AudioEndpointBuilder"] },
              { key: "sv2", cells: ["Themes", "1244", "Themes", "Running", ""] },
              { key: "sv3", cells: ["WinDefend", "1508", "Windows Defender", "Running", "NetworkService"] },
              { key: "sv4", cells: ["Spooler", "1290", "Print Spooler", "Running", ""] },
            ])}
          </div>
        )}

        {tab === "Memory" && (
          <div className="rsc-pane">
            <div className="rsc-graphs">
              <div className="rsc-gwrap"><div className="rsc-gtitle">Physical Memory {memNow}% Used</div><Spark data={mem} h={80} color="#b8860b" /></div>
              <div className="rsc-gwrap"><div className="rsc-gtitle">Commit Charge</div><Spark data={mem.map((v) => v * 1.15)} h={80} color="#c0392b" /></div>
            </div>
            <div className="rsc-membars">
              <Bar label="Used" pct={memNow} color="#c8a24a" detail={`${Math.round((totalMB * memNow) / 100).toLocaleString()} MB`} />
              <Bar label="Modified" pct={4} color="#9ecb6a" detail={`${Math.round(totalMB * 0.04).toLocaleString()} MB`} />
              <Bar label="Standby" pct={22} color="#7ab0e0" detail={`${Math.round(totalMB * 0.22).toLocaleString()} MB`} />
              <Bar label="Free" pct={Math.max(0, 100 - memNow - 26)} color="#dfe6ee" detail={`${Math.round((totalMB * Math.max(0, 74 - memNow)) / 100).toLocaleString()} MB`} />
            </div>
            <div className="rsc-sec">Processes</div>
            {procTable([["Image", 160], ["PID", 52], ["Hard Faults/sec", 92], ["Commit (KB)", 84], ["Working Set (KB)", 108], ["Shareable (KB)", 96], ["Private (KB)", 86]], procs.map((p, i) => ({
              key: p.name + i,
              cells: [p.name, String(i * 4 + 312), String(i % 3), (p.mem * 1.25 | 0).toLocaleString(), p.mem.toLocaleString(), Math.round(p.mem * 0.42).toLocaleString(), Math.round(p.mem * 0.58).toLocaleString()],
            })))}
          </div>
        )}

        {tab === "Disk" && (
          <div className="rsc-pane">
            <div className="rsc-graphs">
              <div className="rsc-gwrap"><div className="rsc-gtitle">Disk {diskNow}% Highest Active Time</div><Spark data={disk} h={80} color="#8a5bd0" /></div>
              <div className="rsc-gwrap"><div className="rsc-gtitle">Disk Queue Length</div><Spark data={disk.map((v) => v / 18)} h={80} max={6} color="#2c7bd0" /></div>
            </div>
            <div className="rsc-sec">Processes with Disk Activity</div>
            {procTable([["Image", 170], ["PID", 56], ["Read (B/sec)", 96], ["Write (B/sec)", 96], ["Total (B/sec)", 96], ["I/O Priority", 80]], procs.slice(0, 10).map((p, i) => ({
              key: p.name + i,
              cells: [p.name, String(i * 4 + 312), (p.cpu * 1200).toLocaleString(), (p.cpu * 3400).toLocaleString(), (p.cpu * 4600).toLocaleString(), "Normal"],
            })))}
            <div className="rsc-sec">Storage</div>
            {procTable([["Logical Disk", 130], ["Active Time (%)", 100], ["Available Space (GB)", 130], ["Total Space (GB)", 120], ["Disk Queue Length", 120]], [
              { key: "c", cells: ["C:", String(diskNow), "147", "250", "0.02"] },
              { key: "d", cells: ["D:", String(Math.round(diskNow / 3)), "389", "500", "0.00"] },
            ])}
          </div>
        )}

        {tab === "Network" && (
          <div className="rsc-pane">
            <div className="rsc-graphs">
              <div className="rsc-gwrap"><div className="rsc-gtitle">Network — {netNow} Kbps</div><Spark data={net} h={80} color="#2c7bd0" /></div>
              <div className="rsc-gwrap"><div className="rsc-gtitle">TCP Connections</div><Spark data={net.map((v) => v / 22)} h={80} max={5} color="#2f8f2f" /></div>
            </div>
            <div className="rsc-sec">Processes with Network Activity</div>
            {procTable([["Image", 170], ["PID", 56], ["Send (B/sec)", 96], ["Receive (B/sec)", 96], ["Total (B/sec)", 96]], procs.slice(0, 8).map((p, i) => ({
              key: p.name + i,
              cells: [p.name, String(i * 4 + 312), s.defaults.net === "off" ? "0" : (p.cpu * 220).toLocaleString(), s.defaults.net === "off" ? "0" : (p.cpu * 980).toLocaleString(), s.defaults.net === "off" ? "0" : (p.cpu * 1200).toLocaleString()],
            })))}
            <div className="rsc-sec">TCP Connections</div>
            {procTable([["Image", 150], ["PID", 56], ["Local Address", 130], ["Remote Address", 130], ["State", 90]], s.defaults.net === "off" ? [] : [
              { key: "c1", cells: ["iexplore.exe", "2680", "192.168.1.23:49412", "93.184.216.34:80", "Established"] },
              { key: "c2", cells: ["svchost.exe", "1136", "0.0.0.0:135", "—", "Listening"] },
              { key: "c3", cells: ["lsass.exe", "612", "0.0.0.0:49155", "—", "Listening"] },
            ])}
            <div className="rsc-sec">Listening Ports</div>
            {procTable([["Image", 150], ["PID", 56], ["Address", 150], ["Protocol", 80], ["Firewall Status", 120]], [
              { key: "p1", cells: ["svchost.exe", "1136", "0.0.0.0", "TCP", "Allowed, No Restriction"] },
              { key: "p2", cells: ["svchost.exe", "940", "0.0.0.0", "TCP", "Not Allowed"] },
            ])}
          </div>
        )}
      </div>
      <div className="rsc-status"><span>CPU: {cpuNow}%</span><span>Memory: {memNow}%</span><span>Disk: {diskNow}%</span><span>Network: {netNow} Kbps</span><span style={{ marginLeft: "auto" }}>{windows.length} windows · {getState().settings.currentUser}</span></div>
    </div>
  );
}
