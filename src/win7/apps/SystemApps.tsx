"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Win, useStore, getState, setWin, openApp, closeWin, focusWin, msgBox, children, resolvePath, pathOf, mkdir, mkfile, deleteForever, renameNode, moveNodes, copyNodes, shutdown, restart, logoff,
  runCommand, MenuItem, FsNode, lock, workArea, mkfile as mkf, notify, view, openCP, setState, extOf,
} from "../store";
import { APPS } from "../registry";
import { Icon, appIcon } from "../icons";
import { Btn, Tabs, MenuBar } from "../ui";
import { openFileDialog } from "../dialogs";
import { WALLPAPERS } from "../data";

/* ================================================================= CMD */
const HELP = `For more information on a specific command, type HELP command-name
CD       Displays the name of or changes the current directory.
CLS      Clears the screen.
COPY     Copies one or more files to another location.
DATE     Displays the date.
DEL      Deletes one or more files.
DIR      Displays a list of files and subdirectories in a directory.
ECHO     Displays messages.
EXIT     Quits the CMD.EXE program.
HOSTNAME Prints the name of the current host.
IPCONFIG Displays network configuration.
MD       Creates a directory.
MOVE     Moves files.
PING     Tests a network connection.
RD       Removes a directory.
REN      Renames a file or files.
SHUTDOWN Allows proper local shutdown of machine.
START    Starts a program (calc, notepad, mspaint, explorer, iexplore...).
SYSTEMINFO Displays machine specific properties.
TASKKILL Kill or stop a running process.
TASKLIST Displays all running tasks.
TIME     Displays the time.
TREE     Graphically displays the folder structure.
TYPE     Displays the contents of a text file.
VER      Displays the Windows version.
WHOAMI   Displays the current user.`;

export function Cmd({ win }: { win: Win }) {
  const [lines, setLines] = useState<string[]>(["Microsoft Windows [Version 6.1.7601]", "Copyright (c) 2009 Microsoft Corporation.  All rights reserved.", ""]);
  const [cwd, setCwd] = useState("home");
  const [input, setInput] = useState("");
  const hist = useRef<string[]>([]);
  const hi = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);
  const fsx = () => getState().fs;
  const prompt = (c = cwd) => pathOf(c) + ">";
  useEffect(() => { box.current?.scrollTo(0, 99999); }, [lines, input]);
  useEffect(() => { inp.current?.focus(); }, []);

  const run = (raw: string) => {
    const out: string[] = [];
    let c = cwd;
    const cmdline = raw.trim();
    const [cmd0, ...rest] = cmdline.split(/\s+/);
    const cmd = (cmd0 || "").toLowerCase();
    const arg = rest.join(" ");
    const f = fsx();
    const say = (...s: string[]) => out.push(...s);
    const d2 = (n: FsNode) => new Date(n.modified).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", " ");
    if (!cmd) { /* nothing */ }
    else if (/^[a-z]:$/.test(cmd)) { const id = resolvePath(cmd.toUpperCase() + "\\"); if (id) c = id; else say("The system cannot find the drive specified."); }
    else if (cmd === "help") say(...(arg ? [`${arg.toUpperCase()}: see the full list by typing HELP.`] : HELP.split("\n")));
    else if (cmd === "cls") { setLines([]); setCwd(c); return; }
    else if (cmd === "echo") say(arg || "ECHO is on.");
    else if (cmd === "ver") say("", "Microsoft Windows [Version 6.1.7601]");
    else if (cmd === "date") say("The current date is: " + new Date().toLocaleDateString("en-US", { weekday: "short", month: "2-digit", day: "2-digit", year: "numeric" }));
    else if (cmd === "time") say("The current time is: " + new Date().toLocaleTimeString("en-US", { hour12: false }) + ".00");
    else if (cmd === "hostname") say("PC");
    else if (cmd === "whoami") say("pc\\" + getState().settings.currentUser.toLowerCase());
    else if (cmd === "title") setWin(win.id, { title: arg || "Command Prompt" });
    else if (cmd === "color") say("Color settings are not supported in this console.");
    else if (cmd === "path") say("PATH=C:\\Windows\\system32;C:\\Windows");
    else if (cmd === "set") say("COMPUTERNAME=PC", "OS=Windows_NT", "SystemDrive=C:", "SystemRoot=C:\\Windows", "USERNAME=" + getState().settings.currentUser, "USERPROFILE=C:\\Users\\" + getState().settings.currentUser);
    else if (cmd === "vol") say(" Volume in drive C is OS", " Volume Serial Number is 4A2B-9C1D");
    else if (cmd === "exit") { closeWin(win.id, true); return; }
    else if (cmd === "dir" || cmd === "ls") {
      const target = arg && !arg.startsWith("/") ? resolvePath(arg, c) : c;
      if (!target || !f[target]) say("File Not Found");
      else if (f[target].type === "file") say(" Volume in drive C is OS", "", " Directory of " + pathOf(f[target].parent!), "", `${d2(f[target])}    ${String(f[target].size).padStart(14)} ${f[target].name}`);
      else {
        const drv = (() => { let n: FsNode | undefined = f[target]; while (n?.parent) n = f[n.parent]; return n; })();
        const kids = children(target).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
        say(` Volume in drive ${drv?.letter?.[0] || "C"} is ${drv?.label || "OS"}`, " Volume Serial Number is 4A2B-9C1D", "", " Directory of " + pathOf(target), "");
        if (f[target].parent) say(`${d2(f[target])}    <DIR>          .`, `${d2(f[target])}    <DIR>          ..`);
        kids.forEach((k) => say(`${d2(k)}    ${k.type === "folder" ? "<DIR>         " : String(k.size).padStart(14)} ${k.name}`));
        const files = kids.filter((k) => k.type === "file");
        say(`${String(files.length).padStart(15)} File(s) ${String(files.reduce((a, b) => a + b.size, 0)).padStart(14)} bytes`, `${String(kids.length - files.length).padStart(15)} Dir(s)  ${String(drv?.free || 0).padStart(14)} bytes free`);
      }
    } else if (cmd === "cd" || cmd === "chdir") {
      const a = arg.replace(/^\/d\s+/i, "");
      if (!a) say(pathOf(c));
      else { const id = resolvePath(a, c); if (id && f[id]?.type === "folder") c = id; else say("The system cannot find the path specified."); }
    } else if (cmd === "md" || cmd === "mkdir") { if (!arg) say("The syntax of the command is incorrect."); else { const parts = arg.replace(/"/g, "").split("\\"); const nm = parts.pop()!; const parent = parts.length ? resolvePath(parts.join("\\"), c) : c; if (!parent) say("The system cannot find the path specified."); else if (children(parent).some((k) => k.name.toLowerCase() === nm.toLowerCase())) say("A subdirectory or file " + nm + " already exists."); else mkdir(parent, nm); } }
    else if (cmd === "rd" || cmd === "rmdir") { const id = resolvePath(arg.replace(/\/s|\/q/gi, "").trim(), c); if (!id || f[id]?.type !== "folder") say("The system cannot find the file specified."); else if (children(id).length && !/\/s/i.test(arg)) say("The directory is not empty."); else deleteForever([id]); }
    else if (cmd === "del" || cmd === "erase") { const id = resolvePath(arg.replace(/\/[a-z]/gi, "").trim(), c); if (!id) say("Could Not Find " + pathOf(c) + "\\" + arg); else if (f[id].type === "folder") say("Use RD to remove directories."); else deleteForever([id]); }
    else if (cmd === "type") { const id = resolvePath(arg, c); if (!id || f[id]?.type !== "file") say("The system cannot find the file specified."); else say(...((f[id].content || "").startsWith("data:") ? ["(binary file)"] : (f[id].content || "").split(/\r?\n/))); }
    else if (cmd === "copy") { const [a, b] = arg.split(/\s+/); const s = resolvePath(a || "", c); const t = resolvePath(b || ".", c); if (!s || !t) say("The system cannot find the file specified."); else { const dest = f[t].type === "folder" ? t : f[t].parent!; copyNodes([s], dest); say("        1 file(s) copied."); } }
    else if (cmd === "move") { const [a, b] = arg.split(/\s+/); const s = resolvePath(a || "", c); const t = resolvePath(b || "", c); if (!s || !t || f[t].type !== "folder") say("The system cannot find the file specified."); else { moveNodes([s], t); say("        1 file(s) moved."); } }
    else if (cmd === "ren" || cmd === "rename") { const [a, b] = arg.split(/\s+/); const s = resolvePath(a || "", c); if (!s || !b) say("The syntax of the command is incorrect."); else renameNode(s, b); }
    else if (cmd === "tree") {
      const walk = (id: string, pre: string) => { const k = children(id).filter((x) => x.type === "folder"); k.forEach((n, i) => { say(pre + (i === k.length - 1 ? "└───" : "├───") + n.name); walk(n.id, pre + (i === k.length - 1 ? "    " : "│   ")); }); };
      say("Folder PATH listing", "Volume serial number is 4A2B-9C1D", pathOf(c)); walk(c, "");
    }
    else if (cmd === "ipconfig") say("", "Windows IP Configuration", "", "Ethernet adapter Local Area Connection:", "", "   Connection-specific DNS Suffix  . : home", "   IPv4 Address. . . . . . . . . . . : 192.168.1.23", "   Subnet Mask . . . . . . . . . . . : 255.255.255.0", "   Default Gateway . . . . . . . . . : 192.168.1.1");
    else if (cmd === "ping") { const h = arg || "localhost"; const on = getState().settings.defaults.net !== "off"; say("", `Pinging ${h} [${on ? "93.184.216.34" : "?"}] with 32 bytes of data:`); for (let i = 0; i < 4; i++) say(on ? `Reply from 93.184.216.34: bytes=32 time=${20 + ((i * 7) % 13)}ms TTL=56` : "Request timed out."); say("", `Ping statistics for 93.184.216.34:`, `    Packets: Sent = 4, Received = ${on ? 4 : 0}, Lost = ${on ? 0 : 4} (${on ? 0 : 100}% loss),`); }
    else if (cmd === "tasklist") { say("", "Image Name                     PID Session Name     Mem Usage", "========================= ======== ================ ============", "System Idle Process              0 Services              24 K", "explorer.exe                  1288 Console           58,204 K", "dwm.exe                        980 Console           21,440 K"); const seen = new Set<string>(); getState().windows.filter((w) => !APPS[w.app].noTask).forEach((w, i) => { const e = APPS[w.app].exe || w.app + ".exe"; if (!seen.has(e)) { seen.add(e); say(`${e.padEnd(25)} ${String(2000 + i * 44).padStart(8)} Console           ${(8000 + i * 1300).toLocaleString()} K`); } }); say("cmd.exe                       3120 Console            2,884 K"); }
    else if (cmd === "taskkill") { const m = /\/im\s+(\S+)/i.exec(arg); if (!m) say("ERROR: Invalid syntax."); else { const ws = getState().windows.filter((w) => (APPS[w.app].exe || "").toLowerCase() === m[1].toLowerCase()); if (!ws.length) say(`ERROR: The process "${m[1]}" not found.`); else { ws.forEach((w) => closeWin(w.id, true)); say(`SUCCESS: The process "${m[1]}" has been terminated.`); } } }
    else if (cmd === "systeminfo") say("", "Host Name:                 PC", "OS Name:                   Microsoft Windows 7 Ultimate", "OS Version:                6.1.7601 Service Pack 1 Build 7601", "OS Manufacturer:           Microsoft Corporation", "System Type:               x64-based PC", "Processor(s):              1 Processor(s) Installed.", `Total Physical Memory:     ${((navigator as unknown as { deviceMemory?: number }).deviceMemory || 8) * 1024} MB`, "Time Zone:                 (UTC-08:00) Pacific Time (US & Canada)");
    else if (cmd === "netstat") say("", "Active Connections", "", "  Proto  Local Address          Foreign Address        State", "  TCP    192.168.1.23:49412     93.184.216.34:80       ESTABLISHED");
    else if (cmd === "shutdown") { if (/\/s/i.test(arg)) { say("Shutting down..."); setTimeout(shutdown, 600); } else if (/\/r/i.test(arg)) { say("Restarting..."); setTimeout(restart, 600); } else if (/\/l/i.test(arg)) setTimeout(logoff, 300); else if (/\/h|\/l/i.test(arg)) setTimeout(lock, 300); else say("Usage: shutdown [/s | /r | /l]"); }
    else if (cmd === "start") { if (!runCommand(arg || "cmd")) say("The system cannot find the file " + arg + "."); }
    else if (["calc", "notepad", "mspaint", "explorer", "iexplore", "taskmgr", "wordpad", "charmap", "magnify", "wmplayer", "write", "winver", "control"].includes(cmd.replace(/\.exe$/, ""))) runCommand(cmd);
    else say(`'${cmd0}' is not recognized as an internal or external command,`, "operable program or batch file.");
    setCwd(c);
    setLines((l) => [...l, prompt(cwd) + raw, ...out, ...(cmd ? [""] : [])]);
  };

  return (
    <div className="cmdwin" onClick={() => inp.current?.focus()} ref={box}>
      {lines.map((l, i) => <div key={i} className="cmd-l">{l || "\u00a0"}</div>)}
      <div className="cmd-l cmd-in"><span>{prompt()}</span><input ref={inp} value={input} spellCheck={false} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") { hist.current.push(input); hi.current = hist.current.length; run(input); setInput(""); }
        else if (e.key === "ArrowUp") { e.preventDefault(); if (hi.current > 0) { hi.current--; setInput(hist.current[hi.current] || ""); } }
        else if (e.key === "ArrowDown") { e.preventDefault(); if (hi.current < hist.current.length - 1) { hi.current++; setInput(hist.current[hi.current]); } else { hi.current = hist.current.length; setInput(""); } }
        else if (e.key === "Tab") { e.preventDefault(); const w = input.split(" "); const last = w.pop() || ""; const m = children(cwd).find((k) => k.name.toLowerCase().startsWith(last.toLowerCase())); if (m) setInput([...w, m.name.includes(" ") ? `"${m.name}"` : m.name].join(" ")); }
        else if (e.ctrlKey && e.key.toLowerCase() === "c") { setLines((l) => [...l, prompt() + input + "^C"]); setInput(""); }
      }} /></div>
    </div>
  );
}

/* ========================================================== Task Manager */
function Graph({ data, color = "#4cff4c", max = 100, fill = true }: { data: number[]; color?: string; max?: number; fill?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const W = c.width, H = c.height;
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#0a5a0a"; g.lineWidth = 1;
    for (let x = 0; x < W; x += 12) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
    for (let y = 0; y < H; y += 12) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
    g.beginPath();
    data.forEach((v, i) => { const x = (i / 59) * W, y = H - (Math.min(max, v) / max) * H; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.strokeStyle = color; g.lineWidth = 1.5; g.stroke();
    if (fill) { g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fillStyle = color + "33"; g.fill(); }
  }, [data, color, max, fill]);
  return <canvas ref={ref} width={300} height={90} className="tm-graph" />;
}

const SERVICES = ["AudioSrv|Windows Audio", "BITS|Background Intelligent Transfer Service", "Dhcp|DHCP Client", "Dnscache|DNS Client", "EventLog|Windows Event Log", "mpssvc|Windows Firewall", "PlugPlay|Plug and Play", "Spooler|Print Spooler", "Themes|Themes", "W32Time|Windows Time", "wuauserv|Windows Update", "WinDefend|Windows Defender"];
const SYS_PROCS: [string, string, number][] = [["System Idle Process", "SYSTEM", 0], ["System", "SYSTEM", 600], ["smss.exe", "SYSTEM", 400], ["csrss.exe", "SYSTEM", 2900], ["wininit.exe", "SYSTEM", 900], ["services.exe", "SYSTEM", 4200], ["lsass.exe", "SYSTEM", 5800], ["svchost.exe", "SYSTEM", 9300], ["svchost.exe", "NETWORK SERVICE", 6700], ["dwm.exe", "User", 21400], ["explorer.exe", "User", 58200], ["audiodg.exe", "LOCAL SERVICE", 12500]];

export function TaskManager({ win }: { win: Win }) {
  const windows = useStore((s) => s.windows);
  const s = useStore((st) => st.settings);
  const [tab, setTab] = useState("Applications");
  const [sel, setSel] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const cpu = useRef<number[]>(Array(60).fill(3));
  const mem = useRef<number[]>(Array(60).fill(40));
  const net = useRef<number[]>(Array(60).fill(1));
  useEffect(() => {
    const i = setInterval(() => {
      const wc = getState().windows.length;
      const last = cpu.current[59];
      cpu.current = [...cpu.current.slice(1), Math.max(1, Math.min(98, last + (Math.random() - 0.5) * 14 + (wc > 4 ? 0.5 : -0.2)))];
      mem.current = [...mem.current.slice(1), Math.min(90, 34 + wc * 2.2 + Math.random() * 2)];
      net.current = [...net.current.slice(1), Math.max(0, Math.min(100, net.current[59] + (Math.random() - 0.5) * 18))];
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(i);
  }, []);
  const apps = windows.filter((w) => !APPS[w.app].noTask && !w.closing);
  const procs = useMemo(() => {
    const seen = new Map<string, Win[]>();
    apps.forEach((w) => { const e = APPS[w.app].exe || w.app + ".exe"; seen.set(e, [...(seen.get(e) || []), w]); });
    return [...SYS_PROCS.map(([n, u, m], i) => ({ name: n, user: u, mem: m, id: "s" + i, wins: [] as Win[] })), ...[...seen.entries()].map(([n, ws], i) => ({ name: n, user: s.currentUser, mem: 7000 + ws.length * 9000 + i * 1300, id: "a" + n, wins: ws })), { name: "taskmgr.exe", user: s.currentUser, mem: 6200, id: "tm", wins: [] as Win[] }];
  }, [apps.length, s.currentUser]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = Math.round(cpu.current[59]);
  const m = Math.round(mem.current[59]);
  const total = ((navigator as unknown as { deviceMemory?: number }).deviceMemory || 8) * 1024;
  void tick;
  const endTask = () => { const w = apps.find((x) => x.id === sel); if (w) closeWin(w.id, true); setSel(null); };
  const endProc = () => {
    const p = procs.find((x) => x.id === sel);
    if (!p) return;
    if (p.wins.length) msgBox({ title: "Task Manager Warning", text: `WARNING: Terminating a process can cause undesired results including loss of data and system instability. Are you sure you want to terminate ${p.name}?`, icon: "warn", buttons: ["End process", "Cancel"], onResult: (b) => b === "End process" && p.wins.forEach((w) => closeWin(w.id, true)) });
    else msgBox({ title: "Unable to Terminate Process", text: "The operation could not be completed.\nAccess is denied.", icon: "error" });
  };
  const menus = [
    { label: "File", items: (): MenuItem[] => [{ label: "New Task (Run...)", onClick: () => openApp("run") }, { sep: true }, { label: "Exit Task Manager", onClick: () => closeWin(win.id) }] },
    { label: "Options", items: (): MenuItem[] => [{ label: "Always On Top", checked: true }, { label: "Minimize On Use" }] },
    { label: "View", items: (): MenuItem[] => [{ label: "Refresh Now", onClick: () => setTick((t) => t + 1) }, { label: "Update Speed", sub: [{ label: "High", radio: true }, { label: "Normal", radio: true, checked: true }, { label: "Low", radio: true }] }] },
    { label: "Help", items: (): MenuItem[] => [{ label: "Task Manager Help", onClick: () => openApp("help") }, { label: "About Windows", onClick: () => openApp("winver") }] },
  ];
  return (
    <div className="tm">
      <MenuBar menus={menus} />
      <Tabs tabs={["Applications", "Processes", "Services", "Performance", "Networking", "Users"]} value={tab} onChange={(t) => { setTab(t); setSel(null); }} />
      <div className="tm-body">
        {tab === "Applications" && (
          <>
            <div className="tm-table"><div className="tm-th"><span style={{ flex: 1 }}>Task</span><span style={{ width: 90 }}>Status</span></div>
              {apps.map((w) => <div key={w.id} className={"tm-tr" + (sel === w.id ? " sel" : "")} onClick={() => setSel(w.id)} onDoubleClick={() => focusWin(w.id)}><span style={{ flex: 1 }}><Icon name={appIcon(w.app)} size={16} /> {w.title}</span><span style={{ width: 90 }}>Running</span></div>)}
              {!apps.length && <div className="tm-empty">No running applications.</div>}</div>
            <div className="tm-btns"><Btn disabled={!sel} onClick={endTask}>End Task</Btn><Btn disabled={!sel} onClick={() => sel && focusWin(sel)}>Switch To</Btn><Btn onClick={() => openApp("run")}>New Task...</Btn></div>
          </>
        )}
        {tab === "Processes" && (
          <>
            <div className="tm-table"><div className="tm-th"><span style={{ flex: 1.4 }}>Image Name</span><span style={{ flex: 1 }}>User Name</span><span style={{ width: 40 }}>CPU</span><span style={{ width: 80, textAlign: "right" }}>Memory</span></div>
              {procs.map((p, i) => <div key={p.id} className={"tm-tr" + (sel === p.id ? " sel" : "")} onClick={() => setSel(p.id)}><span style={{ flex: 1.4 }}>{p.name}</span><span style={{ flex: 1 }}>{p.user}</span><span style={{ width: 40 }}>{p.name === "System Idle Process" ? String(100 - c).padStart(2, "0") : String(i === 10 ? 1 : (p.wins.length ? Math.round(c / (apps.length + 2)) : 0)).padStart(2, "0")}</span><span style={{ width: 80, textAlign: "right" }}>{(p.mem + (tick % 7) * 12).toLocaleString()} K</span></div>)}
            </div>
            <div className="tm-btns"><label><input type="checkbox" defaultChecked /> Show processes from all users</label><Btn disabled={!sel} onClick={endProc}>End Process</Btn></div>
          </>
        )}
        {tab === "Services" && <div className="tm-table"><div className="tm-th"><span style={{ width: 100 }}>Name</span><span style={{ flex: 1 }}>Description</span><span style={{ width: 70 }}>Status</span></div>{SERVICES.map((sv, i) => { const [n, d] = sv.split("|"); return <div key={n} className="tm-tr"><span style={{ width: 100 }}>{n}</span><span style={{ flex: 1 }}>{d}</span><span style={{ width: 70 }}>{i === 7 || i === 1 ? "Stopped" : "Running"}</span></div>; })}</div>}
        {tab === "Performance" && (
          <div className="tm-perf">
            <div className="tm-row"><div className="tm-meter"><div className="tm-bar"><i style={{ height: c + "%" }} /></div><span>{c} %</span></div><div style={{ flex: 1 }}><div className="tm-lab">CPU Usage History</div><Graph data={cpu.current} /></div></div>
            <div className="tm-row"><div className="tm-meter"><div className="tm-bar"><i style={{ height: m + "%" }} /></div><span>{Math.round((total * m) / 100)} MB</span></div><div style={{ flex: 1 }}><div className="tm-lab">Physical Memory Usage History</div><Graph data={mem.current} color="#ffd24c" /></div></div>
            <table className="tm-stats"><tbody>
              <tr><td>Physical Memory (MB)</td><td /><td>System</td><td /></tr>
              <tr><td>Total</td><td>{total}</td><td>Handles</td><td>{(14000 + apps.length * 220 + (tick % 9) * 3).toLocaleString()}</td></tr>
              <tr><td>Cached</td><td>{Math.round(total * 0.32)}</td><td>Threads</td><td>{620 + apps.length * 9}</td></tr>
              <tr><td>Available</td><td>{Math.round((total * (100 - m)) / 100)}</td><td>Processes</td><td>{procs.length}</td></tr>
              <tr><td>Free</td><td>{Math.round((total * (100 - m)) / 200)}</td><td>Up Time</td><td>0:{String(Math.floor(performance.now() / 3600000)).padStart(2, "0")}:{String(Math.floor(performance.now() / 60000) % 60).padStart(2, "0")}:{String(Math.floor(performance.now() / 1000) % 60).padStart(2, "0")}</td></tr>
            </tbody></table>
          </div>
        )}
        {tab === "Networking" && (
          <div className="tm-perf">
            <div className="tm-lab">Local Area Connection</div>
            <Graph data={net.current} color="#4cc8ff" />
            <table className="tm-list"><thead><tr><th>Adapter Name</th><th>Network Utilization</th><th>Link Speed</th><th>State</th></tr></thead><tbody><tr><td>Local Area Connection</td><td>{s.defaults.net === "off" ? "0 %" : net.current[59].toFixed(2) + " %"}</td><td>1 Gbps</td><td>{s.defaults.net === "off" ? "Disconnected" : "Connected"}</td></tr></tbody></table>
          </div>
        )}
        {tab === "Users" && (
          <><div className="tm-table"><div className="tm-th"><span style={{ flex: 1 }}>User</span><span style={{ width: 80 }}>ID</span><span style={{ width: 90 }}>Status</span></div><div className="tm-tr sel"><span style={{ flex: 1 }}>{s.currentUser} (PC\{s.currentUser})</span><span style={{ width: 80 }}>1</span><span style={{ width: 90 }}>Active</span></div></div>
          <div className="tm-btns"><Btn onClick={() => logoff()}>Logoff</Btn><Btn onClick={() => openApp("msgbox")} disabled>Send Message...</Btn></div></>
        )}
      </div>
      <div className="tm-status"><span>Processes: {procs.length}</span><span>CPU Usage: {c}%</span><span>Physical Memory: {m}%</span></div>
      {void tick}{void mkf}{void WALLPAPERS}
    </div>
  );
}

/* =============================================================== Help */
interface Topic { id: string; title: string; body: React.ReactNode; tags: string }
const KEYS: [string, string][] = [["Windows key", "Open or close the Start menu"], ["Windows + D", "Show the desktop (also Ctrl+Alt+D)"], ["Windows + E", "Open Computer (also Ctrl+Alt+E)"], ["Windows + R", "Open Run (also Ctrl+Alt+R)"], ["Windows + L", "Lock the computer (also Ctrl+Alt+L)"], ["Windows + Left/Right", "Snap the active window to a side"], ["Windows + Up/Down", "Maximize / restore or minimize"], ["Windows + M", "Minimize all windows"], ["Alt + Tab", "Switch between open windows"], ["Alt + F4", "Close the active window (also Ctrl+Alt+W)"], ["Ctrl + Esc", "Open the Start menu"], ["Ctrl + C / X / V", "Copy / cut / paste"], ["Ctrl + Z", "Undo the last file operation"], ["Delete / Shift+Delete", "Delete to Recycle Bin / permanently"], ["F2", "Rename the selected item"], ["F5", "Refresh"], ["F11", "Toggle browser full screen"], ["Esc", "Close menus and dialogs"]];
const TOPICS: Topic[] = [
  { id: "start", title: "Getting started with Windows 7", tags: "start welcome basics", body: <><p>Welcome to Windows 7! Here are a few things to try first:</p><ul><li>Click the <b>Start</b> orb to open programs, search for files, or shut down.</li><li>Hover over a taskbar button for a live thumbnail; right-click for a Jump List.</li><li>Click the sliver at the far right of the taskbar to peek at the desktop.</li><li>Right-click the desktop to personalize, change the resolution, or add gadgets.</li></ul></> },
  { id: "taskbar", title: "Using the taskbar", tags: "taskbar pin jump list thumbnails", body: <><p>The taskbar shows pinned and running programs. Drag-free pinning: right-click a program and choose <b>Pin this program to taskbar</b>. Right-click the taskbar and clear <b>Lock the taskbar</b> to drag it to another screen edge, or open <b>Properties</b> for auto-hide and small icons.</p></> },
  { id: "keys", title: "Keyboard shortcuts", tags: "keyboard shortcuts keys alt tab", body: <table className="help-keys"><tbody>{KEYS.map(([k, d]) => <tr key={k}><td><kbd>{k}</kbd></td><td>{d}</td></tr>)}</tbody></table> },
  { id: "files", title: "Manage files and folders with Windows Explorer", tags: "files folders explorer copy move delete recycle", body: <><p>Use Windows Explorer to browse libraries, drives and folders. Drag items between folders, use Ctrl+C / Ctrl+X / Ctrl+V, and press F2 to rename. Deleted items go to the <b>Recycle Bin</b>, where you can restore them or empty it. Everything you create is saved in your browser.</p></> },
  { id: "personalize", title: "Personalize your computer", tags: "theme wallpaper color aero transparency screensaver", body: <><p>Open <b>Control Panel &gt; Personalization</b> to pick an Aero theme, change the desktop background, window color, transparency, sounds and screen saver. Basic and High Contrast themes are also available.</p></> },
  { id: "gadgets", title: "Desktop gadgets", tags: "gadgets clock weather cpu", body: <><p>Right-click the desktop and choose <b>Gadgets</b> to add a clock, calendar, CPU meter, weather, picture puzzle, slideshow or feed headlines. Drag gadgets to move them and use the buttons beside a gadget to close it or keep it on top.</p></> },
  { id: "apps", title: "Using built-in programs", tags: "notepad paint calculator wordpad media player snipping sticky", body: <><p>Windows 7 includes Notepad, WordPad, Paint, Calculator (Standard and Scientific), Windows Media Player, Snipping Tool, Sticky Notes, Sound Recorder, Character Map, Magnifier, Command Prompt and Task Manager. Find them under <b>Start &gt; All Programs &gt; Accessories</b>.</p></> },
  { id: "net", title: "Networking and the Internet", tags: "network internet wifi ie browser", body: <><p>Click the network icon in the notification area to view or disable the connection. Use Internet Explorer to browse; web pages open inside the browser window (some sites do not allow this — use <i>Open in a new browser tab</i>).</p></> },
  { id: "trouble", title: "Troubleshooting problems", tags: "problem error freeze task manager restart", body: <><p>If a program stops responding, open Task Manager (right-click the taskbar &gt; <b>Start Task Manager</b>) and use <b>End Task</b>. To start fresh, restart from the Start menu. You can reset this simulated PC from Control Panel &gt; Action Center.</p></> },
  { id: "users", title: "User accounts and logging on", tags: "user account password login lock", body: <><p>Create accounts and passwords in <b>Control Panel &gt; User Accounts</b>. Lock your computer with Windows + L, or use Switch user / Log off from the arrow beside Shut down.</p></> },
];

export function HelpApp({ win }: { win: Win }) {
  const [hist, setHist] = useState<string[]>(["home"]);
  const [hi, setHi] = useState(0);
  const [q, setQ] = useState("");
  const page = hist[hi];
  const nav = (p: string) => { setHist([...hist.slice(0, hi + 1), p]); setHi(hi + 1); };
  const topic = TOPICS.find((t) => t.id === page);
  const results = q.trim() ? TOPICS.filter((t) => (t.title + t.tags).toLowerCase().includes(q.toLowerCase())) : null;
  return (
    <div className="help">
      <div className="help-bar">
        <button className="navbtn" disabled={hi === 0} onClick={() => setHi(hi - 1)}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 2L4 8l6 6" stroke="#fff" strokeWidth="3" fill="none" /></svg></button>
        <button className="navbtn fwd" disabled={hi >= hist.length - 1} onClick={() => setHi(hi + 1)}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 2l6 6-6 6" stroke="#fff" strokeWidth="3" fill="none" /></svg></button>
        <button className="rb-btn" onClick={() => { setQ(""); nav("home"); }}>⌂ Help home</button>
        <button className="rb-btn" onClick={() => msgBox({ title: "Print", text: "No printer is installed.", icon: "warn" })}>⎙ Print</button>
        <button className="rb-btn" onClick={() => nav("all")}>☰ Browse Help</button>
        <div className="ex-search" style={{ marginLeft: "auto", width: 220 }}><input placeholder="Search Help" value={q} onChange={(e) => setQ(e.target.value)} />{q ? <span className="ex-clear" onClick={() => setQ("")}>✕</span> : null}</div>
      </div>
      <div className="help-main">
        {results ? (
          <div><h2>Search results ({results.length})</h2>{results.map((t) => <div key={t.id} className="help-link"><a onClick={() => { setQ(""); nav(t.id); }}>{t.title}</a></div>)}{!results.length && <p>No results. Try different keywords.</p>}</div>
        ) : topic ? (
          <div><h2>{topic.title}</h2>{topic.body}<p><a onClick={() => setHi(Math.max(0, hi - 1))}>◀ Back</a></p></div>
        ) : page === "all" ? (
          <div><h2>Browse Help topics</h2>{TOPICS.map((t) => <div key={t.id} className="help-link"><Icon name="help" size={16} /> <a onClick={() => nav(t.id)}>{t.title}</a></div>)}</div>
        ) : (
          <div>
            <div className="help-hero"><Icon name="help" size={56} /><div><h1>Windows Help and Support</h1><p>Find answers quickly</p></div></div>
            <div className="help-cols">
              <div><h3>Find an answer quickly</h3>{["start", "taskbar", "keys", "files", "personalize"].map((id) => <div key={id} className="help-link"><a onClick={() => nav(id)}>{TOPICS.find((t) => t.id === id)!.title}</a></div>)}</div>
              <div><h3>More support options</h3><div className="help-link"><a onClick={() => nav("all")}>Browse all Help topics</a></div><div className="help-link"><a onClick={() => openApp("ie")}>Windows website (Internet Explorer)</a></div><div className="help-link"><a onClick={() => openCP("system")}>System information</a></div><div className="help-link"><a onClick={() => openApp("winver")}>About Windows</a></div></div>
            </div>
          </div>
        )}
      </div>
      <div className="help-status">Offline Help | Windows 7 Ultimate</div>
      {void win}{void setState}
    </div>
  );
}

/* ========================================================== Snipping Tool */
async function captureScreen(): Promise<HTMLCanvasElement> {
  const root = document.querySelector(".mag-wrap") as HTMLElement;
  const W = root.clientWidth, H = root.clientHeight;
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const g = out.getContext("2d")!;
  g.fillStyle = "#1d5ba8"; g.fillRect(0, 0, W, H);
  try {
    const clone = root.cloneNode(true) as HTMLElement;
    const srcAll = [root, ...Array.from(root.querySelectorAll("*"))] as HTMLElement[];
    const dstAll = [clone, ...Array.from(clone.querySelectorAll("*"))] as HTMLElement[];
    srcAll.forEach((s, i) => {
      const d = dstAll[i];
      if (!d || !d.style) return;
      const cs = getComputedStyle(s);
      let css = "";
      for (let k = 0; k < cs.length; k++) css += `${cs[k]}:${cs.getPropertyValue(cs[k])};`;
      d.style.cssText = css;
      if (s.tagName === "CANVAS") {
        const img = document.createElement("img");
        try { img.src = (s as unknown as HTMLCanvasElement).toDataURL(); } catch {}
        img.style.cssText = css;
        d.replaceWith(img);
      }
    });
    clone.querySelectorAll("iframe,video,audio,.snip-overlay,.thumbs").forEach((e) => e.remove());
    const xhtml = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("render")); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
    g.drawImage(img, 0, 0, W, H);
  } catch {
    g.fillStyle = "#fff"; g.font = "16px Segoe UI"; g.fillText("Screen capture preview is limited in this browser.", 30, 40);
    getState().windows.filter((w) => !w.min).forEach((w) => { g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(w.x, w.y, w.w, w.h); g.fillStyle = "#000"; g.fillText(w.title, w.x + 10, w.y + 20); });
  }
  return out;
}

export function SnippingTool({ win }: { win: Win }) {
  const [mode, setMode] = useState<"free" | "rect" | "window" | "full">("rect");
  const [cap, setCap] = useState(false);
  const [shot, setShot] = useState<HTMLCanvasElement | null>(null);
  const [pen, setPen] = useState<"pen" | "hi" | "eraser">("pen");
  const [rect, setRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [path, setPath] = useState<[number, number][]>([]);
  const cv = useRef<HTMLCanvasElement>(null);
  const orig = useRef<HTMLCanvasElement | null>(null);
  const root = typeof document !== "undefined" ? document.querySelector(".w7") : null;

  const begin = async (m = mode) => {
    if (m === "full") return finish({ x: 0, y: 0, w: getState().screen.w, h: getState().screen.h });
    setWin(win.id, { min: true });
    setTimeout(() => { setCap(true); setRect(null); setPath([]); }, 220);
  };
  const finish = async (r: { x: number; y: number; w: number; h: number }, free?: [number, number][]) => {
    setCap(false);
    setWin(win.id, { min: true });
    await new Promise((res) => setTimeout(res, 60));
    const full = await captureScreen();
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(r.w)); c.height = Math.max(1, Math.round(r.h));
    const g = c.getContext("2d")!;
    if (free && free.length > 2) {
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      g.save(); g.beginPath(); free.forEach(([x, y], i) => (i ? g.lineTo(x - r.x, y - r.y) : g.moveTo(x - r.x, y - r.y))); g.closePath(); g.clip();
    }
    g.drawImage(full, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
    if (free) g.restore();
    const copy = document.createElement("canvas");
    copy.width = c.width; copy.height = c.height; copy.getContext("2d")!.drawImage(c, 0, 0);
    orig.current = copy;
    setShot(c);
    const wa = workArea(getState());
    setWin(win.id, { min: false, w: Math.min(wa.w - 40, Math.max(420, c.width + 40)), h: Math.min(wa.h - 40, c.height + 120) });
    focusWin(win.id);
  };
  useEffect(() => {
    if (shot && cv.current) { cv.current.width = shot.width; cv.current.height = shot.height; cv.current.getContext("2d")!.drawImage(shot, 0, 0); }
  }, [shot]);

  const overlayDown = (e: React.PointerEvent) => {
    const sc = view.scale;
    if (mode === "window") {
      const el = document.elementsFromPoint(e.clientX, e.clientY).find((x) => (x as HTMLElement).dataset?.win) as HTMLElement | undefined;
      if (el) { const w = getState().windows.find((q) => q.id === el.dataset.win)!; const wa = workArea(getState()); finish(w.max ? { x: wa.x, y: wa.y, w: wa.w, h: wa.h } : { x: w.x, y: w.y, w: w.w, h: w.h }); }
      else finish({ x: 0, y: 0, w: getState().screen.w, h: getState().screen.h });
      return;
    }
    const sx = e.clientX / sc, sy = e.clientY / sc;
    const pts: [number, number][] = [[sx, sy]];
    let r = { x1: sx, y1: sy, x2: sx, y2: sy };
    const mv = (ev: PointerEvent) => {
      const x = ev.clientX / sc, y = ev.clientY / sc;
      if (mode === "free") { pts.push([x, y]); setPath([...pts]); }
      else { r = { x1: sx, y1: sy, x2: x, y2: y }; setRect(r); }
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      if (mode === "free") {
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        const x = Math.min(...xs), y = Math.min(...ys);
        finish({ x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }, pts);
      } else {
        const x = Math.min(r.x1, r.x2), y = Math.min(r.y1, r.y2);
        if (Math.abs(r.x2 - r.x1) < 3 || Math.abs(r.y2 - r.y1) < 3) { setCap(false); setWin(win.id, { min: false }); focusWin(win.id); return; }
        finish({ x, y, w: Math.abs(r.x2 - r.x1), h: Math.abs(r.y2 - r.y1) });
      }
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = cv.current!;
    const g = c.getContext("2d")!;
    const rc = c.getBoundingClientRect();
    const p = (ev: { clientX: number; clientY: number }) => ({ x: ((ev.clientX - rc.left) / rc.width) * c.width, y: ((ev.clientY - rc.top) / rc.height) * c.height });
    let last = p(e);
    const mv = (ev: PointerEvent) => {
      const n = p(ev);
      g.lineCap = "round"; g.lineJoin = "round";
      if (pen === "eraser") { g.globalCompositeOperation = "source-over"; if (orig.current) { g.save(); g.beginPath(); g.arc(n.x, n.y, 10, 0, 7); g.clip(); g.drawImage(orig.current, 0, 0); g.restore(); } }
      else { g.strokeStyle = pen === "pen" ? "#d00" : "rgba(255,240,0,.45)"; g.lineWidth = pen === "pen" ? 2.5 : 14; g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(n.x, n.y); g.stroke(); }
      last = n;
    };
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const saveSnip = () => openFileDialog({ mode: "save", exts: ["png", "jpg"], name: "Capture.png", start: "pics", onDone: (id, nm, dir) => { const d = cv.current!.toDataURL(extOf(nm) === "jpg" ? "image/jpeg" : "image/png"); if (id) import("../store").then((m) => m.writeFile(id, d)); else mkfile(dir, nm, d); notify({ title: "Snipping Tool", text: "Snip saved.", icon: "info" }); } });
  const copyImg = () => cv.current!.toBlob((b) => { if (b && navigator.clipboard && "write" in navigator.clipboard) navigator.clipboard.write([new ClipboardItem({ "image/png": b })]).then(() => notify({ title: "Snipping Tool", text: "Snip copied to clipboard.", icon: "info" })).catch(() => msgBox({ title: "Snipping Tool", text: "Clipboard access was blocked.", icon: "warn" })); });
  const modeMenu = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    import("../store").then((m) => m.showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, ([["free", "Free-form Snip"], ["rect", "Rectangular Snip"], ["window", "Window Snip"], ["full", "Full-screen Snip"]] as const).map(([k, l]) => ({ label: l, checked: mode === k, radio: true, onClick: () => { setMode(k); begin(k); } }))));
  };
  const bb = rect ? { left: Math.min(rect.x1, rect.x2), top: Math.min(rect.y1, rect.y2), width: Math.abs(rect.x2 - rect.x1), height: Math.abs(rect.y2 - rect.y1) } : null;
  return (
    <div className="snip">
      <div className="snip-bar">
        <button className="rb-btn" onClick={() => begin()}><Icon name="snip" size={20} /> New</button><button className="rb-btn" onClick={modeMenu}>▾</button>
        {shot && <><span className="sep" /><button className="rb-btn" onClick={saveSnip}>💾 Save Snip</button><button className="rb-btn" onClick={copyImg}>⎘ Copy</button><button className="rb-btn" onClick={() => msgBox({ title: "Send Snip", text: "No e-mail program is configured.", icon: "info" })}>✉ Send</button><span className="sep" /><button className={"rb-btn" + (pen === "pen" ? " on" : "")} onClick={() => setPen("pen")}>✎ Pen</button><button className={"rb-btn" + (pen === "hi" ? " on" : "")} onClick={() => setPen("hi")}>▮ Highlighter</button><button className={"rb-btn" + (pen === "eraser" ? " on" : "")} onClick={() => setPen("eraser")}>▭ Eraser</button><button className="rb-btn" onClick={() => { setShot(null); setWin(win.id, { w: 420, h: 150 }); }}>✕ Delete</button></>}
      </div>
      {shot ? <div className="snip-view"><canvas ref={cv} onPointerDown={draw} style={{ cursor: "crosshair" }} /></div> : <div className="snip-hint">Click the New button, or click the arrow next to the New button to choose a snip type: <b>{{ free: "Free-form Snip", rect: "Rectangular Snip", window: "Window Snip", full: "Full-screen Snip" }[mode]}</b></div>}
      {cap && root && createPortal(
        <div className="snip-overlay" onPointerDown={overlayDown} onKeyDown={() => {}}>
          <div className="snip-msg">{mode === "window" ? "Click a window to capture it" : "Drag to select the area to capture — press Esc to cancel"}</div>
          {bb && <div className="snip-rect" style={bb} />}
          {path.length > 1 && <svg className="snip-free"><polyline points={path.map((p) => p.join(",")).join(" ")} fill="none" stroke="#d00" strokeWidth="2" /></svg>}
          <button className="snip-cancel" onPointerDown={(e) => { e.stopPropagation(); setCap(false); setWin(win.id, { min: false }); focusWin(win.id); }}>Cancel</button>
        </div>, root)}
      {void Btn}{void closeWin}
    </div>
  );
}

/* ============================================================ Minesweeper */
const LEVELS = { Beginner: [9, 9, 10], Intermediate: [16, 16, 40], Expert: [30, 16, 99] } as const;
type Cell = { m: boolean; o: boolean; f: boolean; n: number };
export function Minesweeper({ win }: { win: Win }) {
  const [lvl, setLvl] = useState<keyof typeof LEVELS>("Beginner");
  const [[cols, rows, mines]] = [LEVELS[lvl]];
  const make = (): Cell[] => Array.from({ length: cols * rows }, () => ({ m: false, o: false, f: false, n: 0 }));
  const [cells, setCells] = useState<Cell[]>(make);
  const [state, setState2] = useState<"ready" | "play" | "won" | "lost">("ready");
  const [time, setTime] = useState(0);
  const [down, setDown] = useState(false);
  const reset = (l = lvl) => { const [c, r] = LEVELS[l]; setCells(Array.from({ length: c * r }, () => ({ m: false, o: false, f: false, n: 0 }))); setState2("ready"); setTime(0); };
  useEffect(() => { setWin(win.id, { w: cols * 24 + 34, h: rows * 24 + 130 }); reset(lvl); }, [lvl]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (state !== "play") return;
    const i = setInterval(() => setTime((t) => Math.min(999, t + 1)), 1000);
    return () => clearInterval(i);
  }, [state]);
  const nb = (i: number) => { const x = i % cols, y = Math.floor(i / cols); const o: number[] = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) o.push(ny * cols + nx); } return o; };
  const open = (i: number) => {
    if (state === "won" || state === "lost" || cells[i].f || cells[i].o) return;
    let cs = cells.map((c) => ({ ...c }));
    if (state === "ready") {
      let placed = 0;
      while (placed < mines) { const k = Math.floor(Math.random() * cs.length); if (!cs[k].m && k !== i && !nb(i).includes(k)) { cs[k].m = true; placed++; } }
      cs.forEach((c, k) => (c.n = nb(k).filter((j) => cs[j].m).length));
      setState2("play");
    }
    if (cs[i].m) { cs.forEach((c) => { if (c.m) c.o = true; }); setCells(cs); setState2("lost"); return; }
    const st = [i];
    while (st.length) { const k = st.pop()!; if (cs[k].o || cs[k].f) continue; cs[k].o = true; if (cs[k].n === 0) nb(k).forEach((j) => !cs[j].o && st.push(j)); }
    setCells(cs);
    if (cs.every((c) => c.m || c.o)) { setState2("won"); setCells(cs.map((c) => (c.m ? { ...c, f: true } : c))); }
  };
  const flag = (e: React.MouseEvent, i: number) => { e.preventDefault(); if (state === "won" || state === "lost" || cells[i].o) return; setCells(cells.map((c, k) => (k === i ? { ...c, f: !c.f } : c))); };
  const left = mines - cells.filter((c) => c.f).length;
  const led = (n: number) => String(Math.max(-99, Math.min(999, n))).padStart(3, "0");
  const menus = [{ label: "Game", items: (): MenuItem[] => [{ label: "New", shortcut: "F2", onClick: () => reset() }, { sep: true }, ...(Object.keys(LEVELS) as (keyof typeof LEVELS)[]).map((k) => ({ label: k, checked: lvl === k, radio: true, onClick: () => setLvl(k) })), { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }] }, { label: "Help", items: (): MenuItem[] => [{ label: "Help", onClick: () => openApp("help") }] }];
  const colors = ["", "#0000ff", "#008000", "#ff0000", "#000080", "#800000", "#008080", "#000", "#808080"];
  return (
    <div className="mines" onKeyDown={(e) => e.key === "F2" && reset()} tabIndex={0}>
      <MenuBar menus={menus} />
      <div className="mines-body">
        <div className="mines-head"><div className="led">{led(left)}</div><button className="smiley" onClick={() => reset()}>{state === "lost" ? "😵" : state === "won" ? "😎" : down ? "😮" : "🙂"}</button><div className="led">{led(time)}</div></div>
        <div className="mines-grid" style={{ gridTemplateColumns: `repeat(${cols}, 24px)` }} onPointerDown={() => setDown(true)} onPointerUp={() => setDown(false)} onPointerLeave={() => setDown(false)}>
          {cells.map((c, i) => (
            <div key={i} className={"mc" + (c.o ? " open" : "")} onClick={() => open(i)} onContextMenu={(e) => flag(e, i)} style={{ color: colors[c.n] }}>
              {c.o ? (c.m ? "💣" : c.n || "") : c.f ? "🚩" : ""}
            </div>
          ))}
        </div>
      </div>
      {void lock}
    </div>
  );
}
