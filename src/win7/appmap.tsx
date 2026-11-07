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
import { GadgetGallery } from "./gadgets";
import { MsgBox, Uac, Progress, Props, Run, FileDialog, Winver, Setup, InputBox } from "./dialogs";
import { Solitaire, Spider, Hearts, GamesExplorer } from "./apps/Games";
import { FreeCell, Mahjong, Chess, Purble } from "./apps/Games7";
import { SystemDiagnostics } from "./apps/Kernel";
import { EventViewer, DiskCleanup, Regedit } from "./apps/Tools";
import { WindowsFeatures } from "./apps/Features";
import { Journal, XpsViewer, StickyNotes2, SpeechRecognition, Mobility, Reliability, AnytimeUpgrade } from "./apps/Utilities";

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
