"use client";
/**
 * Two Control Panel pages Windows 7 has and the simulator was missing:
 *
 *  - **Indexing Options** — which locations are indexed for Windows Search,
 *    which file types are indexed by content, and the index's size and status.
 *    The simulator's Start-menu search honours the location list, so switching a
 *    location off really does remove its files from the results.
 *  - **ClearType Text Tuner** — the five-step wizard that picks the gamma the
 *    text is rendered with. Each step shows the same sample in two samples and
 *    the choice is applied to the whole shell.
 */
import React, { useState } from "react";
import { getState, setState, lsGet, lsSet, setSettings, openApp, notify } from "../store";
import { services } from "../services";
import { GroupBox, Btn, Check } from "../ui";
import { Icon } from "../icons";

/* ==================================================== Indexing Options */

const LOCATIONS: { id: string; label: string; where: string }[] = [
  { id: "docs", label: "Documents", where: "C:\\Users\\%user%\\Documents" },
  { id: "music", label: "Music", where: "C:\\Users\\%user%\\Music" },
  { id: "pics", label: "Pictures", where: "C:\\Users\\%user%\\Pictures" },
  { id: "vids", label: "Videos", where: "C:\\Users\\%user%\\Videos" },
  { id: "dl", label: "Downloads", where: "C:\\Users\\%user%\\Downloads" },
  { id: "desk", label: "Desktop", where: "C:\\Users\\%user%\\Desktop" },
];

const DEFAULT_LOCS = ["docs", "music", "pics", "vids", "desk"];
const TYPES = [
  ["txt", "Text Document"],
  ["rtf", "Rich Text Document"],
  ["html", "HTML Document"],
  ["docx", "Word Document"],
  ["xlsx", "Excel Worksheet"],
  ["pptx", "PowerPoint Presentation"],
  ["pdf", "PDF Document"],
  ["jpg", "JPEG Image"],
  ["png", "PNG Image"],
  ["mp3", "MP3 Audio"],
  ["wmv", "Windows Media Video"],
];

export function IndexingOptions() {
  const [locs, setLocs] = useState<string[]>(() => lsGet("win7.index.locs", DEFAULT_LOCS));
  const [types, setTypes] = useState<string[]>(() => lsGet("win7.index.types", TYPES.map(([e]) => e)));
  const [fileOnly, setFileOnly] = useState(() => lsGet("win7.index.fileonly", false));
  const [tab, setTab] = useState<"locations" | "types" | "advanced">("locations");
  const st = getState();

  const commit = (next: string[]) => {
    setLocs(next);
    lsSet("win7.index.locs", next);
    // the Start menu search is the consumer of this list
    setState({ rev: getState().rev + 1 });
  };

  const indexedFiles = Object.values(st.fs).filter((n) => {
    if (n.type !== "file") return false;
    const parent = n.parent as string;
    if (!locs.includes(parent)) return false;
    const ext = n.name.includes(".") ? n.name.split(".").pop()!.toLowerCase() : "";
    return types.includes(ext);
  }).length;

  const estimated = Math.max(1, Math.round(indexedFiles * 0.02 + 4));

  return (
    <div>
      <h1 className="cp-h1">Indexing Options</h1>
      <p className="cp-desc">Indexing makes searches in Windows faster by making an index of the files on your computer. Windows Search uses the index to find files by name and, for the types listed below, by their contents.</p>
      <div className="idx-tabs">
        {(["locations", "types", "advanced"] as const).map((t) => (
          <a key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "locations" ? `Indexed Locations (${locs.length})` : t === "types" ? `File Types (${types.length})` : "Advanced"}</a>
        ))}
      </div>
      <div className="idx-body">
        {tab === "locations" && (
          <GroupBox title="Change selected locations">
            <p>Folders included in the index:</p>
            {LOCATIONS.map((l) => (
              <Check
                key={l.id}
                checked={locs.includes(l.id)}
                onChange={(v) => commit(v ? [...locs, l.id] : locs.filter((x) => x !== l.id))}
                label={`${l.label} — ${l.where.replace("%user%", st.settings.currentUser)}`}
              />
            ))}
            <p className="cp-small">Files in folders that are not indexed are still searchable by name; only their contents are skipped.</p>
          </GroupBox>
        )}
        {tab === "types" && (
          <GroupBox title="Change how indexed locations are searched">
            <p><Check checked={fileOnly} onChange={(v) => { setFileOnly(v); lsSet("win7.index.fileonly", v); }} label="Index only file names, not contents" /></p>
            <table className="idx-types">
              <thead><tr><th>File name extension</th><th>Description</th><th>Index contents</th></tr></thead>
              <tbody>
                {TYPES.map(([ext, desc]) => (
                  <tr key={ext}>
                    <td>{ext}</td>
                    <td>{desc}</td>
                    <td><input type="checkbox" disabled={fileOnly} checked={types.includes(ext)} onChange={(e) => { const n = e.target.checked ? [...types, ext] : types.filter((x) => x !== ext); setTypes(n); lsSet("win7.index.types", n); }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GroupBox>
        )}
        {tab === "advanced" && (
          <>
            <GroupBox title="Index location">
              <p>Index location: C:\\ProgramData\\Microsoft\\Windows\\Search\\Data</p>
              <p><Btn onClick={() => openApp("explorer")}>Open folder</Btn></p>
            </GroupBox>
            <GroupBox title="Troubleshooting">
              <p>If search is slow or results are incomplete, the index can be rebuilt. A rebuild takes time but fixes most missing results.</p>
              <p>
                <Btn onClick={() => notify({ title: "Indexing Options", text: "The index was rebuilt. " + indexedFiles + " files are now indexed.", icon: "info" })}>Rebuild</Btn>{" "}
                <Btn onClick={() => notify({ title: "Indexing Options", text: "Indexing set to classic mode: the whole drive is indexed.", icon: "info" })}>Set to classic</Btn>
              </p>
            </GroupBox>
          </>
        )}
        <p className="cp-small idx-status">
          {indexedFiles} items indexed · {estimated} MB in the index · {services()["WSearch"]?.running ? "Indexing complete" : "Windows Search service is stopped"}
        </p>
      </div>
    </div>
  );
}

/* ===================================================== ClearType tuner */

const SAMPLES = [
  "The quick brown fox jumps over the lazy dog",
  "Windows 7 makes everyday tasks easier",
  "Aero glass, snap, shake and peek",
  "Segoe UI is the system typeface of Windows 7",
];

export function ClearTypeTuner() {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [gamma, setGamma] = useState(() => lsGet("win7.cleartype.gamma", 1));
  const [enabled, setEnabled] = useState(() => lsGet("win7.cleartype.on", true));

  const apply = (g: number) => {
    setGamma(g);
    lsSet("win7.cleartype.gamma", g);
    lsSet("win7.cleartype.on", true);
    setEnabled(true);
    setSettings({ clearType: true });
    document.documentElement.style.setProperty("--w7-ct-gamma", String(g));
  };

  const finish = () => {
    apply(choice ?? 1);
    notify({ title: "ClearType Text Tuner", text: "ClearType tuning is complete.", icon: "info" });
  };

  const sample = SAMPLES[step % SAMPLES.length];

  return (
    <div>
      <h1 className="cp-h1">ClearType Text Tuner</h1>
      <p className="cp-desc">ClearType makes the text on your screen almost as sharp and clear as text on paper. Turn it off, or choose the setting that looks best to you.</p>
      <GroupBox title={`Step ${step + 1} of 4`}>
        <p><Check checked={enabled} onChange={(v) => { setEnabled(v); lsSet("win7.cleartype.on", v); setSettings({ clearType: v }); document.documentElement.style.setProperty("--w7-ct-gamma", v ? String(gamma) : "1"); }} label="Turn on ClearType" /></p>
        <p>Click the sample that looks best to you:</p>
        <div className="ct-samples">
          {[0.85, 1, 1.15, 1.3].map((g, i) => (
            <button
              key={i}
              className={"ct-sample" + (choice === i ? " on" : "")}
              onClick={() => { setChoice(i); apply(g); }}
              style={{ fontWeight: g < 1 ? 300 : g > 1.2 ? 600 : 400 }}
            >
              {sample}
            </button>
          ))}
        </div>
        <p className="cp-small">Sample rendered at gamma {[0.85, 1, 1.15, 1.3][choice ?? 1]}. The choice applies to the whole desktop immediately.</p>
        <p>
          <Btn onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Btn>{" "}
          {step < 3 ? <Btn def onClick={() => setStep(step + 1)}>Next</Btn> : <Btn def onClick={finish}>Finish</Btn>}
        </p>
      </GroupBox>
    </div>
  );
}
