export interface AppMeta {
  title: string;
  icon: string;
  w: number;
  h: number;
  single?: boolean;
  chrome?: "none";
  noTask?: boolean;
  modal?: boolean;
  fixed?: boolean;
  group?: string;
  desc?: string;
  exe?: string;
  hidden?: boolean;
}

export const APPS: Record<string, AppMeta> = {
  explorer: { title: "Windows Explorer", icon: "explorer", w: 880, h: 540, group: "explorer", exe: "explorer.exe", desc: "Browse your files and folders" },
  controlpanel: { title: "Control Panel", icon: "controlpanel", w: 880, h: 580, group: "explorer", exe: "control.exe", desc: "Change settings and customize functionality" },
  ie: { title: "Windows Internet Explorer", icon: "ie", w: 980, h: 620, exe: "iexplore.exe", desc: "Browse the web" },
  notepad: { title: "Untitled - Notepad", icon: "notepad", w: 640, h: 440, exe: "notepad.exe", desc: "Create and edit text files" },
  paint: { title: "Untitled - Paint", icon: "paint", w: 920, h: 640, exe: "mspaint.exe", desc: "Draw and edit pictures" },
  calc: { title: "Calculator", icon: "calc", w: 262, h: 392, exe: "calc.exe", desc: "Perform basic and scientific calculations" },
  wmp: { title: "Windows Media Player", icon: "wmp", w: 900, h: 600, single: true, exe: "wmplayer.exe", desc: "Play music and videos" },
  wordpad: { title: "Document - WordPad", icon: "wordpad", w: 760, h: 520, exe: "wordpad.exe", desc: "Create and edit rich text documents" },
  snip: { title: "Snipping Tool", icon: "snip", w: 420, h: 150, single: true, exe: "SnippingTool.exe", desc: "Capture a screen snip" },
  sticky: { title: "Sticky Notes", icon: "sticky", w: 230, h: 230, chrome: "none", group: "sticky", exe: "StikyNot.exe", desc: "Stick notes on your desktop" },
  recorder: { title: "Sound Recorder", icon: "recorder", w: 360, h: 170, single: true, exe: "SoundRecorder.exe", desc: "Record sound from a microphone" },
  cmd: { title: "Command Prompt", icon: "cmd", w: 680, h: 380, exe: "cmd.exe", desc: "Run text commands" },
  taskmgr: { title: "Windows Task Manager", icon: "taskmgr", w: 430, h: 510, single: true, exe: "taskmgr.exe", desc: "See running programs and system performance" },
  photos: { title: "Windows Photo Viewer", icon: "photos", w: 820, h: 620, exe: "PhotoViewer.dll", desc: "View and manage your pictures" },
  magnifier: { title: "Magnifier", icon: "magnifier", w: 330, h: 120, single: true, exe: "magnify.exe", desc: "Enlarge parts of the screen" },
  charmap: { title: "Character Map", icon: "charmap", w: 560, h: 440, single: true, exe: "charmap.exe", desc: "Select special characters" },
  dvdmaker: { title: "Windows DVD Maker", icon: "dvd", w: 720, h: 540, single: true, exe: "DVDMaker.exe", desc: "Create DVD slide shows" },
  help: { title: "Windows Help and Support", icon: "help", w: 820, h: 580, single: true, exe: "helpPane.exe", desc: "Find answers and help topics" },
  gadgets: { title: "Gadgets", icon: "gadgets", w: 660, h: 430, single: true, exe: "sidebar.exe", desc: "Add gadgets to your desktop" },
  minesweeper: { title: "Minesweeper", icon: "mines", w: 300, h: 390, single: true, exe: "minesweeper.exe", desc: "Clear the minefield" },
  run: { title: "Run", icon: "run", w: 420, h: 205, single: true, noTask: true, fixed: true, exe: "run.exe" },
  msgbox: { title: "Windows", icon: "info", w: 400, h: 170, noTask: true, fixed: true, hidden: true },
  uac: { title: "User Account Control", icon: "shield", w: 460, h: 280, noTask: true, fixed: true, modal: true, hidden: true },
  progress: { title: "Copying", icon: "folder", w: 420, h: 170, noTask: true, fixed: true, hidden: true },
  props: { title: "Properties", icon: "info", w: 380, h: 480, noTask: true, fixed: true, hidden: true },
  filedlg: { title: "Open", icon: "folder", w: 640, h: 440, noTask: true, modal: false, hidden: true },
  winver: { title: "About Windows", icon: "flag", w: 480, h: 400, noTask: true, fixed: true, single: true, hidden: true },
  setup: { title: "Setup", icon: "programs", w: 460, h: 300, noTask: false, fixed: true, hidden: true },
  inputbox: { title: "Input", icon: "question", w: 380, h: 170, noTask: true, fixed: true, hidden: true },
};

export const SYSTEM_PLACES: Record<string, string> = {
  computer: "Computer",
  network: "Network",
  recycle: "Recycle Bin",
  favorites: "Favorites",
  libraries: "Libraries",
};
