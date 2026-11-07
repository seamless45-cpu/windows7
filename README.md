# Windows 7 Ultimate — browser recreation

A faithful, interactive recreation of the Windows 7 Ultimate desktop that runs entirely in
the browser. Built with Next.js 16, React 19 and plain CSS — no canvas UI toolkit, no
screenshot images: every window frame, icon and Aero effect is drawn with CSS and inline SVG.

## Play it

**https://seamless45-cpu.github.io/windows7/** — the simulator is published as a static
site by the GitHub Pages workflow in `.github/workflows/pages.yml`.

## Running it locally

```bash
npm install
npm run dev         # http://localhost:3000
```

`npm run build` produces a static site in `out/` (the app is entirely client-side, so it
also runs from a plain file server: `npm start`). `npm run build:pages` builds the same
site with the `/windows7` base path used by GitHub Pages. No environment variables or
database are required.

### Publishing

Pages for this repository is a legacy *"deploy from the `main` branch"* site served from
`/`, so there is no `docs/` folder or CI artifact to publish into: the built site lives at
the repository root next to the source.

```bash
npm run build:pages   # builds with basePath=/windows7 and copies it to the repo root
git add -A && git commit -m "Publish site" && git push
```

`scripts/publish-pages.mjs` copies `out/index.html`, `out/_next/**` and `out/404.html` to the
repository root and writes `.nojekyll` (so GitHub serves the files verbatim instead of
running Jekyll, which used to turn this README into the site's `index.html`). Re-run it
whenever the app changes; the previous `_next` folder is replaced wholesale because Next.js
fingerprints those file names.

## Shell features

| Area | What works |
| --- | --- |
| Boot / logon | Boot screen, multi-user logon, Welcome, lock, sleep, restart, shutdown, off |
| Aero | Glass frames, transparency + colour intensity, Aero Peek (desktop button & thumbnails), Aero Snap (drag to edges / `Win`+arrows), Snap Assist, Aero Shake, Flip 3D (`Win`+`Tab`) |
| Taskbar | Pinned & grouped buttons, live thumbnails, jump lists with pinned/recent files and tasks, progress bars, keyboard navigation (`Win`+`T`), notification area, clock/calendar flyout, volume, network, battery, Action Center, taskbar on any edge, auto-hide, small icons |
| Start menu | Search across programs, files and Control Panel, pinned & recent programs, jump-list arrows, all-programs tree, power menu |
| Desktop | Icons with drag selection, rename, arrange/sort, system icons, recycle bin, gadgets, per-icon positions |
| Personalisation | Themes (Aero, Basic, Classic, High Contrast), wallpapers + own pictures, wallpaper slideshow, window colour, screensaver (bubbles, ribbons, photos), cursors, pointer trails, DPI scaling |
| Keyboard | `Win`/`Ctrl`+`Esc` Start, `Win`+`D`, `Win`+`E`, `Win`+`R`, `Win`+`L`, `Win`+`P`/`X` Mobility Center, `Win`+`T`, `Win`+`Tab` Flip 3D, `Win`+`Home` shake, `Alt`+`Tab`, `Alt`+`F4`, snap arrows, F11 |

## Applications

**Accessories** — Notepad, WordPad, Calculator (standard + scientific, history), Paint,
Character Map, Sticky Notes (old and new multi-note manager), Magnifier, Snipping Tool,
Sound Recorder, Windows Journal (ink notes, pen/highlighter/eraser, pages).
**Media** — Windows Media Player, Photo Viewer, DVD Maker, XPS Viewer.
**Games** — Solitaire, Spider Solitaire, Hearts (all fully playable with bots, scoring and
difficulty/deal options), Minesweeper, and the Games Explorer.
**System** — Command Prompt, Task Manager, Control Panel (30+ pages incl. Reliability
Monitor, Mobility Center, Aero options, Windows Anytime Upgrade), Explorer with Libraries,
Search, Recycle Bin, Device Manager, Windows Update, Action Center.
**Network / Other** — Internet Explorer, Speech Recognition (microphone engine where the
browser supports it, otherwise type-a-command mode), Help and Support.

Everything you create — files, notes, wallpapers, journal pages, settings, icon positions,
game best scores — is stored in `localStorage`. *Control Panel → Action Center → Reset this
simulated PC* restores the original system.

## Layout

```
src/app/            layout, global CSS (win7.css shell, win7-apps.css apps)
src/win7/store.ts   single external store: settings, virtual file system, windows, power
src/win7/*.tsx      shell (Desktop, Window, Taskbar, StartMenu, dialogs, aero, gadgets)
src/win7/apps/      application implementations
src/win7/data.ts    wallpapers, sample pictures, seeded file system
```
