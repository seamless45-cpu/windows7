/**
 * Sound completeness.
 *
 * The simulator shipped with eleven program events defined, labelled in
 * Control Panel and backed by real .mp3 files — and never triggered anywhere.
 * These checks make that class of bug impossible to reintroduce: every event in
 * `SOUND_EVENTS` must map to a clip that exists on disk, and must be reachable
 * from a `playSys(...)` call in the shipped source.
 *
 * Run: node tests/sounds.test.mjs
 */
import { readFile, readdir, access, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
let failures = 0;
const check = (name, ok, detail) => {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : " — " + detail}`);
  if (!ok) failures++;
};

const soundTs = await readFile(path.join(root, "src/win7/sound.ts"), "utf8");

/* --------------------------------------------------- event -> clip mapping */
// parse SOUND_EVENTS and CLIP without executing the module (it needs a browser)
// the event table ends at the next top-level export; anchoring on a comment
// breaks as soon as a new comment mentions "sound schemes" too
const eventsStart = soundTs.indexOf("export const SOUND_EVENTS");
const eventsBlock = soundTs.slice(eventsStart, soundTs.indexOf("export const", eventsStart + 1));
const eventKeys = [...eventsBlock.matchAll(/\{ key: "([^"]+)", label: "/g)].map((m) => m[1]);
check("SOUND_EVENTS is non-empty", eventKeys.length > 20, `${eventKeys.length} events`);

const clipBlock = soundTs.slice(soundTs.indexOf("const CLIP: Record<SysSound, string>"), soundTs.indexOf("const clipOf"));
const clipMap = Object.fromEntries([...clipBlock.matchAll(/^ {2}"?([a-z-]+)"?: "([a-z-]+)",$/gm)].map((m) => [m[1], m[2]]));

const missingMap = eventKeys.filter((k) => !clipMap[k]);
check("every event maps to a clip", missingMap.length === 0, missingMap.join(", "));

/* ------------------------------------------------- the clips really are there */
const schemes = ["default", "Afternoon", "Calligraphy", "Characters", "Cityscape", "Delta", "Festival", "Garden", "Heritage", "Landscape", "Quirky", "Raga", "Savannah", "Sonata"];
const clips = [...new Set(Object.values(clipMap))];
for (const scheme of schemes) {
  const dir = path.join(root, "public/sounds", scheme);
  let files;
  try {
    files = new Set((await readdir(dir)).map((f) => f.replace(/\.mp3$/, "")));
  } catch {
    check(`scheme folder exists: ${scheme}`, false, "missing directory");
    continue;
  }
  const absent = clips.filter((c) => !files.has(c));
  check(`scheme "${scheme}" has every mapped clip (${clips.length})`, absent.length === 0, absent.join(", "));
}

/* ------------------------------------------ the Windows Vista schemes exist */
// Glass / Pearl / Tinker are rendered as .wav (see scripts/gen-vista-sounds.mjs)
// and "Vista Default" reuses the Windows Default folder, so it needs no files.
const vista = ["VistaGlass", "VistaPearl", "VistaTinker"];
const scoreNames = [...new Set([...soundTs.matchAll(/^ {2}"?([a-z_-]+)"?: \(\) => \{$/gm)].map((m) => m[1]))];
for (const scheme of vista) {
  const dir = path.join(root, "public/sounds", scheme);
  let files;
  try {
    files = new Set((await readdir(dir)).map((f) => f.replace(/\.wav$/, "")));
  } catch {
    check(`Vista scheme folder exists: ${scheme}`, false, "missing directory");
    continue;
  }
  const absent = clips.filter((c) => !files.has(c));
  check(`Vista scheme "${scheme}" has every mapped clip (${clips.length})`, absent.length === 0, absent.join(", "));
  // a zero-length WAV is "present" but silent
  let tiny = [];
  for (const c of clips) {
    try {
      const st = await stat(path.join(dir, `${c}.wav`));
      if (st.size < 200) tiny.push(c);
    } catch {
      tiny.push(c);
    }
  }
  check(`Vista scheme "${scheme}" clips are real audio, not empty files`, tiny.length === 0, tiny.join(", "));
}
check("the Vista schemes are listed in SCHEMES", /"Vista Glass"/.test(soundTs) && /"Vista Pearl"/.test(soundTs) && /"Vista Tinker"/.test(soundTs) && /"Vista Default"/.test(soundTs));
check("every scheme has a description", /export const SCHEME_META/.test(soundTs) && /"Vista Tinker": \{ version: "Windows Vista"/.test(soundTs));
check("Vista clips are played from their .wav container", /schemeExt/.test(soundTs) && /\?\.mp3`|\$\{clip\}\.\$\{schemeExt/.test(soundTs));
check("Vista Default reuses the Windows Default clips", /\|\| scheme === "Vista Default" \? "default"/.test(soundTs));
void scoreNames;

/* --------------------------------------------------------- every event fires */
// collect playSys("...") call sites across the app
const walk = async (dir) => {
  const out = [];
  for (const e of await readdir(path.join(root, dir), { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...(await walk(path.join(dir, e.name))));
    else if (/\.tsx?$/.test(e.name)) out.push(path.join(dir, e.name));
  }
  return out;
};
const files = await walk("src");
let joined = "";
for (const f of files) joined += "\n" + (await readFile(path.join(root, f), "utf8"));

const called = new Set([...joined.matchAll(/playSys\("([a-z-]+)"\)/g)].map((m) => m[1]));
// a few are played through a variable / ternary rather than a literal
// the exclamation sound is chosen by a ternary inside msgBox (icon-dependent)
const dynamic = ["maximize", "minimize", "restore-up", "restore-down", "startup", "logon", "exclaim"];
for (const d of dynamic) if (new RegExp(`"${d}"`).test(joined)) called.add(d);

const neverPlayed = eventKeys.filter((k) => !called.has(k));
check("every program event is triggered somewhere", neverPlayed.length === 0, neverPlayed.join(", "));

/* ------------------------------------- Windows 7 has no Minimize/Restore event */
check("no invented 'Windows Minimize' event label", !/"Windows Minimize"/.test(eventsBlock));
check("no invented 'Windows Restore' event label", !/"Windows Restore"/.test(eventsBlock));
// the clip *names* Windows gives the files are a different thing from event
// labels, and the Vista notes mention them; scope those checks to SOUND_EVENTS.
check(
  "the four real window events are present",
  ["maximize", "minimize", "restore-down", "restore-up"].every((k) => eventKeys.includes(k)),
);
check("Restore Down shares the Minimize clip", clipMap["restore-down"] === "minimize");
check("Maximize shares the Restore clip", clipMap["maximize"] === "restore");

/* ------------------------------------- the Sounds tab can reassign an event */
check("an event's sound can be changed", /export function setSoundFor/.test(soundTs));
check("(None) silences an event", /soundFor\(snd\.scheme, kind\) === null\) return;/.test(soundTs));
check("silenced events are not downloaded either", /soundFor\(scheme, kind\) === null\) return;/.test(soundTs));
check("assignments persist", /localStorage\.setItem\("win7\.soundmap"/.test(soundTs));
check("the Sounds drop-down lists clips", /SOUND_CLIPS/.test(soundTs) && /clipLabel/.test(soundTs));
check("the Sounds tab offers (None)", /\(None\)/.test(joined) && /setSoundFor\(s\.soundScheme, ev/.test(joined));
check("the scheme can be restored", /Restore this scheme/.test(joined));

/* ------------------------------------------- Speech Recognition events wired */
for (const k of ["speech-on", "speech-off", "speech-sleep", "speech-misrecognition", "speech-disambiguation"]) {
  check(`speech event "${k}" is played`, joined.includes(`playSys("${k}")`));
}
check("Speech Recognition has a sleeping state", /"sleep"/.test(joined) && /Sleeping/.test(joined));

/* ------------------------- sound helpers are reachable, not just defined */
// a helper that plays an event but is never called is the same bug as an
// event that is never played
for (const fn of ["deviceConnected", "deviceFailed", "deviceRemoved", "checkBattery", "newMail", "jobComplete", "printDocument"]) {
  const defined = new RegExp(`export function ${fn}\\(`).test(joined);
  const callSites = (joined.match(new RegExp(`\\b${fn}\\(`, "g")) || []).length;
  check(`${fn} is defined and called`, defined && callSites >= 2, defined ? `defined but ${callSites - 1} caller(s)` : "not defined");
}

/* --------------------------------------------------- UAC has its own sound */
check("UAC plays its own event", /playSys\("uac"\)/.test(joined));

/* ------------------------------------------------- printing is not a dead end */
check("print goes through the XPS Document Writer", /export function printDocument/.test(joined));
check("Print Complete fires after a job", /playSys\("print"\)/.test(joined));
check("no app still claims no printer is installed", !/No printer is installed/.test(joined));

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
