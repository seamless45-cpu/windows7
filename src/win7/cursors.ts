/**
 * The Windows 7 Aero pointer set, drawn as SVG.
 *
 * Windows 7's Aero cursors are 32×32 (48×48 at 200 % DPI) images with an
 * 8-bit alpha channel: a white pointer with a soft black outline, a one pixel
 * inner highlight and a drop shadow. They are *not* the Windows XP/Classic
 * black-and-white arrows, so the whole set is drawn here rather than reusing
 * the browser's `auto` cursor, and each one carries its real hot spot.
 */
const enc = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

const SHADOW = `<filter id="s" x="-30%" y="-30%" width="180%" height="180%"><feDropShadow dx="1" dy="1" stdDeviation="1.1" flood-color="#000" flood-opacity=".45"/></filter>`;

/** The classic Aero arrow body, drawn pointing at (6,4). */
const ARROW = `M6 4 L6 25 L11.2 20.3 L15 29.6 L18.6 28.1 L14.9 19 L21.6 19 Z`;

const arrow = (extra = "", w = 32, h = 32) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 32 32"><defs>${SHADOW}</defs><g filter="url(#s)"><path d="${ARROW}" fill="#fff" stroke="#101010" stroke-width="1.6" stroke-linejoin="round"/><path d="${ARROW}" fill="none" stroke="#fff" stroke-width=".7" stroke-linejoin="round" opacity=".95"/></g>${extra}</svg>`;

const RING = `<circle cx="24" cy="24" r="6.4" fill="none" stroke="#2f6fb4" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="7 33" transform="rotate(-40 24 24)"/><circle cx="24" cy="24" r="6.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="7 33" stroke-dashoffset=".8" transform="rotate(-40 24 24)" opacity=".6"/>`;

const help = `<g><circle cx="23" cy="23" r="6.6" fill="#fff" stroke="#101010" stroke-width="1.4"/><text x="23" y="27.2" font-family="Segoe UI,Arial" font-size="9.5" font-weight="700" text-anchor="middle" fill="#1a4d8f">?</text></g>`;
const busy = `<g>${RING}<path d="M24 24l3.4 8.4-4.2-1.6z" fill="#101010"/></g>`;

const res = (d: string, rotate = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs>${SHADOW}</defs><g filter="url(#s)" transform="rotate(${rotate} 16 16)">${d}</g></svg>`;

const WE = `<path d="M4 16l5-5v3.4h14V11l5 5-5 5v-3.4H9V21z" fill="#fff" stroke="#101010" stroke-width="1.4" stroke-linejoin="round"/>`;
const NS = WE;

/** name → [css, hotspot x, y] */
export const CURSORS: Record<string, string> = {
  // Normal Select
  default: `${enc(arrow())} 6 4, default`,
  // Link Select (hand)
  pointer: `${enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs>${SHADOW}</defs><g filter="url(#s)"><path d="M9 13.5c0-1.2.9-2.1 2.1-2.1 1.1 0 2 .9 2 2.1V6.6c0-1.2.9-2.1 2.1-2.1s2.1.9 2.1 2.1v6.5-1.4c0-1.2.9-2.1 2.1-2.1s2.1.9 2.1 2.1v1.9-.8c0-1.1.9-2 2-2s2 .9 2 2v8.4c0 4.6-2.6 7.8-8 7.8-4.6 0-6.4-1.9-8.6-6.1l-1.9-3.4c-.5-1 .1-2.2 1.2-2.4.8-.2 1.6.2 2 .9l1.6 2.6z" fill="#fff" stroke="#101010" stroke-width="1.4" stroke-linejoin="round"/></g></svg>`)} 11 4, pointer`,
  // Help Select
  help: `${enc(arrow(help, 34, 34))} 6 4, help`,
  // Working in Background / Busy
  progress: `${enc(arrow(busy, 34, 34))} 6 4, progress`,
  busy: `${enc(arrow(busy, 34, 34))} 6 4, wait`,
  // Text Select
  text: `${enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs>${SHADOW}</defs><g filter="url(#s)"><path d="M13 5h6M16 5v22M13 27h6" stroke="#101010" stroke-width="3" stroke-linecap="round"/><path d="M13 5h6M16 5v22M13 27h6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></g></svg>`)} 16 16, text`,
  // Precision Select
  crosshair: `${enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g stroke="#101010" stroke-width="3.4" stroke-linecap="round"><path d="M16 4v8M16 20v8M4 16h8M20 16h8"/></g><g stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M16 4v8M16 20v8M4 16h8M20 16h8"/></g><circle cx="16" cy="16" r="1.4" fill="#fff" stroke="#101010"/></svg>`)} 16 16, crosshair`,
  // Unavailable
  notAllowed: `${enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs>${SHADOW}</defs><g filter="url(#s)"><path d="${ARROW}" fill="#fff" stroke="#101010" stroke-width="1.6" stroke-linejoin="round"/></g><circle cx="22" cy="23" r="8" fill="#fff" stroke="#b01818" stroke-width="2.6"/><path d="M16.5 17.5l11 11" stroke="#b01818" stroke-width="2.6" stroke-linecap="round"/></svg>`)} 6 4, not-allowed`,
  // Move
  move: `${enc(res(`<path d="M16 3l4 4h-2.6v7.4H25V11.4l4 4.6-4 4.6v-2.6h-7.4V25h2.6l-4.6 4-4.6-4h2.6v-7.4H5.4V20L1 16l4.4-4v2.6h7.4V7H10z" fill="#fff" stroke="#101010" stroke-width="1.3" stroke-linejoin="round"/>`))} 16 16, move`,
  ew: `${enc(res(WE))} 16 16, ew-resize`,
  ns: `${enc(res(NS, 90))} 16 16, ns-resize`,
  nwse: `${enc(res(WE, -45))} 16 16, nwse-resize`,
  nesw: `${enc(res(WE, 45))} 16 16, nesw-resize`,
  // Pen
  pen: `${enc(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs>${SHADOW}</defs><g filter="url(#s)"><path d="M22 4l6 6-16 16-7.5 1.5L6 20z" fill="#fff" stroke="#101010" stroke-width="1.5" stroke-linejoin="round"/><path d="M20 6l6 6" stroke="#101010" stroke-width="1.2"/><path d="M6 20l6 6" stroke="#101010" stroke-width="1.1"/></g></svg>`)} 5 27, crosshair`,
};

/** Wrap a cursor definition so browsers that reject SVG fall back sanely. */
export function cursorCss(name: keyof typeof CURSORS | string, kind = "auto") {
  const c = CURSORS[name] || CURSORS.default;
  return `${c.split(",").slice(0, 2).join(",")}, ${kind}`;
}

/** The whole `cursor:` stylesheet for the desktop, injected once. */
export const CURSOR_CSS = `
.w7, .w7 * { cursor: ${CURSORS.default}; }
.w7 a, .w7 .link, .w7 [role="link"] { cursor: ${CURSORS.pointer}; }
.w7 input[type="text"], .w7 input[type="password"], .w7 input[type="number"], .w7 input[type="search"],
.w7 input:not([type]), .w7 textarea, .w7 [contenteditable="true"] { cursor: ${CURSORS.text}; }
.w7 input[type="range"] { cursor: ${CURSORS.ew}; }
.w7 .rz-n, .w7 .rz-s { cursor: ${CURSORS.ns}; }
.w7 .rz-e, .w7 .rz-w { cursor: ${CURSORS.ew}; }
.w7 .rz-ne, .w7 .rz-sw { cursor: ${CURSORS.nesw}; }
.w7 .rz-nw, .w7 .rz-se { cursor: ${CURSORS.nwse}; }
.w7 .drag-handle, .w7 .win-drag, .w7 .gadget-grip { cursor: ${CURSORS.move}; }
.w7 [disabled], .w7 .cb[disabled], .w7 .disabled { cursor: ${CURSORS.notAllowed}; }
.w7.busy, .w7.busy * { cursor: ${CURSORS.progress} !important; }
.w7.pen, .w7.pen * { cursor: ${CURSORS.pen} !important; }
.w7 .helpable { cursor: ${CURSORS.help}; }
`;
