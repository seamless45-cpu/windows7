"use client";
import React from "react";
import type { Win } from "./store";
import { Explorer } from "./apps/Explorer";
import { ControlPanel } from "./apps/ControlPanel";
import { Notepad, WordPad, Calculator, CharMap, StickyNotes, Magnifier } from "./apps/Accessories";
import { Paint } from "./apps/Paint";
import { MediaPlayer, PhotoViewer, DvdMaker, SoundRecorder } from "./apps/Media";
import { IE } from "./apps/IE";
import { Cmd, TaskManager, HelpApp, SnippingTool, Minesweeper } from "./apps/SystemApps";
import { GadgetGallery, GadgetOptions } from "./gadgets";
import { MsgBox, Uac, Progress, Props, Run, FileDialog, Winver, Setup, InputBox } from "./dialogs";
import { Solitaire, Spider, Hearts, GamesExplorer } from "./apps/Games";
import { FreeCell, Mahjong, Chess, Purble } from "./apps/Games7";
import { SystemDiagnostics } from "./apps/Kernel";
import { EventViewer, DiskCleanup, Regedit } from "./apps/Tools";
import { WindowsFeatures } from "./apps/Features";
import { Journal, XpsViewer, StickyNotes2, SpeechRecognition, Mobility, Reliability, AnytimeUpgrade } from "./apps/Utilities";
import { Services, MsConfig } from "./apps/Services";
import { OnScreenKeyboard, Narrator, StepsRecorder, MathPanel } from "./apps/Accessories7";
import { TaskScheduler } from "./apps/TaskScheduler";
import { ResourceMonitor } from "./apps/ResourceMonitor";
import { ComputerManagement, DeviceManager, LocalUsers } from "./apps/ComputerManagement";
import { DiskManagement } from "./apps/DiskManagement";
import { PowerShell } from "./apps/PowerShell";
import { SystemRestore } from "./apps/SystemRestore";
import { Defender } from "./apps/Defender";
import { Calendar } from "./apps/Calendar";
import { FirewallAdvanced, LocalSecurityPolicy, RemoteDesktop, SyncCenter, EasyTransfer, MemoryDiagnostic, PerformanceMonitor } from "./apps/AdminSafety";
import { PrivateCharEditor, TabletInputPanel, StickyManager, SupportDiagnostic, FaxAndScan } from "./apps/Accessories9";
import { MediaCenter } from "./apps/MediaCenter";
import { PlayTo, CardSpace, OpenWith } from "./apps/ShellExtras";
import { GettingStarted, ColorCalibration, PowerShellISE, WindowsContacts } from "./apps/Extras7";
import { FunFeatures } from "./apps/FunFeatures";
import { BackupRestore, BitLocker, HomeGroup, CredentialManager, ExperienceIndex, RemoteAssistance } from "./apps/PanelTools";

export const COMPONENTS: Record<string, React.ComponentType<{ win: Win }>> = {
  explorer: Explorer,
  controlpanel: ControlPanel,
  ie: IE,
  notepad: Notepad,
  paint: Paint,
  calc: Calculator,
  wmp: MediaPlayer,
  wordpad: WordPad,
  snip: SnippingTool,
  sticky: StickyNotes,
  recorder: SoundRecorder,
  cmd: Cmd,
  sysdiag: SystemDiagnostics,
  services: Services,
  msconfig: MsConfig,
  tasksched: TaskScheduler,
  resmon: ResourceMonitor,
  compmgmt: ComputerManagement,
  devmgr: DeviceManager,
  diskmgmt: DiskManagement,
  powershell: PowerShell,
  sysrestore: SystemRestore,
  defender: Defender,
  calendar: Calendar,
  lusrmgr: LocalUsers,
  fw: FirewallAdvanced,
  secpol: LocalSecurityPolicy,
  rdp: RemoteDesktop,
  sync: SyncCenter,
  migwiz: EasyTransfer,
  mdsched: MemoryDiagnostic,
  perfmon: PerformanceMonitor,
  eudc: PrivateCharEditor,
  tabtip: TabletInputPanel,
  stkmgr: StickyManager,
  support: SupportDiagnostic,
  wfs: FaxAndScan,
  mce: MediaCenter,
  playto: PlayTo,
  cardspace: CardSpace,
  openwith: OpenWith,
  gettingstarted: GettingStarted,
  fun: FunFeatures,
  dccw: ColorCalibration,
  ise: PowerShellISE,
  contacts: WindowsContacts,
  backup: BackupRestore,
  bitlocker: BitLocker,
  homegroup: HomeGroup,
  credmgr: CredentialManager,
  wei: ExperienceIndex,
  ra: RemoteAssistance,
  osk: OnScreenKeyboard,
  narrator: Narrator,
  psr: StepsRecorder,
  mip: MathPanel,
  features: WindowsFeatures,
  eventvwr: EventViewer,
  cleanmgr: DiskCleanup,
  regedit: Regedit,
  taskmgr: TaskManager,
  photos: PhotoViewer,
  magnifier: Magnifier,
  charmap: CharMap,
  dvdmaker: DvdMaker,
  help: HelpApp,
  gadgets: () => <GadgetGallery />,
  gadgetopts: GadgetOptions,
  minesweeper: Minesweeper,
  run: Run,
  msgbox: MsgBox,
  uac: Uac,
  progress: Progress,
  props: Props,
  filedlg: FileDialog,
  winver: Winver,
  setup: Setup,
  inputbox: InputBox,
  solitaire: Solitaire,
  spider: Spider,
  hearts: Hearts,
  freecell: FreeCell,
  mahjong: Mahjong,
  chess: Chess,
  purble: Purble,
  gamecenter: GamesExplorer,
  journal: Journal,
  xps: XpsViewer,
  sticky2: StickyNotes2,
  speech: SpeechRecognition,
  mobility: Mobility,
  reliability: Reliability,
  trust: AnytimeUpgrade,
};
