"use client";
/**
 * Windows PowerShell (powershell.exe).
 *
 * A working command shell with the cmdlets that make sense on a simulated PC:
 * the file-system verbs operate on the same virtual file system Explorer shows,
 * Get-Process / Get-Service read the live process and service state, and
 * pipelines (`| Where-Object`, `| Sort-Object`, `| Select-Object -First`,
 * `| Measure-Object`) really filter the objects passed down the pipe.
 */
import React, { useEffect, useRef, useState } from "react";
import { children, resolvePath, pathOf, getState, Win, closeWin, runCommand, mkdir, mkfile, deleteForever, copyNodes, moveNodes, renameNode, writeFile } from "../store";
import { APPS } from "../registry";
import { getEvents } from "../kernel";
import { SERVICE_DEFS, services, startService, stopService } from "../services";

type Row = Record<string, string | number>;
type Emit = { rows: Row[]; text: string[] };

const flat = (text: string[]): Row[] => text.map((t) => ({ _text: t }));
const MARK = "$_";
const VALUE = "PS_VALUE"; // a pipeline that produced one scalar

const HELP: [string, string][] = [
  ["Add-Content", "Adds content to the specified items."],
  ["Clear-Host", "Clears the screen."],
  ["Copy-Item", "Copies an item from one location to another."],
  ["Get-ChildItem", "Gets the items and child items in one or more locations."],
  ["Get-Command", "Gets all commands available to PowerShell."],
  ["Get-Content", "Gets the content of the item at the location."],
  ["Get-Date", "Gets the current date and time."],
  ["Get-EventLog", "Gets events from the Windows Event Log."],
  ["Get-Help", "Displays information about commands."],
  ["Get-HotFix", "Gets the hotfixes applied to the local computer."],
  ["Get-Location", "Gets information about the current working location."],
  ["Get-Process", "Gets the processes running on the local computer."],
  ["Get-Service", "Gets the services on the computer."],
  ["Get-Volume", "Gets the volumes on the computer."],
  ["Get-WmiObject", "Gets WMI object instances."],
  ["Move-Item", "Moves an item from one location to another."],
  ["New-Item", "Creates a new item."],
  ["Remove-Item", "Deletes the specified items."],
  ["Rename-Item", "Renames an item in a namespace."],
  ["Select-Object", "Selects objects or object properties."],
  ["Set-Content", "Writes new content or replaces existing content in a file."],
  ["Sort-Object", "Sorts objects by property values."],
  ["Start-Process", "Starts one or more processes."],
  ["Start-Service", "Starts one or more stopped services."],
  ["Stop-Process", "Stops one or more running processes."],
  ["Stop-Service", "Stops one or more running services."],
  ["Test-Connection", "Sends ICMP echo request packets to another computer."],
  ["Where-Object", "Selects objects from a collection based on their values."],
  ["Write-Host", "Writes customized output to a host."],
  ["Write-Output", "Sends the specified objects to the next command in the pipeline."],
];

/** Split a pipeline into stages, respecting quotes. */
function stages(line: string): string[] {
  const out: string[] = [];
  let cur = "", q: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { cur += ch; if (ch === q) q = null; }
    else if (ch === '"' || ch === "'") { q = ch; cur += ch; }
    else if (ch === "|") { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

/**
 * Compare `$_.Prop -op value`, the form Where-Object takes a script block in.
 * Returns true/false, or null when the script is not a simple comparison.
 */
function testScript(row: Row, script: string): boolean | null {
  const m = /^\$_\s*\.?\s*(\w+)?\s*(-\w+)\s*(.+)$/.exec(script.trim().replace(/^\{|\}$/g, "").trim());
  if (!m) return null;
  const [, prop, op, rawRaw] = m;
  const raw = rawRaw.trim().replace(/^["']|["']$/g, "");
  const val = prop ? row[prop] : row[MARK];
  if (val === undefined) return false;
  const sval = String(val).toLowerCase(), sr = raw.toLowerCase();
  switch (op.toLowerCase()) {
    case "-eq": return String(val).toLowerCase() === sr;
    case "-ne": return String(val).toLowerCase() !== sr;
    case "-like": {
      const rx = new RegExp("^" + raw.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
      return rx.test(String(val));
    }
    case "-notlike": return !new RegExp("^" + raw.replace(/\*/g, ".*") + "$", "i").test(String(val));
    case "-match": try { return new RegExp(raw, "i").test(String(val)); } catch { return false; }
    case "-gt": return Number(val) > Number(raw) || (!isNaN(Number(val)) ? false : sval > sr);
    case "-lt": return Number(val) < Number(raw);
    case "-ge": return Number(val) >= Number(raw);
    case "-le": return Number(val) <= Number(raw);
    case "-contains": return String(val).toLowerCase().includes(sr);
    default: return null;
  }
}

function sizeStr(n: number): string {
  if (n < 1024) return n.toLocaleString();
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export function PowerShell({ win }: { win: Win }) {
  const [lines, setLines] = useState<Row[]>(() => [
    { _text: "Windows PowerShell" },
    { _text: "Copyright (C) 2009 Microsoft Corporation. All rights reserved." },
    { _text: "" },
  ]);
  const [cwd, setCwd] = useState("home");
  const [input, setInput] = useState("");
  const hist = useRef<string[]>([]);
  const hi = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const inp = useRef<HTMLInputElement>(null);

  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [lines, input]);
  useEffect(() => { inp.current?.focus(); }, []);

  const prompt = (c = cwd) => "PS " + pathOf(c) + "> ";

  const emit = (rows: Row[]) => setLines((l) => [...l, ...rows]);

  /* ------------------------------------------------------------- cmdlets */
  const runStage = (stage: string, pipe: Row[], cwdIn: string): { rows: Row[]; cwd?: string; clear?: boolean; exit?: boolean } => {
    const tokens = stage.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const name = (tokens.shift() || "").replace(/^["']|["']$/g, "");
    const args = tokens.map((t) => t.replace(/^["']|["']$/g, ""));
    const named = (flag: string) => { const i = args.findIndex((a) => a.toLowerCase() === flag.toLowerCase()); return i >= 0 ? args[i + 1] : undefined; };
    const positional = args.filter((a, i) => !a.startsWith("-") && !(i > 0 && args[i - 1].startsWith("-")));
    const alias: Record<string, string> = {
      ls: "Get-ChildItem", dir: "Get-ChildItem", gci: "Get-ChildItem", pwd: "Get-Location", gl: "Get-Location", cd: "Set-Location", chdir: "Set-Location",
      cat: "Get-Content", gc: "Get-Content", type: "Get-Content", echo: "Write-Output", write: "Write-Output", ps: "Get-Process", gps: "Get-Process",
      gsv: "Get-Service", cls: "Clear-Host", clear: "Clear-Host", help: "Get-Help", man: "Get-Help", md: "New-Item", mkdir: "New-Item",
      rm: "Remove-Item", del: "Remove-Item", erase: "Remove-Item", cp: "Copy-Item", copy: "Copy-Item", mv: "Move-Item", move: "Move-Item",
      ren: "Rename-Item", rni: "Rename-Item", sc: "Set-Content", si: "Start-Process", start: "Start-Process", kill: "Stop-Process",
      spps: "Stop-Process", sort: "Sort-Object", select: "Select-Object", where: "Where-Object", misura: "Measure-Object",
      ping: "Test-Connection", gal: "Get-ChildItem", gp: "Get-ItemProperty", gv: "Get-Volume",
    };
    const cmd = alias[name.toLowerCase()] || (HELP.find(([n]) => n.toLowerCase() === name.toLowerCase())?.[0]) || name;

    /** resolve an argument (or the pipeline value) to a file-system id */
    const resolve = (a?: string): string | null => {
      if (!a) return cwdIn;
      const p = a.trim();
      if (p === ".") return cwdIn;
      if (p === "..") return getState().fs[cwdIn]?.parent || cwdIn;
      const id = resolvePath(p, cwdIn);
      if (id) return id;
      // wildcards: *.txt
      if (/[*?]/.test(p)) {
        const rx = new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
        const hit = children(cwdIn).find((n) => rx.test(n.name));
        return hit ? hit.id : null;
      }
      return null;
    };
    const scoped = (a?: string): { parent: string; match?: RegExp | null } => {
      if (!a) return { parent: cwdIn, match: null };
      if (/[*?]/.test(a)) {
        const rx = new RegExp("^" + a.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
        return { parent: cwdIn, match: rx };
      }
      return { parent: resolve(a) || cwdIn, match: null };
    };

    switch (cmd) {
      case "Get-ChildItem": {
        if (pipe.length) return { rows: pipe };
        const target = resolve(positional[0]);
        const f = getState().fs;
        if (!target) return { rows: flat([`Get-ChildItem : Cannot find path '${positional[0]}' because it does not exist.`]) };
        const node = f[target];
        const kids = node.type === "file" ? [node] : children(target).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
        return {
          rows: kids.map((k) => ({
            Mode: k.type === "folder" ? "d-----" : "-------",
            "LastWriteTime": new Date(k.modified).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
            Length: k.type === "folder" ? "" : sizeStr(k.size),
            Name: k.name,
            _kind: k.type,
            _id: k.id,
          })),
        };
      }
      case "Get-Location": return { rows: flat(["", `Path`, `----`, pathOf(cwdIn), ""]) };
      case "Set-Location": {
        const id = resolve(positional[0]);
        if (!id || getState().fs[id]?.type !== "folder") return { rows: flat([`Set-Location : Cannot find path '${positional[0] || ""}' because it does not exist.`]) };
        return { rows: [], cwd: id };
      }
      case "New-Item": {
        const isDir = args.some((a) => a.toLowerCase() === "-itemtype" && args[args.indexOf(a) + 1]?.toLowerCase() === "directory");
        const nm = positional[0] || named("-Name");
        if (!nm) return { rows: flat(["New-Item : Cannot bind argument to parameter 'Path' because it is null."]) };
        const parts = nm.split(/[\\/]/).filter(Boolean);
        const leaf = parts.pop()!;
        const parent = parts.length ? resolve(parts.join("\\")) || cwdIn : cwdIn;
        if (!getState().fs[parent]) return { rows: flat([`New-Item : Cannot find path '${nm}' because it does not exist.`]) };
        if (children(parent).some((k) => k.name.toLowerCase() === leaf.toLowerCase())) return { rows: flat([`New-Item : An item with the specified name ${leaf} already exists.`]) };
        const makeDir = isDir || !/\.[a-z0-9]{2,4}$/i.test(leaf);
        const newId = makeDir ? mkdir(parent, leaf) : mkfile(parent, leaf, "");
        void newId;
        return {
          rows: flat([
            "", `    Directory: ${pathOf(parent)}`, "",
            "Mode                LastWriteTime         Length Name",
            "----                -------------         ------ ----",
            `${makeDir ? "d-----" : "-a---"}   ${new Date().toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} ${makeDir ? "         " : "        0"} ${leaf}`,
            "",
          ]),
        };
      }
      case "Remove-Item": {
        const sc = scoped(positional[0]);
        const victims = getState().fs[sc.parent]?.type === "folder" ? children(sc.parent).filter((k) => !sc.match || sc.match.test(k.name)) : [];
        if (!victims.length) return { rows: flat([`Remove-Item : Cannot find path '${positional[0] || ""}' because it does not exist.`]) };
        deleteForever(victims.map((v) => v.id));
        return { rows: [] };
      }
      case "Copy-Item": {
        const src = resolve(positional[0]);
        const dst = resolve(positional[1]) || cwdIn;
        if (!src) return { rows: flat(["Copy-Item : Cannot find path because it does not exist."]) };
        copyNodes([src], getState().fs[dst]?.type === "folder" ? dst : getState().fs[dst]?.parent || cwdIn);
        return { rows: [] };
      }
      case "Move-Item": {
        const src = resolve(positional[0]);
        const dst = resolve(positional[1]);
        if (!src || !dst || getState().fs[dst]?.type !== "folder") return { rows: flat(["Move-Item : Cannot find path because it does not exist."]) };
        moveNodes([src], dst);
        return { rows: [] };
      }
      case "Rename-Item": {
        const src = resolve(positional[0]);
        const nm = positional[1] || named("-NewName");
        if (!src || !nm) return { rows: flat(["Rename-Item : Cannot bind argument to parameter 'NewName' because it is null."]) };
        renameNode(src, nm);
        return { rows: [] };
      }
      case "Get-Content": {
        const id = resolve(positional[0]);
        if (!id || !getState().fs[id]) return { rows: flat([`Get-Content : Cannot find path '${positional[0] || ""}' because it does not exist.`]) };
        const n = getState().fs[id];
        if (n.type === "folder") return { rows: flat(["Get-Content : Access to the path is denied."]) };
        const body = (n.content || "").startsWith("data:") ? "(binary file)" : n.content || "";
        return { rows: flat(body.split(/\r?\n/)) };
      }
      case "Set-Content": {
        const id = args.find((a) => !a.startsWith("-"));
        const value = args.filter((a) => a !== id).join(" ");
        const target = id ? resolve(id) : null;
        if (!target) return { rows: flat(["Set-Content : Cannot find path because it does not exist."]) };
        writeFile(target, value);
        return { rows: [] };
      }
      case "Get-Process": {
        if (pipe.length) return { rows: pipe };
        const wins = getState().windows.filter((w) => !APPS[w.app].noTask);
        const base: [string, number, number][] = [["System", 4, 620], ["smss", 316, 424], ["csrss", 412, 3120], ["wininit", 500, 980], ["services", 580, 4612], ["lsass", 612, 6104], ["svchost", 940, 9480], ["svchost", 1136, 6812], ["dwm", 1640, 21840], ["explorer", 2088, 58412], ["audiodg", 2412, 12488]];
        const rows: [string, number, number][] = [...base, ...wins.map((w, i) => [(APPS[w.app].exe || w.app + ".exe").replace(/\.exe$/, ""), 3000 + i * 44, 9000 + i * 3200] as [string, number, number]), ["powershell", 4104, 41200] as [string, number, number]];
        return {
          rows: rows.map(([n, id, mem]) => ({
            Handles: 120 + (id % 340), NPM: 30 + (id % 12), PM: mem, WS: mem, VM: mem * 3, CPU: (id % 7) / 10, Id: id, ProcessName: n,
          })),
        };
      }
      case "Stop-Process": {
        const idArg = named("-Id") || named("-Name");
        const pidn = Number(idArg || named("-Name"));
        if (idArg && !isNaN(pidn)) {
          const w = getState().windows[pidn - 3000];
          if (w && pidn >= 3000) { closeWin(w.id, true); return { rows: [] }; }
          return { rows: flat([`Stop-Process : Cannot find a process with the identifier ${pidn}.`]) };
        }
        if (name && idArg) {
          const hits = getState().windows.filter((w) => (APPS[w.app].exe || "").toLowerCase() === (idArg.toLowerCase() + ".exe"));
          if (!hits.length) return { rows: flat([`Stop-Process : Cannot find a process with the name "${idArg}".`]) };
          hits.forEach((w) => closeWin(w.id, true));
          return { rows: [] };
        }
        return { rows: flat(["Stop-Process : Missing an argument for parameter 'Id'. Specify a parameter of type 'System.Int32[]'."]) };
      }
      case "Get-Service": {
        if (pipe.length) return { rows: pipe };
        const all = services();
        return {
          rows: SERVICE_DEFS.map((d) => ({ Status: all[d.key].running ? "Running" : "Stopped", Name: d.key, DisplayName: d.display })),
        };
      }
      case "Start-Service":
      case "Stop-Service": {
        const which = positional[0] || named("-Name") || "";
        const hit = SERVICE_DEFS.filter((d) => d.key.toLowerCase() === which.toLowerCase() || d.display.toLowerCase() === which.toLowerCase());
        if (!hit.length) return { rows: flat([`${cmd} : Cannot find any service with service name '${which}'.`]) };
        hit.forEach((d) => (cmd === "Start-Service" ? startService(d.key) : stopService(d.key, true)));
        return { rows: [] };
      }
      case "Get-EventLog": {
        const n = Number(named("-Newest") || 10);
        return {
          rows: getEvents().slice(0, n).map((e) => ({ Index: e.id, Time: new Date(e.time).toLocaleTimeString("en-US", { hour12: false }), EntryType: e.level, Source: e.source, Message: e.text.slice(0, 90) })),
        };
      }
      case "Get-Volume":
        return {
          rows: Object.values(getState().fs).filter((n) => n.letter).map((d) => ({ DriveLetter: (d.letter || "C").replace(":", ""), FileSystemLabel: d.label || "", FileSystem: "NTFS", Size: sizeStr(d.total || 0), SizeRemaining: sizeStr(d.free || 0) })),
        };
      case "Get-HotFix":
        return { rows: [1, 2, 3, 4].map((i) => ({ Source: "PC", Description: "Update", HotFixID: ["KB976932", "KB3000483", "KB2813347", "KB2598845"][i - 1], InstalledOn: ["1/12/2011", "3/11/2011", "4/9/2013", "11/2/2014"][i - 1] })) };
      case "Get-WmiObject":
      case "Get-CimInstance":
        return { rows: flat(["", "Manufacturer          Model            TotalPhysicalMemory", "------------          -----            -------------------", "Microsoft Corporation  Virtual Machine  8589934592", ""]) };
      case "Get-Date":
        return { rows: flat([new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })]) };
      case "Test-Connection": {
        const host = positional[0] || "localhost";
        const on = getState().settings.defaults.net !== "off";
        return {
          rows: [1, 2, 3, 4].map((i) => ({ Source: "PC", Destination: on ? host : "?", IPV4Address: on ? "93.184.216.34" : "", ResponseTime: on ? 20 + i * 3 : "", TimeToLive: on ? 56 : "" })),
        };
      }
      case "Get-Command":
        return { rows: HELP.map(([n]) => ({ CommandType: "Cmdlet", Name: n, ModuleName: "Microsoft.PowerShell.Management" })) };
      case "Get-Help": {
        const about = positional[0];
        if (!about) return { rows: flat(["", "Name  Category  Module  Synopsis", "----  --------  ------  --------", ...HELP.map(([n, s]) => `${n.padEnd(18)} Cmdlet            ${s}`), ""]) };
        const hit = HELP.find(([n]) => n.toLowerCase() === about.toLowerCase());
        if (!hit) return { rows: flat([`Get-Help : Cannot find Help for topic "${about}".`]) };
        return { rows: flat(["", `NAME`, `    ${hit[0]}`, "", "SYNOPSIS", `    ${hit[1]}`, "", "SYNTAX", `    ${hit[0]} [[-Path] <String[]>] [-Force]`, "", "REMARKS", "    Get-Help cannot find the Help files for this cmdlet on this computer.", ""]) };
      }
      case "Write-Output":
      case "Write-Host": {
        if (!args.length) return { rows: pipe };
        const text = args.join(" ").replace(/-(fore|back)groundcolor\s+\w+/gi, "").trim();
        return { rows: flat([text]) };
      }
      case "Clear-Host": return { rows: [], clear: true };
      case "Start-Process": {
        const p = positional[0] || named("-FilePath") || "";
        if (!runCommand(p)) return { rows: flat([`Start-Process : This command cannot be run due to the error: The system cannot find the file specified.`]) };
        return { rows: [] };
      }
      case "Where-Object": {
        const script = stage.slice(stage.indexOf(cmd) + cmd.length).trim() || args.join(" ");
        const keep = pipe.filter((r) => testScript(r, script) === true);
        return { rows: keep };
      }
      case "Sort-Object": {
        const prop = positional[0] || "Name";
        const desc = args.some((a) => a.toLowerCase() === "-descending");
        const out = [...pipe].sort((a, b) => String(a[prop] ?? "").localeCompare(String(b[prop] ?? ""), undefined, { numeric: true }));
        return { rows: desc ? out.reverse() : out };
      }
      case "Select-Object": {
        const first = Number(named("-First") || 0);
        const last = Number(named("-Last") || 0);
        const propIdx = args.findIndex((a) => a.toLowerCase() === "-property");
        const props = propIdx >= 0 ? args.slice(propIdx + 1).filter((a) => !a.startsWith("-")) : [];
        let out = pipe;
        if (first) out = out.slice(0, first);
        else if (last) out = out.slice(-last);
        if (props.length) out = out.map((r) => Object.fromEntries(props.map((p) => [p, r[p] ?? ""])));
        return { rows: out };
      }
      case "Measure-Object": {
        const nums = pipe.map((r) => Number(r.Count ?? r.Length ?? r.PS ?? 0)).filter((n) => !isNaN(n));
        return { rows: [{ Count: pipe.length, Average: nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0, Sum: nums.reduce((a, b) => a + b, 0), Maximum: Math.max(0, ...nums), Minimum: Math.min(...nums) }] };
      }
      case "Get-Item": return runStage("Get-ChildItem -Force " + (positional[0] || ""), [], cwdIn);
      case "Get-ItemProperty": return { rows: flat([`    Hive: HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion`, "", "Name          Property", "----          --------", "Themes        CurrentTheme : C:\\Windows\\Resources\\Themes\\Aero\\aero.msstyles"]) };
      case "Exit": return { rows: [], exit: true };
      default:
        return { rows: flat([`${name} : The term '${name}' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.`]) };
    }
  };

  const run = (raw: string) => {
    const line = raw.trim();
    if (!line) return;
    const parts = stages(line);
    const p = prompt();
    let cur = cwd;
    let rows: Row[] = [];
    let clear = false;
    for (const st of parts) {
      const r = runStage(st, rows, cur);
      if (r.cwd) cur = r.cwd;
      if (r.clear) clear = true;
      if (r.exit) { closeWin(win.id, true); return; }
      rows = r.rows;
    }
    setCwd(cur);
    if (clear) { setLines([{ _text: p + line }]); return; }
    setLines((l) => [...l, { _text: p + line }, ...rows]);
  };

  /* ------------------------------------------------------------ rendering */
  const renderRows = (rows: Row[], base: number) => {
    const out: React.ReactNode[] = [];
    let i = 0;
    while (i < rows.length) {
      const r = rows[i];
      if (r._text !== undefined) { out.push(<div key={base + i} className="psh-l">{String(r._text) || "\u00a0"}</div>); i++; continue; }
      // group the consecutive objects with the same shape into one table
      const keys = Object.keys(r).filter((k) => !k.startsWith("_"));
      const group: Row[] = [];
      while (i < rows.length && rows[i]._text === undefined && Object.keys(rows[i]).filter((k) => !k.startsWith("_")).join("|") === keys.join("|")) { group.push(rows[i]); i++; }
      out.push(
        <div key={"t" + base + i} className="psh-table">
          <div className="psh-tr h">{keys.map((k) => <span key={k} style={{ width: Math.max(9, ...group.map((g) => String(g[k] ?? "").length)) * 7.2 }}>{k}</span>)}</div>
          {group.map((g, gi) => (
            <div key={gi} className="psh-tr">
              {keys.map((k) => <span key={k} style={{ width: Math.max(9, ...group.map((x) => String(x[k] ?? "").length)) * 7.2 }}>{String(g[k] ?? "")}</span>)}
            </div>
          ))}
        </div>
      );
    }
    return out;
  };

  return (
    <div className="psh" style={{ flex: "1 1 auto" }} ref={box} onClick={() => inp.current?.focus()} onContextMenu={(e) => { e.preventDefault(); import("../store").then((m) => m.showMenu(e, [{ label: "Mark", onClick: () => {} }, { label: "Copy", onClick: () => {} }, { sep: true }, { label: "Clear Screen", onClick: () => setLines([]) }, { label: "Close", onClick: () => closeWin(win.id) }])); }}>
      {renderRows(lines, 0)}
      <div className="psh-line">
        <span className="psh-prompt">{prompt()}</span>
        <input ref={inp} value={input} spellCheck={false} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") { hist.current.push(input); hi.current = hist.current.length; run(input); setInput(""); }
          else if (e.key === "ArrowUp") { e.preventDefault(); if (hi.current > 0) { hi.current--; setInput(hist.current[hi.current] || ""); } }
          else if (e.key === "ArrowDown") { e.preventDefault(); if (hi.current < hist.current.length - 1) { hi.current++; setInput(hist.current[hi.current]); } else { hi.current = hist.current.length; setInput(""); } }
          else if (e.key === "Tab") {
            e.preventDefault();
            const w = input.split(" "); const last = w.pop() || "";
            const hit = children(cwd).find((k) => k.name.toLowerCase().startsWith(last.toLowerCase()));
            if (hit) setInput([...w, hit.name.includes(" ") ? `"${hit.name}"` : hit.name].join(" "));
            else { const c = HELP.map(([n]) => n).find((n) => n.toLowerCase().startsWith(last.toLowerCase())); if (c) setInput([...w, c].join(" ")); }
          }
        }} />
      </div>
    </div>
  );
}
