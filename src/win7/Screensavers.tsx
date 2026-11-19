"use client";
/**
 * The Windows 7 screen savers: **Mystify** (the polyline ribbons that fold
 * over themselves and drag bright streaks behind them) and **3D Text** (a
 * floating, spinning extruded word over a starfield).
 *
 * Both are drawn on a canvas at device resolution. Mystify reproduces the
 * original's four bouncing vertices per line and the additive trail buffer
 * that makes the ribbons look like arcs of light. 3D Text extrudes the glyphs
 * one pixel at a time into an off-screen buffer, shades the front face with a
 * vertical gradient and lays a mirrored reflection under it.
 */
import React, { useEffect, useRef } from "react";
import { useStore } from "./store";


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


