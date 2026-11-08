"use client";
/**
 * The two full-screen transitions Windows 7 uses.
 *
 *  1. **Fade through black** — every secure-desktop or session change dissolves
 *     to black and back: sign-in, sign-out, shutdown, restart, UAC, the screen
 *     saver password prompt. DWM runs it at about 250 ms each way.
 *  2. **Theme cross-dissolve** — applying a theme does not flash; the old
 *     desktop fades into the new one over roughly a third of a second, and the
 *     window frames blend with it.
 */
import React, { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { wpStyle } from "./fileops";

export function FadeLayer() {
  const fade = useStore((s) => s.fade);
  // No local state: the overlay is driven entirely by the store, so a fade
  // "in" starts from the black the "out" phase left behind.
  if (!fade) return null;
  return <div key={fade.token} className={"fade-black " + fade.mode} aria-hidden="true" />;
}

/**
 * Cross-dissolve when the theme (or the wallpaper that carries it) changes.
 * The previous wallpaper is painted over the new desktop and fades out, which
 * reads exactly like DWM's theme transition.
 */
export function ThemeMix() {
  const theme = useStore((s) => s.settings.theme);
  const wallpaper = useStore((s) => s.settings.wallpaper);
  const pos = useStore((s) => s.settings.wpPos);
  const [old, setOld] = useState<{ wallpaper: string; pos: string; theme: string; key: number } | null>(null);
  const last = useRef({ theme, wallpaper });

  useEffect(() => {
    const prev = last.current;
    if (prev.theme === theme && prev.wallpaper === wallpaper) return;
    last.current = { theme, wallpaper };
    setOld({ wallpaper: prev.wallpaper, pos, theme: prev.theme, key: Date.now() });
    const t = setTimeout(() => setOld(null), 460);
    return () => clearTimeout(t);
  }, [theme, wallpaper, pos]);

  if (!old) return null;
  return (
    <div
      key={old.key}
      className={"theme-mix theme-" + old.theme}
      style={{ ...wpStyle(old.wallpaper, old.pos), backgroundSize: "cover", backgroundPosition: "center" }}
      aria-hidden="true"
    />
  );
}
