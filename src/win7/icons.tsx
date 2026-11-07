"use client";
import React from "react";
import type { FsNode } from "./store";
import { extOf } from "./store";
import { APPS } from "./registry";

export function IconDefs() {
  const g = (id: string, a: string, b: string, mid?: string) => (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      {mid && <stop offset=".5" stopColor={mid} />}
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        {g("iFolderB", "#e9bd55", "#c28a1c")}
        {g("iFolderF", "#ffeeb0", "#f1bf45")}
        {g("iBlue", "#8fcaff", "#1d62c4")}
        {g("iGreen", "#a9ec88", "#2c9628")}
        {g("iRed", "#ff9f90", "#cc2c18")}
        {g("iGray", "#fbfcfd", "#a9b2bd")}
        {g("iYellow", "#fff7b8", "#f0bd00")}
        {g("iOrange", "#ffd08a", "#e46a00")}
        {g("iPurple", "#d7b8ff", "#6c34c4")}
        {g("iPaper", "#ffffff", "#dde6ef")}
        {g("iScreen", "#6dc0ff", "#144a9e")}
        {g("iDark", "#68727f", "#1b2027")}
        {g("iSilver", "#ffffff", "#98a3b0", "#d8dee6")}
        <radialGradient id="iOrb" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#ffe0a0" />
          <stop offset=".5" stopColor="#ff8a1a" />
          <stop offset="1" stopColor="#c04800" />
        </radialGradient>
        <radialGradient id="iSphere" cx=".35" cy=".3" r=".85">
          <stop offset="0" stopColor="#bfe4ff" />
          <stop offset=".55" stopColor="#2f86e0" />
          <stop offset="1" stopColor="#0b3a8c" />
        </radialGradient>
      </defs>
    </svg>
  );
}

const Folder = ({ g, c }: { g?: React.ReactNode; c?: [string, string] }) => (
  <>
    <path d="M3 10h15l4 4h23v26H3z" fill={c ? c[0] : "url(#iFolderB)"} stroke="#a6761a" strokeWidth="1" />
    <path d="M3 19h42v21H3z" fill={c ? c[1] : "url(#iFolderF)"} stroke="#c8962b" strokeWidth="1" />
    <path d="M3 19h42v5C30 22 16 26 3 23z" fill="#fff" opacity=".35" />
    {g}
  </>
);
const Paper = ({ g, fold = true }: { g?: React.ReactNode; fold?: boolean }) => (
  <>
    <path d="M9 3h22l9 9v33H9z" fill="url(#iPaper)" stroke="#7d8996" />
    {fold && <path d="M31 3v9h9z" fill="#c9d3de" stroke="#7d8996" />}
    {g}
  </>
);
const Tile = ({ a, b, children }: { a: string; b: string; children?: React.ReactNode }) => {
  const id = "t" + a.slice(1) + b.slice(1);
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="7" fill={`url(#${id})`} stroke="rgba(0,0,0,.35)" />
      <rect x="4" y="4" width="40" height="18" rx="6" fill="#fff" opacity=".25" />
      {children}
    </>
  );
};
const W = "#fff";

const G: Record<string, () => React.ReactNode> = {
  computer: () => (
    <>
      <rect x="5" y="5" width="38" height="27" rx="3" fill="url(#iGray)" stroke="#5f6b79" />
      <rect x="8" y="8" width="32" height="21" fill="url(#iScreen)" />
      <path d="M8 8h32v9C28 14 18 16 8 13z" fill="#fff" opacity=".35" />
      <rect x="19" y="32" width="10" height="4" fill="#97a1ad" />
      <rect x="10" y="36" width="28" height="6" rx="2" fill="url(#iGray)" stroke="#5f6b79" />
    </>
  ),
  folder: () => <Folder />,
  docs: () => <Folder g={<><path d="M17 26h14M17 30h14M17 34h10" stroke="#7a5a10" strokeWidth="2" /></>} />,
  pictures: () => <Folder g={<><rect x="14" y="24" width="20" height="13" fill="#9fd3ff" stroke="#386" /><path d="M14 37l6-7 5 5 4-4 5 6z" fill="#3a9a3a" /></>} />,
  music: () => <Folder g={<><path d="M20 38V27l12-2v11" stroke="#17406e" strokeWidth="2" fill="none" /><circle cx="18" cy="38" r="3" fill="#17406e" /><circle cx="30" cy="36" r="3" fill="#17406e" /></>} />,
  videos: () => <Folder g={<><rect x="14" y="25" width="20" height="13" fill="#222" /><path d="M21 28l8 3.500-8 3.500z" fill="#fff" /></>} />,
  downloads: () => <Folder g={<path d="M24 24v10M18 30l6 7 6-7" stroke="#1f9a2a" strokeWidth="4" fill="none" />} />,
  desktop: () => <Folder c={["#3a7bd5", "#79b7f5"]} g={<rect x="14" y="25" width="20" height="12" fill="#fff" opacity=".7" stroke="#145" />} />,
  favorites: () => <path d="M24 3l6.500 13.500 15 2-11 10.500 2.800 14.800L24 36.500 10.700 43.800 13.500 29 2.500 18.500l15-2z" fill="url(#iYellow)" stroke="#c28a00" />,
  user: () => (
    <>
      <circle cx="24" cy="15" r="9" fill="url(#iBlue)" stroke="#1a4f9c" />
      <path d="M6 44c0-12 8-17 18-17s18 5 18 17z" fill="url(#iBlue)" stroke="#1a4f9c" />
      <ellipse cx="21" cy="12" rx="4" ry="3" fill="#fff" opacity=".45" />
    </>
  ),
  network: () => (
    <>
      <rect x="4" y="6" width="22" height="16" rx="2" fill="url(#iGray)" stroke="#5f6b79" />
      <rect x="6" y="8" width="18" height="12" fill="url(#iScreen)" />
      <rect x="22" y="22" width="22" height="16" rx="2" fill="url(#iGray)" stroke="#5f6b79" />
      <rect x="24" y="24" width="18" height="12" fill="url(#iScreen)" />
      <path d="M15 22v6h7M33 38v4H12" stroke="#5f6b79" strokeWidth="2" fill="none" />
      <circle cx="38" cy="10" r="8" fill="url(#iSphere)" />
    </>
  ),
  recycle: () => (
    <>
      <path d="M9 12h30l-3 31H12z" fill="#cfe6f7" fillOpacity=".7" stroke="#5f7b92" />
      <path d="M7 9h34v4H7z" fill="url(#iGray)" stroke="#5f6b79" />
      <g fill="none" stroke="#2a9a3a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 22l5-6 4 5M30 26l-2 8h-7M17 30l-1-5" /></g>
    </>
  ),
  recycleFull: () => (
    <>
      <path d="M14 8l8 6-12 2zM30 6l6 8-14 0z" fill="#fff" stroke="#9aa" />
      <path d="M9 12h30l-3 31H12z" fill="#cfe6f7" fillOpacity=".75" stroke="#5f7b92" />
      <path d="M7 9h34v4H7z" fill="url(#iGray)" stroke="#5f6b79" />
      <g fill="none" stroke="#2a9a3a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 24l5-6 4 5M30 28l-2 8h-7" /></g>
    </>
  ),
  controlpanel: () => (
    <>
      <rect x="4" y="6" width="40" height="36" rx="4" fill="url(#iGray)" stroke="#5f6b79" />
      <rect x="9" y="12" width="14" height="10" fill="url(#iBlue)" stroke="#164" />
      <rect x="26" y="12" width="13" height="10" fill="url(#iGreen)" stroke="#164" />
      <rect x="9" y="26" width="14" height="10" fill="url(#iOrange)" stroke="#864" />
      <rect x="26" y="26" width="13" height="10" fill="url(#iRed)" stroke="#844" />
    </>
  ),
  ie: () => (
    <>
      <circle cx="24" cy="25" r="16" fill="url(#iSphere)" stroke="#0a3a8c" />
      <text x="24" y="33" textAnchor="middle" fontSize="26" fontWeight="bold" fontFamily="Georgia,serif" fill="#fff">e</text>
      <ellipse cx="24" cy="24" rx="22" ry="8" transform="rotate(-25 24 24)" fill="none" stroke="#ffd23a" strokeWidth="3.500" />
      <circle cx="40" cy="8" r="3" fill="#ffd23a" />
    </>
  ),
  explorer: () => (
    <>
      <path d="M3 12h13l3 3h26v26H3z" fill="url(#iFolderB)" stroke="#a6761a" />
      <rect x="9" y="18" width="30" height="24" fill="url(#iPaper)" stroke="#6b7684" />
      <rect x="9" y="18" width="30" height="5" fill="#4a8ee0" />
      <path d="M3 24h42v17H3z" fill="url(#iFolderF)" stroke="#c8962b" />
      <rect x="14" y="30" width="6" height="8" fill="#4a8ee0" /><rect x="22" y="30" width="6" height="8" fill="#5cc05c" /><rect x="30" y="30" width="6" height="8" fill="#e8923a" />
    </>
  ),
  notepad: () => (
    <>
      <rect x="9" y="7" width="30" height="37" rx="2" fill="url(#iPaper)" stroke="#5f6b79" />
      <rect x="9" y="7" width="30" height="8" rx="2" fill="url(#iBlue)" stroke="#164f9c" />
      {[10, 15, 20, 25, 30, 35].map((x) => <rect key={x} x={x} y="3" width="2.500" height="8" rx="1" fill="#556" />)}
      <path d="M14 22h20M14 28h20M14 34h14" stroke="#7aa4d8" strokeWidth="1.500" />
    </>
  ),
  paint: () => (
    <>
      <path d="M24 5C11 5 3 14 3 24c0 9 7 18 16 18 5 0 4-5 8-5 5 0 18 0 18-12C45 14 36 5 24 5z" fill="url(#iPaper)" stroke="#8a7a5a" />
      <circle cx="13" cy="22" r="4" fill="#e03a3a" /><circle cx="20" cy="13" r="4" fill="#f2c200" /><circle cx="31" cy="13" r="4" fill="#3aa84a" /><circle cx="38" cy="22" r="4" fill="#2a7ae0" />
      <path d="M33 44l9-20 4 2-9 20z" fill="url(#iOrange)" stroke="#864" />
    </>
  ),
  calc: () => (
    <>
      <rect x="8" y="3" width="32" height="42" rx="4" fill="url(#iGray)" stroke="#5f6b79" />
      <rect x="12" y="7" width="24" height="9" fill="#cfe9c8" stroke="#586" />
      {[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => <rect key={r * 4 + c} x={12 + c * 6.500} y={20 + r * 7} width="5" height="5" rx="1" fill={c === 3 ? "#e8923a" : "#6b7684"} />))}
    </>
  ),
  wmp: () => (
    <>
      <circle cx="24" cy="24" r="20" fill="url(#iOrb)" stroke="#a04000" />
      <ellipse cx="24" cy="14" rx="15" ry="9" fill="#fff" opacity=".35" />
      <path d="M19 15l16 9-16 9z" fill="#fff" stroke="#c05000" />
    </>
  ),
  wordpad: () => (
    <>
      <Paper g={<><path d="M14 22h22M14 27h22M14 32h14" stroke="#7aa4d8" strokeWidth="1.500" /><text x="14" y="20" fontSize="10" fontWeight="bold" fill="#1b4ea0" fontFamily="Arial">W</text></>} />
      <path d="M30 42l10-18 3 2-10 18-4 1z" fill="url(#iBlue)" stroke="#164f9c" />
    </>
  ),
  snip: () => (
    <>
      <rect x="4" y="4" width="40" height="40" rx="3" fill="url(#iPaper)" stroke="#5f6b79" strokeDasharray="4 3" />
      <circle cx="16" cy="34" r="5" fill="none" stroke="#c22" strokeWidth="3" />
      <circle cx="30" cy="34" r="5" fill="none" stroke="#c22" strokeWidth="3" />
      <path d="M19 30L34 10M27 30L12 10" stroke="#6b7684" strokeWidth="3" />
    </>
  ),
  sticky: () => (
    <>
      <path d="M5 5h38v30l-10 10H5z" fill="url(#iYellow)" stroke="#b89500" />
      <path d="M33 45V35h10z" fill="#e0b800" stroke="#b89500" />
      <path d="M11 15h26M11 22h26M11 29h16" stroke="#9a7d00" strokeWidth="1.500" />
    </>
  ),
  recorder: () => (
    <>
      <rect x="17" y="4" width="14" height="24" rx="7" fill="url(#iSilver)" stroke="#4a5562" />
      <path d="M10 22c0 9 6 14 14 14s14-5 14-14M24 36v8M16 44h16" stroke="#4a5562" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M20 10h8M20 15h8M20 20h8" stroke="#6b7684" />
    </>
  ),
  cmd: () => (
    <>
      <rect x="3" y="6" width="42" height="36" rx="3" fill="#111" stroke="#667" />
      <rect x="3" y="6" width="42" height="6" rx="3" fill="url(#iGray)" />
      <text x="7" y="28" fontSize="11" fontFamily="Consolas,monospace" fill="#ddd">C:\&gt;_</text>
    </>
  ),
  taskmgr: () => (
    <>
      <rect x="4" y="5" width="40" height="34" rx="3" fill="url(#iGray)" stroke="#5f6b79" />
      <rect x="7" y="8" width="34" height="26" fill="#0c2a12" />
      <path d="M7 28l6-8 5 5 6-12 6 9 5-5 4 3" stroke="#4cff4c" strokeWidth="2" fill="none" />
      <rect x="14" y="40" width="20" height="4" rx="1" fill="#97a1ad" />
    </>
  ),
  photos: () => (
    <>
      <rect x="3" y="7" width="42" height="34" rx="2" fill="#fff" stroke="#6b7684" />
      <rect x="6" y="10" width="36" height="28" fill="url(#iScreen)" />
      <path d="M6 38l11-13 8 8 6-6 11 11z" fill="#3a9a3a" />
      <circle cx="34" cy="18" r="4" fill="#ffe56a" />
    </>
  ),
  magnifier: () => (
    <>
      <circle cx="20" cy="20" r="14" fill="#cfe8ff" fillOpacity=".7" stroke="#4a5562" strokeWidth="3" />
      <path d="M12 14a10 10 0 0 1 10-4" stroke="#fff" strokeWidth="3" fill="none" />
      <path d="M31 31l13 13" stroke="#6a4a2a" strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  charmap: () => (
    <Tile a="#f4f8ff" b="#a8bddb"><text x="24" y="35" textAnchor="middle" fontSize="30" fill="#1b4ea0" fontFamily="Georgia,serif">Ω</text></Tile>
  ),
  dvd: () => (
    <>
      <circle cx="24" cy="24" r="20" fill="url(#iSilver)" stroke="#5f6b79" />
      <circle cx="24" cy="24" r="14" fill="none" stroke="#9ad" strokeWidth="2" opacity=".7" />
      <circle cx="24" cy="24" r="5" fill="#fff" stroke="#5f6b79" />
      <path d="M8 14l8 3-6 8z" fill="#f90" opacity=".5" /><path d="M40 34l-8-3 6-8z" fill="#39f" opacity=".5" />
    </>
  ),
  help: () => (
    <>
      <circle cx="24" cy="24" r="20" fill="url(#iSphere)" stroke="#0a3a8c" />
      <text x="24" y="34" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#fff" fontFamily="Segoe UI,Arial">?</text>
    </>
  ),
  gadgets: () => (
    <>
      <circle cx="17" cy="17" r="12" fill="url(#iGray)" stroke="#5f6b79" strokeWidth="1.500" />
      <path d="M17 9v8l5 3" stroke="#234" strokeWidth="2" fill="none" />
      <rect x="26" y="22" width="18" height="20" rx="2" fill="url(#iGreen)" stroke="#164" />
      <rect x="6" y="30" width="16" height="12" rx="2" fill="url(#iOrange)" stroke="#864" />
    </>
  ),
  mines: () => (
    <>
      <circle cx="24" cy="26" r="13" fill="url(#iDark)" stroke="#000" />
      <path d="M24 6v8M24 38v8M5 26h8M35 26h8M10 12l6 6M32 34l6 6M38 12l-6 6M16 34l-6 6" stroke="#222" strokeWidth="3" />
      <circle cx="19" cy="21" r="3" fill="#fff" opacity=".7" />
    </>
  ),
  drive: () => (
    <>
      <path d="M4 20l5-12h30l5 12z" fill="url(#iGray)" stroke="#5f6b79" />
      <rect x="4" y="20" width="40" height="16" rx="2" fill="url(#iGray)" stroke="#5f6b79" />
      <rect x="8" y="26" width="22" height="4" fill="#8e99a6" />
      <circle cx="38" cy="28" r="2.500" fill="#4cff4c" stroke="#164" />
    </>
  ),
  cd: () => (
    <>
      <circle cx="24" cy="24" r="19" fill="url(#iSilver)" stroke="#5f6b79" />
      <circle cx="24" cy="24" r="5" fill="#fff" stroke="#5f6b79" />
    </>
  ),
  file: () => <Paper />,
  txt: () => <Paper g={<path d="M14 18h20M14 23h20M14 28h20M14 33h12" stroke="#6b7684" strokeWidth="1.500" />} />,
  rtf: () => <Paper g={<><text x="13" y="22" fontSize="10" fontWeight="bold" fill="#1b4ea0" fontFamily="Arial">W</text><path d="M14 27h20M14 32h20M14 37h10" stroke="#7aa4d8" strokeWidth="1.500" /></>} />,
  html: () => <Paper g={<><circle cx="24" cy="29" r="10" fill="url(#iSphere)" /><text x="24" y="34" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#fff" fontFamily="Georgia">e</text></>} />,
  image: () => <Paper g={<><rect x="13" y="17" width="22" height="18" fill="url(#iScreen)" stroke="#456" /><path d="M13 35l7-8 5 5 4-3 6 6z" fill="#3a9a3a" /></>} />,
  audio: () => <Paper g={<><path d="M20 35V22l12-3v13" stroke="#1b4ea0" strokeWidth="2.500" fill="none" /><circle cx="17" cy="35" r="3.500" fill="#1b4ea0" /><circle cx="29" cy="32" r="3.500" fill="#1b4ea0" /></>} />,
  video: () => <Paper g={<><rect x="13" y="18" width="22" height="16" fill="#222" /><path d="M21 21l9 5-9 5z" fill="#fff" /></>} />,
  exe: () => <Paper fold={false} g={<><rect x="12" y="14" width="26" height="22" fill="url(#iGray)" stroke="#456" /><rect x="12" y="14" width="26" height="5" fill="url(#iBlue)" /></>} />,
  zip: () => <Folder g={<path d="M24 20v18M21 22h6M21 26h6M21 30h6M21 34h6" stroke="#6a4a00" strokeWidth="2" />} />,
  font: () => <Paper g={<text x="24" y="38" textAnchor="middle" fontSize="26" fontWeight="bold" fill="#c22" fontFamily="Georgia">A</text>} />,
  iso: () => <Paper g={<circle cx="24" cy="30" r="10" fill="url(#iSilver)" stroke="#556" />} />,
  // The Windows 7 logo: four waving panes — orange-red, green, blue, yellow —
  // each shaded with the vertical gradient the real flag artwork uses. It is
  // drawn in vector so it stays crisp at any size on the logon screen, in
  // winver and in Control Panel.
  flag: () => (
    <>
      <defs>
        <linearGradient id="w7paneRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f89a3f" /><stop offset=".45" stopColor="#f2691c" /><stop offset="1" stopColor="#d94b0b" /></linearGradient>
        <linearGradient id="w7paneGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8dc3b" /><stop offset=".45" stopColor="#7bbb0b" /><stop offset="1" stopColor="#5c9a00" /></linearGradient>
        <linearGradient id="w7paneBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#63cdfb" /><stop offset=".45" stopColor="#139df0" /><stop offset="1" stopColor="#0a7fc4" /></linearGradient>
        <linearGradient id="w7paneYellow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffdc63" /><stop offset=".45" stopColor="#ffbb13" /><stop offset="1" stopColor="#e09b00" /></linearGradient>
      </defs>
      <path d="M5 8.6c5.6-2.9 10.6-1.9 15.6 1 .7.4 1 .9 1 1.6v12.9c0 1.7-.5 2.1-2 1.3-5-2.7-9.8-3.5-14.6-1.2-.9.4-1.2-.1-1.2-1.1V9.7c0-.5.4-1 1.2-1.1z" fill="url(#w7paneRed)" />
      <path d="M27 9.9c5-2.9 10-3.9 15.6-1 .8.1 1.2.6 1.2 1.1v13.4c0 1-.3 1.5-1.2 1.1-4.8-2.3-9.6-1.5-14.6 1.2-1.5.8-2 .4-2-1.3V11.5c0-.7.3-1.2 1-1.6z" fill="url(#w7paneGreen)" />
      <path d="M5 27.4c4.8-2.3 9.6-1.5 14.6 1.2 1.5.8 2 .4 2 2.1v11.2c0 1-.3 1.5-1.2 1.1-4.8-2.3-9.6-1.5-14.2.9-.8.4-1.2 0-1.2-1V28.5c0-.5.4-1 0-1.1z" fill="url(#w7paneBlue)" />
      <path d="M27 28.6c5-2.7 9.8-3.5 14.6-1.2.9.4 1.2.6 1.2 1.1v9.6c0 1-.4 1.4-1.2 1-4.6-2.4-9.4-3.2-14.2-.9-.9.4-1.2.1-1.2-1.1V30c0-1.7.3-2.1.8-1.4z" fill="url(#w7paneYellow)" />
    </>
  ),
  shield: () => (
    <>
      <path d="M24 3l17 6v13c0 11-8 19-17 23C15 41 7 33 7 22V9z" fill="url(#iBlue)" stroke="#0a3a8c" />
      <path d="M24 3l17 6v13c0 11-8 19-17 23z" fill="url(#iYellow)" opacity=".9" />
      <path d="M24 3l17 6v13c0 11-8 19-17 23V3z" fill="#fff" opacity=".1" />
      <path d="M24 3L7 9v13c0 11 8 19 17 23z" fill="url(#iBlue)" />
    </>
  ),
  error: () => (
    <>
      <circle cx="24" cy="24" r="20" fill="url(#iRed)" stroke="#8a1008" strokeWidth="1.500" />
      <path d="M16 16l16 16M32 16L16 32" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  warn: () => (
    <>
      <path d="M24 4L46 42H2z" fill="url(#iYellow)" stroke="#a07a00" strokeWidth="1.500" strokeLinejoin="round" />
      <path d="M24 17v13" stroke="#333" strokeWidth="4" strokeLinecap="round" /><circle cx="24" cy="36" r="2.500" fill="#333" />
    </>
  ),
  info: () => (
    <>
      <circle cx="24" cy="24" r="20" fill="url(#iSphere)" stroke="#0a3a8c" strokeWidth="1.500" />
      <circle cx="24" cy="14" r="3" fill="#fff" /><path d="M24 21v15" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  question: () => (
    <>
      <circle cx="24" cy="24" r="20" fill="url(#iSphere)" stroke="#0a3a8c" strokeWidth="1.500" />
      <text x="24" y="34" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#fff" fontFamily="Segoe UI,Arial">?</text>
    </>
  ),
  run: () => (
    <>
      <rect x="4" y="9" width="40" height="30" rx="3" fill="url(#iPaper)" stroke="#5f6b79" />
      <rect x="4" y="9" width="40" height="7" rx="3" fill="url(#iBlue)" />
      <path d="M12 26l6 4-6 4M22 34h10" stroke="#234" strokeWidth="2.500" fill="none" />
    </>
  ),
  shutdown: () => (
    <>
      <circle cx="24" cy="24" r="20" fill="url(#iRed)" stroke="#8a1008" />
      <path d="M24 10v14M15 16a13 13 0 1 0 18 0" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  programs: () => (
    <Tile a="#d9e9fb" b="#6c9ad6"><circle cx="19" cy="26" r="10" fill="url(#iSilver)" stroke="#456" /><rect x="22" y="12" width="16" height="18" fill="url(#iOrange)" stroke="#864" /></Tile>
  ),
  system: () => <Tile a="#cfe0f7" b="#5d86c4"><rect x="10" y="12" width="28" height="19" rx="2" fill="url(#iScreen)" stroke="#fff" /><rect x="18" y="34" width="12" height="4" fill="#fff" /><path d="M15 17l6 5-6 5" stroke="#fff" strokeWidth="2" fill="none" /></Tile>,
  security: () => <Tile a="#bfeaa9" b="#3a9a3a"><path d="M24 9l12 4v9c0 8-5 13-12 16-7-3-12-8-12-16v-9z" fill="#fff" stroke="#164" /><path d="M18 24l4 4 8-9" stroke="#2a9a3a" strokeWidth="3" fill="none" /></Tile>,
  netcat: () => <Tile a="#bfe2ff" b="#2f86e0"><circle cx="24" cy="24" r="13" fill="none" stroke="#fff" strokeWidth="2.500" /><ellipse cx="24" cy="24" rx="6" ry="13" fill="none" stroke="#fff" strokeWidth="2" /><path d="M11 24h26M13 17h22M13 31h22" stroke="#fff" strokeWidth="1.500" /></Tile>,
  hardware: () => <Tile a="#e3e8ee" b="#8b97a6"><rect x="10" y="22" width="28" height="12" rx="2" fill="#fff" stroke="#456" /><rect x="15" y="12" width="18" height="10" fill="#cfe9ff" stroke="#456" /><path d="M10 38h28" stroke="#456" strokeWidth="2" /></Tile>,
  users: () => <Tile a="#d4e6ff" b="#5b8fd6"><circle cx="19" cy="18" r="6" fill="#fff" /><path d="M8 38c0-8 5-11 11-11s11 3 11 11z" fill="#fff" /><circle cx="33" cy="20" r="5" fill="#ffe3a0" /><path d="M26 38c0-6 3-9 7-9s8 3 8 9z" fill="#ffe3a0" /></Tile>,
  appearance: () => <Tile a="#cbe5ff" b="#4d8fe0"><rect x="9" y="11" width="30" height="20" rx="2" fill="#fff" stroke="#145" /><rect x="11" y="13" width="26" height="16" fill="url(#iScreen)" /><circle cx="20" cy="38" r="3" fill="#f33" /><circle cx="27" cy="38" r="3" fill="#fc0" /><circle cx="34" cy="38" r="3" fill="#3c3" /></Tile>,
  clock: () => <Tile a="#e8f1ff" b="#8fb0dd"><circle cx="24" cy="24" r="14" fill="#fff" stroke="#345" strokeWidth="2" /><path d="M24 14v10l7 4" stroke="#345" strokeWidth="2.500" fill="none" /></Tile>,
  ease: () => <Tile a="#bfe0ff" b="#2f78d0"><circle cx="24" cy="24" r="14" fill="none" stroke="#fff" strokeWidth="2.500" /><circle cx="24" cy="15" r="3" fill="#fff" /><path d="M14 21h20M24 21v7l-5 7M24 28l5 7" stroke="#fff" strokeWidth="2.500" fill="none" /></Tile>,
  firewall: () => <Tile a="#ffbfa0" b="#d2501e"><path d="M8 12h32v8H8zM8 22h14v8H8zM24 22h16v8H24zM8 32h32v6H8z" fill="#fff" stroke="#7a2a0a" /></Tile>,
  update: () => <Tile a="#bff0a9" b="#3a9a3a"><path d="M13 22a12 12 0 0 1 21-6l3-3v10H27l4-4a7 7 0 0 0-13 3zM35 26a12 12 0 0 1-21 6l-3 3V25h10l-4 4a7 7 0 0 0 13-3z" fill="#fff" /></Tile>,
  power: () => <Tile a="#d9f2c6" b="#5aa83a"><rect x="9" y="17" width="26" height="15" rx="2" fill="#fff" stroke="#264" /><rect x="35" y="21" width="4" height="7" fill="#264" /><rect x="12" y="20" width="14" height="9" fill="#4cc84c" /></Tile>,
  sound: () => <Tile a="#e0e8f0" b="#8fa0b4"><path d="M10 19h7l9-7v24l-9-7h-7z" fill="#fff" stroke="#345" /><path d="M31 18a9 9 0 0 1 0 12M35 14a15 15 0 0 1 0 20" stroke="#345" strokeWidth="2" fill="none" /></Tile>,
  display: () => <Tile a="#c8e0fb" b="#4d86d2"><rect x="8" y="11" width="32" height="22" rx="2" fill="#fff" stroke="#145" /><rect x="11" y="14" width="26" height="16" fill="url(#iScreen)" /><rect x="19" y="35" width="10" height="4" fill="#fff" /></Tile>,
  mouse: () => <Tile a="#e8edf3" b="#8fa0b4"><rect x="14" y="8" width="20" height="32" rx="10" fill="#fff" stroke="#345" strokeWidth="1.500" /><path d="M24 8v14M14 22h20" stroke="#345" /></Tile>,
  keyboard: () => <Tile a="#e8edf3" b="#8fa0b4"><rect x="6" y="14" width="36" height="20" rx="2" fill="#fff" stroke="#345" />{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={9 + i * 6.500} y="17" width="4.500" height="4" fill="#567" />)}{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={10 + i * 6.500} y="23" width="4.500" height="4" fill="#567" />)}<rect x="14" y="29" width="20" height="3" fill="#567" /></Tile>,
  fonts: () => <Tile a="#fff8d8" b="#e6c24a"><text x="24" y="35" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#1b3a8c" fontFamily="Georgia,serif">A</text></Tile>,
  region: () => <Tile a="#cfe8ff" b="#4d9ae0"><circle cx="24" cy="24" r="14" fill="#fff" stroke="#145" /><path d="M24 10c-6 6-6 22 0 28M24 10c6 6 6 22 0 28M10 24h28" stroke="#2f78d0" strokeWidth="1.500" fill="none" /></Tile>,
  devices: () => <Tile a="#e3e8ee" b="#8b97a6"><rect x="8" y="24" width="20" height="12" rx="2" fill="#fff" stroke="#345" /><rect x="12" y="14" width="12" height="10" fill="#fff" stroke="#345" /><rect x="30" y="16" width="10" height="20" rx="2" fill="#2a2f38" stroke="#345" /></Tile>,
  printer: () => <Tile a="#e8edf3" b="#93a3b8"><rect x="14" y="8" width="20" height="12" fill="#fff" stroke="#345" /><rect x="8" y="20" width="32" height="14" rx="2" fill="#cfd7e0" stroke="#345" /><rect x="14" y="30" width="20" height="10" fill="#fff" stroke="#345" /></Tile>,
  defaultprogs: () => <Tile a="#d4e6ff" b="#5b8fd6"><circle cx="24" cy="24" r="14" fill="url(#iGreen)" stroke="#fff" strokeWidth="2" /><path d="M17 24l5 5 9-10" stroke="#fff" strokeWidth="4" fill="none" /></Tile>,
  folderopts: () => <Tile a="#fff2c0" b="#e6b73a"><path d="M8 14h12l3 3h17v19H8z" fill="url(#iFolderF)" stroke="#8a6a10" /><circle cx="34" cy="32" r="6" fill="#fff" stroke="#345" strokeWidth="2" /></Tile>,
  inetopts: () => <Tile a="#bfe2ff" b="#2f78d0"><circle cx="24" cy="24" r="14" fill="url(#iSphere)" stroke="#fff" /><text x="24" y="31" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#fff" fontFamily="Georgia">e</text></Tile>,
  actioncenter: () => <Tile a="#fff1b8" b="#e8a400"><path d="M12 38V10l22 6-10 4 10 4z" fill="#fff" stroke="#7a5a00" strokeWidth="1.500" /></Tile>,
  taskbar: () => <Tile a="#c6dcf6" b="#4d7ac0"><rect x="6" y="30" width="36" height="9" fill="#1b2d4a" /><circle cx="11" cy="34.500" r="3" fill="#6cf" /><rect x="8" y="10" width="22" height="16" fill="#fff" stroke="#145" /></Tile>,
  devmgr: () => <Tile a="#e3e8ee" b="#8b97a6"><rect x="10" y="9" width="28" height="14" fill="#fff" stroke="#345" /><path d="M14 23v6h-4v8h28v-8h-4v-6" fill="none" stroke="#345" strokeWidth="2" /></Tile>,
  star: () => <path d="M24 3l6.500 13.500 15 2-11 10.500 2.800 14.800L24 36.500 10.700 43.800 13.500 29 2.500 18.500l15-2z" fill="url(#iYellow)" stroke="#c28a00" />,
  setup: () => <Tile a="#e0ecfa" b="#7aa4d8"><rect x="12" y="10" width="24" height="28" fill="url(#iOrange)" stroke="#864" /><path d="M24 16v14M18 25l6 6 6-6" stroke="#fff" strokeWidth="3" fill="none" /></Tile>,
  /* ---- Windows 7 extra apps ---- */
  sticky2: () => <Tile a="#fff8b0" b="#e8c400"><rect x="10" y="10" width="28" height="28" fill="#fffbe0" stroke="#c8a800" /><path d="M18 18h12M18 24h12M18 30h8" stroke="#8a7a20" strokeWidth="2" /></Tile>,
  solitaire: () => <Tile a="#0a7a2a" b="#053f16"><rect x="12" y="10" width="18" height="26" rx="2" fill="#fff" stroke="#345" /><rect x="17" y="14" width="18" height="26" rx="2" fill="#fff" stroke="#345" /><path d="M26 22l5 5-5 5-5-5z" fill="#d00" /><path d="M22 22h8l-4 6z" fill="#d00" /></Tile>,
  spider: () => <Tile a="#0a7a2a" b="#053f16"><rect x="8" y="8" width="16" height="22" rx="2" fill="#fff" stroke="#345" /><rect x="20" y="14" width="16" height="22" rx="2" fill="#fff" stroke="#345" /><path d="M24 14l4 5h-8z" fill="#222" /><circle cx="28" cy="26" r="3" fill="#d00" /></Tile>,
  hearts: () => <Tile a="#0a7a2a" b="#053f16"><rect x="10" y="10" width="20" height="24" rx="2" fill="#fff" stroke="#345" /><path d="M25 20c0-4 7-4 7 1 0 4-7 8-7 8s-7-4-7-8c0-5 7-5 7-1z" fill="#d00" /></Tile>,
  gamecenter: () => <Tile a="#e8eef8" b="#8ba8d0"><circle cx="24" cy="21" r="11" fill="url(#iDark)" stroke="#345" strokeWidth="2" /><path d="M24 13v6M21 16h6M31 18h.1M31 24h.1" stroke="#fff" strokeWidth="2.500" strokeLinecap="round" /><path d="M14 32l-4 8h28l-4-8" fill="#c8d4e4" stroke="#345" /></Tile>,
  xps: () => <Paper g={<><text x="24" y="34" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2a6fd6" fontFamily="Segoe UI,Arial">XPS</text></>} />,
  journal: () => <Paper g={<><rect x="14" y="20" width="20" height="14" fill="#fff" stroke="#8aa" /><path d="M17 24h14M17 28h14" stroke="#c9d8e8" strokeWidth="1.500" /></>} />,
  stickyApp: () => <Tile a="#fff6a8" b="#e0b800"><rect x="10" y="10" width="28" height="28" fill="#fffbe8" /><path d="M14 34l4-4M18 40l10-10" stroke="#c8a800" /><path d="M18 18h12M18 24h12" stroke="#8a7a20" strokeWidth="2" /></Tile>,
  notepad2: () => <Paper g={<><path d="M15 20h18M15 26h18M15 32h12" stroke="#5a7aa8" strokeWidth="1.500" /></>} />,
  calc2: () => <Tile a="#f0f4fa" b="#a8b8cc"><rect x="10" y="8" width="28" height="32" rx="2" fill="#e8eef8" stroke="#345" /><rect x="14" y="12" width="20" height="7" fill="#dfe9c8" stroke="#567" />{[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => <rect key={r + "-" + c} x={14 + c * 7} y={22 + r * 4.500} width="5" height="3.500" fill="#8fa0b4" />))}</Tile>,
  find: () => <Tile a="#e8f4ff" b="#4d9ae0"><circle cx="21" cy="21" r="11" fill="none" stroke="#fff" strokeWidth="4" /><path d="M29 29l10 10" stroke="#fff" strokeWidth="5" strokeLinecap="round" /></Tile>,
  snipping2: () => <Tile a="#eef4ff" b="#7aa8e0"><path d="M14 10l10 20M34 10L24 30" stroke="#c03030" strokeWidth="3.500" /><circle cx="14" cy="34" r="5" fill="none" stroke="#c03030" strokeWidth="3" /><circle cx="34" cy="34" r="5" fill="none" stroke="#c03030" strokeWidth="3" /></Tile>,
  magnifier2: () => <Tile a="#f0f6ff" b="#8fb6e8"><circle cx="21" cy="21" r="12" fill="#e0f0ff" fillOpacity=".8" stroke="#fff" strokeWidth="4" /><path d="M30 30l11 11" stroke="#fff" strokeWidth="6" strokeLinecap="round" /></Tile>,
  wordpad2: () => <Paper g={<><text x="24" y="32" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#2a6fd6" fontFamily="Georgia,serif">W</text></>} />,
  speech: () => <Tile a="#dceafc" b="#5b8fd6"><rect x="10" y="12" width="16" height="22" rx="8" fill="#fff" stroke="#345" strokeWidth="2" /><path d="M18 38v-4M14 38h8" stroke="#345" strokeWidth="2" /><path d="M32 16a12 12 0 0 1 0 16M36 12a18 18 0 0 1 0 24" stroke="#fff" strokeWidth="2.500" fill="none" /></Tile>,
  trust: () => <Tile a="#d7ecff" b="#2f7bd0"><path d="M24 9l13 5v10c0 8-6 13-13 15-7-2-13-7-13-15V14z" fill="#fff" stroke="#145" /><path d="M18 24l4 4 8-9" stroke="#2a9a3a" strokeWidth="3.500" fill="none" /></Tile>,
  history: () => <Tile a="#eaf1fb" b="#7fa2d2"><path d="M12 24a12 12 0 1 0 4-9" fill="none" stroke="#fff" strokeWidth="3" /><path d="M8 8v8h8" fill="none" stroke="#fff" strokeWidth="3" /><path d="M24 17v8l6 3" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" /></Tile>,
  /* tray glyphs */
  speaker: () => <><path d="M6 18h9l11-9v30l-11-9H6z" fill="#e8eef6" stroke="#2c3a4c" strokeWidth="2" /><path d="M32 16a11 11 0 0 1 0 16M37 10a19 19 0 0 1 0 28" stroke="#e8eef6" strokeWidth="3" fill="none" strokeLinecap="round" /></>,
  speakerMute: () => <><path d="M6 18h9l11-9v30l-11-9H6z" fill="#e8eef6" stroke="#2c3a4c" strokeWidth="2" /><path d="M32 18l12 12M44 18L32 30" stroke="#ff5a4a" strokeWidth="4" strokeLinecap="round" /></>,
  netOn: () => <><rect x="6" y="8" width="26" height="19" rx="2" fill="#e8eef6" stroke="#2c3a4c" strokeWidth="2" /><rect x="9" y="11" width="20" height="13" fill="#4a9aef" /><rect x="22" y="22" width="20" height="15" rx="2" fill="#e8eef6" stroke="#2c3a4c" strokeWidth="2" /><rect x="25" y="25" width="14" height="9" fill="#4a9aef" /></>,
  netOff: () => <><rect x="6" y="8" width="26" height="19" rx="2" fill="#e8eef6" stroke="#2c3a4c" strokeWidth="2" /><rect x="9" y="11" width="20" height="13" fill="#4a9aef" /><circle cx="35" cy="34" r="10" fill="#e23a2a" stroke="#fff" strokeWidth="2" /><path d="M31 30l8 8M39 30l-8 8" stroke="#fff" strokeWidth="3" /></>,
  battery: () => <><rect x="4" y="14" width="34" height="20" rx="3" fill="#e8eef6" stroke="#2c3a4c" strokeWidth="2" /><rect x="38" y="20" width="5" height="8" fill="#2c3a4c" /><rect x="8" y="18" width="22" height="12" fill="#4cd04c" /></>,
  flagAC: () => <><path d="M10 42V8" stroke="#e8eef6" strokeWidth="4" /><path d="M12 9c8-4 14 4 24 0v18c-10 4-16-4-24 0z" fill="#e8eef6" stroke="#2c3a4c" strokeWidth="1.500" /></>,
  chevron: () => <path d="M10 32l14-14 14 14" stroke="#e8eef6" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  usb: () => <><path d="M24 4v36M24 40a4 4 0 1 0 0 .1M24 20l-10-6v8M24 28l10-6v-6" stroke="#e8eef6" strokeWidth="3" fill="none" /><circle cx="24" cy="42" r="4" fill="#e8eef6" /></>,
};

/**
 * Icons are drawn from the real Windows 7 artwork extracted from the system
 * DLLs (imageres.dll, shell32.dll, explorer.exe, the built-in games…) and
 * served from /icons. Anything without artwork falls back to the vector
 * glyphs below, so the shell never shows a blank icon.
 */
const ICON_BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Every icon name that has real Windows 7 artwork in public/icons. */
export const ART: ReadonlySet<string> = new Set([
  "actioncenter", "audio", "cd", "charmap", "cmd", "computer", "controlpanel", "defender", "docs", "downloads",
  "drive", "driveFixed", "dvd", "dvdmaker", "error", "exe", "explorer", "file", "folder", "folderOpen",
  "gadgets", "gamecenter", "games", "hearts", "help", "html", "ie", "image", "info", "iso", "journal", "magnifier",
  "mines", "music", "network", "networkConn", "notepad", "paint", "photos", "pictures", "printer", "programs",
  "question", "recorder", "recycle", "recycleFull", "reliability", "rtf", "run", "search", "share", "shield", "snip", "solitaire",
  "speech", "spider", "sticky", "taskmgr", "trust", "txt", "usb", "user", "users", "video", "videos", "warn", "wmp",
  "wordpad", "xps", "zip",
]);

export function Icon({ name, size = 32, className = "", style }: { name: string; size?: number; className?: string; style?: React.CSSProperties }) {
  const isLnk = name.endsWith("@lnk");
  const base = isLnk ? name.slice(0, -4) : name;
  if (ART.has(base)) {
    return (
      <span className={"ico art " + className} style={{ width: size, height: size, ...style }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ICON_BASE}/icons/${base}.png`}
          alt=""
          width={size}
          height={size}
          draggable={false}
          loading="eager"
          decoding="async"
        />
        {isLnk && <span className="lnk-arrow" />}
      </span>
    );
  }
  const glyph = G[base] || G.file;
  return (
    <svg className={"ico " + className} width={size} height={size} viewBox="0 0 48 48" style={style}>
      {glyph()}
      {isLnk && (
        <g>
          <rect x="2" y="30" width="16" height="16" rx="2" fill="#fff" stroke="#6b7684" />
          <path d="M6 42V36h-2l6-5 6 5h-2v6z" fill="#2a6fd6" transform="rotate(45 10 38) translate(0 0)" opacity="0" />
          <path d="M6 41l7-7M8 34h5v5" stroke="#2a6fd6" strokeWidth="2.500" fill="none" />
        </g>
      )}
    </svg>
  );
}

export function appIcon(app: string): string {
  return APPS[app]?.icon || "file";
}

const EXT_ICON: Record<string, string> = {
  txt: "txt", log: "txt", ini: "txt", cfg: "txt", bat: "txt", md: "txt", rtf: "rtf", doc: "rtf", docx: "rtf", html: "html", htm: "html",
  jpg: "image", jpeg: "image", png: "image", bmp: "image", gif: "image", svg: "image", mp3: "audio", wma: "audio", wav: "audio", m4a: "audio",
  wmv: "video", mp4: "video", avi: "video", webm: "video", mpg: "video", exe: "exe", dll: "exe", zip: "zip", ttf: "font", iso: "iso",
  xps: "xps", oxps: "xps", jnt: "journal",
};
const FOLDER_ICON: Record<string, string> = { docs: "docs", pics: "pictures", music: "music", vids: "videos", dl: "downloads", desk: "desktop", fav: "folderOpen", home: "user" };

export function nodeIcon(n: FsNode): string {
  if (n.type === "folder") return n.parent === null ? "drive" : FOLDER_ICON[n.id] || "folder";
  const e = extOf(n.name);
  if (e === "lnk") {
    try {
      const o = JSON.parse(n.content || "{}");
      if (o.t === "app") return appIcon(o.v) + "@lnk";
      if (o.t === "cp") return "controlpanel@lnk";
      if (o.t === "url") return "ie@lnk";
      return "folder@lnk";
    } catch {
      return "file@lnk";
    }
  }
  if (e === "exe" && n.content?.startsWith("app:")) {
    const a = n.content.slice(4);
    return APPS[a]?.icon || "exe";
  }
  return EXT_ICON[e] || "file";
}
