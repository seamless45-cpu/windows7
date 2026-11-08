"use client";
/**
 * Task Scheduler (taskschd.msc).
 *
 * The same three-pane layout MMC uses: the library tree on the left, the task
 * list plus the General / Triggers / Actions / Conditions / Settings / History
 * tabs in the middle, and the Actions pane on the right. Running a task really
 * runs it here — it moves to *Running* for a moment, records a Last Run Time and
 * a result code, and writes entries to the task's own history.
 */
import React, { useState } from "react";
import { Win, closeWin, openApp, notify, msgBox, promptBox, lsGet, lsSet, MenuItem } from "../store";
import { MenuBar, Btn } from "../ui";
import { Icon } from "../icons";
import { logEvent } from "../kernel";

interface Hist { at: number; event: number; level: "Information" | "Warning" | "Error"; text: string }
interface Task {
  id: string;
  name: string;
  folder: string;
  status: "Ready" | "Running" | "Disabled";
  trigger: string;
  next: string;
  last: string;
  result: string;
  author: string;
  action: string;
  args: string;
  conditions: string[];
  settings: string[];
  hist: Hist[];
}

const now = () => Date.now();
/** A GUID-ish instance id for the "launched instance {…}" history line. */
let instanceSeq = 0;
const nextInstance = () => (++instanceSeq).toString(16).padStart(4, "0") + Date.now().toString(16).slice(-6);

const fmt = (t: number) => new Date(t).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const T = (id: string, name: string, folder: string, trigger: string, action: string, author = "Microsoft Corporation"): Task => ({
  id, name, folder, status: "Ready", trigger, next: "11/8/2026 3:00:00 AM", last: "11/7/2026 3:00:00 AM", result: "0x0",
  author, action, args: "", hist: [{ at: now() - 3600e3, event: 102, level: "Information", text: "Task completed with return code 0." }],
  conditions: ["Start the task only if the computer is on AC power", "Stop if the computer switches to battery power"],
  settings: ["Allow task to be run on demand", "Run task as soon as possible after a scheduled start is missed", "Stop the task if it runs longer than 3 days"],
});

const DEFAULT_TASKS: Task[] = [
  T("t1", "Microsoft\\Windows\\Defrag\\ScheduledDefrag", "\\Microsoft\\Windows\\Defrag", "Weekly, Sunday at 1:00 AM", "C:\\Windows\\system32\\defrag.exe"),
  T("t2", "Microsoft\\Windows\\SystemRestore\\SR", "\\Microsoft\\Windows\\SystemRestore", "Daily at 12:00 AM", "C:\\Windows\\system32\\srtasks.exe ExecuteScheduledSPPCreation"),
  T("t3", "Microsoft\\Windows\\WindowsBackup\\ConfigNotification", "\\Microsoft\\Windows\\WindowsBackup", "Daily at 10:00 PM", "C:\\Windows\\system32\\sdclt.exe /CONFIGNOTIFICATION"),
  T("t4", "Microsoft\\Windows\\UpdateOrchestrator\\Schedule Scan", "\\Microsoft\\Windows\\UpdateOrchestrator", "Daily at 3:00 AM", "C:\\Windows\\system32\\usoclient.exe StartScan"),
  T("t5", "Microsoft\\Windows\\DiskDiagnostic\\Microsoft-Windows-DiskDiagnosticDataCollector", "\\Microsoft\\Windows\\DiskDiagnostic", "At startup", "C:\\Windows\\system32\\rundll32.exe dfdts.dll,RunDfdDataCollector"),
  T("t6", "Microsoft\\Windows\\Maintenance\\WinSAT", "\\Microsoft\\Windows\\Maintenance", "Weekly, Sunday at 9:00 AM", "C:\\Windows\\system32\\winsat.exe formal"),
  T("t7", "GoogleUpdateTaskMachineCore", "\\", "At logon of any user · daily at 11:00 PM", "C:\\Program Files\\Google\\Update\\GoogleUpdate.exe /c", "Google Inc."),
  T("t8", "Adobe Acrobat Update Task", "\\", "Every day at 6:00 AM", "C:\\Program Files\\Common Files\\Adobe\\ARM\\1.0\\AdobeARM.exe", "Adobe Systems Incorporated"),
];

const FOLDERS = ["\\", "\\Microsoft", "\\Microsoft\\Windows", "\\Microsoft\\Windows\\Defrag", "\\Microsoft\\Windows\\DiskDiagnostic", "\\Microsoft\\Windows\\Maintenance", "\\Microsoft\\Windows\\SystemRestore", "\\Microsoft\\Windows\\UpdateOrchestrator", "\\Microsoft\\Windows\\WindowsBackup"];

const KEY = "win7.tasks";
const load = (): Task[] => { try { const raw = lsGet<Task[] | null>(KEY, null); if (raw && raw.length) return raw; } catch { /* ignore */ } return DEFAULT_TASKS; };
const save = (t: Task[]) => lsSet(KEY, t);

export function TaskScheduler({ win }: { win: Win }) {
  const [tasks, setTasks] = useState<Task[]>(load);
  const [folder, setFolder] = useState("\\");
  const [sel, setSel] = useState<string | null>("Microsoft\\Windows\\Defrag\\ScheduledDefrag");
  const [tab, setTab] = useState("General");
  const [busy, setBusy] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<string[]>(["\\", "\\Microsoft", "\\Microsoft\\Windows"]);

  const commit = (next: Task[]) => { setTasks(next); save(next); };
  const task = tasks.find((t) => t.id === sel) || null;
  const shown = tasks.filter((t) => t.folder === folder);

  const addHist = (t: Task, event: number, text: string, level: Hist["level"] = "Information"): Task => ({
    ...t,
    hist: [{ at: now(), event, level, text }, ...t.hist].slice(0, 40),
  });

  const run = (id: string) => {
    const instance = nextInstance();
    const t = tasks.find((x) => x.id === id);
    if (!t || t.status === "Running") return;
    setBusy(id);
    mutate(id, (x) => addHist({ ...x, status: "Running" }, 100, `Task Scheduler launched instance {${instance}} of task "${x.name}".`));
    logEvent("Information", "TaskScheduler", 100, `Task Scheduler launched task "${t.name}".`, "Application");
    setTimeout(() => {
      mutate(id, (x) => addHist({ ...x, status: x.status === "Disabled" ? "Disabled" : "Ready", last: fmt(now()), result: "0x0" }, 102, "Task completed with return code 0."));
      logEvent("Information", "TaskScheduler", 102, `Task "${t.name}" completed with return code 0.`, "Application");
      setBusy(null);
    }, 1400);
  };

  /** Update one task from whatever the current state is (safe inside timers). */
  const mutate = (id: string, fn: (t: Task) => Task) => {
    setTasks((cur) => {
      const next = cur.map((t) => (t.id === id ? fn(t) : t));
      save(next);
      return next;
    });
  };

  const toggle = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const off = t.status !== "Disabled";
    mutate(id, (x) => addHist({ ...x, status: off ? "Disabled" : "Ready" }, off ? 201 : 200, off ? "Task Scheduler disabled task." : "Task Scheduler enabled task."));
  };

  const del = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    msgBox({
      title: "Task Scheduler", icon: "warn", text: `Are you sure you want to delete the task "${t.name}"?`, buttons: ["Yes", "No"],
      onResult: (b) => { if (b === "Yes") { commit(tasks.filter((x) => x.id !== id)); setSel(null); } },
    });
  };

  const create = () => {
    promptBox({
      title: "Create Basic Task", text: "Type a name for the task:", value: "My Task",
      onOk: (name) => {
        const id = "u" + now().toString(36);
        const t: Task = {
          id, name, folder: "\\", status: "Ready", trigger: "Daily at 9:00 AM", next: "11/8/2026 9:00:00 AM", last: "Never", result: "0x41303",
          author: "PC\\" + (typeof localStorage !== "undefined" ? "user" : "user"), action: "C:\\Windows\\system32\\notepad.exe", args: "",
          conditions: ["Start the task only if the computer is idle for 10 minutes"],
          settings: ["Allow task to be run on demand", "Stop the task if it runs longer than 3 days"],
          hist: [{ at: now(), event: 106, level: "Information", text: "Task registered." }],
        };
        commit([...tasks, t]);
        setFolder("\\");
        setSel(id);
        notify({ title: "Task Scheduler", text: `The task "${name}" was created.`, icon: "info" });
      },
    });
  };

  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Create Basic Task...", onClick: create }, { label: "Import Task...", onClick: () => notify({ title: "Task Scheduler", text: "No task XML files were found.", icon: "warn" }) }, { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }] },
    { label: "Action", items: () => [
      { label: "Run", disabled: !task || task.status === "Running", onClick: () => task && run(task.id) },
      { label: "End", disabled: !task || task.status !== "Running", onClick: () => task && mutate(task.id, (x) => addHist({ ...x, status: "Ready" }, 102, "Task Scheduler terminated the task instance.")) },
      { label: task?.status === "Disabled" ? "Enable" : "Disable", disabled: !task, onClick: () => task && toggle(task.id) },
      { label: "Delete", disabled: !task, onClick: () => task && del(task.id) },
      { sep: true },
      { label: "Display All Running Tasks", onClick: () => { const r = tasks.filter((t) => t.status === "Running"); notify({ title: "Task Scheduler", text: r.length ? r.map((t) => t.name).join(", ") : "No tasks are currently running.", icon: "info" }); } },
      { label: "Refresh", onClick: () => { const again = load(); setTasks(again); } },
    ] },
    { label: "View", items: () => [{ label: "Show Hidden Tasks", checked: false }, { sep: true }, { label: "Help", onClick: () => openApp("help") }] },
    { label: "Help", items: () => [{ label: "Task Scheduler Help", onClick: () => openApp("help") }, { label: "About Task Scheduler", onClick: () => openApp("winver") }] },
  ];

  const row = (label: string, value: React.ReactNode) => (
    <tr><td>{label}</td><td>{value}</td></tr>
  );

  return (
    <div className="tsk">
      <MenuBar menus={menus} />
      <div className="tsk-body">
        <div className="tsk-tree">
          <div className="tsk-tree-h"><Icon name="taskmgr" size={14} /> Task Scheduler (Local)</div>
          {FOLDERS.map((f) => {
            const depth = f === "\\" ? 0 : f.split("\\").length - 2;
            const label = f === "\\" ? "Task Scheduler Library" : f.split("\\").pop()!;
            const kids = tasks.some((t) => t.folder === f);
            const isOpen = openFolders.includes(f);
            return (
              <div key={f}>
                <div className={"tsk-node" + (folder === f ? " sel" : "")} style={{ paddingLeft: 8 + depth * 14 }}
                  onClick={() => { setFolder(f); setOpenFolders(openFolders.includes(f) ? openFolders.filter((o) => o !== f) : [...openFolders, f]); }}>
                  <span className="tsk-tri">{depth === 0 ? "▾" : isOpen ? "▾" : "▸"}</span>
                  <Icon name="folder" size={14} /> {label}
                  {kids && <span className="tsk-count">{tasks.filter((t) => t.folder === f).length}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="tsk-main">
          <div className="tsk-list">
            <div className="tsk-th"><span style={{ width: 250 }}>Name</span><span style={{ width: 66 }}>Status</span><span style={{ flex: 1.2 }}>Triggers</span><span style={{ width: 130 }}>Next Run Time</span><span style={{ width: 130 }}>Last Run Time</span><span style={{ width: 78 }}>Last Run Result</span></div>
            {shown.map((t) => (
              <div key={t.id} className={"tsk-tr" + (sel === t.id ? " sel" : "")} onClick={() => setSel(t.id)} onDoubleClick={() => run(t.id)}
                onContextMenu={(e) => { e.preventDefault(); setSel(t.id); import("../store").then((m) => m.showMenu(e, [{ label: "Run", onClick: () => run(t.id) }, { label: t.status === "Disabled" ? "Enable" : "Disable", onClick: () => toggle(t.id) }, { sep: true }, { label: "Delete", onClick: () => del(t.id) }, { sep: true }, { label: "Properties", bold: true, onClick: () => setTab("General") }])); }}>
                <span style={{ width: 250 }}>{t.name}</span>
                <span style={{ width: 66, color: t.status === "Disabled" ? "#8a9099" : t.status === "Running" ? "#1a6fb2" : "#1a7a2e" }}>{t.status}</span>
                <span style={{ flex: 1.2 }}>{t.trigger}</span>
                <span style={{ width: 130 }}>{t.status === "Disabled" ? "—" : t.next}</span>
                <span style={{ width: 130 }}>{t.last}</span>
                <span style={{ width: 78 }}>{t.result}</span>
              </div>
            ))}
            {!shown.length && <div className="tsk-empty">There are no tasks in this folder.</div>}
          </div>

          <div className="tsk-detail">
            <div className="tsk-tabs">
              {["General", "Triggers", "Actions", "Conditions", "Settings", "History"].map((t) => (
                <button key={t} className={"tsk-tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
            <div className="tsk-pane">
              {!task && <div className="tsk-empty">Select a task to see its properties.</div>}
              {task && tab === "General" && (
                <table className="tsk-props"><tbody>
                  {row("Name", task.name)}
                  {row("Location", "Task Scheduler Library" + (task.folder === "\\" ? "" : task.folder))}
                  {row("Author", task.author)}
                  {row("Description", `Runs ${task.action.split("\\").pop()} on schedule.`)}
                  {row("Status", task.status)}
                  {row("Run as user", "SYSTEM")}
                  {row("Configure for", "Windows 7, Windows Server 2008 R2")}
                </tbody></table>
              )}
              {task && tab === "Triggers" && (
                <table className="tsk-props"><tbody>
                  {row("Trigger", task.trigger)}
                  {row("Details", task.trigger.toLowerCase().startsWith("at startup") ? "At system startup" : "Enabled, repeat every 1 hour for a duration of 1 day")}
                  {row("Status", task.status === "Disabled" ? "Disabled" : "Enabled")}
                  {row("Next run", task.status === "Disabled" ? "—" : task.next)}
                </tbody></table>
              )}
              {task && tab === "Actions" && (
                <table className="tsk-props"><tbody>
                  {row("Action", "Start a program")}
                  {row("Program/script", <code className="tsk-code">{task.action}</code>)}
                  {row("Add arguments", task.args || "(none)")}
                  {row("Start in", "(none)")}
                </tbody></table>
              )}
              {task && tab === "Conditions" && (
                <ul className="tsk-listul">{task.conditions.map((c) => <li key={c}>{c}</li>)}<li>Wake the computer to run this task</li></ul>
              )}
              {task && tab === "Settings" && (
                <ul className="tsk-listul">{task.settings.map((c) => <li key={c}>{c}</li>)}</ul>
              )}
              {task && tab === "History" && (
                <div className="tsk-hist">
                  <div className="tsk-hist-h"><span style={{ width: 150 }}>Date and Time</span><span style={{ width: 60 }}>Event ID</span><span style={{ width: 84 }}>Level</span><span style={{ flex: 1 }}>Task Category / Message</span></div>
                  {task.hist.map((h, i) => (
                    <div key={i} className="tsk-hist-r"><span style={{ width: 150 }}>{fmt(h.at)}</span><span style={{ width: 60 }}>{h.event}</span><span style={{ width: 84 }}>{h.level}</span><span style={{ flex: 1 }}>{h.text}</span></div>
                  ))}
                  {!task.hist.length && <div className="tsk-empty">No events have been recorded for this task.</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="tsk-actions">
          <div className="tsk-act-h">Actions</div>
          <div className="tsk-act-g">Task Scheduler (Local)</div>
          <button className="tsk-act" onClick={create}><b>Create Basic Task...</b></button>
          <button className="tsk-act" onClick={create}><b>Create Task...</b></button>
          <button className="tsk-act" onClick={() => notify({ title: "Task Scheduler", text: "No task XML files were found.", icon: "warn" })}><b>Import Task...</b></button>
          <button className="tsk-act" onClick={() => notify({ title: "Task Scheduler", text: tasks.filter((t) => t.status === "Running").map((t) => t.name).join(", ") || "No tasks are currently running.", icon: "info" })}><b>Display All Running Tasks</b></button>
          <button className="tsk-act" onClick={() => setTasks(load())}><b>Refresh</b></button>
          <button className="tsk-act" onClick={() => openApp("help")}><b>Help</b></button>
          <div className="tsk-act-g">Selected Item</div>
          <button className="tsk-act" disabled={!task} onClick={() => task && run(task.id)}><b>Run</b></button>
          <button className="tsk-act" disabled={!task || task.status !== "Running"} onClick={() => task && mutate(task.id, (x) => addHist({ ...x, status: "Ready" }, 102, "Task Scheduler terminated the task instance."))}><b>End</b></button>
          <button className="tsk-act" disabled={!task} onClick={() => task && toggle(task.id)}><b>{task?.status === "Disabled" ? "Enable" : "Disable"}</b></button>
          <button className="tsk-act" disabled={!task} onClick={() => task && del(task.id)}><b>Delete</b></button>
          <button className="tsk-act" disabled={!task} onClick={() => task && setTab("General")}><b>Properties</b></button>
        </div>
      </div>
      <div className="tsk-status">{tasks.length} tasks · {tasks.filter((t) => t.status === "Running").length} running · {tasks.filter((t) => t.status === "Disabled").length} disabled{busy ? " · running selected task…" : ""}</div>
    </div>
  );
}
