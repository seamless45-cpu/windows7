# Windows 7 behavior references

This note records the behavior used for the shared-shell and Calculator accuracy pass.
It is deliberately about observable behavior, not modern Windows conventions.

## Shell and taskbar

- **Win+M** minimizes the current windows; **Win+Shift+M** restores that set. It must not
  restore windows that were already minimized. **Win+D** toggles Show Desktop using the
  same remembered set.
- **Win+1…0** addresses the first ten taskbar buttons. The normal form launches or switches
  (and toggles a single active window), Shift starts another instance, Ctrl cycles that
  program's windows, and Alt opens its Jump List. Pinned programs precede unpinned running
  programs, matching the rendered taskbar.
- **Win+Space** previews only while held. **Win+T** and **Win+Shift+T** move through the
  taskbar; **Win+B** targets the notification area.
- **Alt+Space** opens the active window's system menu. Restore/Move/Size/Minimize/Maximize
  are enabled according to the current frame state. Move and Size accept arrows, Enter to
  commit, and Escape to restore the original geometry.
- **Alt+Esc** cycles in window order, **Ctrl+Shift+Esc** opens Task Manager, and **Win+U**
  opens Ease of Access Center.

References:

- Microsoft Q&A, [14 Best Windows 7 Keyboard Shortcuts](https://learn.microsoft.com/en-us/answers/questions/9df7d646-efa4-4525-963d-7c265ad735e8/14-best-windows-7-keyboard-shortcuts)
- Microsoft Support, [Keyboard shortcuts in Windows](https://support.microsoft.com/en-us/windows/keyboard-shortcuts-in-windows-dcc61a57-8ff0-cffe-9796-cb9706c75eec)
  (current page; general window/menu commands are unchanged)
- Contemporary reproduction of Microsoft's Windows 7 shortcut table,
  [List of Windows 7 Keyboard Shortcuts](https://conetrix.com/blog/list-of-windows-7-keyboard-shortcuts)

## Explorer and desktop

Implemented accelerators include **Ctrl+N** (duplicate window), **Ctrl+W** (close),
**Ctrl+Shift+N** (new folder), **Alt+Left/Right/Up** (history/parent), **Alt+D/F4**
(address), **Ctrl+E/Ctrl+F/F3** (search), **Alt+P** (preview), **Alt+Enter** (properties),
**Shift+F10/Application key** (selected item's menu), **F2**, **F5**, **Delete**,
**Shift+Delete**, **Ctrl+A/C/X/V/Z**, type-ahead selection, and Ctrl+wheel view sizing.
These commands act on the same virtual file system and selection as their menu equivalents.

References:

- Microsoft Q&A, [Key bindings and microphones](https://learn.microsoft.com/en-us/answers/questions/11c8e88a-6769-43c2-89e7-866f6ce6edcd/key-bindings-and-microphones)
- Contemporary Windows 7 Explorer shortcut reference,
  [Windows Explorer keyboard shortcuts](https://what-when-how.com/windows-7/windows-explorer-keyboard-shortcuts-windows-7/)

## Calculator

Standard view uses immediate, left-to-right execution: `2 + 3 × 4 =` is **20**, while
Scientific view applies operator precedence and returns **14**. Additive percentages use a
percentage of the left operand (`200 + 10% = 220`); multiplicative percentages use
hundredths (`200 × 10% = 20`). Digit grouping changes only presentation and preserves an
in-progress decimal exactly.

The pure rules live in `src/win7/calcEngine.ts`; regression cases live in
`tests/calculator.test.mjs` (`npm run test:calc`).

Reference and cross-check:

- [Windows Calculator ignores order of operations](https://www.reddit.com/r/mildlyinfuriating/comments/5ddiyw/windows_calculator_ignores_order_of_operations/)
  (includes descriptions of the Windows 7 Standard/Scientific distinction)

## Shared menus and dialogs

Context menus support arrows, Home/End, Enter/Space, letter navigation, and Escape. Their
keyboard events stop at the menu so they cannot also activate the underlying application.
Message boxes accept Enter for the default action and Escape for the final cancel-style
action.

## Window management and embedding (accuracy pass)

- **Aero Snap has no assist.** After a window snaps to an edge, Windows 7 leaves the
  other half of the screen empty. Snap Assist — the grid of other windows offered to fill
  the gap — arrived with Windows 10, and quarter-screen corner snapping is also post-7, so
  neither is present. Dragging to the left/right edge or the top edge, and `Win`+arrows, are
  the Windows 7 gestures, and the snap outline drawn during the drag is the Windows 7 one.
  *Automatically arrange windows when dragged to the edge of the screen* (Control Panel →
  Aero options) is the real preference and switches the gesture off.
- **Dragging a maximised window restores it proportionally.** The grab point keeps its
  relative position inside the restored frame, so the caption stays under the pointer
  instead of the frame jumping.
- **The Start menu's right column** is, in order: user name, Documents, Pictures, Music,
  Games, then Computer, Control Panel, Devices and Printers, Default Programs, Help and
  Support. The Shut down arrow offers Switch user, Log off, Lock, Restart, Sleep —
  Hibernate replaces Sleep in that slot rather than appearing as a sixth item.
- **The desktop/shell `New` submenu** lists Folder, Shortcut, then the registered file types
  alphabetically (Bitmap image, Contact, Journal Document, Microsoft Word Document, Rich
  Text Document, Text Document), with Compressed (zipped) Folder last.

### Internet Explorer frames

The IE window renders real sites in an `<iframe>`, so two different limits apply:

1. **What the simulator may grant.** Remote pages get `allow-scripts allow-forms
   allow-popups allow-popups-to-escape-sandbox allow-modals allow-presentation
   allow-orientation-lock allow-pointer-lock allow-downloads
   allow-top-navigation-by-user-activation allow-same-origin`, plus a Permissions-Policy
   `allow` list for clipboard, fullscreen, geolocation, camera, microphone, autoplay,
   encrypted media, picture-in-picture, web-share and the motion/gamepad sensors. Pages from
   the virtual file system are injected with `srcdoc`; they are same-origin with the shell,
   so they deliberately do **not** receive `allow-same-origin` — their scripts run, but the
   document gets an opaque origin and cannot touch the desktop's storage.
2. **What the framed site allows.** `X-Frame-Options` and `Content-Security-Policy:
   frame-ancestors` are evaluated by the browser before the frame is drawn. No attribute,
   sandbox token or script on the embedding page can override them, so a site that refuses
   framing is not a bug the simulator can fix. The known-blocker list lives in
   `src/win7/embed.ts`; those hosts get a page that names the actual cause and offers the two
   real ways out (open in a real browser tab, or retry the frame). Everything else gets the
   IE 8-era information bar with the same "open in a new tab" link.

Both sandbox policies and the blocker list are asserted in `tests/accuracy.test.mjs`
(`npm run test:accuracy`).

References:

- MakeUseOf, [How to Disable Snap Assist in Windows 10](https://www.makeuseof.com/tag/disable-snap-assist-windows-10/)
  — Aero Snap is the Windows 7 feature; Snap Assist is the Windows 10 addition.
- [Snap feature](https://baike.baidu.com/en/item/Snap%20feature/2889383) — Windows 10 added
  Snap Assist and Corner Snap on top of the Windows 7 behaviour.
- [iframe cheat sheet](https://iframe-detector.com/iframe-cheat-sheet/) — every sandbox token.
- [How to Bypass X-Frame-Options and CSP frame-ancestors](https://iframetest.com/x-frame-options-bypass/)
  — framing headers cannot be overridden from the embedding page.

## Sound coverage (accuracy pass)

The simulator had **every** Windows 7 clip on disk and an event list in Control Panel —
but eleven of those events were never triggered anywhere, so they were silent no matter
what the user did. The events are now wired to the actions that raise them in Windows 7:

| Event | Raised by |
| --- | --- |
| Windows User Account Control | the consent prompt (it borrowed the *exclamation* sound before) |
| Print Complete | a finished print job |
| Device Connect / Disconnect / Connect Failed | plugging in, safely removing, and a driver that fails to restart |
| Battery Low / Critical | the charge dropping past the alarm levels (10% / 5%) |
| Feed Discovered | a page that advertises an RSS feed (the IE 8 Feeds button lights up) |
| Windows Pop-up Blocked | IE's pop-up bar |
| Windows Information Bar | the information bar appearing over a page |
| Menu Pop-up | any context menu opening |
| Complete | a finished Windows Defender scan or backup |
| New Mail Notification | a message arriving |

**Window events were also renamed to the real ones.** Windows 7's Program Events list has
no "Minimize" and no "Restore" event; it has **Maximize**, **Minimize**, **Restore Down**
(maximised → normal) and **Restore Up** (minimised → normal). The old code played a made-up
"Windows Restore" event. Both pairs now share the clips Windows assigns them
(Windows Restore.wav for Maximize and Restore Up, Windows Minimize.wav for Minimize and
Restore Down), which is what the Windows Default scheme actually does.

**Speech Recognition's five events** (Listening, Not listening, Sleeping, Misrecognition,
Disambiguation) are wired to the app, which gained the *Sleep / Wake up* state that Windows 7
has. The five `.mp3`s were shipped but unreachable before.

**The Sounds tab can now reassign an event.** Windows stores a scheme as event → .wav
assignments, so the tab has the real Sounds drop-down — every clip in the scheme's Media
folder plus **(None)** — and a *Restore this scheme's defaults* button. Assignments persist
in `win7.soundmap` and a silenced event is neither played nor downloaded.

**Printing is real.** Windows 7 ships the *Microsoft XPS Document Writer*, so "No printer is
installed" — which seven programs used to say — was simply wrong. Print now runs a job
through the queue and writes a `.xps` file into Documents, then fires Print Complete.

`tests/sounds.test.mjs` (`npm run test:sounds`) asserts that every event maps to a clip that
exists in all fourteen schemes, that every event is triggered from somewhere, and that no
sound helper is defined-but-uncalled (which is how the eleven silent events survived).

## Start menu (accuracy pass)

- The right pane is a **list of 16 px icons with labels**, not bare text; each item uses its
  shell icon (Documents, Pictures, Music, Games, Computer, Control Panel, Devices and
  Printers, Default Programs, Help and Support).
- The menu is **424 × 540** with a **252 px** left pane. The old 270 px left pane left too
  little room on the right for "Devices and Printers", which is the longest label Windows 7
  puts there; the real menu splits roughly 60/40.
- The Shut down button carries the **power glyph** and shares its row with the arrow at full
  width, as on the real taskbar.
- Search results are grouped **Programs → Control Panel → Files**. Control Panel used to be
  listed after the files, and keyboard navigation followed the same wrong order.
- *See more results* appears for Control Panel matches too.
- The power menu is **Switch user, Log off, Lock, Restart, Sleep** — Hibernate replaces Sleep
  in the same slot rather than being a sixth item (it is a separate entry in the real menu).

## Start menu scaling (fixed)

The panel used to be a hard `424 × 540` box with `maxHeight: 100%` forced on it. That is
right at 100% DPI on a 1080p screen, but Windows does not treat the Start menu as a fixed
rectangle: **the menu is as tall as the available work area** (it hangs off the taskbar and
never off the screen), and the left pane scrolls when it has to. On a short work area the
old box either clipped its bottom row or, with `max-height`, squeezed the flex children
without giving the list a chance to scroll.

`StartMenu.tsx` now measures the emulated screen (`state.screen`, which already has the DPI
zoom, the resolution zoom and the sub-900 px auto-zoom divided out) and:

- caps the height at the work area minus a 4 px margin, never below 300 px;
- scales the **whole panel** through a `--sm-scale` custom property when even that does not
  fit horizontally or vertically, so the art stays proportional instead of being squeezed;
- gives `.sm-left` and `.sm-list` `min-height: 0` so the frequent-programs list scrolls
  inside a shortened panel, as in Windows.

Verified against every display scale the shell can produce (100/125/150% DPI, the
1280-based resolution zoom, the sub-900 px auto-zoom, small taskbar icons, taskbar on each
edge): the panel fits inside the work area in all of them.

## Toggles and sliders (Win 7 art)

Windows 7 has **no pill-shaped toggle switches** — not in the Control Panel, not in
Personalization, nowhere. Every boolean is a 13 × 13 Aero check box and every exclusive
choice a 13 × 13 radio button: a 1 px `#8e8f93` rim, a `#fff → #f4f4f4 → #e4e4e4` vertical
gradient, a 3 px radius, a light inner bevel on the top-left and a dark one on the
bottom-right. Hover turns rim and fill sky-blue with a soft `rgba(110,190,240,.85)` glow;
pressed inverts the gradient into the blue glass state; the checked glyph is a **navy
(#12456e)** tick (a rotated 2 px corner) or a navy dot, not a coloured background image.
The rules are scoped to `.w7 input[type=checkbox|radio]`, so every app got them at once.

The slider is the Aero trackbar: a 4 px trough with a `#8a8f94` rim and a
`#a9a9a9 → #f2f2f2 → #fbfbfb` fill, and a **21 × 21** rounded-square thumb with a
`#fdfdfd → #d2d2d2` gradient, a 1 px `#7d7d7d` rim and a bright inner bevel. Hover and
drag turn it Aero blue (`#3c7fb1` rim, `rgba(120,200,255,.9)` glow). The volume flyout's
vertical trough uses the same art rotated (`writing-mode: vertical-lr; direction: rtl`).
`Slider` now also takes `step`, `vertical` and a value tooltip, which is how Windows shows
the current value while dragging.

## Full Win 7 animation timings

| Motion | Windows 7 / DWM | This shell before | Now |
| --- | --- | --- | --- |
| Window open | 225 ms | 225 ms | 225 ms |
| Window close | 155 ms | 155 ms | 155 ms |
| Minimize | 250 ms, linear, to the taskbar button | 250 ms, eased | 250 ms, **linear** |
| Restore / maximize | 250 ms (`RESTORE_DURATION_MS`), linear | 175 ms, eased | 250 ms, **linear** |
| Start menu open | ~200 ms fade + slide | 180 ms | 200 ms |
| Tray flyout | 200 ms grow + fade | 140 ms | 200 ms |
| Context menu | 200 ms fade | 120 ms | 200 ms |
| Jump list | 200 ms | 120 ms | 200 ms |
| Thumbnail strip | 150 ms | 130 ms | 150 ms |
| Alt+Tab | 200 ms | 140–160 ms | 200 ms |
| Balloon tip | 200 ms in, 9 s on screen, 280 ms out | 200 ms in, 6 s, 280 ms out | as Windows |
| Snap preview | 200 ms | 120–130 ms | 200 ms |
| Taskbar auto-hide | 200 ms | 200 ms | 200 ms |

DWM's minimize and maximize flights are **linear** — there is no easing curve, which is why
Aero motion looks mechanical rather than "designed". The previous cubic-bezier easings are
gone from those two paths.

## Minimize / maximize lag (fixed)

`.win` used to transition `left`, `top`, `width`, `height`, `border-radius` and `box-shadow`
over 250 ms. Animating geometry forces the browser to recalculate style, lay out the whole
window (and every descendant), repaint it and re-rasterise the client area **every frame**;
on top of that the frame carries `backdrop-filter: blur()` glass, so each of those frames
also re-blurred the desktop behind it. That is the stutter.

The frame now jumps straight to its new layout bounds and the motion is played as a
**FLIP transform** (`Window.tsx`): a Web Animation animates `translate + scale` from the old
rectangle to the new one, so only `transform` changes and the compositor owns the whole
250 ms while the main thread stays free. `will-change: transform` is only present while an
animation is running (a permanent hint would cost a compositor layer per window), and the
`backdrop-filter` is dropped for the duration of the flight. The same treatment applies to
minimize/restore, which already used the Web Animation API but now gets its endpoints from
the taskbar button's live rectangle with linear timing.

## Taskbar (Win 7 metrics)

- **Height 40 px** with large icons, **30 px** with small icons. Unknown DPI scales it,
  since the bar lives inside the emulated screen.
- **Button `MinWidth` 56 px** (40 px with small icons) — `HKCU\Control Panel\Desktop\
  WindowMetrics` — and the button fills the bar's inner height rather than being a 52 × 36
  tile. Only a never-combined labelled button stretches (160–200 px).
- **24 × 24 button glyphs** on the 40 px bar, **16 × 16** on the 30 px bar; the icon is
  never stretched to the button.
- The Aero button art is three layers: a 1 px rim, an inner top light line, and a vertical
  white-to-transparent sheen over the blue glass. Running buttons are the resting glass,
  the focused window is the brighter "pressed" glass with an inner glow, hover lights the
  button **from the pointer** (`radial-gradient` centred on `--mx`), and a press is a
  visibly darker glass rather than a flat modern fill. A grouped button keeps the two
  offset "cards" behind it.
- The notification area is a raised well separated from the buttons by a 1 px dark line and
  a 1 px inner highlight; its icons are **16 px in a 24 × 22 hit box** (20 × 18 with small
  icons) with the same glass hover. The overflow chevron is a small raised button, and the
  clock is Segoe UI 12 px, two centred lines, 68 px wide.
- Show Desktop is the narrow 12 px ridge with the Aero highlight, not a translucent slab.

`tests/accuracy.test.mjs` now pins all of these numbers (13 px check box, 21 px thumb, 56 /
24 / 40 / 16 taskbar metrics, 225 / 155 / 250 ms timings, linear flights) and asserts that
`.win` never transitions layout properties again.
