import type { FsNode } from "./store";

export const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const cssUrl = (svg: string) => `url("${svgUrl(svg)}")`;

const hills = (sky: string, sky2: string, h1: string, h2: string, sun: string) =>
  cssUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${sky}'/><stop offset='1' stop-color='${sky2}'/></linearGradient></defs><rect width='1600' height='900' fill='url(#s)'/><circle cx='1150' cy='260' r='90' fill='${sun}' opacity='.9'/><circle cx='1150' cy='260' r='170' fill='${sun}' opacity='.18'/><path d='M0 620 Q300 460 640 580 T1300 540 T1600 600 V900 H0Z' fill='${h2}'/><path d='M0 740 Q380 600 800 720 T1600 700 V900 H0Z' fill='${h1}'/></svg>`
  );

export const WALLPAPERS: { key: string; name: string; css: string }[] = [
  {
    key: "win7",
    name: "Windows 7",
    css: "radial-gradient(ellipse 55% 85% at 70% 55%, rgba(205,242,255,.95) 0%, rgba(95,180,245,.65) 22%, rgba(20,100,200,0) 62%), conic-gradient(from 205deg at 70% 55%, transparent 0 6%, rgba(255,255,255,.16) 8% 10%, transparent 12% 20%, rgba(255,255,255,.12) 22% 26%, transparent 29% 44%, rgba(255,255,255,.1) 46% 49%, transparent 52% 70%, rgba(255,255,255,.08) 72% 74%, transparent 77%), linear-gradient(135deg,#031747 0%,#0a4aa8 42%,#1c86dc 68%,#052a6a 100%)",
  },
  {
    key: "harmony",
    name: "Harmony",
    css: "radial-gradient(ellipse 80% 40% at 30% 70%, rgba(120,255,200,.55), transparent 70%), radial-gradient(ellipse 70% 50% at 75% 30%, rgba(255,120,220,.45), transparent 70%), linear-gradient(160deg,#1b0f4f 0%,#3a2a9a 40%,#0d7aa8 75%,#0b3d6e 100%)",
  },
  { key: "landscape", name: "Landscape", css: hills("#4aa8ec", "#d6f0ff", "#2f7d32", "#4fa24b", "#fff8c4") },
  { key: "dusk", name: "Dusk", css: hills("#2b1a52", "#ff9a52", "#201233", "#3b2150", "#ffe08a") },
  { key: "coast", name: "Coast", css: hills("#6cc4ff", "#eaf9ff", "#1d6fa3", "#3aa1c4", "#ffffff") },
  {
    key: "night",
    name: "Night Sky",
    css: "radial-gradient(circle at 20% 30%, rgba(255,255,255,.9) 0 1px, transparent 2px), radial-gradient(circle at 60% 20%, rgba(255,255,255,.8) 0 1px, transparent 2px), radial-gradient(circle at 80% 70%, rgba(255,255,255,.8) 0 1px, transparent 2px), radial-gradient(ellipse at 50% 120%, #2b4f9b 0%, #0a1740 55%, #02040f 100%)",
  },
  {
    key: "architecture",
    name: "Architecture",
    css: "repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 2px, transparent 2px 90px), repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 2px, transparent 2px 90px), linear-gradient(160deg,#3c4658 0%,#1b2230 60%,#0c101a 100%)",
  },
  { key: "bluesolid", name: "Solid Blue", css: "linear-gradient(#1d5ba8,#1d5ba8)" },
  { key: "blacksolid", name: "Solid Black", css: "linear-gradient(#000,#000)" },
];

export const COLORS: { key: string; name: string; rgb: [number, number, number] }[] = [
  { key: "sky", name: "Sky", rgb: [116, 184, 252] },
  { key: "twilight", name: "Twilight", rgb: [76, 108, 190] },
  { key: "sea", name: "Sea", rgb: [30, 150, 190] },
  { key: "leaf", name: "Leaf", rgb: [64, 160, 90] },
  { key: "lime", name: "Lime", rgb: [150, 200, 60] },
  { key: "gold", name: "Gold", rgb: [220, 190, 70] },
  { key: "pumpkin", name: "Pumpkin", rgb: [235, 140, 50] },
  { key: "ruby", name: "Ruby", rgb: [200, 60, 70] },
  { key: "blush", name: "Blush", rgb: [240, 150, 180] },
  { key: "violet", name: "Violet", rgb: [150, 100, 200] },
  { key: "frost", name: "Frost", rgb: [200, 220, 240] },
  { key: "slate", name: "Slate", rgb: [110, 120, 135] },
  { key: "smoke", name: "Smoke", rgb: [70, 70, 75] },
  { key: "chocolate", name: "Chocolate", rgb: [120, 80, 60] },
  { key: "lavender", name: "Lavender", rgb: [180, 170, 230] },
  { key: "taupe", name: "Taupe", rgb: [170, 150, 130] },
];

export const PIC_NAMES = ["Chrysanthemum", "Desert", "Hydrangeas", "Jellyfish", "Koala", "Lighthouse", "Penguins", "Tulips"];

export function scene(i: number): string {
  const pal = [
    ["#6fb7ff", "#fff1c9", "#d94a8c", "#3f8f3a"],
    ["#79c1ff", "#ffe6a8", "#d9a15a", "#b9773a"],
    ["#8fb1ff", "#e5ecff", "#6a7be0", "#4b9a5a"],
    ["#0a2a5a", "#2a7fb8", "#ff9ad5", "#0a1d44"],
    ["#a8d6a0", "#f1f7d8", "#8d8d8d", "#4a7a3a"],
    ["#4a98e8", "#cfe8ff", "#e8e8e8", "#7c8a98"],
    ["#b6dcff", "#ffffff", "#2a2a33", "#d9ecff"],
    ["#7cc8ff", "#fff0f0", "#e8363f", "#4aa24a"],
  ][i % 8];
  const [a, b, c, d] = pal;
  let motif = "";
  switch (i % 8) {
    case 0:
      for (let k = 0; k < 18; k++) motif += `<ellipse cx='${400 + Math.cos(k) * 120}' cy='${300 + Math.sin(k) * 40}' rx='20' ry='90' fill='${c}' transform='rotate(${k * 20} 400 300)'/>`;
      motif += `<circle cx='400' cy='300' r='30' fill='#ffd54a'/>`;
      break;
    case 1:
      motif = `<path d='M0 420 Q200 330 420 400 T800 380 V600 H0Z' fill='${c}'/><path d='M0 490 Q260 420 520 480 T800 470 V600 H0Z' fill='${d}'/><circle cx='640' cy='130' r='56' fill='#fff7c0'/>`;
      break;
    case 2:
      for (let k = 0; k < 40; k++) motif += `<circle cx='${200 + ((k * 53) % 420)}' cy='${180 + ((k * 37) % 200)}' r='${22 + (k % 5) * 5}' fill='${c}' opacity='.8'/>`;
      break;
    case 3:
      motif = `<ellipse cx='400' cy='230' rx='120' ry='90' fill='${c}' opacity='.75'/>` + [0, 1, 2, 3, 4, 5].map((k) => `<path d='M${300 + k * 40} 300 q-20 90 ${k % 2 ? 20 : -20} 190' stroke='${c}' stroke-width='6' fill='none' opacity='.7'/>`).join("");
      break;
    case 4:
      motif = `<rect x='360' y='220' width='90' height='260' rx='40' fill='${c}'/><circle cx='405' cy='200' r='60' fill='${c}'/><circle cx='360' cy='160' r='28' fill='${c}'/><circle cx='450' cy='160' r='28' fill='${c}'/>`;
      break;
    case 5:
      motif = `<rect x='370' y='160' width='60' height='320' fill='${c}'/><rect x='370' y='240' width='60' height='36' fill='#d33'/><rect x='370' y='340' width='60' height='36' fill='#d33'/><rect x='350' y='130' width='100' height='30' fill='#444'/><path d='M0 470 Q300 420 800 470 V600 H0Z' fill='${d}'/>`;
      break;
    case 6:
      for (let k = 0; k < 5; k++) motif += `<ellipse cx='${220 + k * 90}' cy='${400 - (k % 2) * 20}' rx='34' ry='80' fill='${c}'/><ellipse cx='${220 + k * 90}' cy='${420 - (k % 2) * 20}' rx='22' ry='56' fill='#fff'/>`;
      break;
    default:
      for (let k = 0; k < 9; k++) motif += `<path d='M${150 + k * 65} 480 V380' stroke='${d}' stroke-width='5'/><path d='M${150 + k * 65} 380 q-26 -10 -22 -50 q22 8 22 30 q0 -22 22 -30 q4 40 -22 50z' fill='${c}'/>`;
  }
  return svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='800' height='600' fill='url(#g)'/>${motif}</svg>`
  );
}

export const USER_PICS = ["flower", "fish", "guitar", "chess", "car", "butterfly", "football", "star"];
export function userPic(key: string): string {
  const bg: Record<string, [string, string]> = {
    flower: ["#ffd6e8", "#ff7fb0"], fish: ["#bfe8ff", "#2aa0e8"], guitar: ["#ffe2b3", "#e8903a"], chess: ["#e0e0e0", "#6a6a6a"],
    car: ["#ffd0d0", "#e03a3a"], butterfly: ["#e6d0ff", "#8a4fe0"], football: ["#d6f5c8", "#4aa83a"], star: ["#fff2b0", "#f2c200"],
  };
  const [c1, c2] = bg[key] || bg.flower;
  let shape = "";
  switch (key) {
    case "flower": shape = Array.from({ length: 6 }, (_, k) => `<ellipse cx='64' cy='34' rx='13' ry='24' fill='#fff' transform='rotate(${k * 60} 64 64)'/>`).join("") + `<circle cx='64' cy='64' r='13' fill='#f5c400'/>`; break;
    case "fish": shape = `<ellipse cx='60' cy='64' rx='34' ry='20' fill='#fff'/><path d='M92 64 L116 44 V84Z' fill='#fff'/><circle cx='44' cy='58' r='4' fill='#0a4a8a'/>`; break;
    case "guitar": shape = `<ellipse cx='54' cy='78' rx='26' ry='22' fill='#fff'/><rect x='70' y='26' width='8' height='56' transform='rotate(35 74 54)' fill='#fff'/><circle cx='54' cy='78' r='7' fill='${c2}'/>`; break;
    case "chess": shape = `<path d='M50 100 H78 L72 60 Q86 48 74 34 Q64 24 54 34 Q42 48 56 60Z' fill='#fff'/><rect x='44' y='100' width='40' height='8' fill='#fff'/>`; break;
    case "car": shape = `<path d='M18 80 L30 54 H88 L108 80Z' fill='#fff'/><rect x='14' y='78' width='100' height='20' rx='6' fill='#fff'/><circle cx='36' cy='100' r='9' fill='#333'/><circle cx='92' cy='100' r='9' fill='#333'/>`; break;
    case "butterfly": shape = `<ellipse cx='42' cy='52' rx='24' ry='28' fill='#fff'/><ellipse cx='86' cy='52' rx='24' ry='28' fill='#fff'/><ellipse cx='46' cy='86' rx='16' ry='18' fill='#fff'/><ellipse cx='82' cy='86' rx='16' ry='18' fill='#fff'/><rect x='61' y='34' width='6' height='64' rx='3' fill='#333'/>`; break;
    case "football": shape = `<circle cx='64' cy='64' r='36' fill='#fff'/><path d='M64 44 L82 58 L75 80 H53 L46 58Z' fill='#222'/>`; break;
    default: shape = `<path d='M64 18 L77 50 L112 52 L85 74 L94 108 L64 88 L34 108 L43 74 L16 52 L51 50Z' fill='#fff'/>`;
  }
  return svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><defs><linearGradient id='b' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='128' height='128' fill='url(#b)'/>${shape}</svg>`);
}

export const TRACKS = [
  { name: "Kalimba", artist: "Mr. Scruff", album: "Ninja Tuna", len: 348 },
  { name: "Maid with the Flaxen Hair", artist: "Richard Stoltzman", album: "Fine Music, Vol. 1", len: 173 },
  { name: "Sleep Away", artist: "Bob Acri", album: "Bob Acri", len: 200 },
  { name: "Aero Dreams", artist: "Windows Orchestra", album: "Sample Music", len: 156 },
  { name: "Glass Morning", artist: "Windows Orchestra", album: "Sample Music", len: 188 },
];

const NOW = Date.now();
export function seedFs(): Record<string, FsNode> {
  const fs: Record<string, FsNode> = {};
  const d = (id: string, name: string, parent: string | null, extra: Partial<FsNode> = {}) => {
    fs[id] = { id, name, type: "folder", parent, size: 0, created: NOW - 9e8, modified: NOW - 3e8, ...extra };
  };
  const f = (id: string, name: string, parent: string, content: string, size?: number, extra: Partial<FsNode> = {}) => {
    fs[id] = { id, name, type: "file", parent, content, size: size ?? content.length, created: NOW - 8e8, modified: NOW - 2e8, ...extra };
  };
  d("c", "Local Disk (C:)", null, { letter: "C:", label: "OS", total: 250e9, free: 147e9 });
  d("d", "Data (D:)", null, { letter: "D:", label: "Data", total: 500e9, free: 389e9 });
  d("c_perf", "PerfLogs", "c");
  d("c_pf", "Program Files", "c");
  d("c_pf86", "Program Files (x86)", "c");
  d("c_users", "Users", "c");
  d("c_win", "Windows", "c");
  d("c_public", "Public", "c_users");
  d("home", "User", "c_users");
  d("desk", "Desktop", "home");
  d("docs", "Documents", "home");
  d("pics", "Pictures", "home");
  d("music", "Music", "home");
  d("vids", "Videos", "home");
  d("dl", "Downloads", "home");
  d("fav", "Favorites", "home");
  d("c_pf_ie", "Internet Explorer", "c_pf");
  d("c_pf_wmp", "Windows Media Player", "c_pf");
  d("c_pf_nt", "Windows NT", "c_pf");
  d("c_pf_games", "Microsoft Games", "c_pf");
  d("c_sys32", "System32", "c_win");
  d("c_fonts", "Fonts", "c_win");
  d("c_web", "Web", "c_win");
  f("exe_ie", "iexplore.exe", "c_pf_ie", "app:ie", 810e3);
  f("exe_wmp", "wmplayer.exe", "c_pf_wmp", "app:wmp", 1.2e6);
  f("exe_wp", "wordpad.exe", "c_pf_nt", "app:wordpad", 5.3e6);
  f("exe_mines", "Minesweeper.exe", "c_pf_games", "app:minesweeper", 3.1e6);
  [["cmd.exe", "cmd"], ["notepad.exe", "notepad"], ["calc.exe", "calc"], ["mspaint.exe", "paint"], ["taskmgr.exe", "taskmgr"], ["explorer.exe", "explorer"], ["charmap.exe", "charmap"], ["SnippingTool.exe", "snip"]].forEach(([n, a], i) =>
    f("exe_s" + i, n, "c_sys32", "app:" + a, 200e3 + i * 77e3)
  );
  ["segoeui.ttf", "tahoma.ttf", "arial.ttf", "consola.ttf", "cour.ttf", "times.ttf", "verdana.ttf", "calibri.ttf"].forEach((n, i) => f("font" + i, n, "c_fonts", "", 600e3 + i * 31e3));
  f("win_ini", "win.ini", "c_win", "; for 16-bit app support\r\n[fonts]\r\n[extensions]\r\n[mci extensions]\r\n[files]\r\n[Mail]\r\nMAPI=1\r\n");

  // Desktop shortcuts
  const lnk = (id: string, name: string, t: string, v: string) => f(id, name + ".lnk", "desk", JSON.stringify({ t, v }), 1200);
  lnk("lnk_ie", "Internet Explorer", "app", "ie");
  lnk("lnk_wmp", "Windows Media Player", "app", "wmp");
  lnk("lnk_note", "Notepad", "app", "notepad");
  lnk("lnk_paint", "Paint", "app", "paint");
  lnk("lnk_calc", "Calculator", "app", "calc");
  lnk("lnk_gadgets", "Desktop Gadgets", "app", "gadgets");

  // Documents
  f("doc1", "Welcome to Windows 7.txt", "docs", "Welcome to Windows 7 Ultimate!\r\n\r\nThis is a browser-based recreation of the Windows 7 desktop.\r\nTry the Start menu, the taskbar thumbnails, Aero Peek, the Control Panel,\r\nand the built-in applications. Everything you create is saved in your browser.\r\n\r\nKeyboard shortcuts:\r\n  Win (Meta) / Ctrl+Esc  Start menu\r\n  Win+D / Ctrl+Alt+D     Show desktop\r\n  Win+E / Ctrl+Alt+E     Computer\r\n  Win+R / Ctrl+Alt+R     Run\r\n  Win+L / Ctrl+Alt+L     Lock\r\n  Alt+Tab                Switch windows\r\n  Alt+F4 / Ctrl+Alt+W    Close window\r\n");
  f("doc2", "Shopping list.txt", "docs", "Milk\r\nEggs\r\nBread\r\nCoffee\r\nApples\r\n");
  f("doc3", "Budget 2026.txt", "docs", "Rent: 900\r\nFood: 350\r\nTransport: 80\r\nSavings: 400\r\n");
  f("doc4", "Letter.rtf", "docs", "<div style='font-family:Calibri'><h2>Dear Friend,</h2><p>This is a sample <b>WordPad</b> document with <i>rich</i> <u>formatting</u>.</p><p>Sincerely,<br>User</p></div>");
  d("doc_work", "Work", "docs");
  f("doc5", "Meeting notes.txt", "doc_work", "Agenda\r\n1. Status\r\n2. Roadmap\r\n3. Questions\r\n");
  f("doc6", "page.html", "docs", "<html><body style='font-family:Segoe UI,Arial;padding:20px'><h1>Hello from the virtual file system!</h1><p>This HTML file lives in your Documents folder and is rendered in Internet Explorer.</p></body></html>");

  // Pictures
  PIC_NAMES.forEach((n, i) => f("pic" + i, n + ".jpg", "pics", scene(i), 600e3 + i * 53e3));
  // Music / videos
  TRACKS.forEach((t, i) => f("mus" + i, t.name + ".mp3", "music", "synth:" + i, t.len * 16000, { meta: { artist: t.artist, album: t.album, len: t.len } }));
  f("vid0", "Wildlife.wmv", "vids", "synth:video", 26.2e6, { meta: { len: 30 } });
  f("vid1", "Aurora.wmv", "vids", "synth:video2", 18.1e6, { meta: { len: 24 } });
  f("dl1", "setup_sample.exe", "dl", "app:setup", 4.2e6);
  f("dl2", "readme.txt", "dl", "Downloaded file.\r\n");
  // D drive
  d("d_backup", "Backup", "d");
  d("d_proj", "Projects", "d");
  d("d_inst", "Installers", "d");
  f("d1", "Readme.txt", "d_proj", "Project notes live here.\r\n");
  f("d2", "archive.zip", "d_backup", "", 52e6);
  return fs;
}
