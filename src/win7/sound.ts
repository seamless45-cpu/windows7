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
      // Older schemes only define the documented program events; anything else
      // simply has no sound for that scheme, exactly like Windows.
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
  gain.connect(c.destination);
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
  g.connect(c.destination);
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
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
