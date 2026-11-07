"use client";
/**
 * A small, honest kernel for the simulated PC.
 *
 * Windows 7's boot is a sequence: the firmware hands over to the boot manager,
 * winload.exe loads the kernel (ntoskrnl.exe) and the boot-start drivers, the
 * kernel initialises the executive and begins Phase 1, then the session manager
 * (smss.exe) starts Win32 (csrss.exe, wininit.exe) and the services and logon
 * processes. This module models that: boot stages that really take time, a
 * driver set that really loads (and can really fail), system threads, and a bug
 * check (blue screen) that reports a stop code the way the real one does.
 *
 * It is deliberately separate from the UI: `kernel.boot()` returns the ordered
 * log the boot screen prints, and `kernel.bugcheck()` produces the stop code
 * that the blue screen renders.
 */

export type Stage = "firmware" | "bootmgr" | "winload" | "kernel" | "smss" | "wininit" | "services" | "logon" | "ready";

export interface KernelLine {
  t: number;
  stage: Stage;
  text: string;
}

export interface Driver {
  name: string;
  display: string;
  group: "Boot Bus Extender" | "System Bus Extender" | "SCSI miniport" | "Port" | "Primary disk" | "File system" | "Keyboard" | "Pointer" | "Network" | "Display";
  /** 0 = boot (loaded by winload), 1 = system, 3 = demand */
  start: 0 | 1 | 3;
  file: string;
  /** simulated load time in ms */
  ms: number;
  /** set by the diagnostics page to force a boot failure */
  fail?: boolean;
}

/** The boot-start and system drivers Windows 7 loads on every boot. */
export const DRIVERS: Driver[] = [
  { name: "acpi", display: "Microsoft ACPI Driver", group: "Boot Bus Extender", start: 0, file: "acpi.sys", ms: 90 },
  { name: "pci", display: "PCI Bus Driver", group: "Boot Bus Extender", start: 0, file: "pci.sys", ms: 80 },
  { name: "intelppm", display: "Intel Processor Driver", group: "Boot Bus Extender", start: 0, file: "intelppm.sys", ms: 60 },
  { name: "msisadrv", display: "ISA Driver", group: "Boot Bus Extender", start: 0, file: "msisadrv.sys", ms: 40 },
  { name: "volmgr", display: "Volume Manager Driver", group: "System Bus Extender", start: 0, file: "volmgr.sys", ms: 70 },
  { name: "volsnap", display: "Storage volumes", group: "System Bus Extender", start: 0, file: "volsnap.sys", ms: 55 },
  { name: "disk", display: "Disk Driver", group: "Primary disk", start: 0, file: "disk.sys", ms: 65 },
  { name: "partmgr", display: "Partition Manager", group: "System Bus Extender", start: 0, file: "partmgr.sys", ms: 50 },
  { name: "storport", display: "Microsoft Storage Port Driver", group: "SCSI miniport", start: 0, file: "storport.sys", ms: 85 },
  { name: "nvstor", display: "NVIDIA nForce SATA Controller", group: "SCSI miniport", start: 0, file: "nvstor.sys", ms: 75 },
  { name: "cdrom", display: "CD-ROM Driver", group: "SCSI miniport", start: 1, file: "cdrom.sys", ms: 60 },
  { name: "ntfs", display: "NT File System Driver", group: "File system", start: 0, file: "ntfs.sys", ms: 95 },
  { name: "fvevol", display: "BitLocker Drive Encryption Filter Driver", group: "Boot Bus Extender", start: 0, file: "fvevol.sys", ms: 70 },
  { name: "ksecdd", display: "Kernel Security Support Provider Interface", group: "File system", start: 0, file: "ksecdd.sys", ms: 45 },
  { name: "ci", display: "Code Integrity Module", group: "File system", start: 0, file: "ci.dll", ms: 40 },
  { name: "fltmgr", display: "File System Filter Manager Driver", group: "File system", start: 0, file: "fltmgr.sys", ms: 80 },
  { name: "kbdclass", display: "Keyboard Class Driver", group: "Keyboard", start: 1, file: "kbdclass.sys", ms: 30 },
  { name: "i8042prt", display: "i8042 Keyboard and PS/2 Mouse Port Driver", group: "Keyboard", start: 1, file: "i8042prt.sys", ms: 35 },
  { name: "mouclass", display: "Mouse Class Driver", group: "Pointer", start: 1, file: "mouclass.sys", ms: 30 },
  { name: "tcpip", display: "TCP/IP Protocol Driver", group: "Network", start: 1, file: "tcpip.sys", ms: 70 },
  { name: "netbt", display: "NetBIOS over Tcpip", group: "Network", start: 1, file: "netbt.sys", ms: 40 },
  { name: "ndis", display: "NDIS System Driver", group: "Network", start: 0, file: "ndis.sys", ms: 75 },
  { name: "dxgkrnl", display: "DirectX Graphics Kernel", group: "Display", start: 1, file: "dxgkrnl.sys", ms: 90 },
  { name: "atikmdag", display: "ATI Radeon Kernel Mode Driver", group: "Display", start: 1, file: "atikmdag.sys", ms: 110 },
  { name: "audiosrv", display: "Windows Audio Endpoint", group: "Port", start: 1, file: "portcls.sys", ms: 60 },
];

export interface BootStage {
  stage: Stage;
  label: string;
  /** window title shown while this stage runs */
  text: string;
  ms: number;
  lines: string[];
}

/** The ordered boot the boot screen plays. */
export const BOOT_STAGES: BootStage[] = [
  {
    stage: "firmware", label: "POST", text: "Starting Windows", ms: 700,
    lines: ["BIOS: Award Modular BIOS v6.00PG", "CPU: Intel(R) Core(TM)2 Duo @ 2.66GHz  Memory: 4096 MB OK", "Detecting IDE drives ... 1 hard disk, 1 DVD-ROM"],
  },
  {
    stage: "bootmgr", label: "Boot Manager", text: "Starting Windows", ms: 500,
    lines: ["BOOTMGR: Boot Manager 1.1", "Loading Windows 7 ... winload.exe"],
  },
  {
    stage: "winload", label: "winload.exe", text: "Starting Windows", ms: 900,
    lines: ["winload: loading ntoskrnl.exe, hal.dll, ci.dll", "winload: loading boot-start drivers (start=0)"],
  },
  {
    stage: "kernel", label: "ntoskrnl.exe", text: "Starting Windows", ms: 1400,
    lines: ["ntoskrnl: Phase 0 initialisation complete", "ntoskrnl: Phase 1 initialisation — executive, object manager, IRQL", "ntoskrnl: loading system drivers (start=1)"],
  },
  {
    stage: "smss", label: "smss.exe", text: "Starting Windows", ms: 500,
    lines: ["smss: Session Manager initialising", "smss: \\SystemRoot created, paging file configured"],
  },
  {
    stage: "wininit", label: "wininit.exe", text: "Starting Windows", ms: 600,
    lines: ["smss: starting csrss.exe and wininit.exe", "wininit: Windows Subsystem ready"],
  },
  {
    stage: "services", label: "services.exe", text: "Starting Windows", ms: 900,
    lines: ["services: starting Plug and Play, Event Log, Power, Themes", "services: starting AudioSrv, Spooler, WSearch"],
  },
  {
    stage: "logon", label: "winlogon.exe", text: "Starting Windows", ms: 400,
    lines: ["winlogon: Winlogon notification packages loaded", "winlogon: displaying secure logon"],
  },
  { stage: "ready", label: "Desktop", text: "Welcome", ms: 0, lines: ["explorer.exe: shell started"] },
];

/** Services services.exe starts, used by msconfig and Task Manager. */
export const SERVICES = [
  ["AudioSrv|Windows Audio", "Manages audio for Windows-based programs", true],
  ["Themes|Themes", "Provides user experience theme management", true],
  ["Dhcp|DHCP Client", "Registers and updates IP addresses", true],
  ["Dnscache|DNS Client", "Caches domain name resolution", true],
  ["EventLog|Windows Event Log", "Manages events and event logs", true],
  ["Schedule|Task Scheduler", "Lets you schedule tasks", true],
  ["Spooler|Print Spooler", "Loads files to memory for printing", true],
  ["WSearch|Windows Search", "Indexes content for fast searching", true],
  ["WinDefend|Windows Defender", "Protection against malware", false],
  ["wuauserv|Windows Update", "Enables detection of updates", true],
] as const;

/** Stop codes the bug check can report, with Windows 7's own wording. */
export const BUGCHECKS = {
  "0x0000007B": { title: "INACCESSIBLE_BOOT_DEVICE", reason: "The boot device is no longer accessible. A driver may have failed to load, or the disk controller changed." },
  "0x0000000A": { title: "IRQL_NOT_LESS_OR_EQUAL", reason: "A kernel-mode process or driver attempted to access memory at an invalid IRQL." },
  "0x00000050": { title: "PAGE_FAULT_IN_NONPAGED_AREA", reason: "Requested data was not in memory and the fault handler could not be called." },
  "0x000000C2": { title: "BAD_POOL_CALLER", reason: "A kernel-mode process or driver incorrectly attempted to free an already-free allocation." },
  "0x0000003B": { title: "SYSTEM_SERVICE_EXCEPTION", reason: "An exception occurred while executing a routine that transitions from non-privileged to privileged code." },
  "0x000000ED": { title: "UNMOUNTABLE_BOOT_VOLUME", reason: "The kernel could not mount the boot volume — the file system may be damaged." },
} as const;
export type StopCode = keyof typeof BUGCHECKS;

export interface BootResult {
  ok: boolean;
  lines: KernelLine[];
  /** the driver that failed, if any */
  failed?: Driver;
  stop?: StopCode;
  /** simulated wall time */
  ms: number;
}

/**
 * Run the boot synchronously and produce the kernel log. The boot screen
 * replays the lines with the stage timings so the machine appears to really
 * initialise, instead of flashing a logo.
 */
export function bootKernel(opts: { safeMode?: boolean; brokenDriver?: string } = {}): BootResult {
  const lines: KernelLine[] = [];
  let t = 0;
  const drivers = opts.safeMode ? DRIVERS.filter((d) => d.start === 0) : DRIVERS;
  const failing = opts.brokenDriver ? drivers.find((d) => d.name === opts.brokenDriver) : undefined;

  for (const st of BOOT_STAGES) {
    if (st.stage === "ready") break;
    for (const text of st.lines) lines.push({ t, stage: st.stage, text });
    if (st.stage === "kernel" || st.stage === "winload") {
      const set = st.stage === "winload" ? drivers.filter((d) => d.start === 0) : drivers.filter((d) => d.start === 1);
      for (const d of set) {
        if (d === failing) {
          lines.push({ t, stage: st.stage, text: `${d.file} ... FAILED (0xC0000001)` });
          const stop: StopCode = d.group === "Primary disk" || d.group === "SCSI miniport" ? "0x0000007B" : "0x0000000A";
          return { ok: false, lines, failed: { ...d, fail: true }, stop, ms: t + st.ms };
        }
        t += Math.round(d.ms / 4);
        lines.push({ t, stage: st.stage, text: `loaded ${d.file} (${d.display})` });
      }
    }
    t += st.ms;
  }
  lines.push({ t, stage: "ready", text: "explorer.exe started — welcome" });
  return { ok: true, lines, ms: t };
}

/** Total simulated boot time in ms, used to pace the boot screen. */
export const bootDuration = (safeMode = false) => bootKernel({ safeMode }).ms;

/** Format the blue-screen block the way Windows 7 prints it. */
export function bugcheckText(stop: StopCode, driver?: string, extra?: string) {
  const info = BUGCHECKS[stop];
  return [
    `*** STOP: ${stop} (0x${(Math.random() * 0xffffffff) >>> 0}\`${(Math.random() * 0xffffffff) >>> 0})`,
    "",
    `${info.title}`,
    "",
    `If this is the first time you've seen this Stop error screen,`,
    `restart your computer. If this screen appears again, follow`,
    `these steps:`,
    "",
    `Check to make sure any new hardware or software is properly installed.`,
    `If this is a new installation, ask your hardware or software manufacturer`,
    `for any Windows updates you might need.`,
    "",
    extra || (driver ? `The driver ${driver} was unable to complete an operation.` : `If problems continue, disable or remove any newly installed hardware`),
    driver && extra ? `Failing driver: ${driver}` : "",
    "",
    `Technical information:`,
    "",
    `*** STOP: ${stop} (${info.title})`,
    "",
    "Collecting data for crash dump ...",
    "Initializing disk for crash dump ...",
    "Beginning dump of physical memory.",
    "Dumping physical memory to disk: 100",
  ].filter((l) => l !== "").join("\r\n");
}

/* =========================================================== event log */
/**
 * The Windows Event Log. Real sources — Kernel-General, Service Control
 * Manager, Application Error, Windows Error Reporting — record what the
 * simulation does, so Event Viewer shows genuine system history rather than
 * invented rows.
 */
export type EventLevel = "Information" | "Warning" | "Error" | "Critical";
export interface LogEvent {
  id: number;
  time: number;
  level: EventLevel;
  log: "System" | "Application" | "Security";
  source: string;
  eventId: number;
  text: string;
}

const LOG_KEY = "win7.events";

/** Notify Event Viewer that the log changed (never let a listener break logging). */
function announce() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("win7-log"));
  } catch {
    /* some embedded environments have no Event constructor */
  }
}
let seq = 1;

export function getEvents(): LogEvent[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const list = raw ? (JSON.parse(raw) as LogEvent[]) : [];
    seq = list.reduce((m, e) => Math.max(m, e.id), 0) + 1;
    return list;
  } catch {
    return [];
  }
}

export function logEvent(level: EventLevel, source: string, eventId: number, text: string, log: LogEvent["log"] = "System") {
  const list = getEvents();
  const ev: LogEvent = { id: seq++, time: Date.now(), level, log, source, eventId, text };
  const next = [ev, ...list].slice(0, 400);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* storage full — the log is best-effort */
  }
  announce();
  return ev;
}

export function clearLog(log?: LogEvent["log"]) {
  const list = log ? getEvents().filter((e) => e.log !== log) : [];
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  announce();
}

/** Standard event IDs Windows 7 uses for the things this simulation does. */
export const EVENT_IDS = {
  bootStart: { source: "Microsoft-Windows-Kernel-General", id: 12, text: "The operating system started at system time %s." },
  bootComplete: { source: "Microsoft-Windows-Kernel-General", id: 13, text: "The operating system is shutting down at system time %s." },
  serviceStart: { source: "Service Control Manager", id: 7036, text: "The %s service entered the running state." },
  serviceStop: { source: "Service Control Manager", id: 7036, text: "The %s service entered the stopped state." },
  driverFail: { source: "Service Control Manager", id: 7000, text: "The %s service failed to start due to the following error: The system cannot find the file specified." },
  bugCheck: { source: "Microsoft-Windows-Kernel-Power", id: 41, text: "The system has rebooted without cleanly shutting down first. This error could be caused if the system stopped responding, crashed, or lost power unexpectedly." },
  appError: { source: "Application Error", id: 1000, text: "Faulting application %s, version 6.1.7601.2, time stamp 0x4ce7c9d1, faulting module unknown." },
  uac: { source: "Microsoft-Windows-UAC", id: 2000, text: "An application attempted to elevate: %s." },
} as const;
