"use client";
/**
 * More Windows 7 programs: Event Viewer, Disk Cleanup and the Registry Editor.
 *
 * These are real views onto state the simulation already keeps: Event Viewer
 * reads the Windows Event Log written by the kernel (`logEvent`), Disk Cleanup
 * measures the files really stored in the simulated file system, and Regedit
 * edits the settings that back the shell — themes, wallpaper, sounds, Explorer
 * options — so a change there is immediately visible on the desktop.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Win, useStore, getState, setState, setSettings, setWin, openApp, msgBox, notify, closeWin, lsGet, lsSet, MenuItem, Settings } from "../store";
import { MenuBar, Btn, Check } from "../ui";
import { Icon } from "../icons";
import { getEvents, clearLog, logEvent, type LogEvent, type EventLevel } from "../kernel";
import { playSys } from "../sound";

/* ============================================================ Event Viewer */
const LEVEL_COLOR: Record<EventLevel, string> = { Critical: "#c0392b", Error: "#d35400", Warning: "#b7950b", Information: "#1f6fb2" };

export function EventViewer({ win }: { win: Win }) {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | LogEvent["log"]>("all");
  const [level, setLevel] = useState<"all" | EventLevel>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = () => setEvents(getEvents());
    load();
    window.addEventListener("win7-log", load);
    return () => window.removeEventListener("win7-log", load);
  }, []);

  const shown = useMemo(
    () =>
      events.filter(
        (e) => (filter === "all" || e.log === filter) && (level === "all" || e.level === level) &&
          (!query || (e.source + e.text).toLowerCase().includes(query.toLowerCase()))
      ),
    [events, filter, level, query]
  );
  const cur = events.find((e) => e.id === sel) || shown[0];

  const menus = [
    {
      label: "File", items: (): MenuItem[] => [
        { label: "Save All Events As...", onClick: () => {
          const text = shown.map((e) => `${new Date(e.time).toLocaleString()}  ${e.level}  ${e.log}  ${e.source}  ${e.eventId}  ${e.text}`).join("\r\n");
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
          a.download = "events.txt";
          a.click();
        } },
        { sep: true },
        { label: "Clear Log...", onClick: () => msgBox({ title: "Event Viewer", text: "Do you want to save before clearing?", icon: "warn", buttons: ["Clear", "Cancel"], onResult: (b) => { if (b === "Clear") { clearLog(filter === "all" ? undefined : filter); setEvents(getEvents()); } } }) },
        { sep: true },
        { label: "Exit", onClick: () => closeWin(win.id) },
      ],
    },
    { label: "Action", items: (): MenuItem[] => [{ label: "Refresh", onClick: () => setEvents(getEvents()) }, { label: "Filter Current Log...", onClick: () => { setLevel("all"); setFilter("all"); setQuery(""); } }] },
    { label: "Help", items: (): MenuItem[] => [{ label: "Event Viewer Help", onClick: () => openApp("help") }] },
  ];

  return (
    <div className="ev">
      <MenuBar menus={menus} />
      <div className="ev-bar">
        <span className="ev-path">Event Viewer (Local) › Windows Logs › {filter === "all" ? "All" : filter}</span>
        <span style={{ flex: 1 }} />
        <select className="w7sel" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">All logs</option>
          <option value="System">System</option>
          <option value="Application">Application</option>
          <option value="Security">Security</option>
        </select>
        <select className="w7sel" value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
          <option value="all">All levels</option>
          <option value="Critical">Critical</option>
          <option value="Error">Error</option>
          <option value="Warning">Warning</option>
          <option value="Information">Information</option>
        </select>
        <input className="w7input" placeholder="Filter current log" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 160 }} />
      </div>
      <div className="ev-main">
        <div className="ev-list">
          <div className="ev-th"><span style={{ width: 130 }}>Level</span><span style={{ width: 138 }}>Date and Time</span><span style={{ flex: 1 }}>Source</span><span style={{ width: 60 }}>Event ID</span></div>
          {shown.map((e) => (
            <div key={e.id} className={"ev-tr" + (cur?.id === e.id ? " sel" : "")} onClick={() => setSel(e.id)}>
              <span style={{ width: 130, color: LEVEL_COLOR[e.level] }}><i className="ev-ico" style={{ background: LEVEL_COLOR[e.level] }} />{e.level}</span>
              <span style={{ width: 138 }}>{new Date(e.time).toLocaleString()}</span>
              <span style={{ flex: 1 }}>{e.source}</span>
              <span style={{ width: 60 }}>{e.eventId}</span>
            </div>
          ))}
          {!shown.length && <div className="ev-empty">There is no event in this log matching the filter.</div>}
        </div>
        <div className="ev-detail">
          {cur ? (
            <>
              <div className="ev-detail-h"><b>{cur.level}</b><span>{new Date(cur.time).toLocaleString()}</span></div>
              <dl>
                <dt>Log Name:</dt><dd>{cur.log}</dd>
                <dt>Source:</dt><dd>{cur.source}</dd>
                <dt>Event ID:</dt><dd>{cur.eventId}</dd>
                <dt>Level:</dt><dd>{cur.level}</dd>
                <dt>User:</dt><dd>N/A</dd>
                <dt>Computer:</dt><dd>{lsGet("win7.pcname", "PC")}</dd>
                <dt>Description:</dt><dd className="ev-desc">{cur.text}</dd>
              </dl>
            </>
          ) : <p className="ev-empty">Select an event to see its details.</p>}
        </div>
      </div>
      <div className="ev-status">{shown.length} event{shown.length === 1 ? "" : "s"} shown · {events.length} in the log</div>
      {void setState}{void setSettings}
    </div>
  );
}

/* ============================================================ Disk Cleanup */
export function DiskCleanup({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const [busy, setBusy] = useState(true);
  const [pick, setPick] = useState<Record<string, boolean>>({ temp: true, thumb: true, logs: false, recycle: true, dump: false });
  const [done, setDone] = useState(0);

  const nodes = Object.values(fs);
  const sizes = useMemo(() => {
    const files = nodes.filter((n) => n.type === "file");
    const total = files.reduce((a, n) => a + (n.content?.length || 0), 0);
    const trash = nodes.filter((n) => n.type === "file" && n.trash).reduce((a, n) => a + (n.content?.length || 0), 0);
    return {
      total,
      temp: Math.round(total * 0.018) + 640,
      thumb: Math.round(total * 0.010) + 220,
      logs: 96,
      recycle: trash,
      dump: 512,
      files: files.length,
    };
  }, [nodes]);

  useEffect(() => {
    const t = setTimeout(() => setBusy(false), 900);
    return () => clearTimeout(t);
  }, []);

  const selected = (Object.keys(pick).filter((k) => pick[k]) as (keyof typeof sizes)[]).reduce((a, k) => a + (sizes[k] as number), 0);

  const clean = () => {
    // really empty the recycle bin, and log the maintenance event
    setState({ fs: Object.fromEntries(Object.entries(fs).filter(([, n]) => !(n.type === "file" && n.trash && n.content?.length))) });
    logEvent("Information", "Microsoft-Windows-DiskDiagnostic", 1001, `Disk Cleanup freed ${(selected / 1024).toFixed(1)} KB on Local Disk (C:).`, "Application");
    setDone(selected);
    playSys("recycle");
    notify({ title: "Disk Cleanup", text: `Freed ${(selected / 1024).toFixed(1)} KB of disk space.`, icon: "info" });
  };

  return (
    <div className="dc">
      <div className="dc-head">
        <Icon name="drive" size={40} />
        <div>
          <b>Disk Cleanup for (C:)</b>
          <p>{busy ? "Calculating how much disk space you can free on (C:)…" : `You can free up to ${(selected / 1024).toFixed(1)} KB of disk space on (C:).`}</p>
        </div>
      </div>
      <div className="dc-prog"><i style={{ width: busy ? "60%" : "100%" }} /></div>
      <div className="dc-list">
        {([
          ["temp", "Temporary Internet Files", "Web pages you have viewed are stored here for quick display."],
          ["thumb", "Thumbnails", "Windows keeps a copy of every thumbnail for quick display."],
          ["logs", "System error memory dump and minidump files", "Files Windows keeps after a system error."],
          ["recycle", "Recycle Bin", `${Object.values(fs).filter((n) => n.type === "file" && n.trash).length} deleted items.`],
          ["dump", "Debugging information for crash dumps", "Memory dump files from kernel bug checks."],
        ] as const).map(([k, label, desc]) => (
          <label key={k} className={"dc-row" + (pick[k] ? " on" : "")}>
            <input type="checkbox" checked={pick[k]} onChange={(e) => setPick({ ...pick, [k]: e.target.checked })} />
            <span>
              <b>{label}</b> <em>{Math.round((sizes[k] as number) / 1024) || 0} KB</em>
              <span className="cp-desc">{desc}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="dc-foot">
        <span className="cp-desc">{done ? `Cleaned ${(done / 1024).toFixed(1)} KB.` : `${sizes.files} files · ${(sizes.total / 1024).toFixed(1)} KB used`}</span>
        <span style={{ flex: 1 }} />
        <Btn def onClick={clean} disabled={busy || selected === 0}>OK</Btn>
        <Btn onClick={() => closeWin(win.id)}>Cancel</Btn>
      </div>
    </div>
  );
}

/* ============================================================ Registry Editor */
interface RegValue { name: string; type: "REG_SZ" | "REG_DWORD"; value: string | number }
interface RegKey { name: string; children: Record<string, RegKey>; values: RegValue[] }

/** Build a registry view over the real settings that drive the shell. */
function buildRegistry(s: Settings, pcName: string): RegKey {
  const k = (name: string, children: RegKey[] = [], values: RegValue[] = []): RegKey => ({
    name,
    children: Object.fromEntries(children.map((c) => [c.name, c])),
    values,
  });
  const v = (name: string, value: string | number, type: RegValue["type"] = "REG_SZ"): RegValue => ({ name, type, value });

  const hkcu = k("HKEY_CURRENT_USER", [
    k("Control Panel", [
      k("Desktop", [], [
        v("Wallpaper", s.wallpaper),
        v("WallpaperStyle", s.wpPos),
        v("TileWallpaper", s.wpPos === "tile" ? "1" : "0"),
        v("ScreenSaveActive", s.screensaver === "none" ? "0" : "1"),
        v("ScreenSaveTimeOut", String(s.ssWait * 60)),
        v("WallpaperSound", s.wpSound ? "1" : "0", "REG_DWORD"),
      ]),
      k("Colors", [], [v("Window", s.colorKey)]),
      k("Sounds", [], [v("(Default)", s.soundScheme)]),
      k("International", [], [v("LocaleName", s.region)]),
    ]),
    k("Software", [
      k("Microsoft", [
        k("Windows", [
          k("CurrentVersion", [
            k("Explorer", [k("Advanced", [], [
              v("TaskbarGlomLevel", s.taskbar.combine === "always" ? 1 : 0, "REG_DWORD"),
              v("HideIcons", s.showIcons ? 0 : 1, "REG_DWORD"),
              v("SmallIcons", s.taskbar.small ? 1 : 0, "REG_DWORD"),
              v("AutoHide", s.taskbar.autohide ? 1 : 0, "REG_DWORD"),
            ])]),
            k("Themes", [], [
              v("CurrentTheme", s.theme === "aero" ? "Aero.msstyles" : s.theme === "basic" ? "Aero.msstyles (Basic)" : s.theme === "classic" ? "Classic.msstyles" : "HC.msstyles"),
              v("Transparency", s.transparency ? 1 : 0, "REG_DWORD"),
            ]),
            k("Policies", [k("System", [], [v("EnableLUA", s.uac === "never" ? 0 : 1, "REG_DWORD")])]),
          ]),
        ]),
      ]),
    ]),
  ]);

  const hklm = k("HKEY_LOCAL_MACHINE", [
    k("SOFTWARE", [
      k("Microsoft", [
        k("Windows NT", [
          k("CurrentVersion", [], [
            v("ProductName", "Windows 7 Ultimate"),
            v("CurrentBuild", "7601"),
            v("CurrentVersion", "6.1"),
            v("InstallDate", 1246000000, "REG_DWORD"),
          ]),
        ]),
      ]),
    ]),
    k("SYSTEM", [k("CurrentControlSet", [k("Control", [k("ComputerName", [], [v("ComputerName", pcName)])])])]),
    k("HARDWARE", [k("DESCRIPTION", [k("System", [], [
      v("SystemBiosVersion", "Award Modular BIOS v6.00PG"),
      v("ProcessorNameString", "Intel(R) Core(TM)2 Duo CPU E8200 @ 2.66GHz"),
      v("Identifier", "Intel64 Family 6 Model 23 Stepping 6"),
    ])])]),
  ]);

  return { name: "Computer", children: { "HKEY_CURRENT_USER": hkcu, "HKEY_LOCAL_MACHINE": hklm }, values: [] };
}

/** Map an edited registry value back onto the shell setting it controls. */
function applyValue(path: string, name: string, raw: string) {
  const p = path.toLowerCase();
  if (p.endsWith("control panel\\desktop")) {
    if (name === "Wallpaper") return setSettings({ wallpaper: raw });
    if (name === "WallpaperStyle") return setSettings({ wpPos: raw as Settings["wpPos"] });
    if (name === "ScreenSaveTimeOut") return setSettings({ ssWait: Math.max(1, Math.round(Number(raw) / 60) || 1) });
  }
  if (p.endsWith("control panel\\colors") && name === "Window") return setSettings({ colorKey: raw });
  if (p.endsWith("control panel\\sounds")) return setSettings({ soundScheme: raw });
  if (p.endsWith("currentversion\\themes")) return setSettings({ theme: raw.startsWith("Classic") ? "classic" : raw.startsWith("HC") ? "hc" : /Basic/.test(raw) ? "basic" : "aero" });
  if (p.endsWith("advanced")) {
    if (name === "HideIcons") return setSettings({ showIcons: raw === "0" });
    if (name === "SmallIcons") return setSettings({ taskbar: { ...getState().settings.taskbar, small: raw === "1" } });
    if (name === "TaskbarGlomLevel") return setSettings({ taskbar: { ...getState().settings.taskbar, combine: raw === "1" ? "always" : "never" } });
  }
  if (p.endsWith("policies\\system") && name === "EnableLUA") return setSettings({ uac: raw === "0" ? "never" : "default" });
  if (p.endsWith("computername")) {
    lsSet("win7.pcname", raw);
    setState({ rev: getState().rev + 1 });
  }
}

export function Regedit({ win }: { win: Win }) {
  const s = useStore((st) => st.settings);
  const pcName = lsGet("win7.pcname", "PC");
  const [path, setPath] = useState<string[]>(["HKEY_CURRENT_USER", "Control Panel", "Desktop"]);
  const [selName, setSelName] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ name: string; value: string; type: RegValue["type"]; isNew: boolean } | null>(null);
  const [tick, setTick] = useState(0);
  const treeRef = useRef<HTMLDivElement>(null);

  const root = useMemo(() => buildRegistry(s, pcName), [s, pcName, tick]);
  const walk = (keys: string[]) => keys.reduce<RegKey | null>((k, p) => (k ? k.children[p] || null : null), root);
  const cur = walk(path) || walk(["HKEY_CURRENT_USER", "Control Panel", "Desktop"])!;

  const open = (keys: string[]) => { setPath(keys); setSelName(null); setEditing(null); };

  const commit = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return setEditing(null);
    const val = editing.type === "REG_DWORD" ? Math.max(0, Math.round(Number(editing.value) || 0)) : editing.value;
    applyValue(path.join("\\"), name, String(val));
    logEvent("Information", "Microsoft-Windows-Registry", 1, `Registry value ${path.join("\\")}\\${name} was changed to "${val}".`, "Application");
    setTick((t) => t + 1);
    setEditing(null);
    // the setting change is what actually matters
    setSettings({});
  };

  const del = (name: string) => {
    msgBox({ title: "Confirm Value Delete", text: `Deleting certain registry values can cause system instability or a bug check. Are you sure you want to permanently delete this value?\n\n${name}`, icon: "warn", buttons: ["Yes", "No"], onResult: (b) => { if (b === "Yes") { setSelName(null); logEvent("Warning", "Microsoft-Windows-Registry", 2, `Registry value ${path.join("\\")}\\${name} was deleted.`, "Application"); } } });
  };

  const renderTree = (k: RegKey, keys: string[], depth: number): React.ReactNode => (
    <div key={keys.join("/")}>
      <div className={"re-node" + (path.join("/") === keys.join("/") ? " sel" : "")} style={{ paddingLeft: 6 + depth * 14 }} onClick={() => open(keys)}>
        <span className="re-caret">{Object.keys(k.children).length ? "▾" : ""}</span>
        <Icon name="folder" size={14} /> {k.name}
      </div>
      {Object.values(k.children).map((c) => renderTree(c, [...keys, c.name], depth + 1))}
    </div>
  );

  return (
    <div className="re">
      <MenuBar
        menus={[
          { label: "File", items: (): MenuItem[] => [{ label: "Import...", onClick: () => notify({ title: "Regedit", text: "Import is not available in this simulation.", icon: "info" }) }, { label: "Export...", onClick: () => { const text = JSON.stringify(root, null, 2); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = "registry.json"; a.click(); } }, { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }] },
          { label: "Edit", items: (): MenuItem[] => [
            { label: "New › String Value", onClick: () => setEditing({ name: "", value: "", type: "REG_SZ", isNew: true }) },
            { label: "New › DWORD (32-bit) Value", onClick: () => setEditing({ name: "", value: "0", type: "REG_DWORD", isNew: true }) },
            { sep: true },
            { label: "Modify...", disabled: !selName, onClick: () => { const v = cur.values.find((x) => x.name === selName); if (v) setEditing({ name: v.name, value: String(v.value), type: v.type, isNew: false }); } },
            { label: "Delete", disabled: !selName, onClick: () => selName && del(selName) },
          ] },
          { label: "View", items: (): MenuItem[] => [{ label: "Refresh", onClick: () => setTick((t) => t + 1) }, { label: "Status Bar", checked: true }] },
          { label: "Help", items: (): MenuItem[] => [{ label: "About Registry Editor", onClick: () => msgBox({ title: "About Registry Editor", text: "Registry Editor 6.1 (build 7601). Changes here are applied to the live settings of this simulated PC.", icon: "info" }) }] },
        ]}
      />
      <div className="re-body">
        <div className="re-tree" ref={treeRef}>{Object.values(root.children).map((c) => renderTree(c, [c.name], 0))}</div>
        <div className="re-vals">
          <div className="re-th"><span style={{ width: 180 }}>Name</span><span style={{ width: 90 }}>Type</span><span style={{ flex: 1 }}>Data</span></div>
          <div className={"re-tr" + (selName === "(Default)" ? " sel" : "")} onClick={() => setSelName("(Default)")} onDoubleClick={() => { const v = cur.values.find((x) => x.name === "(Default)"); if (v) setEditing({ name: v.name, value: String(v.value), type: v.type, isNew: false }); }}>
            <span style={{ width: 180 }}><Icon name="exe" size={14} /> (Default)</span><span style={{ width: 90 }}>REG_SZ</span><span style={{ flex: 1 }}>(value not set)</span>
          </div>
          {cur.values.map((v) => (
            <div
              key={v.name}
              className={"re-tr" + (selName === v.name ? " sel" : "")}
              onClick={() => setSelName(v.name)}
              onDoubleClick={() => setEditing({ name: v.name, value: String(v.value), type: v.type, isNew: false })}
            >
              <span style={{ width: 180 }}><Icon name={v.type === "REG_DWORD" ? "exe" : "txt"} size={14} /> {v.name}</span>
              <span style={{ width: 90 }}>{v.type}</span>
              <span style={{ flex: 1 }}>{String(v.value)}</span>
            </div>
          ))}
          {!cur.values.length && <div className="re-empty">This key has no values other than (Default).</div>}
        </div>
      </div>
      {editing && (
        <div className="re-edit">
          <b>{editing.isNew ? "New Value" : "Edit String"}</b>
          <label>Value name: <input className="w7input" autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} disabled={!editing.isNew} /></label>
          <label>Value data: <input className="w7input" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commit()} /></label>
          <div className="re-edit-btns"><Btn def onClick={commit}>OK</Btn><Btn onClick={() => setEditing(null)}>Cancel</Btn></div>
        </div>
      )}
      <div className="re-status">{path.join("\\")} · {cur.values.length} value{cur.values.length === 1 ? "" : "s"} · changes apply immediately</div>
    </div>
  );
}
