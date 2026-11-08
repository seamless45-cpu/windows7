"use client";
/**
 * Soft-keyboard suppression.
 *
 * Windows 7's Start menu focuses its search box as soon as the menu opens — but
 * a desktop has no on-screen keyboard unless you start osk.exe yourself. Mobile
 * browsers do the opposite: any *programmatic* focus on a text field raises the
 * phone's keyboard, so tapping the Start orb covered half the screen with a
 * keyboard Windows 7 never had.
 *
 * A `readOnly` field can be focused without the keyboard appearing, so that is
 * what programmatic focus uses. The field is marked `data-softkb="off"` and
 * returned to normal on the user's first genuine interaction — a tap on it, or
 * a key press (hardware keyboards must keep working) — after which it behaves
 * exactly like any other input.
 */

import { useEffect, useRef } from "react";

const ATTR = "data-softkb";

/**
 * Only touch-first devices raise a keyboard on focus. On a desktop with a mouse
 * and a real keyboard this must be a complete no-op, so typing continues to
 * work exactly as before.
 */
function touchFirst() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  } catch {
    return false;
  }
}

function release(el: HTMLElement) {
  if (el.getAttribute(ATTR) !== "off") return;
  el.removeAttribute(ATTR);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.readOnly = false;
}

/** Focus a field without asking a mobile browser to show its keyboard. */
export function focusNoKeyboard<T extends HTMLElement>(el: T | null | undefined) {
  if (!el) return;
  const field = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  // readOnly is the only reliable way to focus a field without a soft keyboard;
  // it is lifted on the user's first tap or key press.
  if (field && touchFirst() && !el.getAttribute(ATTR)) {
    el.setAttribute(ATTR, "off");
    (el as HTMLInputElement).readOnly = true;
  }
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}

/** Focus a field on mount, without raising a soft keyboard. */
export function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const t = window.setTimeout(() => focusNoKeyboard(ref.current), 30);
    return () => window.clearTimeout(t);
  }, []);
  return ref;
}

/**
 * Releases programmatically focused fields the moment the user reaches for
 * them. Installed once by the shell; returns a cleanup function.
 */
export function installSoftKeyboardGuard(): () => void {
  if (typeof document === "undefined") return () => {};
  const onPointer = (e: Event) => {
    const t = e.target as HTMLElement | null;
    const el = t?.closest?.(`[${ATTR}="off"]`) as HTMLElement | null;
    if (!el) return;
    release(el);
    // A tap on an already-focused field does not refire focus, and some
    // browsers only offer the keyboard at that point: re-focus after releasing
    // so the tap that follows behaves like a normal text field.
    if (document.activeElement === el) {
      el.blur();
      window.setTimeout(() => {
        if (document.body.contains(el)) el.focus({ preventScroll: true });
      }, 0);
    }
  };
  const onKey = (e: Event) => {
    const el = e.target as HTMLElement | null;
    if (el) release(el);
  };
  document.addEventListener("pointerdown", onPointer, true);
  document.addEventListener("touchstart", onPointer, true);
  document.addEventListener("keydown", onKey, true);
  return () => {
    document.removeEventListener("pointerdown", onPointer, true);
    document.removeEventListener("touchstart", onPointer, true);
    document.removeEventListener("keydown", onKey, true);
  };
}
