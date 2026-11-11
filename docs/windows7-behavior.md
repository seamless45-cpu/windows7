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
