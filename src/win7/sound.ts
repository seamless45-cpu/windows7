/**
 * Windows 7 sound schemes.
 *
 * The clips in `public/sounds/<scheme>` are the real Windows 7 sounds: the
 * fourteen schemes that shipped with the OS (Windows Default, Afternoon,
 * Calligraphy, Characters, Cityscape, Delta, Festival, Garden, Heritage,
 * Landscape, Quirky, Raga, Savannah and Sonata) plus the "No Sounds" scheme,
 * which Windows implements by simply not playing anything.
 *
 * Clips are decoded once per session and played through Web Audio so the
 * volume slider, mute and the selected scheme all apply, and several sounds
 * can overlap the way they do on Windows.
 */
export const snd = { vol: 0.5, muted: false, scheme: "Windows Default" as string, keyClick: false };

/** Every program event the simulator can play. */
export type SysSound =
  | "default" | "logon" | "logoff" | "startup" | "shutdown" | "minimize" | "restore"
  | "ding" | "error" | "exclaim" | "critical" | "balloon" | "notify" | "recycle" | "menu" | "uac"
  | "print" | "hardware-insert" | "hardware-remove" | "hardware-fail"
  | "battery-low" | "battery-critical" | "feed" | "infobar" | "popup" | "navigation"
  | "ringin" | "ringout";

/** Events shown in Control Panel → Sound → Program Events, in Windows' order. */
export const SOUND_EVENTS: { key: SysSound; label: string }[] = [
  { key: "default", label: "Windows Default" },
  { key: "logon", label: "Windows Logon" },
  { key: "logoff", label: "Windows Logoff" },
  { key: "startup", label: "Windows Startup" },
  { key: "shutdown", label: "Windows Shutdown" },
  { key: "minimize", label: "Windows Minimize" },
  { key: "restore", label: "Windows Restore" },
  { key: "ding", label: "Windows Ding" },
  { key: "error", label: "Windows Error" },
  { key: "exclaim", label: "Windows Exclamation" },
  { key: "critical", label: "Windows Critical Stop" },
  { key: "balloon", label: "Windows Notification" },
  { key: "notify", label: "Windows Notify" },
  { key: "recycle", label: "Windows Recycle" },
  { key: "menu", label: "Windows Menu Command" },
  { key: "uac", label: "Windows User Account Control" },
  { key: "print", label: "Windows Print Complete" },
  { key: "hardware-insert", label: "Device Connect" },
  { key: "hardware-remove", label: "Device Disconnect" },
  { key: "hardware-fail", label: "Device Connect Failed" },
  { key: "battery-low", label: "Windows Battery Low" },
  { key: "battery-critical", label: "Windows Battery Critical" },
  { key: "feed", label: "Windows Feed Discovered" },
  { key: "infobar", label: "Windows Information Bar" },
  { key: "popup", label: "Windows Pop-up Blocked" },
  { key: "navigation", label: "Windows Navigation Start" },
];

/** The sound schemes shipped in Windows 7 (the folder names on disk). */
export const SCHEMES = [
  "Windows Default",
  "Afternoon",
  "Calligraphy",
  "Characters",
  "Cityscape",
  "Delta",
  "Festival",
  "Garden",
  "Heritage",
  "Landscape",
  "Quirky",
  "Raga",
  "Savannah",
  "Sonata",
  "No Sounds",
] as const;

export const isNoSounds = (scheme: string) => scheme === "No Sounds";

/** Folder that holds a scheme's clips. */
const folder = (scheme: string) => (scheme === "Windows Default" ? "default" : scheme);

// Inlined by next.config.ts (`env`): "" locally, "/windows7" on GitHub Pages.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

let ctx: AudioContext | null = null;
/**
 * Everything the simulator plays goes through one master gain, and a rolling
 * recorder keeps the last 1.5 s of that output. The bug check screen uses that
 * ring buffer to freeze and repeat the very last audio fragment it can hear,
 * which is what a real machine does when the driver dies mid-playback.
 */
let master: GainNode | null = null;
let tap: ScriptProcessorNode | null = null;
const RING_SECONDS = 1.5;
let ringL: Float32Array = new Float32Array(0);
let ringR: Float32Array = new Float32Array(0);
let ringPos = 0;
const cache = new Map<string, AudioBuffer | "loading" | "failed">();
const pending = new Set<string>();

export function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  if (!master) {
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    // ScriptProcessor is deprecated but is the only tap that works everywhere
    // without shipping an AudioWorklet module.
    try {
      const n = 2048;
      tap = ctx.createScriptProcessor(n, 2, 2);
      ringL = new Float32Array(Math.ceil(ctx.sampleRate * RING_SECONDS));
      ringR = new Float32Array(ringL.length);
      tap.onaudioprocess = (ev) => {
        const l = ev.inputBuffer.getChannelData(0);
        const r = ev.inputBuffer.numberOfChannels > 1 ? ev.inputBuffer.getChannelData(1) : l;
        for (let i = 0; i < l.length; i++) {
          ringL[ringPos] = l[i];
          ringR[ringPos] = r[i];
          ringPos = (ringPos + 1) % ringL.length;
        }
      };
      master.connect(tap);
      // A ScriptProcessor with a silent output still receives audio; connecting
      // it to a 0-gain node keeps the graph running without doubling the sound.
      const mute = ctx.createGain();
      mute.gain.value = 0;
      tap.connect(mute);
      mute.connect(ctx.destination);
    } catch {
      // No ScriptProcessor available: play normally, just without the recorder
      // the bug check uses. Do NOT reconnect master — that doubles the volume.
      tap = null;
    }
  }
  return ctx;
}

const url = (scheme: string, kind: SysSound) => `${BASE}/sounds/${folder(scheme)}/${kind}.mp3`;

/** Fetch and decode a clip; safe to call repeatedly. */
function load(scheme: string, kind: SysSound) {
  const c = ac();
  if (!c || isNoSounds(scheme)) return;
  const key = scheme + "/" + kind;
  if (cache.has(key)) return;
  cache.set(key, "loading");
  pending.add(key);
  fetch(url(scheme, kind))
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((ab) => c.decodeAudioData(ab))
    .then((buf) => {
      cache.set(key, buf);
      pending.delete(key);
    })
    .catch(() => {
      // Windows' alternative schemes only redefine 20 of the program events;
      // for the rest the OS keeps using the Windows Default clip. Fall back to
      // it so every scheme is complete instead of silently dropping a sound.
      if (scheme !== "Windows Default") {
        const dkey = "Windows Default/" + kind;
        if (!cache.has(dkey)) {
          load("Windows Default", kind);
          // retry once the default clip arrives
          const wait = (n: number) => {
            const b = cache.get(dkey);
            if (b && typeof b === "object") { cache.set(key, b); pending.delete(key); return; }
            if (n < 40) setTimeout(() => wait(n + 1), 60);
            else { cache.set(key, "failed"); pending.delete(key); }
          };
          setTimeout(() => wait(0), 60);
          return;
        }
        const d = cache.get(dkey);
        if (d && typeof d === "object") { cache.set(key, d); pending.delete(key); return; }
      }
      cache.set(key, "failed");
      pending.delete(key);
    });
}

/** Warm the clips for the current scheme (and the startup sound). */
export function preload(kinds?: SysSound[]) {
  const list = kinds || (SOUND_EVENTS.map((e) => e.key) as SysSound[]);
  list.forEach((k) => load(snd.scheme, k));
}

/** Forget cached clips (used when the scheme changes). */
export function clearCache() {
  cache.clear();
  pending.clear();
}

function playBuffer(buf: AudioBuffer) {
  const c = ac();
  if (!c) return;
  const src = c.createBufferSource();
  const gain = c.createGain();
  src.buffer = buf;
  gain.gain.value = Math.min(1, Math.max(0, snd.vol));
  src.connect(gain);
  gain.connect(master || c.destination);
  src.start();
}

/**
 * Play a Windows program event. `key` is the on-screen keyboard click, which
 * Windows does not have; it stays synthesised and is only heard when the
 * "keyboard click" accessibility option is on.
 */
export function playSys(kind: SysSound | "key") {
  if (snd.muted || snd.vol <= 0 || isNoSounds(snd.scheme)) return;
  if (kind === "key") return; // keyboard clicks are generated by playClick
  const buf = cache.get(snd.scheme + "/" + kind);
  if (buf && typeof buf === "object") {
    playBuffer(buf);
    return;
  }
  if (buf === undefined || buf === "loading") load(snd.scheme, kind);
}

/** Play a specific clip regardless of the selected scheme (used by the Sound dialog previews). */
export function playPreview(scheme: string, kind: SysSound) {
  if (isNoSounds(scheme)) return;
  const key = scheme + "/" + kind;
  const buf = cache.get(key);
  if (buf && typeof buf === "object") {
    playBuffer(buf);
    return;
  }
  load(scheme, kind);
  // play as soon as it arrives
  const wait = () => {
    const b = cache.get(key);
    if (b && typeof b === "object") playBuffer(b);
    else if (b === "loading") setTimeout(wait, 40);
  };
  setTimeout(wait, 40);
}

/** Resume the audio context after the first user gesture. */
export function unlockAudio() {
  const c = ac();
  if (c && c.state === "suspended") c.resume().catch(() => {});
  preload();
}

/** Very short click used for the "keyboard click" accessibility option. */
export function playClick() {
  if (!snd.keyClick || snd.muted || snd.vol <= 0) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.value = 1400;
  g.gain.setValueAtTime(0.02 * snd.vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.02);
  o.connect(g);
  g.connect(master || c.destination);
  o.start();
  o.stop(c.currentTime + 0.03);
}

/** Simple synthesised note, kept for the few places that wanted a tone. */
export function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.2) {
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
  g.connect(master || c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}


/**
 * The bug check stutter. Windows' crash screen does not silence the machine:
 * the last buffer in the audio device loops forever, which sounds like a short
 * fragment of whatever was playing, repeated with a steady glitch. This grabs
 * the tail of the master output, freezes it and loops it at a low rate.
 */
let stutter: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
export function startBlueScreenStutter() {
  const c = ac();
  if (!c || !master) return;
  if (stutter) return;
  const n = Math.max(1024, Math.round(c.sampleRate * 0.09));
  const buf = c.createBuffer(2, n, c.sampleRate);
  const len = ringL.length;
  if (!len) return;
  const l = buf.getChannelData(0);
  const r = buf.getChannelData(1);
  // take the most recent samples from the ring buffer
  for (let i = 0; i < n; i++) {
    const idx = (ringPos - n + i + len * 2) % len;
    l[i] = ringL[idx] || 0;
    r[i] = ringR[idx] || 0;
  }
  // if nothing was audible, synthesise a harsh two-tone fragment so the
  // glitch still reads as broken hardware rather than silence
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(l[i]));
  if (peak < 1e-4) {
    for (let i = 0; i < n; i++) {
      const t = i / c.sampleRate;
      l[i] = r[i] = (Math.sin(2 * Math.PI * 220 * t) * 0.28 + Math.sin(2 * Math.PI * 226.7 * t) * 0.2) * (i % 512 < 256 ? 1 : 0.25);
    }
  } else {
    // click at the loop point, which is the "glitch" in the stutter
    for (let i = 0; i < Math.min(48, n); i++) l[i] = r[i] = (i % 2 ? 1 : -1) * peak * 0.85;
  }
  // Duck the live graph: on a real stop the rest of the audio has stopped and
  // only the frozen fragment is left, so nothing else may play over it.
  if (master) {
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setTargetAtTime(0.15, c.currentTime, 0.05);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.playbackRate.value = 0.92;
  const gain = c.createGain();
  gain.gain.value = 0.55;
  src.connect(gain);
  gain.connect(c.destination);
  src.start();
  stutter = { src, gain };
}

export function stopBlueScreenStutter() {
  const c = ctx;
  if (master && c) {
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setTargetAtTime(1, c.currentTime, 0.08);
  }
  if (!stutter) return;
  try { stutter.src.stop(); } catch { /* already stopped */ }
  stutter.src.disconnect();
  stutter.gain.disconnect();
  stutter = null;
}

/* --------------------------------------------------------------- thunder */
/**
 * Storm thunder, synthesised: a low rumble with a slow attack, a body of
 * filtered noise and a long decay, plus a sharp crack when the strike is close.
 * `distance` (km-ish) shifts the whole thing later and muffles the highs,
 * exactly the way real thunder works.
 */
let noiseBuf: AudioBuffer | null = null;
function noise(c: AudioContext) {
  if (noiseBuf) return noiseBuf;
  const n = Math.round(c.sampleRate * 2.5);
  const b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lastV = 0;
    for (let i = 0; i < n; i++) {
      // brown-ish noise: integrate white noise for the low rumble
      const w = Math.random() * 2 - 1;
      lastV = (lastV + 0.04 * w) / 1.04;
      d[i] = lastV * 3.2;
    }
  }
  noiseBuf = b;
  return b;
}

export function playThunder(distance = 1.4) {
  if (snd.muted || snd.vol <= 0 || isNoSounds(snd.scheme)) return;
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + Math.min(1.4, distance * 0.22);
  const gain = c.createGain();
  const peak = Math.max(0.05, Math.min(0.95, (snd.vol * 0.85) / (1 + distance * 0.85)));
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.12 + distance * 0.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2 + distance * 0.6);

  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900 / (1 + distance * 0.55);
  lp.Q.value = 0.6;

  const src = c.createBufferSource();
  src.buffer = noise(c);
  src.loop = true;
  src.playbackRate.value = 0.9 + Math.random() * 0.12;
  src.connect(lp);
  lp.connect(gain);
  gain.connect(master);

  // the crack: a short bright transient when the strike is near
  let crack: AudioBufferSourceNode | null = null;
  let crackGain: GainNode | null = null;
  if (distance < 1.6) {
    crack = c.createBufferSource();
    crack.buffer = noise(c);
    crack.playbackRate.value = 2.4;
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 700;
    crackGain = c.createGain();
    const cp = peak * (1.0 - distance / 1.8);
    crackGain.gain.setValueAtTime(0.0001, t0);
    crackGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, cp), t0 + 0.012);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    crack.connect(hp);
    hp.connect(crackGain);
    crackGain.connect(master);
    crack.start(t0);
    crack.stop(t0 + 0.6);
  }

  src.start(t0);
  src.stop(t0 + 3.2 + distance * 0.6);
  src.onended = () => { src.disconnect(); gain.disconnect(); lp.disconnect(); crack?.disconnect(); crackGain?.disconnect(); };
}
