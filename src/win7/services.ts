"use client";
/**
 * The Service Control Manager for the simulated PC.
 *
 * Windows 7's services are the background processes `services.exe` owns; each
 * has a start type (Automatic, Automatic (Delayed Start), Manual, Disabled) and
 * a state (Running, Stopped). The state is real here: stopping a service
 * changes what the shell can do (turning Themes off drops the desktop to
 * Windows 7 Basic, stopping Audio silences the sound scheme, stopping Windows
 * Update blocks updates), and the change is written to the Windows Event Log as
 * Service Control Manager event 7036, which is what the real SCM logs.
 */
import { logEvent } from "./kernel";
import { setSettings, getState, notify } from "./store";

export type StartType = "Automatic" | "Automatic (Delayed Start)" | "Manual" | "Disabled";

export interface ServiceDef {
  key: string;
  display: string;
  desc: string;
  /** what depends on it */
  depends: string[];
  /** "auto" | "delayed" | "manual" | "disabled" by default */
  start: StartType;
  /** processes the service runs in */
  host: string;
  /** publisher; Microsoft services are hidden by msconfig's default filter */
  vendor?: string;
}

export const SERVICE_DEFS: ServiceDef[] = [
  { key: "AudioSrv", display: "Windows Audio", desc: "Manages audio for Windows-based programs. If this service is stopped, audio devices and effects will not function properly.", depends: ["AudioEndpointBuilder"], start: "Automatic", host: "svchost.exe" },
  { key: "AudioEndpointBuilder", display: "Windows Audio Endpoint Builder", desc: "Manages audio devices for the Windows Audio service.", depends: ["PlugPlay"], start: "Automatic", host: "svchost.exe" },
  { key: "BITS", display: "Background Intelligent Transfer Service", desc: "Transfers files in the background using idle network bandwidth, used by Windows Update.", depends: ["RpcSs"], start: "Automatic (Delayed Start)", host: "svchost.exe" },
  { key: "Dhcp", display: "DHCP Client", desc: "Registers and updates IP addresses and DNS records for this computer.", depends: ["Tcpip", "Afd"], start: "Automatic", host: "svchost.exe" },
  { key: "Dnscache", display: "DNS Client", desc: "Caches Domain Name System (DNS) names and registers the full computer name.", depends: ["Tcpip"], start: "Automatic", host: "svchost.exe" },
  { key: "EventLog", display: "Windows Event Log", desc: "Manages events and event logs. This service cannot be stopped.", depends: [], start: "Automatic", host: "svchost.exe" },
  { key: "LanmanServer", display: "Server", desc: "Supports file, print, and named-pipe sharing over the network.", depends: [], start: "Automatic", host: "svchost.exe" },
  { key: "LanmanWorkstation", display: "Workstation", desc: "Creates and maintains client network connections to remote servers.", depends: ["Bowser", "MRxSmb20"], start: "Automatic", host: "svchost.exe" },
  { key: "PlugPlay", display: "Plug and Play", desc: "Enables a computer to recognise changes to installed hardware and either adapt to them or prompt the user.", depends: [], start: "Automatic", host: "services.exe" },
  { key: "Power", display: "Power", desc: "Manages power policy and power policy notification delivery.", depends: [], start: "Automatic", host: "svchost.exe" },
  { key: "RpcSs", display: "Remote Procedure Call (RPC)", desc: "The RPCSS service is the Service Control Manager for COM and DCOM servers.", depends: ["RpcEptMapper"], start: "Automatic", host: "svchost.exe" },
  { key: "Schedule", display: "Task Scheduler", desc: "Lets you configure and schedule automated tasks on this computer.", depends: ["RpcSs"], start: "Automatic", host: "svchost.exe" },
  { key: "Spooler", display: "Print Spooler", desc: "Loads files to memory for later printing.", depends: ["RpcSs"], start: "Automatic", host: "spoolsv.exe" },
  { key: "Themes", display: "Themes", desc: "Provides user experience theme management. Stopping it switches to Windows 7 Basic.", depends: [], start: "Automatic", host: "svchost.exe" },
  { key: "W32Time", display: "Windows Time", desc: "Maintains date and time synchronisation on all computers in a network.", depends: [], start: "Manual", host: "svchost.exe" },
  { key: "WinDefend", display: "Windows Defender", desc: "Protection against malware and other potentially unwanted software.", depends: ["RpcSs"], start: "Automatic (Delayed Start)", host: "svchost.exe" },
  { key: "Winmgmt", display: "Windows Management Instrumentation", desc: "Provides a common interface and object model to access management information about the operating system and devices.", depends: ["RpcSs"], start: "Automatic", host: "svchost.exe" },
  { key: "WSearch", display: "Windows Search", desc: "Provides content indexing, property caching and search results for files, e-mail and other content.", depends: ["RpcSs"], start: "Automatic (Delayed Start)", host: "SearchIndexer.exe" },
  { key: "TermService", display: "Remote Desktop Services", desc: "Allows users to connect interactively to a remote computer.", depends: ["RpcSs"], start: "Manual", host: "svchost.exe" },
  { key: "wuauserv", display: "Windows Update", desc: "Enables the detection, download and installation of updates for Windows and other programs.", depends: ["RpcSs"], start: "Automatic (Delayed Start)", host: "svchost.exe" },
  { key: "ShellHWDetection", display: "Shell Hardware Detection", desc: "Provides notifications for AutoPlay hardware events.", depends: [], start: "Automatic", host: "svchost.exe" },
  { key: "Bonjour", display: "Bonjour Service", desc: "Publishes services and performs DNS resolution on the local network (Apple Inc.).", depends: ["Tcpip"], start: "Automatic", host: "mDNSResponder.exe", vendor: "Apple Inc." },
  { key: "RealtekAudio", display: "Realtek High Definition Audio Service", desc: "Installs the Realtek audio driver extensions and keeps the audio panel running.", depends: ["AudioSrv"], start: "Automatic", host: "RtkAudioService.exe", vendor: "Realtek Semiconductor" },
  { key: "AdobeARM", display: "Adobe Acrobat Update Service", desc: "Keeps the installed Adobe Acrobat Reader up to date.", depends: ["RpcSs"], start: "Manual", host: "armsvc.exe", vendor: "Adobe Systems" },
  { key: "UMBus", display: "User Mode Driver Frameworks", desc: "The User-Mode Driver Framework service.", depends: ["PlugPlay"], start: "Manual", host: "svchost.exe" },
];

interface SvcState {
  start: StartType;
  running: boolean;
}

const KEY = "win7.services";

function defaults(): Record<string, SvcState> {
  return Object.fromEntries(SERVICE_DEFS.map((s) => [s.key, { start: s.start, running: s.start !== "Manual" && s.start !== "Disabled" }]));
}

let cache: Record<string, SvcState> | null = null;

export function services(): Record<string, SvcState> {
  if (cache) return cache;
  let saved: Record<string, SvcState> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    saved = {};
  }
  const base = defaults();
  // merge, keeping the stored start type and stopping Disabled/Manual services
  const out: Record<string, SvcState> = {};
  for (const d of SERVICE_DEFS) {
    const s = saved[d.key];
    const start = (s?.start as StartType) || d.start;
    out[d.key] = { start, running: start === "Disabled" || start === "Manual" ? false : (s ? s.running : d.start !== "Disabled") };
  }
  cache = out;
  return out;
}

function persist() {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota */
  }
}

const eventLog = (svc: ServiceDef, running: boolean) =>
  logEvent("Information", "Service Control Manager", 7036, `The ${svc.display} service entered the ${running ? "running" : "stopped"} state.`, "System");

/** Apply the real side effects of a service being on or off. */
function applyEffects(key: string, running: boolean) {
  const s = getState().settings;
  if (key === "Themes") {
    // stopping the theme service is exactly what drops Windows to Basic
    setSettings({ theme: running ? "aero" : "basic", transparency: running && s.transparency });
  }
  if (key === "AudioSrv" || key === "AudioEndpointBuilder") {
    if (!running) setSettings({ volume: 0 });
  }
  if (key === "WinDefend" && !running) {
    notify({ title: "Windows Defender", text: "Real-time protection is off because the Windows Defender service is stopped.", icon: "warn" });
  }
}

export function startService(key: string, silent = false): boolean {
  const all = services();
  const svc = SERVICE_DEFS.find((d) => d.key === key);
  if (!svc) return false;
  if (all[key].start === "Disabled") {
    if (!silent) notify({ title: "Service", text: `Windows could not start the ${svc.display} service on Local Computer. Error 1058: The service cannot be started, either because it is disabled or because it has no enabled devices associated with it.`, icon: "error" });
    return false;
  }
  // dependencies must be running first, as in the real SCM
  for (const dep of svc.depends) {
    if (all[dep] && !all[dep].running) startService(dep, true);
  }
  all[key] = { ...all[key], running: true };
  persist();
  applyEffects(key, true);
  eventLog(svc, true);
  return true;
}

export function stopService(key: string, force = false): boolean {
  const all = services();
  const svc = SERVICE_DEFS.find((d) => d.key === key);
  if (!svc) return false;
  if (key === "EventLog" && !force) {
    notify({ title: "Services", text: "The Windows Event Log service cannot be stopped — other services depend on it.", icon: "warn" });
    return false;
  }
  // dependents must be stopped first
  const dependents = SERVICE_DEFS.filter((d) => d.depends.includes(key) && all[d.key]?.running);
  if (dependents.length && !force) {
    dependents.forEach((d) => stopService(d.key, true));
  }
  all[key] = { ...all[key], running: false };
  persist();
  applyEffects(key, false);
  eventLog(svc, false);
  return true;
}

export function setStartType(key: string, start: StartType) {
  const all = services();
  if (!all[key]) return;
  all[key] = { start, running: start === "Disabled" ? false : all[key].running };
  persist();
  const svc = SERVICE_DEFS.find((d) => d.key === key)!;
  logEvent("Information", "Service Control Manager", 7040, `The start type of the ${svc.display} service was changed from ${svc.start} to ${start}.`, "System");
  if (start === "Disabled") applyEffects(key, false);
}

export function restartService(key: string) {
  stopService(key, true);
  setTimeout(() => startService(key, true), 220);
}

/** Services that are running, in the order services.exe started them. */
export const isMicrosoft = (d: ServiceDef) => !d.vendor || /Microsoft/i.test(d.vendor);

export const runningServices = () => SERVICE_DEFS.filter((d) => services()[d.key].running);

/* ================================================================ msconfig */
/** Programs Windows 7 starts at login. */
export interface StartupItem {
  key: string;
  name: string;
  command: string;
  publisher: string;
  /** which RUN key it lives under */
  hk: "HKCU" | "HKLM";
}

const STARTUP_KEY = "win7.startup";

export const STARTUP_ITEMS: StartupItem[] = [
  { key: "sidebar", name: "Windows Sidebar", command: "C:\\Program Files\\Windows Sidebar\\sidebar.exe /autoRun", publisher: "Microsoft Corporation", hk: "HKCU" },
  { key: "msg", name: "Windows Messenger", command: "C:\\Program Files\\Windows Live\\Messenger\\msmsgs.exe", publisher: "Microsoft Corporation", hk: "HKCU" },
  { key: "ctfmon", name: "CTF Loader", command: "C:\\Windows\\system32\\ctfmon.exe", publisher: "Microsoft Corporation", hk: "HKLM" },
  { key: "defender", name: "Security Manager", command: "C:\\Program Files\\Windows Defender\\MSASCui.exe -hide", publisher: "Microsoft Corporation", hk: "HKLM" },
  { key: "dvdmaker", name: "Windows DVD Maker", command: "C:\\Program Files\\DVD Maker\\DVDMaker.exe", publisher: "Microsoft Corporation", hk: "HKLM" },
  { key: "snp", name: "Snipping Tool helper", command: "C:\\Windows\\system32\\snippingtool.exe /autorun", publisher: "Microsoft Corporation", hk: "HKCU" },
  { key: "print", name: "Print Spooler Tray", command: "C:\\Windows\\system32\\spoolsv.exe", publisher: "Microsoft Corporation", hk: "HKLM" },
];

export function startupState(): Record<string, boolean> {
  try {
    const saved = JSON.parse(localStorage.getItem(STARTUP_KEY) || "{}") as Record<string, boolean>;
    return Object.fromEntries(STARTUP_ITEMS.map((i) => [i.key, saved[i.key] !== false]));
  } catch {
    return Object.fromEntries(STARTUP_ITEMS.map((i) => [i.key, true]));
  }
}

export function setStartup(key: string, enabled: boolean) {
  const next = { ...startupState(), [key]: enabled };
  try {
    localStorage.setItem(STARTUP_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  const item = STARTUP_ITEMS.find((i) => i.key === key);
  if (item) logEvent("Information", "Microsoft-Windows-Startup", enabled ? 1 : 2, `${item.name} was ${enabled ? "enabled" : "disabled"} for the next login.`, "Application");
}

/** The items that really start with the shell. */
export const activeStartup = () => STARTUP_ITEMS.filter((i) => startupState()[i.key]);
