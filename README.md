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

`scripts/pages-workflow.yml` is a ready-made GitHub Actions workflow for a fully automatic
deploy (build + `actions/deploy-pages`); copy it to `.github/workflows/pages.yml` and set
Pages → Source to *GitHub Actions* if you prefer that to the manual publish step below.

`scripts/publish-pages.mjs` copies `out/index.html`, `out/_next/**` and `out/404.html` to the
repository root and writes `.nojekyll` (so GitHub serves the files verbatim instead of
running Jekyll, which used to turn this README into the site's `index.html`). Re-run it
whenever the app changes; the previous `_next` folder is replaced wholesale because Next.js
fingerprints those file names.

## Artwork, sounds and motion

The shell does not depend on screenshot images or a canvas toolkit — but the **icons and
sounds are the real Windows 7 ones**:

* **Icons** — `public/icons/*.png` were extracted from the actual Windows 7 system
  resources (`imageres.dll`, `shell32.dll`, `explorer.exe`, `mspaint.exe`, `notepad.exe`,
  `wordpad.exe`, `iexplore.exe`, `wmplayer.exe`, the built-in games and Control Panel
  applets) and are served as 96 px lossless PNGs. `Icon` renders that artwork and falls back
  to the hand-drawn SVG glyphs for anything without a resource.
* **Sounds** — `public/sounds/<scheme>/*.mp3` were normalised from the original media
  (peak-normalised with silence trimmed, so the four-second Startup chime is as audible as the
  logon sound) and are all **fourteen sound schemes Windows 7 shipped with** (Windows Default, Afternoon, Calligraphy, Characters, Cityscape, Delta,
  Festival, Garden, Heritage, Landscape, Quirky, Raga, Savannah, Sonata) plus *No Sounds*.
  Each scheme covers the full list of program events — logon/logoff, startup/shutdown,
  minimize/restore, Default Beep, Ding, Error, Exclamation, Notification, Notify, Recycle,
  Menu Command, Critical Stop, UAC, Print Complete, Device Connect/Disconnect/Fail, Battery
  Low/Critical, Feed Discovered, Information Bar, Pop-up Blocked and Navigation Start. The
  clips are transcoded from the original `.wav` files by `scripts/build-sounds.py` and
  decoded through Web Audio, so the volume slider, mute, the selected scheme and the
  per-scheme missing events all behave like the real thing. Control Panel → Sound lists the
  schemes and every program event with a **Test** button, and each Windows theme switches to
  its matching scheme.
* **Motion** — window open/close, minimize (to its own taskbar button), restore, maximize,
  Aero Snap/restore, Aero Shake, the drag-to-snap overlay, Start menu (including the shaded
  search pane), jump lists, taskbar thumbnails, tray flyouts, balloon tips (in and out),
  Alt+Tab, modal dialogs and context menus are animated with the timings Windows 7 uses
  (open ≈225 ms, close ≈300 ms, min/restore ≈150–175 ms, all eased out). They respect
  *Animate windows when minimising and maximising*, `prefers-reduced-motion`, and
  dragging/resizing a window never lags.
* **Window frames** — Aero rounds only the two top corners (6 px) and leaves the bottom edge
  square; maximised windows lose the rounding, and the rounding animates during the
  maximise/restore transition the way DWM does.
* **Boot screen** — the real Windows 7 startup animation: black screen, "Starting Windows"
  and the copyright line, then the four balls of light (red, green, blue, yellow) spiral in
  and melt into the four panes of the Windows flag, which settles and pulses. It follows the
  real 105-frame / 15 fps / 200×200 timeline, with the first four seconds playing once and
  the last three looping.
* **Kernel** — the boot really runs: `src/win7/kernel.ts` models the Windows 7 boot
  sequence (firmware → bootmgr → winload → ntoskrnl Phase 0/1 → smss → wininit → services →
  winlogon) with the boot-start and system drivers, their service groups and start types, and
  the services `services.exe` starts. The boot screen prints the stage the kernel is on, a
  driver can be made to fail and produce a genuine bug check (`0x0000007B` etc.) with the
  classic blue screen and crash-dump progress. The kernel also writes the **Windows Event
  Log**, which Event Viewer reads back.
* **Custom photo and video backgrounds** — Control Panel → Personalization → Desktop
  Background accepts any photo or video (JPG/PNG/GIF/WebP/MP4/WebM/MOV), stored locally in
  IndexedDB. Videos autoplay and loop, and their audio can be switched on or off. The picture
  position offers **Fill, Fit, Center and Tile — never Stretch**, because stretching a photo
  or video destroys its clarity.
* **More programs** — Event Viewer, Disk Cleanup, Registry Editor (edits the real settings
  behind the shell: wallpaper, position, theme, sounds, Explorer options, UAC), System
  Diagnostics (boot log, drivers, services, bug checks) and Windows Features (optional
  features plus a directory of everything this PC can do, with shortcuts).
* **Games** — Solitaire, Spider Solitaire, Hearts, Minesweeper, FreeCell (with Microsoft's
  numbered deals and supermove limit), Mahjong Titans (144-tile turtle layout), Chess Titans
  (a real move generator with castling, en passant, promotion and a searching opponent) and
  Purble Place (Comfy Cakes, Purble Shop, Purble Pairs), all with the artwork from the real
  game resources.

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
