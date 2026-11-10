"use client";
/**
 * PWA plumbing for the desktop.
 *
 * - registers the service worker so the simulator works offline and installs;
 * - exposes `canInstall` / `promptInstall()` for the "Install this PC" entry in
 *   the Start menu, using Chrome's `beforeinstallprompt` where available and
 *   falling back to the browser's own instructions (Safari, Firefox);
 * - reports whether the app is already running installed, so the shell can hide
 *   the install affordance.
 *
 * Registration is skipped in development: a service worker caching dev chunks
 * makes hot reload miserable, and there is nothing to install from localhost
 * that a real build would not show.
 */
import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

type BipEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: BipEvent | null = null;
const listeners = new Set<(v: boolean) => void>();

function emit() {
  listeners.forEach((l) => l(!!deferred));
}

export function installPwaListener() {
  if (typeof window === "undefined") return () => {};
  const onPrompt = (e: Event) => {
    e.preventDefault();
    deferred = e as BipEvent;
    emit();
  };
  const onInstalled = () => {
    deferred = null;
    emit();
    clearInstallFlag();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

/** True when the browser offered an install prompt that has not been used yet. */
export function useCanInstall() {
  const [can, setCan] = useState(!!deferred);
  useEffect(() => {
    listeners.add(setCan);
    return () => {
      listeners.delete(setCan);
    };
  }, []);
  return can;
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  const ios = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

/** Runs the browser's install prompt. Resolves to the user's choice. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const ev = deferred;
  deferred = null;
  emit();
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  return outcome;
}

/**
 * The install flag lives in localStorage rather than the event alone: the
 * `source=pwa` query parameter and `display-mode` are the only other signals,
 * and neither survives a browser that installs silently. Read as "(simulated)
 * installed" — the real state is `isStandalone()`.
 */
const FLAG = "win7.pwa.installed";

export function markInstallFlag() {
  try {
    localStorage.setItem(FLAG, "1");
  } catch {
    /* storage blocked */
  }
}
export function clearInstallFlag() {
  try {
    localStorage.removeItem(FLAG);
  } catch {
    /* storage blocked */
  }
}
export function hasInstallFlag() {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

/** Registers /sw.js once the window has loaded. */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") return;
  const v = process.env.NEXT_PUBLIC_BUILD_ID || "1";
  const url = `${BASE}/sw.js?base=${encodeURIComponent(BASE)}&v=${encodeURIComponent(v)}`;
  const go = () => {
    navigator.serviceWorker.register(url, { scope: `${BASE}/` }).catch(() => {
      /* private mode / blocked storage: the app still runs online */
    });
  };
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

/** Mounts the whole PWA lifecycle. Rendered once by the shell. */
export function usePwa() {
  const canInstall = useCanInstall();
  useEffect(() => {
    registerServiceWorker();
    return installPwaListener();
  }, []);
  return { canInstall };
}
