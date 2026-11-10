#!/usr/bin/env node
/**
 * Generates the PWA icon set from one vector source.
 *
 * The Windows 7 mark is drawn here rather than rasterised from a screenshot so
 * the maskable variant can keep its 2x2 panes inside the safe zone: a maskable
 * icon may be cropped to a circle, and Android expects the artwork to sit inside
 * the middle 80 %.
 *
 * Run with `node scripts/make-icons.mjs` (sharp ships with Next.js).
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public/icons/pwa");
await mkdir(outDir, { recursive: true });

const PANES = { red: "#f65314", green: "#7cbb00", blue: "#00a1f1", yellow: "#ffbb00" };

/**
 * @param {object} o
 * @param {boolean} o.maskable  keep the mark inside the 80 % safe zone
 * @param {string}  o.bg        background; "none" for transparency
 */
function svg({ maskable = false, bg = "none", size = 512, radius = 0.18 } = {}) {
  // artwork occupies 62 % of the canvas (maskable) or 72 % (regular)
  const art = maskable ? size * 0.62 : size * 0.72;
  const gap = art * 0.055;           // the white cross gap between panes
  const pane = (art - gap) / 2;
  const x0 = (size - art) / 2;
  const y0 = (size - art) / 2;
  const r = pane * radius;           // outer-corner radius only
  // A single gloss pass across all four panes, so the highlight lines up the
  // way it does in the real mark (bright at the top edge, dark at the bottom).
  const gloss = `
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".42"/>
      <stop offset=".42" stop-color="#fff" stop-opacity=".14"/>
      <stop offset=".5" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".16"/>
    </linearGradient>`;
  const quad = (x, y, w, h, fill, corners) => {
    // corners = [tl, tr, br, bl] radii as flags
    const [tl, tr, br, bl] = corners;
    return `<path d="M${x + (tl ? r : 0)} ${y}
      H${x + w - (tr ? r : 0)} ${tr ? `A${r} ${r} 0 0 1 ${x + w} ${y + r}` : ""}
      V${y + h - (br ? r : 0)} ${br ? `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` : ""}
      H${x + (bl ? r : 0)} ${bl ? `A${r} ${r} 0 0 1 ${x} ${y + h - r}` : ""}
      V${y + (tl ? r : 0)} ${tl ? `A${r} ${r} 0 0 1 ${x + r} ${y}` : ""} Z" fill="${fill}"/>`;
  };
  const px = [x0, x0 + pane + gap];
  const py = [y0, y0 + pane + gap];
  const panes = [
    quad(px[0], py[0], pane, pane, PANES.red, [1, 0, 0, 0]),
    quad(px[1], py[0], pane, pane, PANES.green, [0, 1, 0, 0]),
    quad(px[0], py[1], pane, pane, PANES.blue, [0, 0, 0, 1]),
    quad(px[1], py[1], pane, pane, PANES.yellow, [0, 0, 1, 0]),
  ].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${gloss}
      <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0d2a4d"/><stop offset="1" stop-color="#061627"/>
      </linearGradient>
    </defs>
    ${bg === "none" ? "" : `<rect width="${size}" height="${size}" fill="url(#plate)"/>`}
    <g>${panes}</g>
    <g>${panes.replace(/fill="[^"]*"/g, 'fill="url(#g)"')}</g>
  </svg>`;
}

const targets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "maskable-192.png", size: 192, maskable: true },
  { file: "maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: true },
];

for (const t of targets) {
  const png = await sharp(Buffer.from(svg({ maskable: t.maskable, size: t.size })))
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(outDir, t.file), png);
  console.log(`${t.file}  ${t.size}x${t.size}  ${png.length} bytes`);
}

// favicon: multi-size ICO is awkward to write by hand, so ship a 32 px PNG plus
// the .svg the browser can use when it prefers vectors.
const fav = await sharp(Buffer.from(svg({ size: 64 }))).png().toBuffer();
await writeFile(path.join(root, "public/icons/pwa/favicon-32.png"), fav);
await writeFile(path.join(root, "app-icon.svg"), svg({ size: 512 }));
console.log("favicon-32.png + app-icon.svg");
