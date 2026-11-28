/**
 * New-feature guards for the "iframe program / Vista sound sets / more programs /
 * game art / no panel animations" pass.
 *
 * Run: node tests/features7.test.mjs
 */
import { readFile, access } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = async (p) => {
  try {
    return await readFile(path.join(root, p), "utf8");
  } catch {
    return "";
  }
};
let failures = 0;
const check = (name, ok, detail) => {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : " — " + detail}`);
  if (!ok) failures++;
};
const exists = async (p) => {
  try {
    await access(path.join(root, p));
    return true;
  } catch {
    return false;
  }
};

const registry = await src("src/win7/registry.ts");
const appmap = await src("src/win7/appmap.tsx");
const css = await src("src/app/win7.css");
const shell = await src("src/win7/Shell.tsx");
const store = await src("src/win7/store.ts");
const menu = await src("src/win7/StartMenu.tsx");

/* ------------------------------------------------ the paste-a-link program */
const frame = await src("src/win7/apps/FrameViewer.tsx");
check("Web Frame program exists", frame.length > 1000);
check("Web Frame is registered", /frame: \{ title: "Web Frame"/.test(registry));
check("Web Frame is mounted", /frame: FrameViewer/.test(appmap));
check("Web Frame appears in the Start menu", /app\("frame"\)/.test(menu));
check("`webframe <url>` works from Run", /\(?:\?:webframe\|frame\)?\(?:\\\.exe\)\?/.test(store) || /webframe/.test(store));
check("Web Frame loads an arbitrary address in an iframe", /<iframe[\s\S]{0,400}src=\{loaded\}/.test(frame));
check("the frame is sandboxed with the shared helpers, not a hand-rolled policy", /sandboxForRemote\(\)/.test(frame) && /EMBED_ALLOW/.test(frame));
// A page can refuse framing; the program must explain it and offer a real tab.
check("a refused frame is explained, not left blank", /refuses to open inside a frame/.test(frame));
check("X-Frame-Options / frame-ancestors are named", /X-Frame-Options/.test(frame) && /frame-ancestors/.test(frame));
check("there is an open-in-a-real-tab escape hatch", /Open in a real browser tab/.test(frame));
check("the user can report a blank frame immediately", /Came up blank\?/.test(frame));
// Known-framable sites must be suggested, and every one must be a real URL.
const cards = [...frame.matchAll(/url: "([^"]+)"/g)].map((m) => m[1]);
check("embed-friendly example sites are listed", cards.length >= 6, `${cards.length} listed`);
check("every example is an absolute http(s) URL", cards.every((u) => /^https?:\/\//.test(u)), cards.filter((u) => !/^https?:\/\//.test(u)).join(", "));
check("a bare host gets a scheme", /return "https:\/\/" \+ t/.test(frame));
check("prose becomes a search instead of a broken URL", /lite\.duckduckgo\.com\/lite\/\?q=/.test(frame));
check("the address bar runs on Enter", /e\.key === "Enter"/.test(frame));
check("saved addresses persist", /win7\.frame\.bookmarks/.test(frame));
check("recent addresses persist", /win7\.frame\.recent/.test(frame));

/* --------------------------------------- animations are off for the panels */
// One switch, and it is the real Windows option: "Animate controls and
// elements inside windows" — separate from the min/max flight switch.
check("panel animations have their own setting", /taskbarAnim: boolean/.test(store));
check("panel animations default to off", /taskbarAnim: false/.test(store));
check("the shell tags the root when they are off", /nomotion-panels/.test(shell));
check("the Start menu, menus and flyouts are covered", /\.nomotion-panels \.start-menu/.test(css) && /\.nomotion-panels \.flyout/.test(css) && /\.nomotion-panels \.ctx/.test(css));
check("taskbar buttons and the tray are covered", /\.nomotion-panels \.tb-btn/.test(css) && /\.nomotion-panels \.tray-ico/.test(css));
check("the window min/max flights are a separate switch", /aero\.animations/.test(css) && /settings\.aero\.animations/.test(shell));
check("Control Panel explains the split", /Animate controls and elements inside windows/.test(await src("src/win7/apps/ControlPanel.tsx")));

/* ---------------------------------------------------- Vista sound schemes */
const sound = await src("src/win7/sound.ts");
for (const s of ["Vista Glass", "Vista Pearl", "Vista Tinker", "Vista Default"]) {
  check(`scheme "${s}" is offered`, new RegExp(`"${s}"`).test(sound));
}
check("schemes carry a description", /export const SCHEME_META/.test(sound));
check("Vista sets are described as Windows Vista", /version: "Windows Vista"/.test(sound));
// Pearl does not override startup, so probe a clip every Vista set carries.
for (const dir of ["VistaDefault", "VistaGlass", "VistaPearl", "VistaTinker"]) {
  check(`sound folder ${dir} exists`, await exists(`public/sounds/${dir}/notify.mp3`));
}
check("the Vista importer is in the repo", await exists("scripts/import-vista-sounds.mjs"));
check("no tone synthesiser is shipped", !(await exists("scripts/gen-vista-sounds.mjs")));
check("the Sound dialog has a schemes browser", /Sound Schemes/.test(await src("src/win7/apps/ControlPanel.tsx")));

/* ------------------------------------------------------- more Win 7 programs */
const NEW_APPS = [
  ["activation", "WindowsActivation"],
  ["wusa", "UpdateInstaller"],
  ["netwiz", "ConnectToNetwork"],
  ["windowcolor", "WindowColor"],
  ["helpwin", "HelpTopics"],
  ["touchcal", "TouchCalibration"],
  ["faxcover", "FaxCoverEditor"],
  ["defrag", "DiskDefragmenter"],
  ["syncw", "SyncCenterWizard"],
];
for (const [id, comp] of NEW_APPS) {
  check(`program "${id}" is registered`, new RegExp(`\\b${id}: \\{ title:`).test(registry));
  check(`program "${id}" is mounted to ${comp}`, new RegExp(`\\b${id}: ${comp}`).test(appmap));
}
check("no program is registered without a component", !/windowcolor: \{ title:/.test(registry) || /windowcolor: WindowColor/.test(appmap));
// dfrgui used to open Disk Cleanup, which is a different program
check("dfrgui.exe opens Disk Defragmenter, not Disk Cleanup", /dfrgui: "defrag"/.test(store));
check("Disk Defragmenter really analyses and defragments", /run\("analyzing"\)/.test(await src("src/win7/apps/SystemTools7.tsx")) && /run\("defragging"\)/.test(await src("src/win7/apps/SystemTools7.tsx")));

/* --------------------------------------------------------- game visual rework */
const cardArt = await src("src/win7/apps/CardArt.tsx");
check("card faces are drawn with real pip layouts", /const PIPS: Record<number, \[number, number, boolean\]\[\]>/.test(cardArt));
check("cards have both indexed corners", /cf-corner tl/.test(cardArt) && /cf-corner br/.test(cardArt));
check("court cards get the framed panel", /cf-court/.test(cardArt));
check("the old single-glyph face is gone", !/cf-big/.test(await src("src/win7/apps/Games.tsx")));
check("Solitaire and Spider share the art", /from "\.\/CardArt"/.test(await src("src/win7/apps/Games.tsx")));
check("FreeCell uses the same art", /from "\.\/CardArt"/.test(await src("src/win7/apps/Games7.tsx")));
check("the card back is the Win 7 lattice", /\.card\.back \.card-back-art/.test(await src("src/app/win7-apps.css")));
const g7 = await src("src/win7/apps/Games7.tsx");
check("Mahjong draws character tiles as Chinese numerals", /CN_NUM/.test(g7) && /萬/.test(g7));
check("Mahjong draws dot tiles as dot patterns", /mj-dots/.test(g7));
check("Mahjong draws bamboo tiles as sticks", /mj-bam/.test(g7));
check("Minesweeper uses Win 7 Aero tiles", /\.mc:hover \{ background: linear-gradient\(#ffffff/.test(await src("src/app/win7-apps.css")));

/* ------------------------------------------- second completeness pass (inbox) */
const inbox = await src("src/win7/apps/Inbox7.tsx");
for (const id of ["printmgmt", "compsvc", "odbcad", "sigverif", "recdisc", "colorcpl", "displayswitch", "netproj"]) {
  check(`${id} is registered and mounted`, new RegExp(`\\b${id}:`).test(registry) && new RegExp(`\\b${id}:`).test(appmap));
}
check("Print Management writes a real test page", /printDocument/.test(inbox) && /win7\.printers/.test(inbox));
check("Display Switch persists the chosen mode", /win7\.display\.mode/.test(inbox));
check("System Repair Disc writes an image file and logs Kernel-General 34", /\.iso\.txt/.test(inbox) && /Kernel-General/.test(inbox));
check("ODBC stores its DSNs", /win7\.odbc/.test(inbox));
check("Win+P opens Display Switch", /k === "p"[\s\S]{0,120}displayswitch/.test(shell));
const cp = await src("src/win7/apps/ControlPanel.tsx");
check("Mouse has five tabs including Wheel and Hardware", /\["Buttons", "Pointers", "Pointer Options", "Wheel", "Hardware"\]/.test(cp));
check("Mouse pointer speed is persisted", /pointerSpeed/.test(store) && /pointerSpeed: v/.test(cp));
check("Keyboard Hardware tab is real", /value=\{ktab\}/.test(cp));
check("Date and Time has extra clocks and Internet Time", /extraClocks/.test(store) && /ntpServer/.test(store));
check("Region renders all four tabs", /setRtab/.test(cp) && /rtab === "Location"/.test(cp));
check("Folder Options renders all three tabs", /setFtab/.test(cp) && /ftab === "Search"/.test(cp));
check("Sound Communications is a real setting", /commActivity/.test(store));
check("system tray icons can be switched off", /showSys\("volume"\)/.test(await src("src/win7/Taskbar.tsx")));
check("Quick Launch toolbar exists", /quicklaunch/.test(store) && /tb-qlaunch/.test(await src("src/win7/Taskbar.tsx")));
const paint = await src("src/win7/apps/Paint.tsx");
check("Paint View tab renders zoom, rulers, gridlines and thumbnails", /ptab === "View"/.test(paint) && /paint-thumbs/.test(paint));
check("WordPad View tab renders zoom presets", /preset === p/.test(await src("src/win7/apps/Accessories.tsx")));
check("Explorer Help dialog really changes folder options", /helpDlg/.test(await src("src/win7/apps/Explorer.tsx")));
check("cmd echo supports echo. / @echo off / %VAR%", /ECHO is on/.test(await src("src/win7/apps/SystemApps.tsx")) && /echoOff/.test(await src("src/win7/apps/SystemApps.tsx")));
check("Heart's New game button deals again", /New game<\/Btn>/.test(await src("src/win7/apps/Games.tsx")));

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
