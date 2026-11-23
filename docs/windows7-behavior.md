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
