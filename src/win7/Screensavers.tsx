"use client";
/**
 * The Windows 7 screen savers that were not in the first pass: **Mystify**
 * (the polyline ribbons that fold over themselves and drag bright streaks of
 * "lightning" behind them), **3D Text** (a floating, spinning extruded word over
 * a starfield) and a smooth **Gradient** wash.
 *
 * All three are drawn on a canvas at device resolution. Mystify reproduces the
 * original's four bouncing vertices per line and the additive trail buffer that
 * makes the ribbons look like arcs of electricity, which is why the user-facing
 * description calls them "lightning strikes". 3D Text extrudes the glyphs one
 * pixel at a time into an off-screen buffer, shades the front face with a
 * vertical gradient and lays a mirrored reflection under it, the same recipe
 * the Direct3D screen saver uses.
 */
import React, { useEffect, useRef } from "react";
import { useStore } from "./store";
import { playThunder } from "./sound";

/* ============================================================ Mystify */
interface Line {
  x: number[]; y: number[]; vx: number[]; vy: number[];
  hue: number; width: number;
}

export function Mystify() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = () => window.innerWidth;
    const h = () => window.innerHeight;
    const size = () => { cv.width = Math.round(w() * dpr); cv.height = Math.round(h() * dpr); };
    size();
    const g = cv.getContext("2d")!;
    g.scale(dpr, dpr);
    const W = () => w(), H = () => h();

    // Windows' Mystify draws two lines with four vertices each, all moving at
    // different speeds; the trail is the previous frame faded, not cleared.
    const mk = (hue: number, width: number): Line => ({
      x: [Math.random() * W(), Math.random() * W()],
      y: [Math.random() * H(), Math.random() * H()],
      vx: [0, 0], vy: [0, 0], hue, width,
    });
    const lines: Line[] = [mk(190, 2.0), mk(320, 1.6)];
    lines.forEach((l) => {
      l.x = [1, 2, 3, 4].map(() => W() * (0.15 + Math.random() * 0.7));
      l.y = [1, 2, 3, 4].map(() => H() * (0.15 + Math.random() * 0.7));
      l.vx = [1, 2, 3, 4].map(() => (Math.random() - 0.5) * 3.4);
      l.vy = [1, 2, 3, 4].map(() => (Math.random() - 0.5) * 3.4);
    });

    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(2.4, (now - last) / 16.7);
      last = now;
      // Fade the previous frame: this is what makes the ribbons look like
      // electric trails instead of a flickering polygon.
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "rgba(0,0,0,.22)";
      g.fillRect(0, 0, W(), H());
      g.globalCompositeOperation = "lighter";

      for (const l of lines) {
        for (let i = 0; i < 4; i++) {
          l.x[i] += l.vx[i] * dt;
          l.y[i] += l.vy[i] * dt;
          if (l.x[i] < 0) { l.x[i] = 0; l.vx[i] *= -1; }
          if (l.x[i] > W()) { l.x[i] = W(); l.vx[i] *= -1; }
          if (l.y[i] < 0) { l.y[i] = 0; l.vy[i] *= -1; }
          if (l.y[i] > H()) { l.y[i] = H(); l.vy[i] *= -1; }
        }
        l.hue = (l.hue + 0.35 * dt) % 360;
        // a soft outer glow plus a bright core: the "lightning" look
        for (const [width, alpha, light] of [[l.width * 2.0, 0.10, 45], [l.width * 1.15, 0.20, 62], [l.width * 0.62, 0.85, 82]] as const) {
          g.strokeStyle = `hsla(${l.hue}, 100%, ${light}%, ${alpha})`;
          g.lineWidth = width;
          g.lineJoin = "round";
          g.beginPath();
          g.moveTo(l.x[0], l.y[0]);
          for (let i = 1; i < 4; i++) g.lineTo(l.x[i], l.y[i]);
          g.closePath();
          g.stroke();
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const onResize = () => { g.setTransform(1, 0, 0, 1, 0, 0); size(); g.scale(dpr, dpr); g.fillStyle = "#000"; g.fillRect(0, 0, W(), H()); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return <div className="screensaver"><canvas ref={ref} /></div>;
}


/* ========================================================== Lightning */
/**
 * A storm over a dark landscape. Each strike is generated procedurally:
 * a main bolt walks downward with a jittered midpoint displacement, then throws
 * off forked branches at random points, each of which forks again. The bolt is
 * drawn three times — a wide dim halo, a mid glow and a 1 px white core — and
 * the whole sky is lit for a few frames, with a second, weaker return stroke
 * about 80 ms later, which is what makes real lightning read as lightning
 * instead of a white line. Thunder trails the flash by the distance.
 */
interface Pt { x: number; y: number }

function boltPath(x0: number, y0: number, x1: number, y1: number, rough: number, out: Pt[], depth = 0) {
  const mid = (a: number, b: number) => (a + b) / 2 + (Math.random() - 0.5) * rough;
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 26));
  let px = x0, py = y0;
  out.push({ x: px, y: py });
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const tx = x0 + (x1 - x0) * t;
    const ty = y0 + (y1 - y0) * t;
    const nx = mid(tx, px) + 0; // horizontal wander, perpendicular-ish
    const ny = mid(ty, py);
    px = depth === 0 ? tx + (Math.random() - 0.5) * rough : nx;
    py = ny;
    out.push({ x: px, y: py });
  }
  return out;
}

function makeStrike(W: number, H: number) {
  const startX = W * (0.15 + Math.random() * 0.7);
  const endX = startX + (Math.random() - 0.5) * W * 0.22;
  const main: Pt[] = [];
  boltPath(startX, -20, endX, H * (0.62 + Math.random() * 0.3), H * 0.06, main);
  const branches: { pts: Pt[]; w: number }[] = [];
  const forks = 2 + Math.floor(Math.random() * 4);
  for (let f = 0; f < forks; f++) {
    const at = main[Math.floor(main.length * (0.12 + Math.random() * 0.7))];
    if (!at) continue;
    const len = H * (0.12 + Math.random() * 0.34);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const pts: Pt[] = [];
    boltPath(at.x, at.y, at.x + dir * len * (0.35 + Math.random() * 0.6), at.y + len, H * 0.035, pts);
    branches.push({ pts, w: 0.45 + Math.random() * 0.3 });
    if (Math.random() < 0.55) {
      const at2 = pts[Math.floor(pts.length * 0.5)];
      if (at2) {
        const sub: Pt[] = [];
        boltPath(at2.x, at2.y, at2.x + dir * len * 0.4, at2.y + len * 0.5, H * 0.025, sub);
        branches.push({ pts: sub, w: 0.3 });
      }
    }
  }
  return { main, branches, x: endX };
}

export function Lightning() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv0 = ref.current;
    if (!cv0) return;
    const cv = cv0;
    const g = cv.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // static horizon silhouette so the sky reads as a landscape
    const ridge: Pt[] = [];
    const ridgeH = () => {
      ridge.length = 0;
      for (let x = -20; x <= W + 20; x += 24) {
        ridge.push({ x, y: H * 0.82 + Math.sin(x / 190) * H * 0.03 + Math.sin(x / 61) * H * 0.012 + Math.random() * H * 0.012 });
      }
    };
    ridgeH();

    const rain = Array.from({ length: 130 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 6 + Math.random() * 9, l: 8 + Math.random() * 16 }));

    let strike: ReturnType<typeof makeStrike> | null = null;
    let flash = 0;            // 0..1, the sky's brightness
    let flash2 = 0;           // the return stroke
    let boltAlpha = 0;
    const next = 900 + Math.random() * 2600;
    let nextAt = performance.now() + next;
    let last = performance.now();
    let raf = 0;

    const drawBolt = (alpha: number) => {
      if (!strike) return;
      const layers: [number, string][] = [
        [9, `rgba(150,180,255,${0.10 * alpha})`],
        [4.5, `rgba(190,215,255,${0.22 * alpha})`],
        [1.15, `rgba(255,255,255,${0.95 * alpha})`],
      ];
      for (const [w, col] of layers) {
        g.strokeStyle = col;
        g.lineWidth = w;
        g.lineJoin = "round";
        g.lineCap = "round";
        g.beginPath();
        const m = strike.main;
        g.moveTo(m[0].x, m[0].y);
        for (let i = 1; i < m.length; i++) g.lineTo(m[i].x, m[i].y);
        g.stroke();
        for (const b of strike.branches) {
          g.lineWidth = w * b.w;
          g.beginPath();
          g.moveTo(b.pts[0].x, b.pts[0].y);
          for (let i = 1; i < b.pts.length; i++) g.lineTo(b.pts[i].x, b.pts[i].y);
          g.stroke();
        }
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;

      // ---- sky
      const sky = g.createLinearGradient(0, 0, 0, H);
      const lit = Math.min(1, flash * 0.75 + flash2 * 0.5);
      sky.addColorStop(0, `rgb(${8 + lit * 96}, ${12 + lit * 104}, ${26 + lit * 122})`);
      sky.addColorStop(0.55, `rgb(${16 + lit * 72}, ${22 + lit * 80}, ${40 + lit * 96})`);
      sky.addColorStop(1, `rgb(${10 + lit * 44}, ${14 + lit * 50}, ${24 + lit * 62})`);
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);

      // cloud band, brightened by the flash from below
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 0.31 + 0.08) % 1) * W;
        const cy = H * (0.1 + (i % 3) * 0.06) + Math.sin(now / 9000 + i) * 12;
        const rg = g.createRadialGradient(cx, cy, 0, cx, cy, H * 0.34);
        rg.addColorStop(0, `rgba(${150 + lit * 90}, ${165 + lit * 85}, ${200 + lit * 55}, ${0.07 + lit * 0.22})`);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = rg;
        g.fillRect(0, 0, W, H * 0.7);
      }

      // ---- strike timing
      if (!strike || now > nextAt) {
        strike = makeStrike(W, H);
        boltAlpha = 1;
        flash = 1;
        flash2 = 0;
        nextAt = now + 1400 + Math.random() * 4200;
        // thunder follows the flash after a distance-dependent delay
        const dist = 0.6 + Math.random() * 2.6;
        window.setTimeout(() => playThunder(dist), dist * 500);
      }
      // main stroke decays fast, the return stroke a beat later
      boltAlpha = Math.max(0, boltAlpha - 0.055 * dt);
      flash = Math.max(0, flash - 0.07 * dt);
      if (flash < 0.35 && flash2 === 0 && boltAlpha > 0.4) flash2 = 1;
      flash2 = Math.max(0, flash2 - 0.12 * dt);

      drawBolt(boltAlpha);

      // ---- rain
      g.strokeStyle = `rgba(190,210,240,${0.13 + lit * 0.22})`;
      g.lineWidth = 1;
      g.beginPath();
      for (const r of rain) {
        r.y += r.v * dt;
        r.x -= r.v * 0.22 * dt;
        if (r.y > H) { r.y = -20; r.x = Math.random() * (W + 80); }
        if (r.x < -20) r.x = W + 10;
        g.moveTo(r.x, r.y);
        g.lineTo(r.x + r.l * 0.22, r.y - r.l);
      }
      g.stroke();

      // ---- horizon
      g.fillStyle = `rgb(${4 + lit * 16}, ${6 + lit * 18}, ${10 + lit * 22})`;
      g.beginPath();
      g.moveTo(-20, H + 20);
      for (const p of ridge) g.lineTo(p.x, p.y);
      g.lineTo(W + 20, H + 20);
      g.closePath();
      g.fill();

      // the flash also glares across the ground
      if (lit > 0.02) {
        const gr = g.createLinearGradient(0, H * 0.7, 0, H);
        gr.addColorStop(0, `rgba(120,150,210,${lit * 0.12})`);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.fillRect(0, H * 0.7, W, H * 0.3);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onResize = () => { resize(); ridgeH(); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);
  return <div className="screensaver"><canvas ref={ref} /></div>;
}

/* ============================================================ 3D Text */
const STARFIELD = 140;

export function Text3D() {
  const ref = useRef<HTMLCanvasElement>(null);
  const cfg = useStore((s) => s.settings.ssText3D);
  const text = cfg.text || "Windows 7";
  const size = Math.max(14, Math.min(240, cfg.size || 72));
  const spin = Math.max(0, Math.min(100, cfg.spin ?? 40)) / 100;
  const surface = cfg.surface;
  const font = cfg.font || "Segoe UI Light";

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = () => cv.width / dpr;
    const H = () => cv.height / dpr;
    const resize = () => { cv.width = Math.round(window.innerWidth * dpr); cv.height = Math.round(window.innerHeight * dpr); };
    resize();
    const g = cv.getContext("2d")!;
    g.scale(dpr, dpr);

    const stars = Array.from({ length: STARFIELD }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random(),
      s: Math.random(),
    }));

    // Pre-render the word (and its extrusion) once per size/font change.
    const face = document.createElement("canvas");
    const pad = 24;
    const fctx = face.getContext("2d")!;
    const faceFont = `300 ${size}px "${font}", "Segoe UI", Tahoma, sans-serif`;
    fctx.font = faceFont;
    const metrics = fctx.measureText(text);
    const tw = Math.ceil(metrics.width) + pad * 2;
    const th = Math.ceil(size * 1.7) + pad * 2;
    face.width = tw;
    face.height = th;
    fctx.font = faceFont;
    fctx.textBaseline = "middle";
    fctx.textAlign = "center";
    fctx.fillStyle = "#fff";
    fctx.fillText(text, tw / 2, th / 2);

    // extrusion: repeated offset copies, darker the deeper they go
    const depth = Math.round(size * 0.22);
    const extruded = document.createElement("canvas");
    extruded.width = tw;
    extruded.height = th;
    const ectx = extruded.getContext("2d")!;
    for (let i = depth; i > 0; i--) {
      ectx.globalAlpha = 1;
      ectx.drawImage(face, i * 0.55, i);
    }
    ectx.globalCompositeOperation = "source-in";
    const grad = ectx.createLinearGradient(0, 0, 0, th);
    if (surface === "texture") {
      grad.addColorStop(0, "#d6b06a");
      grad.addColorStop(0.45, "#8d6a34");
      grad.addColorStop(0.55, "#b8955a");
      grad.addColorStop(1, "#5b4220");
    } else if (surface === "solid") {
      grad.addColorStop(0, "#5a7590");
      grad.addColorStop(1, "#16223a");
    } else {
      grad.addColorStop(0, "#bcd6ee");
      grad.addColorStop(0.45, "#3f6c9e");
      grad.addColorStop(0.55, "#8fb6db");
      grad.addColorStop(1, "#1d3455");
    }
    ectx.fillStyle = grad;
    ectx.fillRect(0, 0, tw, th);

    // front face: the same colour ramp, lighter, with a specular highlight
    const front = document.createElement("canvas");
    front.width = tw;
    front.height = th;
    const nctx = front.getContext("2d")!;
    nctx.drawImage(face, 0, 0);
    nctx.globalCompositeOperation = "source-in";
    const fg = nctx.createLinearGradient(0, th * 0.25, 0, th * 0.75);
    if (surface === "texture") {
      fg.addColorStop(0, "#f6e3b8");
      fg.addColorStop(0.5, "#c9a35f");
      fg.addColorStop(1, "#7a5a28");
    } else if (surface === "solid") {
      fg.addColorStop(0, "#eef4fb");
      fg.addColorStop(0.5, "#9fb2c6");
      fg.addColorStop(1, "#4a5d73");
    } else {
      fg.addColorStop(0, "#ffffff");
      fg.addColorStop(0.35, "#cfe6fb");
      fg.addColorStop(0.55, "#7fb3e0");
      fg.addColorStop(1, "#27507d");
    }
    nctx.fillStyle = fg;
    nctx.fillRect(0, 0, tw, th);

    let angle = 0;
    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = "#000";
      g.fillRect(0, 0, W(), H());

      // the starfield drifts towards the viewer
      for (const st of stars) {
        st.z -= 0.0022 * dt;
        if (st.z <= 0.02) { st.z = 1; st.x = Math.random() * 2 - 1; st.y = Math.random() * 2 - 1; }
        const px = W() / 2 + (st.x / st.z) * W() * 0.16;
        const py = H() / 2 + (st.y / st.z) * H() * 0.16;
        if (px < -20 || px > W() + 20 || py < -20 || py > H() + 20) continue;
        const a = Math.min(1, (1 - st.z) * 1.5) * 0.85;
        g.fillStyle = `rgba(${210 + st.s * 40}, ${225 + st.s * 25}, 255, ${a})`;
        g.fillRect(px, py, 1.4, 1.4);
      }

      angle += 0.006 * dt * (0.3 + spin * 1.7);
      // the word floats in place with a very slow drift (~6 s period)
      const bob = Math.sin(now / 3000) * 6;
      const persp = 0.35;
      const cos = Math.cos(angle);
      // A simple 3D box rotation: the word turns about its vertical axis and the
      // near side is drawn a little larger, which reads as real depth.
      g.save();
      g.translate(W() / 2, H() / 2 + bob);
      const sk = Math.sin(angle) * persp;
      g.transform(cos * 1, 0, sk, 1, 0, 0);
      const scale = 1 + Math.abs(Math.sin(angle)) * 0.04;

      // reflection under the word
      if (surface === "reflective") {
        g.save();
        g.globalAlpha = 0.22;
        g.translate(0, th * 0.34);
        g.scale(scale, -0.55 * scale);
        const rx = -tw / 2;
        const ry = -(depth + 6);
        g.drawImage(extruded, rx, ry);
        g.drawImage(front, rx - depth * 0.55, ry - depth);
        g.restore();
      }

      g.globalAlpha = 1;
      g.drawImage(extruded, -tw / 2 - depth * 0.55, -th / 2 - depth);
      g.drawImage(front, -tw / 2, -th / 2);
      g.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onResize = () => { resize(); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [text, size, spin, surface, font]);
  return <div className="screensaver"><canvas ref={ref} /></div>;
}

/* ============================================================ Gradient */
export function GradientSS() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d")!;
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    resize();
    let t = 0;
    let raf = 0;
    const draw = () => {
      t += 0.002;
      const w = cv.width, h = cv.height;
      const lg = g.createLinearGradient(0, 0, w, h);
      const a = (Math.sin(t) + 1) / 2;
      lg.addColorStop(0, `hsl(${200 + a * 60}, 70%, ${12 + a * 10}%)`);
      lg.addColorStop(0.5, `hsl(${250 + a * 40}, 65%, ${22 + a * 8}%)`);
      lg.addColorStop(1, `hsl(${300 + a * 30}, 55%, ${8 + a * 6}%)`);
      g.fillStyle = lg;
      g.fillRect(0, 0, w, h);
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <div className="screensaver"><canvas ref={ref} /></div>;
}
