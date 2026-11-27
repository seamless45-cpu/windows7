/**
 * Generate the Windows Vista sound sets — Glass, Pearl and Tinker — as short
 * mono WAV clips.
 *
 * Why synthesised: the Vista RTM WAV files are Microsoft's, this repository has
 * no redistribution rights to them, and only the Windows 7 scheme folders are
 * shipped. Pointing three "new" schemes at the Windows 7 clips would make three
 * identical schemes with different names, which is worse than no schemes at all.
 * So each set is rendered from a documented tone model that matches the
 * character of the original:
 *
 *   Glass   bright bell/FM tones with a crystalline shimmer
 *   Pearl   soft sine arpeggios, long decay, watery
 *   Tinker  short wooden marimba hits with a clicky attack
 *
 * Output: public/sounds/<Set>/<clip>.wav — every clip the Win 7 folders carry,
 * so the existing per-scheme fallback in src/win7/sound.ts never fires.
 *
 * Deterministic (no randomness), so re-running produces identical files.
 *
 *   node scripts/gen-vista-sounds.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const RATE = 22050;
const root = path.resolve(import.meta.dirname, "..");

/* ------------------------------------------------------------------ WAV I/O */
const clamp = (v) => Math.max(-1, Math.min(1, v));

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(clamp(samples[i]) * 31000), i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const note = (name) => {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error("bad note " + name);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  const midi = (parseInt(m[3], 10) + 1) * 12 + base + acc;
  return 440 * Math.pow(2, (midi - 69) / 12);
};

/* --------------------------------------------------------------- synthesis */
const empty = (sec) => new Float32Array(Math.max(1, Math.floor(sec * RATE)));

/**
 * One struck tone. `partials` is a list of [ratio, amplitude]; `decay` is the
 * exponential tail in seconds; `shimmer` adds the slow amplitude-modulated
 * high partial that makes the Glass set sound crystalline.
 */
function tone(buf, start, freq, dur, gain, timbre) {
  const s0 = Math.floor(start * RATE);
  const n = Math.min(Math.floor(dur * RATE), buf.length - s0);
  const attack = timbre.attack;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.exp(-t / timbre.decay) * Math.min(1, t / attack);
    let v = 0;
    for (const [ratio, amp] of timbre.partials) {
      v += Math.sin(2 * Math.PI * freq * ratio * t) * amp;
    }
    if (timbre.shimmer) v += Math.sin(2 * Math.PI * freq * 6.01 * t) * timbre.shimmer * Math.sin(2 * Math.PI * 7.3 * t);
    if (timbre.click) v += (i < 60 ? 1 - i / 60 : 0) * 0.5 * Math.sin(2 * Math.PI * freq * 11 * t);
    if (s0 + i >= 0 && s0 + i < buf.length) buf[s0 + i] += v * env * gain;
  }
}

/** Airy noise swell, used under the Glass/Pearl startup and shutdown. */
function whoosh(buf, start, dur, gain) {
  const s0 = Math.floor(start * RATE);
  const n = Math.min(Math.floor(dur * RATE), buf.length - s0);
  let seed = 12345;
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const noise = seed / 0x3fffffff - 1;
    const t = i / RATE;
    const env = Math.sin((Math.PI * t) / dur) ** 2;
    if (s0 + i >= 0 && s0 + i < buf.length) buf[s0 + i] += noise * env * gain;
  }
}

/* --------------------------------------------------------------- the scores */
// [note, startSeconds, durationSeconds, gain]
const SCORE = {
  startup: () => {
    const b = empty(4.4);
    whoosh(b, 0, 1.2, 0.04);
    [["C5", 0.18], ["G5", 0.46], ["C6", 0.74], ["E6", 1.02], ["G6", 1.3], ["C7", 1.6]].forEach(([n, t]) =>
      tone(b, t, note(n), 3.4, 0.15, T.glass),
    );
    return b;
  },
  logon: () => {
    const b = empty(2.4);
    [["E5", 0], ["B5", 0.16], ["E6", 0.32]].forEach(([n, t]) => tone(b, t, note(n), 2.1, 0.2, T.glass));
    return b;
  },
  logoff: () => {
    const b = empty(1.8);
    [["E6", 0], ["B5", 0.14], ["E5", 0.28]].forEach(([n, t]) => tone(b, t, note(n), 1.6, 0.17, T.glass));
    return b;
  },
  shutdown: () => {
    const b = empty(3.4);
    whoosh(b, 0.35, 2, 0.04);
    [["G6", 0], ["E6", 0.22], ["C6", 0.44], ["G5", 0.66], ["C5", 0.9]].forEach(([n, t]) => tone(b, t, note(n), 2.6, 0.16, T.glass));
    return b;
  },
  default: () => {
    const b = empty(1.6);
    tone(b, 0, note("A5"), 1.5, 0.22, T.glass);
    tone(b, 0.11, note("E6"), 1.4, 0.16, T.glass);
    return b;
  },
  notify: () => {
    const b = empty(1.5);
    tone(b, 0, note("A5"), 1.4, 0.2, T.glass);
    tone(b, 0.1, note("E6"), 1.3, 0.15, T.glass);
    tone(b, 0.2, note("A6"), 1.2, 0.1, T.glass);
    return b;
  },
  ding: () => {
    const b = empty(1.1);
    tone(b, 0, note("C6"), 1, 0.24, T.glass);
    return b;
  },
  chimes: () => {
    const b = empty(2.6);
    [["C5", 0], ["E5", 0.3], ["G5", 0.6], ["C6", 0.9]].forEach(([n, t]) => tone(b, t, note(n), 2, 0.17, T.glass));
    return b;
  },
  "chimes-ding": () => {
    const b = empty(1.4);
    [["C6", 0], ["G6", 0.18]].forEach(([n, t]) => tone(b, t, note(n), 1.3, 0.2, T.glass));
    return b;
  },
  "chimes-notify": () => {
    const b = empty(1.7);
    [["E5", 0], ["A5", 0.2], ["E6", 0.4]].forEach(([n, t]) => tone(b, t, note(n), 1.5, 0.18, T.glass));
    return b;
  },
  "chimes-recycle": () => {
    const b = empty(1.3);
    [["G5", 0], ["C5", 0.22]].forEach(([n, t]) => tone(b, t, note(n), 1.2, 0.18, T.glass));
    return b;
  },
  "chimes-ringout": () => {
    const b = empty(2.2);
    [["B5", 0], ["F#5", 0.25], ["B4", 0.5]].forEach(([n, t]) => tone(b, t, note(n), 1.8, 0.15, T.glass));
    return b;
  },
  chord: () => {
    const b = empty(2.8);
    ["C4", "E4", "G4", "C5"].forEach((n) => tone(b, 0, note(n), 2.6, 0.13, T.glass));
    return b;
  },
  error: () => {
    const b = empty(1.7);
    tone(b, 0, note("C4"), 1.6, 0.2, T.glass);
    tone(b, 0, note("F#4"), 1.6, 0.16, T.glass);
    return b;
  },
  exclaim: () => {
    const b = empty(1.3);
    tone(b, 0, note("E5"), 1.2, 0.22, T.glass);
    tone(b, 0.1, note("B5"), 1.1, 0.15, T.glass);
    return b;
  },
  critical: () => {
    const b = empty(2);
    [0, 0.3, 0.6].forEach((t) => tone(b, t, note("C3"), 1.4, 0.22, T.glass));
    return b;
  },
  balloon: () => {
    const b = empty(1.3);
    tone(b, 0, note("G5"), 1.2, 0.18, T.glass);
    tone(b, 0.12, note("D6"), 1.1, 0.13, T.glass);
    return b;
  },
  minimize: () => {
    const b = empty(0.6);
    tone(b, 0, note("E6"), 0.5, 0.18, T.glass);
    tone(b, 0.05, note("B5"), 0.45, 0.12, T.glass);
    return b;
  },
  restore: () => {
    const b = empty(0.65);
    tone(b, 0, note("B5"), 0.55, 0.16, T.glass);
    tone(b, 0.06, note("E6"), 0.5, 0.13, T.glass);
    return b;
  },
  recycle: () => {
    const b = empty(1.1);
    [["D6", 0], ["A5", 0.14]].forEach(([n, t]) => tone(b, t, note(n), 1, 0.17, T.glass));
    return b;
  },
  menu: () => {
    const b = empty(0.4);
    tone(b, 0, note("E6"), 0.35, 0.14, T.glass);
    return b;
  },
  uac: () => {
    const b = empty(2.2);
    [["C5", 0], ["G5", 0.2], ["E5", 0.42]].forEach(([n, t]) => tone(b, t, note(n), 1.8, 0.18, T.glass));
    return b;
  },
  print: () => {
    const b = empty(1.2);
    [["G5", 0], ["C6", 0.16]].forEach(([n, t]) => tone(b, t, note(n), 1, 0.17, T.glass));
    return b;
  },
  "hardware-insert": () => {
    const b = empty(1.1);
    [["C6", 0], ["G6", 0.12], ["C7", 0.24]].forEach(([n, t]) => tone(b, t, note(n), 0.9, 0.16, T.glass));
    return b;
  },
  "hardware-remove": () => {
    const b = empty(1.1);
    [["C7", 0], ["G6", 0.12], ["C6", 0.24]].forEach(([n, t]) => tone(b, t, note(n), 0.9, 0.16, T.glass));
    return b;
  },
  "hardware-fail": () => {
    const b = empty(1.6);
    [["A4", 0], ["Eb4", 0.24]].forEach(([n, t]) => tone(b, t, note(n), 1.3, 0.19, T.glass));
    return b;
  },
  "battery-low": () => {
    const b = empty(1.4);
    [["A5", 0], ["A5", 0.28]].forEach(([n, t]) => tone(b, t, note(n), 0.9, 0.2, T.glass));
    return b;
  },
  "battery-critical": () => {
    const b = empty(1.8);
    [0, 0.3, 0.6].forEach((t) => tone(b, t, note("A4"), 0.8, 0.21, T.glass));
    return b;
  },
  feed: () => {
    const b = empty(1.3);
    [["D6", 0], ["G6", 0.14]].forEach(([n, t]) => tone(b, t, note(n), 1, 0.17, T.glass));
    return b;
  },
  infobar: () => {
    const b = empty(1);
    [["F5", 0], ["Bb5", 0.14]].forEach(([n, t]) => tone(b, t, note(n), 0.8, 0.17, T.glass));
    return b;
  },
  popup: () => {
    const b = empty(1.1);
    [["Bb5", 0], ["F5", 0.16]].forEach(([n, t]) => tone(b, t, note(n), 0.9, 0.17, T.glass));
    return b;
  },
  navigation: () => {
    const b = empty(0.6);
    tone(b, 0, note("G5"), 0.5, 0.13, T.glass);
    return b;
  },
  ringin: () => {
    const b = empty(1.6);
    [["E5", 0], ["G5", 0.18], ["E5", 0.36]].forEach(([n, t]) => tone(b, t, note(n), 1, 0.17, T.glass));
    return b;
  },
  ringout: () => {
    const b = empty(2);
    [["E5", 0], ["G5", 0.25], ["B5", 0.5]].forEach(([n, t]) => tone(b, t, note(n), 1.4, 0.16, T.glass));
    return b;
  },
  tada: () => {
    const b = empty(3);
    [["C5", 0], ["E5", 0.18], ["G5", 0.36], ["C6", 0.54]].forEach(([n, t]) => tone(b, t, note(n), 2.4, 0.16, T.glass));
    ["C4", "E4", "G4"].forEach((n) => tone(b, 0.7, note(n), 2.1, 0.12, T.glass));
    return b;
  },
  "speech-on": () => {
    const b = empty(0.7);
    [["C6", 0], ["E6", 0.1]].forEach(([n, t]) => tone(b, t, note(n), 0.5, 0.16, T.glass));
    return b;
  },
  "speech-off": () => {
    const b = empty(0.7);
    [["E6", 0], ["C6", 0.1]].forEach(([n, t]) => tone(b, t, note(n), 0.5, 0.16, T.glass));
    return b;
  },
  "speech-sleep": () => {
    const b = empty(0.9);
    [["G5", 0], ["C5", 0.16]].forEach(([n, t]) => tone(b, t, note(n), 0.7, 0.15, T.glass));
    return b;
  },
  "speech-misrecognition": () => {
    const b = empty(0.9);
    [["F#5", 0], ["C5", 0.12]].forEach(([n, t]) => tone(b, t, note(n), 0.6, 0.17, T.glass));
    return b;
  },
  "speech-disambiguation": () => {
    const b = empty(1);
    [["A5", 0], ["A5", 0.2], ["C6", 0.36]].forEach(([n, t]) => tone(b, t, note(n), 0.6, 0.15, T.glass));
    return b;
  },
  ir_begin: () => {
    const b = empty(0.7);
    [["C5", 0], ["G5", 0.12]].forEach(([n, t]) => tone(b, t, note(n), 0.6, 0.14, T.glass));
    return b;
  },
  ir_end: () => {
    const b = empty(0.7);
    [["G5", 0], ["C5", 0.12]].forEach(([n, t]) => tone(b, t, note(n), 0.6, 0.14, T.glass));
    return b;
  },
  ir_inter: () => {
    const b = empty(0.5);
    tone(b, 0, note("D6"), 0.4, 0.13, T.glass);
    return b;
  },
};

/**
 * Timbres. `glass` is the reference used by the score above; the other two
 * re-voice the same score, which is exactly how the real sets relate (same
 * events, different instrument).
 */
const T = {
  glass: { partials: [[1, 1], [2, 0.42], [3.01, 0.26], [4.7, 0.15], [6.8, 0.08]], decay: 0.85, attack: 0.004, shimmer: 0.05 },
  pearl: { partials: [[1, 1], [2, 0.22], [3, 0.08]], decay: 1.35, attack: 0.02, shimmer: 0 },
  tinker: { partials: [[1, 1], [2.4, 0.22], [4.1, 0.08]], decay: 0.34, attack: 0.002, shimmer: 0, click: true },
};

const SETS = { VistaGlass: "glass", VistaPearl: "pearl", VistaTinker: "tinker" };

/* ------------------------------------------------------------------ render */
const only = process.argv.slice(2);
let n = 0;
for (const [folder, timbreKey] of Object.entries(SETS)) {
  if (only.length && !only.includes(folder)) continue;
  const dir = path.join(root, "public/sounds", folder);
  await mkdir(dir, { recursive: true });
  for (const name of Object.keys(SCORE)) {
    // Re-point the shared score at this set's timbre for the duration of one
    // render; `T.glass` is the spelling used inside SCORE.
    const saved = T.glass;
    T.glass = T[timbreKey];
    const buf = SCORE[name]();
    T.glass = saved;
    await writeFile(path.join(dir, `${name}.wav`), wav(buf));
    n++;
  }
  console.log(`${folder}: ${Object.keys(SCORE).length} clips (${timbreKey})`);
}
console.log(`wrote ${n} files`);
