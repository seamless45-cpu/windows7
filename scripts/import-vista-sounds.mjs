/**
 * Convert the genuine Windows Vista .wav sound sets to the 22.05 kHz mono MP3s
 * the simulator streams.
 *
 * The source WAVs are the real Vista RTM media files (44.1 kHz, 16-bit stereo,
 * PCM). They are **not** in this repository or in its history: they are
 * Microsoft's audio, so the repo ships the importer rather than the masters.
 * Point it at a folder holding the Vista media and it writes
 * `public/sounds/<set>/<clip>.mp3`.
 *
 *   node scripts/import-vista-sounds.mjs "<path-to-vista-media>"
 *
 * Accepted input layouts (any one of them):
 *   <path>/Glass/<clip>.wav
 *   <path>/Windows Vista/Glass/<clip>.wav
 *   <path>/all-windows-sounds-HEAD/(2006) Windows Vista/Glass/<clip>.wav
 *
 * Sets: Glass, Pearl, Tinker. Vista's *default* scheme is the same clip set as
 * Windows 7's, so it is offered in the UI as "Vista Default" and played from
 * the existing `default` folder — nothing to import for it.
 *
 * Encoding is pure JavaScript (`lamejs`, a devDependency), so no ffmpeg is
 * needed and the result is deterministic. Nothing is ever synthesised here: if
 * a source file is missing, that clip is simply absent, and `sound.ts` falls
 * back to the Windows Default clip for it exactly as Windows does.
 */
import { readdir, mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

/**
 * lamejs 1.2.1's package entry does not attach `Mp3Encoder` to its exports in a
 * Node ESM context (`MPEGMode is not defined`), but its bundled build does when
 * evaluated as a plain script. Load that build in a sandbox so the dependency
 * stays a devDependency and no native encoder is required.
 */
const require = createRequire(import.meta.url);
const lamejs = (() => {
  const file = require.resolve("lamejs/lame.all.js");
  const src = require("node:fs").readFileSync(file, "utf8");
  const sandbox = {
    console,
    Math,
    Int8Array,
    Int16Array,
    Int32Array,
    Uint8Array,
    Float32Array,
    Float64Array,
    Array,
    Object,
    String,
    Number,
    Error,
    isNaN,
    parseFloat,
    parseInt,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: file });
  return sandbox.lamejs;
})();

const root = path.resolve(import.meta.dirname, "..");

/** Windows media file name (without .wav) -> the clip name the shell plays. */
const CLIP = {
  "Windows Default": "default",
  "Windows Logon Sound": "logon",
  "Windows Logoff Sound": "logoff",
  "Windows Startup": "startup",
  "Windows Shutdown": "shutdown",
  "Windows Minimize": "minimize",
  "Windows Restore": "restore",
  "Windows Ding": "ding",
  "Windows Error": "error",
  "Windows Exclamation": "exclaim",
  "Windows Critical Stop": "critical",
  "Windows Balloon": "balloon",
  "Windows Notify": "notify",
  "Windows Recycle": "recycle",
  "Windows Menu Command": "menu",
  "Windows User Account Control": "uac",
  "Windows Print complete": "print",
  "Windows Print Complete": "print",
  "Windows Hardware Insert": "hardware-insert",
  "Windows Hardware Remove": "hardware-remove",
  "Windows Hardware Fail": "hardware-fail",
  "Windows Battery Low": "battery-low",
  "Windows Battery Critical": "battery-critical",
  "Windows Feed Discovered": "feed",
  "Windows Information Bar": "infobar",
  "Windows Pop-up Blocked": "popup",
  "Windows Navigation Start": "navigation",
  "Windows Ringin": "ringin",
  "Windows Ringout": "ringout",
  "Speech On": "speech-on",
  "Speech Off": "speech-off",
  "Speech Sleep": "speech-sleep",
  "Speech Misrecognition": "speech-misrecognition",
  "Speech Disambiguation": "speech-disambiguation",
  chimes: "chimes",
  chord: "chord",
  ding: "ding",
  notify: "notify",
  recycle: "recycle",
  ringin: "ringin",
  ringout: "ringout",
  tada: "tada",
  start: "startup",
  ir_begin: "ir_begin",
  "Windows Shutdown-Long": "shutdown-long",
  ir_end: "ir_end",
  ir_inter: "ir_inter",
};

/**
 * `VistaDefault` takes the WAVs that sit directly in the Vista media folder —
 * Vista's own default scheme. It is a *different* set of recordings from
 * Windows 7's, which is why it gets its own folder rather than reusing
 * `default/`.
 */
const SETS = { Glass: "VistaGlass", Pearl: "VistaPearl", Tinker: "VistaTinker", "": "VistaDefault" };

const have = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

/**
 * Parse a PCM WAV and return mono float samples at `targetRate`.
 *
 * Handles 8/16/24/32-bit PCM and float32, any channel count (mixed down), and
 * any sample rate (linear resample — these are one-shot effects, not music, so
 * linear interpolation is inaudible and avoids resampler dependencies).
 */
export function wavToMono(buf, targetRate = 22050) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("not a WAV");
  let i = 12;
  let fmt = null;
  let data = null;
  while (i + 8 <= buf.length) {
    const id = buf.toString("ascii", i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    const body = i + 8;
    if (id === "fmt ") {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        rate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      data = buf.subarray(body, body + size);
      break;
    }
    i = body + size + (size & 1);
  }
  if (!fmt || !data) throw new Error("missing fmt/data chunk");

  const { channels, bits, format, rate } = fmt;
  const bytes = bits / 8;
  const frames = Math.floor(data.length / (bytes * channels));
  const mono = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      const o = (f * channels + c) * bytes;
      let v;
      if (format === 3 && bits === 32) v = data.readFloatLE(o);
      else if (bits === 16) v = data.readInt16LE(o) / 32768;
      else if (bits === 24) v = ((data.readUInt8(o) | (data.readUInt8(o + 1) << 8) | (data.readInt8(o + 2) << 16)) << 8) / 2147483648;
      else if (bits === 32) v = data.readInt32LE(o) / 2147483648;
      else v = (data.readUInt8(o) - 128) / 128;
      sum += v;
    }
    mono[f] = sum / channels;
  }
  if (rate === targetRate) return mono;

  const outLen = Math.max(1, Math.round((frames * targetRate) / rate));
  const out = new Float32Array(outLen);
  const step = rate / targetRate;
  for (let n = 0; n < outLen; n++) {
    const pos = n * step;
    const a = Math.floor(pos);
    const b = Math.min(frames - 1, a + 1);
    const t = pos - a;
    out[n] = mono[a] * (1 - t) + mono[b] * t;
  }
  return out;
}

/** Encode mono float samples to MP3 with lamejs (64 kbps, 22.05 kHz mono). */
export function toMp3(samples, rate = 22050) {
  const pcm = Int16Array.from(samples, (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32767))));
  const enc = new lamejs.Mp3Encoder(1, rate, 64);
  const chunks = [];
  const block = 1152;
  for (let i = 0; i < pcm.length; i += block) {
    const slice = pcm.subarray(i, i + block);
    const out = enc.encodeBuffer(slice);
    if (out.length) chunks.push(Buffer.from(out));
  }
  const tail = enc.flush();
  if (tail.length) chunks.push(Buffer.from(tail));
  return Buffer.concat(chunks);
}

/* ------------------------------------------------------------------- main */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isMain) {
  const srcRoot = process.argv[2];
  if (!srcRoot) {
    console.error('usage: node scripts/import-vista-sounds.mjs "<path-to-vista-media>"');
    process.exit(2);
  }
  let written = 0;
  for (const [srcSet, dstSet] of Object.entries(SETS)) {
    const candidates = srcSet
      ? [
          path.join(srcRoot, srcSet),
          path.join(srcRoot, "Windows Vista", srcSet),
          path.join(srcRoot, "all-windows-sounds-HEAD", "(2006) Windows Vista", srcSet),
        ]
      : [srcRoot, path.join(srcRoot, "Windows Vista"), path.join(srcRoot, "all-windows-sounds-HEAD", "(2006) Windows Vista")];
    let srcDir = null;
    for (const c of candidates) if (await have(c)) srcDir = c;
    if (!srcDir) {
      console.error(`skip ${srcSet}: no folder in ${candidates.join(" | ")}`);
      continue;
    }
    const outDir = path.join(root, "public/sounds", dstSet);
    await mkdir(outDir, { recursive: true });
    for (const f of await readdir(srcDir, { withFileTypes: true })) {
      // for the default set the folder also holds the Glass/Pearl/Tinker dirs
      if (!f.isFile() || !f.name.toLowerCase().endsWith(".wav")) continue;
      const name = f.name;
      const clip = CLIP[name.replace(/\.wav$/i, "")];
      if (!clip) {
        console.log(`  ${srcSet || "default"}: no clip name for "${name}" (skipped)`);
        continue;
      }
      const samples = wavToMono(await readFile(path.join(srcDir, name)));
      await writeFile(path.join(outDir, `${clip}.mp3`), toMp3(samples));
      written++;
    }
    console.log(`${dstSet}: ${(await readdir(outDir)).length} clips`);
  }
  console.log(`converted ${written} genuine Vista clips`);
}
