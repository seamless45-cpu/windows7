"use client";
/**
 * Disk Management (diskmgmt.msc) as a standalone console.
 *
 * The volumes are the drives of the simulated file system, so the used/free
 * space and the fill bars are the real numbers Explorer shows. The operations
 * that would destroy the machine (format, delete volume) ask for elevation and
 * explain what the simulation does instead.
 */
import React, { useState } from "react";
import { Win, useStore, msgBox, notify, openCP, lsGet, lsSet, MenuItem, fmtBig, getState } from "../store";
import { MenuBar, Btn } from "../ui";
import { Icon } from "../icons";

export function DiskManagement({ win }: { win: Win }) {
  const s = useStore((st) => st.settings);
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<"graphic" | "list">("graphic");
  const [letter, setLetter] = useState(lsGet("win7.dm.letter", "C"));
  const drives = Object.values(getState().fs).filter((n) => n.letter);

  const elevate = (name: string, fn: () => void) => import("../store").then((m) => m.uac({ name, publisher: "Microsoft Windows", onAllow: fn }));

  const changeLetter = () => {
    const next = letter === "C" ? "D" : "C";
    elevate("Disk Management", () => {
      setLetter(next);
      lsSet("win7.dm.letter", next);
      notify({ title: "Disk Management", text: `The drive letter was changed to ${next}:. Some programs may no longer run correctly.`, icon: "warn" });
    });
  };

  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Exit", onClick: () => import("../store").then((m) => m.closeWin(win.id)) }] },
    { label: "Action", items: () => [
      { label: "Rescan Disks", onClick: () => notify({ title: "Disk Management", text: "Scanning for changes… Disk configuration is up to date.", icon: "info" }) },
      { label: "Refresh", onClick: () => notify({ title: "Disk Management", text: "The disk configuration was refreshed.", icon: "info" }) },
      { sep: true },
      { label: "Open Disk Cleanup", onClick: () => import("../store").then((m) => m.openApp("cleanmgr")) },
      { label: "Change Drive Letter and Paths...", onClick: changeLetter },
      { label: "Properties", onClick: () => openCP("system") },
    ] },
    { label: "View", items: () => [{ label: "Top", checked: view === "graphic", onClick: () => setView("graphic") }, { label: "Bottom", checked: view === "list", onClick: () => setView("list") }, { sep: true }, { label: "Help", onClick: () => import("../store").then((m) => m.openApp("help")) }] },
  ];

  return (
    <div className="dmg">
      <MenuBar menus={menus} />
      <div className="dmg-tools">
        <Btn onClick={() => notify({ title: "Disk Management", text: "The disk configuration was refreshed.", icon: "info" })}>Refresh</Btn>
        <Btn onClick={() => notify({ title: "Disk Management", text: "Scanning for changes… up to date.", icon: "info" })}>Rescan Disks</Btn>
        <Btn onClick={changeLetter}>Change Drive Letter...</Btn>
        <Btn onClick={() => openCP("system")}>Properties</Btn>
      </div>
      <div className="dmg-body">
        <div className="dmg-table">
          <div className="dmg-th"><span style={{ width: 170 }}>Volume</span><span style={{ width: 100 }}>Layout</span><span style={{ width: 88 }}>Type</span><span style={{ width: 96 }}>File System</span><span style={{ width: 80 }}>Status</span><span style={{ width: 150 }}>Capacity</span><span style={{ width: 100 }}>Free Space</span><span style={{ width: 54 }}>% Free</span></div>
          {drives.map((d) => {
            const pct = d.total ? Math.round(((d.free || 0) / d.total) * 100) : 0;
            return (
              <div key={d.id} className={"dmg-tr" + (sel === d.id ? " sel" : "")} onClick={() => setSel(d.id)} onDoubleClick={() => openCP("system")}
                onContextMenu={(e) => { e.preventDefault(); setSel(d.id); import("../store").then((m) => m.showMenu(e, [{ label: "Open", bold: true, onClick: () => openCP("system") }, { label: "Explore", onClick: () => import("../store").then((x) => x.openPath(d.id)) }, { sep: true }, { label: "Change Drive Letter and Paths...", onClick: changeLetter }, { label: "Extend Volume...", onClick: () => msgBox({ title: "Disk Management", text: "There is no unallocated space available on the selected disk.", icon: "warn" }) }, { label: "Shrink Volume...", onClick: () => msgBox({ title: "Disk Management", text: "This operation is not supported on the simulated disk.", icon: "warn" }) }, { sep: true }, { label: "Properties", onClick: () => openCP("system") }])); }}>
                <span style={{ width: 170 }}><Icon name="driveFixed" size={14} /> {d.label || "Local Disk"} ({(d.letter || "C:")[0]}:)</span>
                <span style={{ width: 100 }}>Partition</span>
                <span style={{ width: 88 }}>Basic</span>
                <span style={{ width: 96 }}>NTFS</span>
                <span style={{ width: 80 }} className="dmg-ok">Healthy</span>
                <span style={{ width: 150 }}>{fmtBig(d.total || 0)}</span>
                <span style={{ width: 100 }}>{fmtBig(d.free || 0)}</span>
                <span style={{ width: 54 }}>{pct} %</span>
              </div>
            );
          })}
        </div>

        <div className="dmg-disks">
          {drives.map((d, i) => {
            const used = (d.total || 0) - (d.free || 0);
            const pct = d.total ? Math.round((used / d.total) * 100) : 0;
            return (
              <div key={d.id} className="dmg-row">
                <div className="dmg-disk">Disk {i}<b>{fmtBig(d.total || 0)}</b><span>Online</span></div>
                <div className="dmg-strip">
                  {i === 0 && <b className="dmg-vol sys" style={{ width: "9%" }}>System Reserved<div>100 MB NTFS</div><small>Healthy (System)</small></b>}
                  <i className={"dmg-vol" + (pct > 85 ? " hot" : "")} style={{ width: i === 0 ? "91%" : "100%" }} onClick={() => setSel(d.id)}>
                    <span>{(d.letter || "C:")[0]}: {d.label || "Local Disk"}</span>
                    <div>{fmtBig(used)} of {fmtBig(d.total || 0)} used ({pct}%)</div>
                    <small>Healthy (Primary Partition)</small>
                  </i>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="dmg-status">{drives.length} volumes · {sel ? "1 volume selected" : "Ready"} · {s.theme === "aero" ? "Windows 7 Ultimate" : "Windows 7 " + s.theme}</div>
    </div>
  );
}
