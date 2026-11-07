"use client";
/**
 * The Windows 7 boot animation.
 *
 * Windows 7's boot screen is black, with "Starting Windows" and a small
 * copyright line. The animation itself — designed by Rolf Ebeling — is
 * 105 frames at 15 fps (about 7 s), each frame 200×200 px: four balls of light
 * in the Windows colours (red, green, blue, yellow) swirl around one another
 * like fireflies, then melt together into the four panes of the Windows flag,
 * which settles and pulses. The first four seconds play once; the last three
 * seconds loop while the kernel and boot drivers load.
 *
 * The simulator reproduces that timeline: the one-shot section runs once, then
 * the glow loop repeats until the logon screen is ready.
 */
import React, { useEffect, useState } from "react";

/** 105 frames at 15 fps, first 4 s once, last 3 s looping. */
const FRAME_MS = 1000 / 15;
const TOTAL = 105;
const LOOP_FROM = 60;

const PANES = [
  { key: "red", color: "#f65314", glow: "#ff8a4d", x: -25, y: -25 },
  { key: "green", color: "#7cbb00", glow: "#b3e85c", x: 25, y: -25 },
  { key: "blue", color: "#00a1f1", glow: "#6fd2ff", x: -25, y: 25 },
  { key: "yellow", color: "#ffbb00", glow: "#ffe07a", x: 25, y: 25 },
];

export function BootAnimation() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let n = 0;
    let timer = 0;
    const tick = () => {
      n += 1;
      // once the one-shot section is over, loop the glow
      const f = n < TOTAL ? n : LOOP_FROM + ((n - TOTAL) % (TOTAL - LOOP_FROM));
      setFrame(f);
      timer = window.setTimeout(tick, FRAME_MS);
    };
    timer = window.setTimeout(tick, FRAME_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // 0 → 1 over the one-shot section: orbs flying in and settling.
  const t = clamp(frame / LOOP_FROM);
  const settle = easeInOut(t);
  const formed = frame >= LOOP_FROM;
  const phase = formed ? ((frame - LOOP_FROM) / (TOTAL - LOOP_FROM)) * Math.PI : 0;
  const pulse = formed ? 0.5 + 0.5 * Math.sin(phase) : 0;

  return (
    <div className={"boot-anim" + (formed ? " formed" : "")} role="img" aria-label="Windows 7 startup animation">
      <div className="boot-glow" style={{ opacity: 0.12 + 0.5 * settle + 0.3 * pulse }} />
      <div className="boot-flag" style={{ transform: `scale(${0.8 + 0.2 * settle})` }}>
        {PANES.map((p, i) => {
          const local = clamp((t - i * 0.1) / (1 - i * 0.1));
          const fly = easeOutBack(local);
          // orbs spiral in from off-screen before locking into the flag
          const off = (1 - fly) * 150;
          const spin = (1 - settle) * (i % 2 ? -1 : 1) * 150;
          const ang = ((i * 90 + 45 + spin) * Math.PI) / 180;
          const x = p.x * settle + Math.cos(ang) * off * (1 - settle * 0.35);
          const y = p.y * settle + Math.sin(ang) * off * (1 - settle * 0.35);
          const size = 26 - 8 * settle;
          return (
            <div
              key={p.key}
              className="boot-orb"
              style={{
                width: size,
                height: size,
                background: `radial-gradient(circle at 38% 34%, #fff 0%, ${p.glow} 40%, ${p.color} 78%)`,
                boxShadow: `0 0 ${16 + 20 * settle + 12 * pulse}px ${3 + 7 * settle}px ${p.color}${formed ? "aa" : "55"}`,
                borderRadius: `${6 + 8 * (1 - settle)}px`,
                opacity: local <= 0 ? 0 : 1,
                transform: `translate(-50%,-50%) translate(${x}px,${y}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const easeOutBack = (t: number) => {
  const c = 1.7;
  const p = t - 1;
  return 1 + (c + 1) * p * p * p + c * p * p;
};
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
