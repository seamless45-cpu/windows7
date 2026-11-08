"use client";
/**
 * The Control Panel tools that Windows 7 Ultimate shipped but that are not
 * consoles: Backup and Restore, BitLocker Drive Encryption, HomeGroup,
 * Credential Manager, Performance Information and Tools (the Windows
 * Experience Index) and Windows Remote Assistance.
 *
 * Every one of them works against the simulated file system or localStorage so
 * the state it shows is real: a backup writes an actual archive into the Backup
 * folder, BitLocker encrypts a drive for as long as the session lasts, and the
 * Experience Index is computed from the same numbers the System page reports.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useStore, children, mkfile, notify, msgBox, lsGet, lsSet, openPath } from "../store";
import { Icon } from "../icons";
import { Btn, Check, Radio } from "../ui";
import { playSys } from "../sound";

const nowStr = () => new Date().toLocaleString();

/* ================================================== Backup and Restore */
type Job = { id: string; at: string; kind: string; size: number; dest: string; ok: boolean };
const BK_KEY = "win7.backup.jobs";
export function BackupRestore() {
  const fs = useStore((s) => s.fs);
  const [jobs, setJobs] = useState<Job[]>(() => lsGet<Job[]>(BK_KEY, []));
  const [schedule, setSchedule] = useState(() => lsGet("win7.backup.schedule", { on: false, freq: "Weekly", day: "Sunday", time: "19:00", keep: true }));
  const [dest, setDest] = useState(() => lsGet("win7.backup.dest", "d"));
  const [running, setRunning] = useState(0);
  const [tab, setTab] = useState<"backup" | "restore">("backup");
  const [picks, setPicks] = useState<string[]>([]);

  const docs = useMemo(() => Object.values(fs).filter((n) => !n.trash && n.type !== "folder" && n.parent !== "d"), [fs]);
  const sizeOf = (id: string) => fs[id]?.size || 0;
  const libSize = docs.reduce((a, n) => a + sizeOf(n.id), 0);

  useEffect(() => {
    lsSet(BK_KEY, jobs);
  }, [jobs]);
  useEffect(() => {
    lsSet("win7.backup.schedule", schedule);
  }, [schedule]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setRunning((v) => (v >= 100 ? v : v + 7)), 90);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (running !== 100) return;
    const at = nowStr();
    const name = `Backup ${new Date().toISOString().slice(0, 10)}.zip`;
    mkfile(dest, name, "PK\\x03\\x04 simulated backup archive");
    const job: Job = { id: name, at, kind: "Full", size: libSize, dest: dest.toUpperCase() + ":\\", ok: true };
    // the completion work happens one tick later so the render that reached
    // 100% commits first and the effect never sets state synchronously
    const done = setTimeout(() => {
      setJobs((j) => [job, ...j].slice(0, 12));
      lsSet("win7.backup.last", at);
      playSys("notify");
      notify({ title: "Backup and Restore", text: `The backup was completed successfully. ${name}`, icon: "info" });
      setRunning(0);
    }, 700);
    return () => clearTimeout(done);
  }, [running, dest, libSize]);

  const restore = (j: Job) => {
    msgBox({
      title: "Restore Files",
      text: `Restore the files in ${j.id} to their original locations? Files with the same name will be replaced.`,
      icon: "warn",
      buttons: ["Restore", "Cancel"],
      onResult: (b) => {
        if (b !== "Restore") return;
        setRunning(1);
        const t = setTimeout(() => {
          setRunning(0);
          notify({ title: "Backup and Restore", text: "Your files have been restored.", icon: "info" });
        }, 1600);
        void t;
      },
    });
  };

  return (
    <div className="bk">
      <div className="bk-tabs">
        <div className={"bk-tab" + (tab === "backup" ? " on" : "")} onClick={() => setTab("backup")}>Back up or restore</div>
        <div className={"bk-tab" + (tab === "restore" ? " on" : "")} onClick={() => setTab("restore")}>Manage space</div>
      </div>
      {tab === "backup" ? (
        <div className="bk-body">
          <div className="bk-panel">
            <h2>Back up or restore your files</h2>
            <div className="cp-sec">Backup</div>
            <p>The last backup was created {lsGet("win7.backup.last", "never")}.</p>
            <div className="bk-row"><span>Back up to:</span>
              <select className="w7input" value={dest} onChange={(e) => setDest(e.target.value)}>
                <option value="d">Backup (D:) (2.00 TB free)</option>
                <option value="docs">Documents library</option>
                <option value="dl">Downloads</option>
              </select>
            </div>
            <div className="bk-row"><span>Include:</span><span>{docs.length} files · {(libSize / 1e6).toFixed(1)} MB</span></div>
            <div className="cp-sec">Schedule</div>
            <div className="bk-row"><Check checked={schedule.on} onChange={(v) => setSchedule({ ...schedule, on: v })} label="Run backup on a schedule (recommended)" /></div>
            <div className="bk-row">
              <span>How often:</span>
              <select className="w7input" value={schedule.freq} onChange={(e) => setSchedule({ ...schedule, freq: e.target.value })}>{["Daily", "Weekly", "Monthly"].map((f) => <option key={f}>{f}</option>)}</select>
              <select className="w7input" value={schedule.day} onChange={(e) => setSchedule({ ...schedule, day: e.target.value })}>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((f) => <option key={f}>{f}</option>)}</select>
              <span>at</span>
              <select className="w7input" value={schedule.time} onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}>{["12:00", "15:00", "19:00", "22:00"].map((f) => <option key={f}>{f}</option>)}</select>
            </div>
            <div className="bk-row"><Check checked={schedule.keep} onChange={(v) => setSchedule({ ...schedule, keep: v })} label="Keep the most recent system image" /></div>
            <div className="bk-row">
              <Btn def disabled={running > 0 && running < 100} onClick={() => setRunning(1)}>{running > 0 && running < 100 ? "Backing up…" : "Back up now"}</Btn>
              <Btn onClick={() => setTab("restore")}>Manage space</Btn>
            </div>
            {running > 0 && (
              <div className="bk-prog">
                <div className="bk-bar"><i style={{ width: running + "%" }} /></div>
                <span>{running < 100 ? `Saving the backup set… ${running}%` : "Backup complete."}</span>
              </div>
            )}
          </div>
          <div className="bk-side">
            <div className="cp-sec">Recent backups</div>
            {!jobs.length && <div className="bk-empty">No backups have been created on this PC yet.</div>}
            {jobs.map((j) => (
              <div key={j.id} className="bk-job">
                <Icon name="drive" size={28} />
                <div><b>{j.id}</b><span>{j.at} · {(j.size / 1e6).toFixed(1)} MB · {j.dest}</span></div>
                <button className="w7btn" onClick={() => restore(j)}>Restore…</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bk-body">
          <div className="bk-panel">
            <h2>Manage space</h2>
            <p>Windows keeps the newest backup and deletes older ones to save space on the destination drive.</p>
            <div className="bk-usage"><div className="bk-usage-bar"><i style={{ width: Math.min(100, (jobs.reduce((a, j) => a + j.size, 0) / 4e9) * 100) + "%" }} /></div>
              <span>{(jobs.reduce((a, j) => a + j.size, 0) / 1e6).toFixed(1)} MB used of 4.00 GB reserved</span></div>
            <div className="cp-sec">System protection</div>
            <p>Restore points are managed from <a onClick={() => openPath("sysrestore")}>System Restore</a>.</p>
            <Btn onClick={() => { if (!jobs.length) return; msgBox({ title: "Delete backups", text: "Delete all backup sets on this PC?", icon: "warn", buttons: ["Delete", "Cancel"], onResult: (b) => { if (b === "Delete") setJobs([]); } }); }}>Delete all backups</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================== BitLocker Drive Encryption */
const BL_KEY = "win7.bitlocker";
type Lock = { on: boolean; password: string; mode: "TPM" | "Password" | "USB"; at: string };
export function BitLocker() {
  const fs = useStore((s) => s.fs);
  const [locks, setLocks] = useState<Record<string, Lock>>(() => lsGet<Record<string, Lock>>(BL_KEY, {}));
  const [sel, setSel] = useState("c");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<Lock["mode"]>("Password");
  const [step, setStep] = useState(0);
  const drives = useMemo(() => children("", fs).filter((n) => n.type === "folder" && /^[cd]$/.test(n.id)), [fs]);
  const list = drives.length ? drives : [{ id: "c", name: "Local Disk (C:)" }, { id: "d", name: "Backup (D:)" }];

  useEffect(() => { lsSet(BL_KEY, locks); }, [locks]);
  const cur = locks[sel];

  const turnOn = () => {
    if (step === 0) return setStep(1);
    if (!pw.trim() && mode !== "TPM") return msgBox({ title: "BitLocker", text: "Type a password to unlock this drive.", icon: "warn" });
    setLocks({ ...locks, [sel]: { on: true, password: pw, mode, at: nowStr() } });
    setStep(0);
    setPw("");
    playSys("notify");
    notify({ title: "BitLocker Drive Encryption", text: `${sel.toUpperCase()}: is now encrypted. Keep your recovery password safe.`, icon: "info" });
  };

  return (
    <div className="bl">
      <div className="cp-sec">BitLocker Drive Encryption</div>
      <p className="bl-lead">BitLocker helps protect all files stored on the operating system volume and on fixed data drives by encrypting them.</p>
      <div className="bl-list">
        {list.map((d) => {
          const l = locks[d.id];
          return (
            <div key={d.id} className={"bl-drive" + (sel === d.id ? " sel" : "")} onClick={() => { setSel(d.id); setStep(0); }}>
              <Icon name="drive" size={40} />
              <div className="bl-meta">
                <b>{d.name || d.id.toUpperCase() + ":"}</b>
                <em className={l?.on ? "on" : "off"}>{l?.on ? "BitLocker on" : "BitLocker off"}</em>
                {l?.on && <span>Encrypted {l.at} · {l.mode === "TPM" ? "TPM key protector" : l.mode === "USB" ? "USB key + password" : "Password protector"}</span>}
                {!l?.on && <span>{d.id === "c" ? "Operating system drive" : "Fixed data drive"}</span>}
              </div>
              {l?.on && <Btn onClick={() => { setLocks({ ...locks, [d.id]: { ...l, on: false } }); }}>Turn off BitLocker</Btn>}
            </div>
          );
        })}
      </div>
      {!cur?.on && (
        <div className="bl-setup">
          <div className="cp-sec">Set up BitLocker for {sel.toUpperCase()}:</div>
          {step === 0 ? (
            <>
              <p>Choose how you want to unlock this drive:</p>
              <Radio checked={mode === "Password"} label="Use a password to unlock the drive" onChange={() => setMode("Password")} />
              <Radio checked={mode === "TPM"} label="Use BitLocker with a TPM (recommended for this PC)" onChange={() => setMode("TPM")} />
              <Radio checked={mode === "USB"} label="Use a USB flash drive as a key" onChange={() => setMode("USB")} />
              <p style={{ marginTop: 10 }}><Btn def onClick={turnOn}>Turn on BitLocker</Btn></p>
            </>
          ) : (
            <>
              <p>BitLocker will encrypt {sel.toUpperCase()}: with a {mode === "TPM" ? "TPM key protector" : mode.toLowerCase() + " protector"}. This can take a while.</p>
              {mode !== "TPM" && <div className="bl-row"><span>Password:</span><input className="w7input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /><span className="bl-hint">{pw.length < 8 ? "At least 8 characters" : "Strong enough"}</span></div>}
              <p><Btn def onClick={turnOn}>Encrypt {sel.toUpperCase()}:</Btn> <Btn onClick={() => setStep(0)}>Back</Btn></p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================== HomeGroup */
const HG_KEY = "win7.homegroup";
export function HomeGroup() {
  const [hg, setHg] = useState(() => lsGet("win7.homegroup.state", { created: false, pw: "", join: "", libs: { music: true, pics: true, vids: true, docs: true, printers: false }, shared: ["Media PC", "Living room"] }));
  const [pw, setPw] = useState(hg.pw || "");
  useEffect(() => { lsSet(HG_KEY + ".state", hg); }, [hg]);

  const create = () => {
    const p = pw || "H0me-Gr0up-" + Math.floor(1000 + Math.random() * 8999);
    setHg({ ...hg, created: true, pw: p });
    notify({ title: "HomeGroup", text: "A homegroup has been created. Write down the password so you can add other computers.", icon: "info" });
  };

  return (
    <div className="hg">
      <div className="cp-sec">HomeGroup</div>
      <p className="hg-lead">Share pictures, music, videos, documents and printers with other people on your home network. A homegroup makes it easy to share files between the computers running Windows 7 on your home network.</p>
      {!hg.created ? (
        <div className="hg-create">
          <Icon name="homegroup" size={44} />
          <div>
            <b>There is no homegroup on this network</b>
            <p>Create a homegroup so that the other Windows 7 computers in your home can share libraries and printers.</p>
            <Btn def onClick={create}>Create a homegroup</Btn>
          </div>
        </div>
      ) : (
        <>
          <div className="hg-card">
            <Icon name="homegroup" size={40} />
            <div><b>You are a member of the homegroup</b><span>Password: <code>{hg.pw}</code> <a onClick={() => { navigator.clipboard?.writeText(hg.pw); }}>copy</a></span></div>
            <Btn onClick={() => msgBox({ title: "HomeGroup", text: `The homegroup password is ${hg.pw}`, icon: "info" })}>View or print the password</Btn>
          </div>
          <div className="cp-sec">Share these libraries and devices</div>
          <div className="hg-libs">
            {([["music", "Music"], ["pics", "Pictures"], ["vids", "Videos"], ["docs", "Documents"], ["printers", "Printers"]] as [keyof typeof hg.libs, string][]).map(([k, l]) => (
              <Check key={k} checked={hg.libs[k]} onChange={(v) => setHg({ ...hg, libs: { ...hg.libs, [k]: v } })} label={l} />
            ))}
          </div>
          <div className="cp-sec">Other computers in the homegroup</div>
          <div className="hg-members">
            {hg.shared.map((m) => <div key={m} className="hg-member"><Icon name="computer" size={26} /><b>{m}</b><span>Idle</span></div>)}
            <div className="hg-member"><span>No other computers are on the network right now.</span></div>
          </div>
          <p><Btn onClick={() => { setHg({ ...hg, created: false, pw: "" }); }}>Leave the homegroup</Btn> <Btn onClick={() => setHg({ ...hg, pw: "H0me-Gr0up-" + Math.floor(1000 + Math.random() * 8999) })}>Change the password</Btn></p>
        </>
      )}
    </div>
  );
}

/* ================================================== Credential Manager */
type Cred = { id: string; target: string; user: string; kind: "Windows" | "Certificate" | "Generic"; at: string };
const CR_KEY = "win7.creds";
export function CredentialManager() {
  const [creds, setCreds] = useState<Cred[]>(() => lsGet<Cred[]>(CR_KEY, [
    { id: "c1", target: "MicrosoftAccount", user: "user@example.com", kind: "Generic", at: "2026-09-02 10:14" },
    { id: "c2", target: "TERMSRV/HOME-SERVER", user: "HOME-SERVER\\Administrator", kind: "Windows", at: "2026-08-19 18:02" },
  ]));
  const [kind, setKind] = useState<Cred["kind"]>("Windows");
  const [target, setTarget] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState<"cred" | "vault">("cred");
  useEffect(() => { lsSet(CR_KEY, creds); }, [creds]);

  const add = () => {
    if (!target.trim() || !user.trim()) return msgBox({ title: "Credential Manager", text: "Type a target name and a user name.", icon: "warn" });
    setCreds([{ id: "c" + Date.now(), target, user, kind, at: nowStr() }, ...creds]);
    setTarget(""); setUser(""); setPass("");
  };

  return (
    <div className="cm2">
      <div className="cp-sec">Credential Manager</div>
      <p className="cp-desc">Manage the user names and passwords that you use to sign in to websites or other computers on a network.</p>
      <div className="cm2-tabs">
        <div className={"cm2-tab" + (tab === "cred" ? " on" : "")} onClick={() => setTab("cred")}>Windows Credentials</div>
        <div className={"cm2-tab" + (tab === "vault" ? " on" : "")} onClick={() => setTab("vault")}>Certificate-Based Credentials</div>
      </div>
      {tab === "cred" ? (
        <>
          <div className="cm2-list">
            {creds.map((c) => (
              <div key={c.id} className="cm2-row">
                <Icon name={c.kind === "Windows" ? "network" : "ie"} size={26} />
                <div><b>{c.target}</b><span>{c.kind} · {c.user} · added {c.at}</span></div>
                <button className="w7btn" onClick={() => msgBox({ title: "Credential Manager", text: `Properties for ${c.target}\nUser name: ${c.user}\nPersistence: Logon session`, icon: "info" })}>Properties</button>
                <button className="w7btn" onClick={() => setCreds(creds.filter((x) => x.id !== c.id))}>Remove</button>
              </div>
            ))}
            {!creds.length && <div className="cm2-empty">No Windows credentials are stored.</div>}
          </div>
          <div className="cp-sec">Add a Windows credential</div>
          <div className="cm2-add">
            <div className="cm2-f"><span>Target:</span><input className="w7input" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="TERMSRV/server.example.com" /></div>
            <div className="cm2-f"><span>User name:</span><input className="w7input" value={user} onChange={(e) => setUser(e.target.value)} /></div>
            <div className="cm2-f"><span>Password:</span><input className="w7input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
            <div className="cm2-f"><span>Type:</span><select className="w7input" value={kind} onChange={(e) => setKind(e.target.value as Cred["kind"])}>{[["Windows", "Windows credentials"], ["Generic", "Generic credentials"], ["Certificate", "Certificate"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <Btn def onClick={add}>Add</Btn>
          </div>
        </>
      ) : (
        <div className="cm2-list">
          <div className="cm2-row"><Icon name="shield" size={26} /><div><b>None</b><span>No certificate-based credentials are stored for this user.</span></div></div>
        </div>
      )}
    </div>
  );
}

/* ================================================== Experience Index */
function score(n: number) {
  const s = Math.max(1, Math.min(7.9, Math.round(n * 10) / 10));
  return s;
}
const SUBSCORES = (): { key: string; name: string; desc: string; v: number }[] => {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 8;
  return [
    { key: "cpu", name: "Processor", desc: "Calculations per second", v: score(5.3 + cores * 0.12) },
    { key: "ram", name: "Memory (RAM)", desc: "Memory operations per second", v: score(5.1 + Math.log2(mem) * 0.16) },
    { key: "gfx", name: "Graphics", desc: "Desktop performance for Windows Aero", v: score(5.6) },
    { key: "game", name: "Gaming graphics", desc: "3D business and gaming graphics performance", v: score(5.2) },
    { key: "disk", name: "Primary hard disk", desc: "Disk data transfer rate", v: score(5.9) },
  ];
};
export function ExperienceIndex() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState(() => SUBSCORES());
  const [stamp, setStamp] = useState(() => lsGet("win7.wei.at", "06/11/2026 09:12:44"));
  const base = Math.min(...rows.map((r) => r.v));

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setProgress((p) => (p >= 100 ? p : p + 4)), 80);
    return () => clearInterval(t);
  }, [busy]);
  useEffect(() => {
    if (progress !== 100) return;
    const t = setTimeout(() => {
      const rows2 = SUBSCORES();
      setRows(rows2);
      setBusy(false);
      const at = nowStr();
      setStamp(at);
      lsSet("win7.wei.at", at);
      notify({ title: "Performance Information and Tools", text: `The Windows Experience Index has been updated. Your base score is ${Math.min(...rows2.map((r) => r.v)).toFixed(1)}.`, icon: "info" });
      setProgress(0);
    }, 500);
    return () => clearTimeout(t);
  }, [progress]);

  const bar = (v: number) => Array.from({ length: 8 }, (_, i) => <i key={i} className={i < Math.floor(v) ? "on" : ""} />);

  return (
    <div className="wei">
      <h1 className="cp-h1">Rate and improve your computer&apos;s performance</h1>
      <p className="cp-desc">The Windows Experience Index measures the capability of your computer&apos;s hardware and software configuration and expresses this measurement as a number called a base score.</p>
      <div className="wei-head">
        <div className="wei-base">
          <span>Base score</span>
          <b>{base.toFixed(1)}</b>
          <em>{base >= 6 ? "Excellent" : base >= 5 ? "Very good" : base >= 4 ? "Good" : "Fair"}</em>
        </div>
        <div className="wei-sub">
          <div>Processor</div><div>Memory</div><div>Graphics</div>
          <div><b>{rows[0].v.toFixed(1)}</b></div><div><b>{rows[1].v.toFixed(1)}</b></div><div><b>{rows[2].v.toFixed(1)}</b></div>
        </div>
        <div className="wei-actions">
          <Btn def disabled={busy} onClick={() => { setBusy(true); setProgress(1); }}>{busy ? "Rating…" : "Re-run the assessment"}</Btn>
          <span>Last rated {stamp}</span>
        </div>
      </div>
      {busy && <div className="wei-prog"><div className="wei-bar"><i style={{ width: progress + "%" }} /></div><span>Assessing the processor, memory, graphics and disk…</span></div>}
      <div className="wei-table">
        <div className="wei-h"><span>Component</span><span>What is rated</span><span>Subscore</span><span>Base score</span></div>
        {rows.map((r) => (
          <div key={r.key} className="wei-r" onClick={() => notify({ title: r.name, text: `${r.desc}: ${r.v.toFixed(1)}. This subscore contributes to the base score only if it is the lowest value.`, icon: "info" })}>
            <b>{r.name}</b><span>{r.desc}</span>
            <div className="wei-rate"><b>{r.v.toFixed(1)}</b><div className="wei-bars">{bar(r.v)}</div></div>
            <div className="wei-rate dim">{base.toFixed(1)}</div>
          </div>
        ))}
      </div>
      <div className="cp-sec">Related tasks</div>
      <div className="cp-bottom">
        {[["sysdiag", "View performance details", "taskmgr"], ["resmon", "Open Resource Monitor", "resmon"], ["devmgr", "Update a driver", "devmgr"]].map(([id, l, ic]) => (
          <div key={id} className="cp-bt" onClick={() => openPath(id)}><Icon name={ic} size={30} /><span>{l}</span></div>
        ))}
      </div>
    </div>
  );
}

/* ================================================== Windows Remote Assistance */
export function RemoteAssistance() {
  const [state2, setState2] = useState<"idle" | "invite" | "waiting" | "offer">("idle");
  const [code, setCode] = useState("");
  const [expire, setExpire] = useState(0);
  useEffect(() => {
    if (!expire) return;
    const t = setInterval(() => setExpire((e) => Math.max(0, e - 1)), 1000);
    return () => clearInterval(t);
  }, [expire]);
  if (state2 === "waiting")
    return (
      <div className="ra">
        <div className="cp-sec">Windows Remote Assistance</div>
        <div className="ra-card">
          <Icon name="help" size={40} />
          <div>
            <b>Waiting for you to accept the invitation…</b>
            <p>Give this invitation file and password to the person who is helping you. They open the file in Windows Remote Assistance and type the password.</p>
            <div className="ra-code"><span>Password:</span><code>{code}</code><em>expires in {Math.floor(expire / 60)}:{String(expire % 60).padStart(2, "0")}</em></div>
            <p className="ra-note">Invitation saved to Documents as <b>Invitation.msrcIncident</b>.</p>
          </div>
        </div>
        <p><Btn onClick={() => { setState2("idle"); setExpire(0); }}>Cancel the invitation</Btn></p>
      </div>
    );
  return (
    <div className="ra">
      <div className="cp-sec">Windows Remote Assistance</div>
      <p className="cp-desc">Windows Remote Assistance connects two computers so that a friend or family member you trust can help you fix a computer problem — or so that you can help someone else.</p>
      {state2 === "offer" ? (
        <div className="ra-offer">
          <div className="cp-sec">Invitation from someone you trust</div>
          <p>Do you want to allow <b>Media PC</b> to connect to your computer and take control of it?</p>
          <p><Btn def onClick={() => { setState2("idle"); msgBox({ title: "Windows Remote Assistance", text: "The connection to Media PC was blocked because remote control is not enabled in this simulation.", icon: "info" }); }}>Yes</Btn> <Btn onClick={() => setState2("idle")}>No</Btn></p>
        </div>
      ) : (
        <>
          <div className="ra-tiles">
            <div className="ra-tile" onClick={() => { setState2("invite"); setCode(String(Math.floor(10000000 + Math.random() * 89999999))); }}>
              <Icon name="help" size={44} /><b>Invite someone you trust to help you</b><span>Windows Remote Assistance creates an invitation file that you send to the person who will help you.</span>
            </div>
            <div className="ra-tile" onClick={() => setState2("offer")}>
              <Icon name="network" size={44} /><b>Help someone who has invited you</b><span>Open an invitation file that you received from someone who needs help.</span>
            </div>
          </div>
          <div className="cp-sec">Advanced connection option for help desk</div>
          <p><Btn onClick={() => msgBox({ title: "Windows Remote Assistance", text: "Offer Remote Assistance is configured by a Group Policy and is not enabled on this PC.", icon: "warn" })}>Use Easy Connect</Btn></p>
        </>
      )}
    </div>
  );
}

/* A thin frame the Control Panel uses to embed one of these tools inline. */
export function CPWrap({ children: kids }: { children: React.ReactNode }) {
  return <div className="cp-embed">{kids}</div>;
}
