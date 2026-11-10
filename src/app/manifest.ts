/**
 * The PWA manifest.
 *
 * Next.js serves this at /manifest.webmanifest from the app router, which keeps
 * the URL stable and lets `start_url` / `scope` follow the base path the site is
 * published under (local `/`, GitHub Pages `/windows7/`).
 */
import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Windows 7 Ultimate",
    short_name: "Windows 7",
    description:
      "A browser-based recreation of the Windows 7 Ultimate desktop: Aero, Explorer, the bundled programs and games.",
    // Installed apps open on the desktop, not on a marketing page.
    start_url: `${BASE}/?source=pwa`,
    scope: `${BASE}/`,
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "fullscreen"],
    orientation: "any",
    background_color: "#000000",
    theme_color: "#0a2c5c",
    categories: ["productivity", "utilities", "entertainment"],
    lang: "en",
    dir: "ltr",
    prefer_related_applications: false,
    icons: [
      { src: `${BASE}/icons/pwa/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE}/icons/pwa/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${BASE}/icons/pwa/maskable-192.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `${BASE}/icons/pwa/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Windows 7 shipped pinned Start-menu tiles, Jump Lists and toast balloons;
    // the installed app exposes the same entry points to the OS.
    shortcuts: [
      {
        name: "Notepad",
        short_name: "Notepad",
        url: `${BASE}/?app=notepad`,
        icons: [{ src: `${BASE}/icons/pwa/icon-192.png`, sizes: "192x192" }],
      },
      {
        name: "Paint",
        short_name: "Paint",
        url: `${BASE}/?app=paint`,
        icons: [{ src: `${BASE}/icons/pwa/icon-192.png`, sizes: "192x192" }],
      },
      {
        name: "Command Prompt",
        short_name: "cmd",
        url: `${BASE}/?app=cmd`,
        icons: [{ src: `${BASE}/icons/pwa/icon-192.png`, sizes: "192x192" }],
      },
      {
        name: "Minesweeper",
        short_name: "Minesweeper",
        url: `${BASE}/?app=minesweeper`,
        icons: [{ src: `${BASE}/icons/pwa/icon-192.png`, sizes: "192x192" }],
      },
    ],
    screenshots: [],
  };
}
