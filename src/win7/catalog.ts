import { APPS } from "./registry";

export interface Cat { name: string; icon: string; apps: string[]; sub?: { name: string; icon: string; apps: string[] }[] }

/* Program catalogue used by the Start-menu replacement window and search. */
export const CATALOG: Cat[] = [
  {
    name: "Accessories",
    icon: "folder",
    apps: [],
    sub: [
      { name: "Calculator", icon: "calc", apps: ["calc"] },
      { name: "Command Prompt", icon: "cmd", apps: ["cmd"] },
      { name: "Ease of Access", icon: "folder", apps: ["magnifier", "speech"] },
      { name: "Notepad", icon: "notepad", apps: ["notepad"] },
      { name: "Paint", icon: "paint", apps: ["paint"] },
      { name: "Run", icon: "run", apps: [] },
      { name: "Snipping Tool", icon: "snip", apps: ["snip"] },
      { name: "Sound Recorder", icon: "recorder", apps: ["recorder"] },
      { name: "Sticky Notes", icon: "sticky2", apps: ["sticky2"] },
      { name: "System Tools", icon: "folder", apps: ["charmap", "taskmgr", "reliability", "controlpanel"] },
      { name: "Windows Explorer", icon: "explorer", apps: ["explorer"] },
      { name: "WordPad", icon: "wordpad", apps: ["wordpad"] },
      { name: "XPS Viewer", icon: "xps", apps: ["xps"] },
    ],
  },
  { name: "Games", icon: "gamecenter", apps: ["gamecenter", "solitaire", "spider", "hearts", "minesweeper", "freecell", "mahjong", "chess", "purble"] },
  { name: "Maintenance", icon: "folder", apps: ["reliability", "wupdate", "help", "eventvwr", "cleanmgr", "sysdiag", "regedit"] },
  {
    name: "Startup",
    icon: "folder",
    apps: [],
  },
  { name: "Windows Journal", icon: "journal", apps: ["journal"] },
];

export interface ProgItem { label: string; icon: string; group: string; app?: string }

export function allPrograms(): ProgItem[] {
  const out: ProgItem[] = [];
  const push = (app: string, group: string) => {
    const m = APPS[app];
    if (!m) return;
    if (out.some((o) => o.app === app)) return;
    out.push({ label: m.title.replace(/^(Untitled|Document) - /, ""), icon: m.icon, group, app });
  };
  CATALOG.forEach((c) => {
    c.apps.forEach((a) => push(a, c.name));
    c.sub?.forEach((s) => s.apps.forEach((a) => push(a, c.name)));
  });
  // any remaining visible desktop apps
  Object.keys(APPS)
    .filter((k) => !APPS[k].hidden && !APPS[k].noTask && !out.some((o) => o.app === k))
    .sort()
    .forEach((k) => push(k, "Windows"));
  return out;
}

export function searchPrograms(q: string): ProgItem[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return allPrograms().filter((p) => p.label.toLowerCase().includes(t) || p.group.toLowerCase().includes(t));
}
