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
};
