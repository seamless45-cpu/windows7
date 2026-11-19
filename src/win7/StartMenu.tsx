"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useStore, getState, setState, openApp, openCP, openPath, openNode, searchFs, isIndexed, tbThick, shutdown, restart, sleep, lock, logoff, showMenu, view, setSettings, MenuItem,
  jumpRecent, openJumpList,
} from "./store";
import { APPS } from "./registry";
import { allPrograms } from "./catalog";
import { Icon, appIcon, nodeIcon } from "./icons";
import { userPic } from "./data";
import { focusNoKeyboard } from "./softKeyboard";
import { useCanInstall, promptInstall, markInstallFlag } from "./pwa";

interface PItem { label: string; icon: string; run?: () => void; kids?: PItem[]; desc?: string }

const app = (id: string, label?: string): PItem => ({ label: label || APPS[id].title, icon: APPS[id].icon, run: () => openApp(id), desc: APPS[id].desc });

const runItem = (id: string): (() => void) => () => {
  if (id === "run") return openApp("run");
  if (id === "controlpanel") return openCP();
  if (id === "wupdate") return openCP("wupdate");
  if (id === "reliability") return openApp("reliability");
  if (id === "speech") return openApp("speech");
  if (id === "sticky2") return openApp("sticky2");
  return openApp(id);
};

const PROGRAMS: PItem[] = [
  {
    label: "Accessories",
    icon: "folder",
    kids: [
      { label: "Calculator", icon: "calc", run: () => openApp("calc") },
      app("cmd", "Command Prompt"),
      { label: "Connect to a Network Projector", icon: "network", run: () => openApp("rdp") },
      { label: "Connect to a Projector", icon: "display", run: () => openApp("mobility") },
      {
        label: "Ease of Access",
        icon: "folder",
        kids: [
          { label: "Ease of Access Center", icon: "ease", run: () => openCP("ease") },
          app("magnifier", "Magnifier"),
          app("narrator", "Narrator"),
          app("osk", "On-Screen Keyboard"),
          app("speech", "Windows Speech Recognition"),
        ],
      },
      app("gettingstarted", "Getting Started"),
      app("mip", "Math Input Panel"),
      app("notepad", "Notepad"),
      app("paint", "Paint"),
      app("psr", "Problem Steps Recorder"),
      app("eudc", "Private Character Editor"),
      { label: "Remote Desktop Connection", icon: "network", run: () => openApp("rdp") },
      { label: "Run", icon: "run", run: () => openApp("run") },
      { label: "Snipping Tool", icon: "snip", run: () => openApp("snip") },
      app("recorder", "Sound Recorder"),
      app("sticky2", "Sticky Notes"),
      app("sync", "Sync Center"),
      {
        label: "System Tools",
        icon: "folder",
        kids: [
          app("charmap", "Character Map"),
          app("cleanmgr", "Disk Cleanup"),
          app("compmgmt", "Computer Management"),
          { label: "Control Panel", icon: "controlpanel", run: () => openCP() },
          app("defender", "Windows Defender"),
          app("eventvwr", "Event Viewer"),
          app("explorer", "Windows Explorer"),
          app("taskmgr", "Task Manager"),
          app("tasksched", "Task Scheduler"),
          app("mdsched", "Windows Memory Diagnostic"),
          app("perfmon", "Performance Monitor"),
          app("resmon", "Resource Monitor"),
          app("reliability", "Reliability Monitor"),
          app("secpol", "Local Security Policy"),
          app("services"),
          app("sysdiag", "System Information"),
          app("sysrestore", "System Restore"),
          { label: "Windows Easy Transfer", icon: "programs", run: () => openApp("migwiz") },
          { label: "Windows Easy Transfer Reports", icon: "programs", run: () => openApp("migwiz") },
        ],
      },
      {
        label: "Tablet PC",
        icon: "folder",
        kids: [
          app("tabtip", "Tablet PC Input Panel"),
          app("journal", "Windows Journal"),
        ],
      },
      app("wfs", "Windows Fax and Scan"),
      {
        label: "Windows PowerShell",
        icon: "powershell",
        kids: [
          app("powershell", "Windows PowerShell"),
          app("ise", "Windows PowerShell ISE"),
        ],
      },
      app("wordpad", "WordPad"),
      app("xps", "XPS Viewer"),
    ],
  },
  {
    label: "Games",
    icon: "gamecenter",
    kids: [
      app("gamecenter", "Games Explorer"),
      app("solitaire", "Solitaire"),
      app("spider", "Spider Solitaire"),
      app("hearts", "Hearts"),
      app("minesweeper", "Minesweeper"),
      app("freecell", "FreeCell"),
      app("chess", "Chess Titans"),
      app("mahjong", "Mahjong Titans"),
      app("purble", "Purble Place"),
      app("backgammon", "Internet Backgammon"),
      app("checkers", "Internet Checkers"),
      app("spades", "Internet Spades"),
      app("moregames", "More Games…"),
    ],
  },
  { label: "Startup", icon: "folder", kids: [] },
  app("ie", "Internet Explorer"),
  app("dvdmaker", "Windows DVD Maker"),
  app("wmp", "Windows Media Player"),
  app("mce", "Windows Media Center"),
  app("contacts", "Windows Contacts"),
  app("stkmgr", "Sticky Notes"),
];

const MORE: PItem[] = [
  app("trust", "Windows Anytime Upgrade"),
];

const PINNED: PItem[] = [
  app("ie"),
  app("wmp"),
  app("explorer"),
];

const CPL: [string, string, string][] = [
  ["Personalization", "personalization", "appearance"], ["Display", "display", "display"], ["Sound", "sound", "sound"], ["Mouse", "mouse", "mouse"], ["Keyboard", "keyboard", "keyboard"],
  ["Date and Time", "datetime", "clock"], ["Power Options", "power", "power"], ["Device Manager", "devmgr", "devmgr"], ["System", "system", "system"], ["Windows Update", "wupdate", "update"],
  ["Windows Firewall", "firewall", "firewall"], ["Fonts", "fonts", "fonts"], ["User Accounts", "users", "users"], ["Programs and Features", "programs", "programs"], ["Internet Options", "inetopts", "inetopts"],
  ["Region and Language", "region", "region"], ["Folder Options", "folderopts", "folderopts"], ["Network and Sharing Center", "network", "netcat"], ["Action Center", "actioncenter", "actioncenter"], ["Taskbar and Start Menu", "taskbar", "taskbar"],
  ["Default Programs", "defaultprogs", "defaultprogs"], ["Ease of Access Center", "ease", "ease"],
];

function flat(items: PItem[], acc: PItem[] = []): PItem[] {
  items.forEach((i) => (i.kids ? flat(i.kids, acc) : acc.push(i)));
  return acc;
}

export function StartMenu() {
  const open = useStore((s) => s.startOpen);
  const settings = useStore((s) => s.settings);
  const [all, setAll] = useState(false);
  const [q, setQ] = useState("");
  const [cur, setCur] = useState(0);
  const [exp, setExp] = useState<string[]>([]);
  const [pwr, setPwr] = useState(false);
  const inp = useRef<HTMLInputElement>(null);
  const canInstall = useCanInstall();
  const th = tbThick(settings);
  const pos = settings.taskbar.pos;
  const user = settings.users.find((u) => u.name === settings.currentUser);

  useEffect(() => {
    if (open) {
      // Focus the search box like Windows does, but never ask a phone to raise
      // its on-screen keyboard — opening the Start menu must not cover the
      // screen with a keyboard.
      setTimeout(() => focusNoKeyboard(inp.current), 30);
    } else {
      // Reset after the menu has closed, not during the effect body.
      const t = window.setTimeout(() => {
        setAll(false);
        setQ("");
        setCur(0);
        setExp([]);
        setPwr(false);
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const run = (fn?: () => void) => {
    setState({ startOpen: false });
    setTimeout(() => fn?.(), 10);
  };

  const recents: PItem[] = useMemo(
    () =>
      settings.recent
        .filter((a) => APPS[a] && !PINNED.some((p) => p.label === APPS[a].title))
        .slice(0, 4)
        .map((a) => app(a)),
    [settings.recent]
  );

  // programs that live outside the curated tree (new apps, control panels, etc.)
  const extra = useMemo<PItem[]>(() => {
    const known = new Set(flat([...PROGRAMS, ...MORE]).map((p) => p.label));
    return allPrograms()
      .filter((p) => !known.has(p.label) && p.app)
      .map((p) => ({ label: p.label, icon: p.icon, run: runItem(p.app!) }));
  }, []);

  // search
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return null;
    const progs = [...flat(PROGRAMS), ...flat(MORE)].filter((p) => p.label.toLowerCase().includes(t) || p.desc?.toLowerCase().includes(t));
    const uniq = progs.filter((p, i) => progs.findIndex((x) => x.label === p.label) === i);
    const cp = CPL.filter((c) => c[0].toLowerCase().includes(t));
    // only files in indexed locations, mirroring Windows Search
    const files = searchFs(null, t)
      .filter((n) => !n.id.startsWith("exe_") && (!n.parent || isIndexed(n.parent as string)))
      .slice(0, 12);
    return { progs: uniq, cp, files };
  }, [q]);

  const flatResults: { run: () => void }[] = results
    ? [
        ...results.progs.map((p) => ({ run: () => run(p.run) })),
        ...results.files.map((n) => ({ run: () => run(() => openNode(n.id)) })),
        ...results.cp.map((c) => ({ run: () => run(() => openCP(c[1])) })),
      ]
    : [];

  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCur((c) => Math.min(flatResults.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCur((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      if (results) flatResults[cur]?.run();
      else if (q.trim()) {
        run(() => import("./store").then((m) => m.runCommand(q)));
      }
    } else if (e.key === "Escape") {
      if (q) {
        setQ("");
        e.stopPropagation();
      }
    }
  };

  const renderTree = (items: PItem[], depth = 0, path = ""): React.ReactNode =>
    items.map((it) => {
      const k = path + "/" + it.label;
      const isOpen = exp.includes(k);
      return (
        <React.Fragment key={k}>
          <div
            className="sm-item tree"
            style={{ paddingLeft: 8 + depth * 14 }}
            onClick={() => (it.kids ? setExp(isOpen ? exp.filter((x) => x !== k) : [...exp, k]) : run(it.run))}
          >
            <Icon name={it.icon} size={16} />
            <span>{it.label}</span>
          </div>
          {it.kids && isOpen && (it.kids.length ? renderTree(it.kids, depth + 1, k) : <div className="sm-item tree empty" style={{ paddingLeft: 22 + depth * 14 }}>(Empty)</div>)}
        </React.Fragment>
      );
    });

  const left = (it: PItem) => (
    <div key={it.label} className="sm-item big" onClick={() => run(it.run)}
      onPointerEnter={(e) => {/* reveal the jump-list arrow */ (e.currentTarget as HTMLElement).classList.add("hov"); }}
      onPointerLeave={(e) => (e.currentTarget as HTMLElement).classList.remove("hov")} onContextMenu={(e) => {
      e.preventDefault();
      e.stopPropagation();
      const a = Object.keys(APPS).find((k) => APPS[k].title === it.label || it.label === k);
      const items: MenuItem[] = [{ label: "Open", bold: true, onClick: () => run(it.run) }];
      if (a) items.push(settings.pinned.includes(a) ? { label: "Unpin from Taskbar", onClick: () => setSettings({ pinned: settings.pinned.filter((p) => p !== a) }) } : { label: "Pin to Taskbar", onClick: () => setSettings({ pinned: [...settings.pinned, a] }) });
      showMenu(e, items);
    }}>
      <Icon name={it.icon} size={32} />
      <span>{it.label}</span>
      {(() => {
        const a = Object.keys(APPS).find((k) => APPS[k].title === it.label);
        if (!a) return null;
        const rec = jumpRecent(a);
        if (!rec.length) return null;
        return (
          <button
            className="sm-jl-arrow"
            title="Recent items"
            onClick={(e) => {
              e.stopPropagation();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setState({ startOpen: false });
              openJumpList(a, { x: r.left / view.scale + r.width, y: r.top / view.scale });
            }}
          >▶</button>
        );
      })()}
    </div>
  );

  const place = (label: string, icon: string, fn: () => void, sep = false) => (
    <React.Fragment key={label}>
      {sep && <div className="sm-rsep" />}
      <div className="sm-r" onClick={() => run(fn)}><span>{label}</span></div>
      {void icon}
    </React.Fragment>
  );

  const style: React.CSSProperties =
    pos === "bottom" ? { left: 0, bottom: th } : pos === "top" ? { left: 0, top: th } : pos === "left" ? { left: th, top: 0 } : { right: th, top: 0 };

  return (
    <div className={"start-menu" + (open ? " open" : "") + " tb-" + pos} style={{ ...style, maxHeight: "100%" }} onPointerDown={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
      <div className="sm-user-pic" onClick={() => run(() => openCP("users"))} title="Change your account picture">
        <img src={userPic(user?.pic || "flower")} alt="" draggable={false} />
      </div>
      <div className={"sm-left" + (q.trim() ? " searching" : "")}>
        <div className="sm-list">
          {results ? (
            <div className="sm-results">
              {results.progs.length > 0 && <div className="sm-rh">Programs ({results.progs.length})</div>}
              {results.progs.map((p, i) => (
                <div key={p.label} className={"sm-item tree" + (cur === i ? " cur" : "")} onClick={() => run(p.run)} onMouseEnter={() => setCur(i)}><Icon name={p.icon} size={16} /><span>{p.label}</span></div>
              ))}
              {results.files.length > 0 && <div className="sm-rh">Files ({results.files.length})</div>}
              {results.files.map((n, i) => {
                const idx = results.progs.length + i;
                return <div key={n.id} className={"sm-item tree" + (cur === idx ? " cur" : "")} onClick={() => run(() => openNode(n.id))} onMouseEnter={() => setCur(idx)}><Icon name={nodeIcon(n)} size={16} /><span>{n.name}</span></div>;
              })}
              {results.cp.length > 0 && <div className="sm-rh">Control Panel ({results.cp.length})</div>}
              {results.cp.map((c, i) => {
                const idx = results.progs.length + results.files.length + i;
                return <div key={c[1]} className={"sm-item tree" + (cur === idx ? " cur" : "")} onClick={() => run(() => openCP(c[1]))} onMouseEnter={() => setCur(idx)}><Icon name={c[2]} size={16} /><span>{c[0]}</span></div>;
              })}
              {!results.progs.length && !results.files.length && !results.cp.length && <div className="sm-none">No matches found.</div>}
              {(results.progs.length > 0 || results.files.length > 0) && (
                <div className="sm-rh link" onClick={() => run(() => openApp("explorer", { path: "search", query: q }))}>See more results</div>
              )}
            </div>
          ) : all ? (
            <div className="sm-all">
              {renderTree(PROGRAMS)}
              {extra.length > 0 && <div className="sm-rh">Windows</div>}
              {renderTree(extra)}
            </div>
          ) : (
            <>
              {PINNED.map(left)}
              {recents.length > 0 && <div className="sm-sep" />}
              {recents.map(left)}
            </>
          )}
        </div>
        <div className="sm-lfoot">
          {results ? (
            <div className="sm-back" onClick={() => setQ("")}><span className="tri">◀</span> Back</div>
          ) : (
            <div className="sm-back" onClick={() => setAll(!all)}><span className="tri">{all ? "◀" : "▶"}</span> {all ? "Back" : "All Programs"}</div>
          )}
          <div className="sm-search">
            <input
              ref={inp}
              placeholder="Search programs and files"
              value={q}
              /* The Start menu has no on-screen keyboard in Windows 7: the box
                 is focused for typing, but a phone keyboard must not slide up
                 over the menu. The attribute is dropped as soon as the user
                 taps the field themselves. */
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              /* readOnly until touched: focused like Windows, but silent on phones */
              onChange={(e) => { setQ(e.target.value); setCur(0); }}
              onKeyDown={key}
            />
            <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="5.500" cy="5.500" r="4" fill="none" stroke="#5a7aa8" strokeWidth="1.600" /><path d="M8.500 8.500L13 13" stroke="#5a7aa8" strokeWidth="2" /></svg>
          </div>
        </div>
      </div>
      <div className="sm-right">
        {place(settings.currentUser, "user", () => openPath("home"))}
        <div className="sm-rsep" />
        {place("Documents", "docs", () => openPath("docs"))}
        {place("Pictures", "pictures", () => openPath("pics"))}
        {place("Music", "music", () => openPath("music"))}
        {place("Games", "gamecenter", () => openApp("gamecenter"))}
        <div className="sm-rsep" />
        {place("Computer", "computer", () => openPath("computer"))}
        {place("Control Panel", "controlpanel", () => openCP())}
        {place("Devices and Printers", "devices", () => openCP("devices"))}
        {place("Default Programs", "defaultprogs", () => openCP("defaultprogs"))}
        {place("Help and Support", "help", () => openApp("help"))}
        {/* Windows has no such item; on a browser the "PC" can be installed as an
            app, so it belongs here rather than in a banner over the desktop. */}
        {canInstall && place("Install this PC", "setup", () => { void promptInstall().then((r) => { if (r === "accepted") markInstallFlag(); }); })}
        <div className="sm-rspace" />
        <div className="sm-power">
          <button className="sm-shut" onClick={() => run(shutdown)}>Shut down</button>
          <button className={"sm-arrow" + (pwr ? " on" : "")} onClick={() => setPwr(!pwr)}>▶</button>
          {pwr && (
            <div className="ctx sm-pmenu" onPointerDown={(e) => e.stopPropagation()}>
              {[
                ["Switch user", () => lock()],
                ["Log off", () => logoff()],
                ["Lock", () => lock()],
                ["Restart", () => restart()],
                ["Sleep", () => sleep()],
                ["Hibernate", () => sleep()],
              ].map(([l, f]) => (
                <div key={l as string} className="ctx-item" onClick={() => run(f as () => void)}><span className="ctx-check" /><span className="ctx-label">{l as string}</span></div>
              ))}
            </div>
          )}
        </div>
      </div>
      {void getState}
      {void view}
      {void appIcon}
    </div>
  );
}
