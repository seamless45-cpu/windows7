"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore, setState, getState, login, restart, shutdown, sleep, wake, lock, children, bugCheck, reboot } from "./store";
import { Icon, appIcon } from "./icons";
import { BootAnimation } from "./BootAnimation";
import { bootKernel, BOOT_STAGES, BUGCHECKS, logEvent } from "./kernel";
import { userPic } from "./data";
import { WALLPAPERS } from "./data";
import { playSys } from "./sound";

const LOGIN_BG = WALLPAPERS[0].css;

function Spinner() {
  return (
    <div className="orb-spin">
      {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 45}deg) translateY(-14px)`, animationDelay: `${i * 0.12}s` }} />)}
    </div>
  );
}

/**
 * Windows 7's boot screen. The black screen with "Starting Windows" and the
 * four balls of light is what the OS shows; underneath it the kernel is really
 * initialising, so the boot reports the stage it is in (winload, ntoskrnl,
 * smss, wininit, services, winlogon) in the corner and can genuinely fail — a
 * driver that does not load produces a bug check instead of the logon screen.
 * "Resuming Windows" is shown when waking from hibernate.
 */
export function BootScreen({ text = "Starting Windows", copy = "© Microsoft Corporation" }: { text?: string; copy?: string }) {
  const broken = useStore((s) => s.brokenDriver);
  const safeMode = useStore((s) => s.safeMode);
  const [stage, setStage] = useState(0);

  const result = useMemo(() => bootKernel({ safeMode, brokenDriver: broken || undefined }), [safeMode, broken]);
  const stages = BOOT_STAGES.filter((s) => s.stage !== "ready");

  useEffect(() => {
    if (!result.ok) return;
    // advance one stage at a time so the diagnostics readout follows the log
    const timers = stages.map((_, i) => window.setTimeout(() => setStage(i), i * 620));
    return () => timers.forEach(clearTimeout);
  }, [result.ok]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (result.ok) return;
    // the machine bug-checks partway through the boot
    const stop = result.stop!;
    const t = setTimeout(() => bugCheck(stop, result.failed?.file), 2400);
    return () => clearTimeout(t);
  }, [result]);

  const cur = stages[Math.min(stage, stages.length - 1)];
  const lines = result.lines.filter((l) => l.stage === cur.stage).map((l) => l.text);

  return (
    <div className="boot" onClick={() => { if (result.ok) setState({ power: "login" }); }}>
      <BootAnimation />
      <div className="boot-text">{text}</div>
      {safeMode && <div className="boot-safe">Safe Mode</div>}
      {/* the real boot status: what the kernel is doing right now */}
      <div className="boot-stage">
        <span className="boot-stage-name">{cur.label}</span>
        <span className="boot-stage-line">{lines[lines.length - 1] || ""}</span>
      </div>
      <div className="boot-copy">{copy}</div>
    </div>
  );
}

export function LoginScreen({ locked }: { locked?: boolean }) {
  const settings = useStore((s) => s.settings);
  const [sel, setSel] = useState<string | null>(locked ? settings.currentUser : null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [menu, setMenu] = useState(false);
  const users = locked ? settings.users.filter((u) => u.name === settings.currentUser) : settings.users;
  const attempt = (name: string) => {
    const u = settings.users.find((x) => x.name === name);
    if (!u) return;
    if (u.pass && u.pass !== pw) {
      setErr(true);
      return;
    }
    setPw("");
    setErr(false);
    if (locked) setState({ power: "desktop" });
    else login(name);
  };
  const pick = (name: string) => {
    const u = settings.users.find((x) => x.name === name)!;
    if (u.pass) setSel(name);
    else attempt(name);
  };
  return (
    <div className="login" style={{ background: LOGIN_BG, backgroundSize: "cover" }} onClick={() => setMenu(false)}>
      <div className="login-shade" />
      <div className="login-center">
        {sel ? (
          <div className="login-user big">
            <img src={userPic(settings.users.find((u) => u.name === sel)?.pic || "flower")} alt="" />
            <div className="login-name">{sel}</div>
            <div className="login-pw">
              <input type="password" autoFocus placeholder="Password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(false); }} onKeyDown={(e) => e.key === "Enter" && attempt(sel)} />
              <button onClick={() => attempt(sel)}>➜</button>
            </div>
            {err && <div className="login-err">The user name or password is incorrect.</div>}
            <a onClick={() => { setSel(null); setPw(""); setErr(false); if (locked) setState({ power: "login" }); }}>Switch user</a>
          </div>
        ) : (
          <div className="login-users">
            {users.map((u) => (
              <div key={u.name} className="login-user" onClick={() => pick(u.name)}>
                <img src={userPic(u.pic)} alt="" />
                <div className="login-name">{u.name}</div>
                <div className="login-sub">{u.pass ? "Password protected" : u.admin ? "Administrator" : "Guest"}{locked ? " — Locked" : ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="login-brand"><Icon name="flag" size={40} /><span>Windows<sup>7</sup> <em>Ultimate</em></span></div>
      <div className="login-power" onClick={(e) => e.stopPropagation()}>
        <button className="sm-shut" onClick={() => shutdown()}>Shut down</button>
        <button className="sm-arrow" onClick={() => setMenu(!menu)}>▶</button>
        {menu && (
          <div className="ctx login-menu">
            <div className="ctx-item" onClick={() => restart()}><span className="ctx-check" /><span className="ctx-label">Restart</span></div>
            <div className="ctx-item" onClick={() => sleep()}><span className="ctx-check" /><span className="ctx-label">Sleep</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The Windows 7 bug check screen. It prints the stop code and the driver that
 * failed, waits for a click, then reboot the machine — which is exactly what
 * the real screen does after the dump completes.
 */
export function BlueScreenOfDeath() {
  const crash = useStore((s) => s.crash);
  useEffect(() => {
    playSys("critical");
  }, []);
  if (!crash) return null;
  return (
    <div
      className="bsod"
      onClick={() => reboot()}
      title="Click to restart"
    >
      <div className="bsod-inner">
        <p>A problem has been detected and Windows has been shut down to prevent damage to your computer.</p>
        <p className="bsod-code">{crash.text.split("\r\n").slice(0, 4).join("\n")}</p>
        <p>If this is the first time you&apos;ve seen this Stop error screen, restart your computer. If this screen appears again, follow these steps:</p>
        <p>Check to make sure any new hardware or software is properly installed. If this is a new installation, ask your hardware or software manufacturer for any Windows updates you might need.</p>
        {crash.driver && <p>Failing driver: <b>{crash.driver}</b></p>}
        <p>Technical information:</p>
        <p className="bsod-tech">
          *** STOP: {crash.stop} ({BUGCHECKS[crash.stop as keyof typeof BUGCHECKS]?.title})
        </p>
        <p className="bsod-count">Collecting data for crash dump ... <Countdown /></p>
        <p className="bsod-hint">Press any key to restart, or click here.</p>
      </div>
    </div>
  );
}

function Countdown() {
  const [n, setN] = useState(5);
  useEffect(() => {
    if (n <= 0) {
      reboot();
      return;
    }
    const t = setTimeout(() => setN((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [n]);
  return <b>{n}0%</b>;
}
export function BlueScreen({ text }: { text: string }) {
  return (
    <div className="login blue" style={{ background: LOGIN_BG, backgroundSize: "cover" }}>
      <div className="login-shade" />
      <div className="blue-msg">
        <Spinner />
        <div>{text}</div>
      </div>
    </div>
  );
}

export function PowerScreens() {
  const power = useStore((s) => s.power);
  const user = useStore((s) => s.settings.currentUser);
  useEffect(() => {
    if (power !== "boot") return;
    // The boot screen runs the real kernel log; the secure logon appears when
    // the kernel and the session manager have finished, ~5 s in. A driver
    // failure shows a bug check instead and never reaches this timer.
    const { brokenDriver, safeMode } = getState();
    const res = bootKernel({ safeMode, brokenDriver: brokenDriver || undefined });
    if (!res.ok) return;
    const t = setTimeout(() => {
      logEvent("Information", "Microsoft-Windows-Kernel-General", 12, "The operating system started at system time " + new Date().toLocaleString() + ".", "System");
      if (res.failed) logEvent("Error", "Service Control Manager", 7000, `The ${res.failed.display} service failed to start due to the following error: The system cannot find the file specified.`, "System");
      setState({ power: "login" });
    }, 5200);
    return () => clearTimeout(t);
  }, [power]);
  useEffect(() => {
    if (power !== "sleep") return;
    const w = () => wake();
    const t = setTimeout(() => {
      window.addEventListener("keydown", w, { once: true });
      window.addEventListener("pointerdown", w, { once: true });
    }, 600);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", w);
      window.removeEventListener("pointerdown", w);
    };
  }, [power]);
  switch (power) {
    case "boot": return <BootScreen />;
    case "bsod": return <BlueScreenOfDeath />;
    case "login": return <LoginScreen />;
    case "locked": return <LoginScreen locked />;
    case "welcome": return <BlueScreen text="Welcome" />;
    case "shuttingdown": return <BlueScreen text="Shutting down" />;
    case "restarting": return <BlueScreen text="Restarting" />;
    case "logoff": return <BlueScreen text="Logging off" />;
    case "sleep":
      return <div className="blackout sleep"><span>Sleeping… move the mouse or press a key to wake the computer.</span></div>;
    case "off":
      return (
        <div className="blackout off" onClick={() => setState({ power: "boot" })}>
          <button className="power-btn" title="Power on"><svg width="40" height="40" viewBox="0 0 48 48"><path d="M24 8v16M14 14a15 15 0 1 0 20 0" stroke="#5a6" strokeWidth="4" fill="none" strokeLinecap="round" /></svg></button>
          <span>It is now safe to turn off your computer. Click the power button to start again.</span>
        </div>
      );
    default:
      void user;
      return null;
  }
}

export { lock };

/* ------------------------------------------------------------- Alt+Tab */
export function AltTab() {
  const a = useStore((s) => s.altTab);
  const windows = useStore((s) => s.windows);
  if (!a) return null;
  const list = a.ids.map((id) => windows.find((w) => w.id === id)).filter(Boolean);
  const cur = list[a.idx % Math.max(1, list.length)];
  return (
    <div className="alttab">
      <div className="alttab-box">
        <div className="alttab-row">
          {list.map((w, i) => (
            <div key={w!.id} className={"alttab-item" + (i === a.idx % list.length ? " sel" : "")} onClick={() => { import("./store").then((m) => { m.focusWin(w!.id); setState({ altTab: null }); }); }}>
              <Icon name={appIcon(w!.app)} size={48} />
            </div>
          ))}
        </div>
        <div className="alttab-title">{cur?.title}</div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Screensaver */
export function Screensaver() {
  const on = useStore((s) => s.screensaverOn);
  const kind = useStore((s) => s.settings.screensaver);
  const fs = useStore((s) => s.fs);
  const ref = useRef<HTMLCanvasElement>(null);
  const [pi, setPi] = useState(0);
  useEffect(() => {
    if (!on) return;
    const off = () => setState({ screensaverOn: false });
    const t = setTimeout(() => {
      window.addEventListener("pointerdown", off, { once: true });
      window.addEventListener("keydown", off, { once: true });
      window.addEventListener("pointermove", off, { once: true });
    }, 500);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", off);
      window.removeEventListener("keydown", off);
      window.removeEventListener("pointermove", off);
    };
  }, [on]);
  useEffect(() => {
    if (!on || kind === "photos") return;
    const cv = ref.current;
    if (!cv) return;
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    const g = cv.getContext("2d")!;
    let raf = 0;
    const bubbles = Array.from({ length: 28 }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: 20 + Math.random() * 60, v: 0.4 + Math.random() * 1.2, h: Math.random() * 360 }));
    let t = 0;
    g.fillStyle = "#000";
    g.fillRect(0, 0, cv.width, cv.height);
    const draw = () => {
      t += 0.01;
      if (kind === "bubbles") {
        g.fillStyle = "#06101f";
        g.fillRect(0, 0, cv.width, cv.height);
        bubbles.forEach((b) => {
          b.y -= b.v;
          if (b.y < -b.r) { b.y = cv.height + b.r; b.x = Math.random() * cv.width; }
          const gr = g.createRadialGradient(b.x - b.r / 3, b.y - b.r / 3, b.r / 8, b.x, b.y, b.r);
          gr.addColorStop(0, `hsla(${b.h},90%,85%,.9)`);
          gr.addColorStop(0.7, `hsla(${b.h},80%,55%,.35)`);
          gr.addColorStop(1, `hsla(${b.h},80%,45%,.1)`);
          g.fillStyle = gr;
          g.beginPath();
          g.arc(b.x, b.y, b.r, 0, 7);
          g.fill();
        });
      } else if (kind === "ribbons") {
        g.fillStyle = "rgba(0,0,0,.06)";
        g.fillRect(0, 0, cv.width, cv.height);
        for (let k = 0; k < 4; k++) {
          g.strokeStyle = `hsla(${(t * 40 + k * 70) % 360},90%,60%,.7)`;
          g.lineWidth = 6;
          g.beginPath();
          for (let x = 0; x <= cv.width; x += 20) {
            const y = cv.height / 2 + Math.sin(x / 140 + t * 2 + k) * 160 * Math.sin(t + k) + Math.cos(x / 80 - t * 3) * 40;
            if (x === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
        }
      } else {
        g.fillStyle = "#000";
        g.fillRect(0, 0, cv.width, cv.height);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [on, kind]);
  useEffect(() => {
    if (!on || kind !== "photos") return;
    const i = setInterval(() => setPi((x) => x + 1), 3000);
    return () => clearInterval(i);
  }, [on, kind]);
  if (!on) return null;
  if (kind === "photos") {
    const pics = children("pics", fs).filter((n) => n.content?.startsWith("data:"));
    const p = pics[pi % Math.max(1, pics.length)];
    return <div className="screensaver" style={{ background: p ? `#000 url("${p.content}") center/contain no-repeat` : "#000" }} />;
  }
  void getState;
  return <div className="screensaver"><canvas ref={ref} /></div>;
}
