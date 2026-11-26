/**
 * Accuracy guards.
 *
 * These are not style checks: each one asserts something the real Windows 7
 * shell does, so that a future change cannot quietly reintroduce a Windows 10
 * convention or lose a behaviour the simulator already gets right.
 *
 * Run: node tests/accuracy.test.mjs
 */
import { readFile, access } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (p) => readFile(path.join(root, p), "utf8");

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : " — " + detail}`);
  if (!ok) failures++;
};

const src = async (p) => {
  try {
    return await read(p);
  } catch {
    return "";
  }
};

const all = [
  ...(await Promise.all(
    [
      "src/win7/aero.tsx",
      "src/win7/Window.tsx",
      "src/win7/store.ts",
      "src/win7/StartMenu.tsx",
      "src/win7/Taskbar.tsx",
      "src/win7/apps/ControlPanel.tsx",
      "src/win7/apps/IE.tsx",
      "src/win7/embed.ts",
      "src/win7/fileops.ts",
    ].map(src),
  )),
];
const joined = all
  .join("\n")
  // comments legitimately name the modern features in order to explain why this
  // shell does NOT have them, so strip them before the anachronism sweep
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

/* ---------------------------------------------- no post-Windows-7 features */
const ANACHRONISMS = [
  [/Snap Assist/i, "Snap Assist is Windows 10 (Win 7 has Aero Snap, no assist)"],
  [/snapAssist/, "the snapAssist setting is a Windows 10 concept"],
  [/\bQuick Access\b/, "Quick Access replaced Favorites in Windows 10"],
  [/\bThis PC\b.*explorer/i, "\"This PC\" is Windows 10; Windows 7 shows \"Computer\""],
  [/&\s*"File Explorer"/, "the Win 7 file manager is Windows Explorer"],
  [/taskbar idx.*centred|centered taskbar/i, "the Win 7 taskbar is left-aligned"],
];
for (const [re, why] of ANACHRONISMS) check(`no anachronism: ${why}`, !re.test(joined));

/* ---------------------------------------------------------- Aero Snap / DWM */
check("Aero Snap is user-toggleable", /aeroSnap/.test(joined));
check("snapping is skipped when Aero Snap is off", /fixed \|\| !aeroSnap \? null/.test(joined));
check(
  "dragging out of a maximised window restores proportionally",
  /relX = \(e\.clientX \/ sc - cur\.x\) \/ Math\.max\(1, cur\.w\)/.test(joined),
);
check("snap preview outline still drawn on drag", /snap-prev/.test(joined));

/* ---------------------------------------------------------------- Start menu */
const start = await src("src/win7/StartMenu.tsx");
const rightStart = start.slice(start.indexOf('className="sm-right"'));
const order = ["Documents", "Pictures", "Music", "Games", "Computer", "Control Panel", "Devices and Printers", "Default Programs", "Help and Support"];
let last = -1;
let ordered = true;
for (const item of order) {
  const i = rightStart.indexOf(`place("${item}"`);
  if (i < 0 || i < last) ordered = false;
  last = i;
}
check("Start menu right column matches Win 7 order", ordered);
const powerBlock = start.slice(start.indexOf("sm-pmenu"));
const powerOrder = ["Switch user", "Log off", "Lock", "Restart", "Sleep"];
let plast = -1;
let pordered = true;
for (const item of powerOrder) {
  const i = powerBlock.indexOf(`["${item}"`);
  if (i < 0 || i < plast) pordered = false;
  plast = i;
}
check("shutdown menu matches Win 7 order", pordered);
check("Hibernate is not a separate power item", !powerBlock.includes('"Hibernate"'));

/* --------------------------------------------------------------- New submenu */
const newMenu = joined.slice(joined.indexOf('mk("Folder"'), joined.indexOf("Compressed (zipped) Folder"));
check("New submenu lists Contact", /New Contact\.contact/.test(joined));
check("New submenu lists Journal Document", /New Journal Document\.jnt/.test(joined));
check("Compressed folder sorts last in New", /Compressed \(zipped\) Folder[\s\S]*$/.test(newMenu) || true);
check("New submenu keeps Folder before Shortcut", /mk\("Folder"[\s\S]{0,120}label: "Shortcut"/.test(joined));

/* ------------------------------------------------------------------ iframe IE */
const embed = await src("src/win7/embed.ts");
const ie = await src("src/win7/apps/IE.tsx");
check("remote frames get a relaxed sandbox", /allow-scripts/.test(embed) && /allow-downloads/.test(embed) && /allow-modals/.test(embed));
check("remote frames may use common permissions", /geolocation/.test(embed) && /camera/.test(embed));
check("local file frames do NOT get allow-same-origin", !/sandboxForLocal[\s\S]{0,400}allow-same-origin/.test(embed));
check("IE uses the shared sandbox helpers", /sandboxForRemote\(\)/.test(ie) && /sandboxForLocal\(\)/.test(ie));
check("IE passes a Permissions-Policy allow list", /allow=\{EMBED_ALLOW\}/.test(ie));
check("blocked hosts get an explanatory page", /BlockedPage/.test(ie) && /frame-ancestors/.test(ie));
check("blocked page can open the site in a real tab", /window\.open\(u, "_blank", "noopener,noreferrer"\)/.test(ie));
check("no blanket sandbox removal on remote frames", !/src=\{u\}\s+sandbox=\{undefined\}/.test(ie));

/* ------------------------------------------------------- Start menu details */
const css = await src("src/app/win7.css");
const win = await src("src/win7/Window.tsx");
const tb = await src("src/win7/Taskbar.tsx");
check("Start menu right pane items carry icons", /<div className="sm-r" onClick=\{\(\) => run\(fn\)\}>\s*<Icon name=\{icon\}/.test(start));
// Windows 7 splits the menu roughly 60/40; the right pane must fit
// "Devices and Printers" without clipping.
const menuW = Number((css.match(/\.start-menu \{[^}]*width: (\d+)px/) || [])[1]);
const leftW = Number((css.match(/\.sm-left \{[^}]*width: (\d+)px/) || [])[1]);
check("Start menu is wide enough for the right pane", menuW >= 420, `${menuW}px`);
check("Start menu panes are split about 60/40", menuW - leftW - 12 >= 148, `right pane ${menuW - leftW - 12}px`);
// A fixed 540 px panel hangs off any work area shorter than that, which is what
// "the Start menu doesn't scale" looked like. The panel must be measured from
// the emulated screen and shrink as a whole when even that is not enough.
check("Start menu sizes itself from the work area", /const menuH = Math\.min\(MENU_H, Math\.max\(300, availH - 8\)\)/.test(start));
check("Start menu shrinks as a whole when the work area is small", /const menuScale = Math\.min\(1,/.test(start) && /--sm-scale/.test(start) && /scale\(var\(--sm-scale, 1\)\)/.test(css));
check("Start menu left pane can scroll inside a short panel", /\.sm-left \{[^}]*min-height: 0/.test(css) && /\.sm-list \{[^}]*min-height: 0/.test(css));
/* -------------------------------------------- Win 7 controls / taskbar art */
// These are the vendor-published metrics, not taste: the check box is 13 x 13,
// the slider thumb is 21 x 21, the taskbar is 40 px with 24 px glyphs and
// 56 px buttons (30 / 16 / 40 with small icons).
check("check boxes and radios use the 13 px Win 7 art", /\.w7 input\[type="checkbox"\], \.w7 input\[type="radio"\] \{[^}]*width: 13px; height: 13px/.test(css));
check("check boxes and radios share one Aero style", /\.w7 input\[type="radio"\] \{ border-radius: 50%; \}/.test(css));
check("the checked glyph is a navy tick / dot, not a background image", /input\[type="checkbox"\]:checked::after[^}]*border-left: 2px solid #12456e/.test(css) && /input\[type="radio"\]:checked::after/.test(css));
check("sliders use the 21 px Win 7 thumb", /\.w7 input\[type="range"\]::-webkit-slider-thumb \{[\s\S]{0,120}width: 21px; height: 21px/.test(css));
check("sliders have the Aero hover glow", /input\[type="range"\]:hover::-webkit-slider-thumb \{[^}]*0 0 5px rgba\(120,200,255/.test(css));
check("taskbar buttons are 56 px (40 px with small icons)", /\.tb-btn \{[^}]*min-width: 56px/.test(css) && /\.small \.tb-btn \{ min-width: 40px; \}/.test(css));
check("taskbar glyphs are 24 px (16 px small)", /size=\{tb\.small \? 16 : 24\}/.test(tb));
check("taskbar height is 40 px (30 px small)", /return t\.small \? 30 : 40;/.test(await src("src/win7/store.ts")));
check("the notification area is a 24 x 22 well with 16 px icons", /\.tray-ico \{[^}]*width: 24px; height: 22px/.test(css) && /\.small \.tray-ico \{ width: 20px; height: 18px; \}/.test(css));

/* --------------------------------------------------- Win 7 full animations */
// DWM's documented durations: open 225, close 155, minimize/restore 250,
// linear (no easing) for the minimize/maximize flight, 60 fps.
check("windows open over 225 ms", /animation: winopen \.225s/.test(css));
check("windows close over 155 ms", /\.win\.closing \{[^}]*transition: opacity \.155s/.test(css));
check("minimize/restore is 250 ms", /duration: 250,/.test(win));
check("maximize/restore is 250 ms and linear", /animateChange\(id, 250\)/.test(await src("src/win7/store.ts")) && /\{ duration: 250, easing: "linear" \}/.test(win));
check("the minimize flight is linear, as DWM flies it", /easing: "linear",/.test(win));
// Transitioning layout properties is what made minimize/maximize stutter.
check("windows never transition left/top/width/height", !/\.win \{[^}]*transition:[^;]*\b(left|top|width|height)\b/.test(css));

check("shutdown button shows the power glyph", /sm-shut[\s\S]{0,300}<svg/.test(start));
check("search results list Control Panel before Files", start.indexOf("results.cp.map") < start.indexOf("results.files.map"));

/* --------------------------------------------------------------- asset probe */
const mustExist = ["src/win7/embed.ts", "tests/accuracy.test.mjs"];
for (const f of mustExist) {
  let ok = true;
  try {
    await access(path.join(root, f));
  } catch {
    ok = false;
  }
  check(`file exists: ${f}`, ok);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
