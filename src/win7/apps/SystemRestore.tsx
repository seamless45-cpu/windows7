"use client";
/**
 * System Restore (rstrui.exe).
 *
 * Restore points snapshot the shell's settings — theme, wallpaper, sound
 * scheme, DPI, Explorer options, accounts — the way the real System Restore
 * snapshots the registry and system files (your documents are never touched).
 * Restoring a point really puts those settings back.
 */
import React, { useState } from "react";
import { Win, useStore, setSettings, notify, msgBox, lsGet, lsSet, MenuItem, type Settings } from "../store";
import { MenuBar, Btn } from "../ui";
import { Icon } from "../icons";
import { logEvent } from "../kernel";

interface Point { id: string; name: string; at: number; type: "System" | "Manual" | "Install"; settings: Settings }

const KEY = "win7.restore";

const seedPoints = (sv: Settings): Point[] => {
  return [
    { id: "p0", name: "Windows Update", at: Date.now() - 6 * 864e5, type: "System", settings: { ...sv, theme: "aero", wallpaper: "win7", wpPos: "fill", dpi: 100, transparency: true } },
    { id: "p1", name: "Scheduled checkpoint", at: Date.now() - 2 * 864e5, type: "System", settings: { ...sv } },
    { id: "p2", name: "Before installing new software", at: Date.now() - 8 * 36e5, type: "Install", settings: { ...sv } },
  ];
};

const load = (sv: Settings): Point[] => {
  try {
    const raw = lsGet<Point[] | null>(KEY, null);
    if (raw && raw.length) return raw;
  } catch { /* seeded */ }
  const p = seedPoints(sv);
  lsSet(KEY, p);
  return p;
};

const fmt = (t: number) => new Date(t).toLocaleString("en-US", { weekday: "long", month: "long", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function SystemRestore({ win }: { win: Win }) {
  const current = useStore((st) => st.settings);
  const [points, setPoints] = useState<Point[]>(() => load(current));
  const [sel, setSel] = useState<string | null>(() => load(current)[0]?.id || null);
  const [step, setStep] = useState<"pick" | "confirm" | "done">("pick");
  const [created, setCreated] = useState(false);

  const save = (p: Point[]) => { setPoints(p); lsSet(KEY, p); };
  const point = points.find((p) => p.id === sel) || null;

  const create = () => {
    const p: Point = { id: "u" + Date.now().toString(36), name: "Manual checkpoint", at: Date.now(), type: "Manual", settings: { ...current } };
    save([p, ...points]);
    setSel(p.id);
    setCreated(true);
    logEvent("Information", "System Restore", 8194, "Successfully created a restore point.", "System");
    notify({ title: "System Restore", text: "A restore point was created successfully.", icon: "info" });
  };

  const restore = () => {
    if (!point) return;
    msgBox({
      title: "System Restore", icon: "question",
      text: `Are you sure you want to restore your computer to "${point.name}"? The computer will restart. Your documents are not affected.`,
      buttons: ["Yes", "No"],
      onResult: (b) => {
        if (b !== "Yes") return;
        setSettings({ ...point.settings });
        logEvent("Information", "System Restore", 8196, `System Restore restored the computer to the point "${point.name}".`, "System");
        setStep("done");
      },
    });
  };

  const del = (id: string) => {
    msgBox({
      title: "System Protection", icon: "warn", text: "You cannot delete a mount point that contains the system volume. Delete all restore points for this drive?", buttons: ["Delete", "Cancel"],
      onResult: (b) => { if (b === "Delete") { save(points.filter((p) => p.id !== id)); setSel(null); } },
    });
  };

  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "Create a restore point", onClick: create }, { sep: true }, { label: "Exit", onClick: () => import("../store").then((m) => m.closeWin(win.id)) }] },
    { label: "Action", items: () => [{ label: "Restore the selected point", disabled: !point, onClick: restore }, { label: "Delete restore points", disabled: !point, onClick: () => point && del(point.id) }, { sep: true }, { label: "System Protection...", onClick: () => notify({ title: "System Protection", text: "System protection is turned on for Local Disk (C:).", icon: "info" }) }] },
  ];

  return (
    <div className="rsr">
      <MenuBar menus={menus} />
      <div className="rsr-head">
        <Icon name="sysrestore" size={40} />
        <div>
          <b>Restore your computer to a previous point in time</b>
          <p>System Restore helps you restore your computer&apos;s system files and settings — the theme, wallpaper, sound scheme, DPI and Explorer options — to an earlier point. Personal files are never changed.</p>
        </div>
      </div>

      {step === "pick" && (
        <>
          <div className="rsr-list">
            <div className="rsr-th"><span style={{ width: 260 }}>Date and Time</span><span style={{ flex: 1 }}>Description</span><span style={{ width: 90 }}>Type</span></div>
            {points.map((p) => (
              <div key={p.id} className={"rsr-tr" + (sel === p.id ? " sel" : "")} onClick={() => setSel(p.id)} onDoubleClick={() => { setSel(p.id); setStep("confirm"); }}>
                <span style={{ width: 260 }}>{fmt(p.at)}</span><span style={{ flex: 1 }}>{p.name}</span><span style={{ width: 90 }}>{p.type}</span>
              </div>
            ))}
            {!points.length && <div className="rsr-empty">No restore points have been created on this computer.</div>}
          </div>
          <div className="rsr-foot">
            <label className="rsr-check"><input type="checkbox" checked readOnly /> Scan for affected programs</label>
            <span className="rsr-spacer" />
            <Btn onClick={create}>Create a restore point</Btn>
            <Btn def disabled={!point} onClick={() => setStep("confirm")}>Next &gt;</Btn>
            <Btn onClick={() => import("../store").then((m) => m.closeWin(win.id))}>Cancel</Btn>
          </div>
        </>
      )}

      {step === "confirm" && point && (
        <div className="rsr-body">
          <b>Confirm your restore point</b>
          <p>Windows will restore these system settings from <b>{point.name}</b>:</p>
          <table className="cp-t"><tbody>
            <tr><td>Theme</td><td>{point.settings.theme} · transparency {point.settings.transparency ? "on" : "off"}</td></tr>
            <tr><td>Desktop background</td><td>{point.settings.wallpaper} ({point.settings.wpPos})</td></tr>
            <tr><td>Sound scheme</td><td>{point.settings.soundScheme}</td></tr>
            <tr><td>Text size (DPI)</td><td>{point.settings.dpi} %</td></tr>
            <tr><td>Explorer options</td><td>hidden files {point.settings.folder.showHidden ? "shown" : "hidden"} · extensions {point.settings.folder.showExt ? "shown" : "hidden"}</td></tr>
          </tbody></table>
          <p className="cp-desc">Your documents, pictures and other files are not affected by System Restore.</p>
          <div className="rsr-foot">
            <Btn onClick={() => setStep("pick")}>&lt; Back</Btn>
            <Btn def onClick={restore}>Finish</Btn>
            <Btn onClick={() => setStep("pick")}>Cancel</Btn>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="rsr-body">
          <b>System Restore completed successfully</b>
          <p>Your computer was restored to <b>{point?.name}</b>. Restart your computer for the changes to take effect everywhere.</p>
          <p className="cp-desc">Event <b>8196</b> has been written to the System log, which Event Viewer shows.</p>
          <div className="rsr-foot"><Btn def onClick={() => setStep("pick")}>OK</Btn></div>
        </div>
      )}

      {created && <div className="rsr-status">Restore point created · {points.length} points available</div>}
    </div>
  );
}
