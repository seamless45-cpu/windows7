export const snd = { vol: 0.5, muted: false, scheme: "default" as string, keyClick: false };

let ctx: AudioContext | null = null;
export function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.2, dest?: AudioNode) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(dest || c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export type SysSound = "startup" | "shutdown" | "logoff" | "logon" | "error" | "exclaim" | "ding" | "balloon" | "click" | "key" | "recycle" | "minimize";

export function playSys(kind: SysSound) {
  if (snd.muted || snd.vol <= 0) return;
  if (snd.scheme === "none" && kind !== "key" && kind !== "click") return;
  if (kind === "key" && !snd.keyClick) return;
  const v = snd.vol;
  switch (kind) {
    case "startup": // rising shimmering chord
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.28, 2.4, "sine", 0.09 * v));
      [196, 261.6].forEach((f) => tone(f, 0.1, 2.6, "triangle", 0.06 * v));
      break;
    case "shutdown":
    case "logoff":
      [1046.5, 783.99, 659.25, 523.25].forEach((f, i) => tone(f, i * 0.25, 1.6, "sine", 0.08 * v));
      break;
    case "logon":
      [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.15, 1.2, "sine", 0.08 * v));
      break;
    case "error":
      tone(220, 0, 0.25, "square", 0.05 * v);
      tone(165, 0.12, 0.35, "square", 0.05 * v);
      break;
    case "exclaim":
      tone(880, 0, 0.18, "triangle", 0.1 * v);
      tone(660, 0.1, 0.3, "triangle", 0.1 * v);
      break;
    case "ding":
      tone(1318.5, 0, 0.5, "sine", 0.12 * v);
      break;
    case "balloon":
      tone(988, 0, 0.18, "sine", 0.1 * v);
      tone(1318, 0.12, 0.3, "sine", 0.1 * v);
      break;
    case "click":
      tone(1800, 0, 0.03, "square", 0.02 * v);
      break;
    case "key":
      tone(1200, 0, 0.02, "square", 0.015 * v);
      break;
    case "recycle":
      tone(500, 0, 0.12, "sawtooth", 0.04 * v);
      tone(300, 0.08, 0.2, "sawtooth", 0.04 * v);
      break;
    case "minimize":
      tone(700, 0, 0.06, "sine", 0.03 * v);
      break;
  }
}
