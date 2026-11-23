/**
 * Embedding rules for Internet Explorer.
 *
 * The simulator shows real web pages inside an <iframe>, so it has to decide
 * three things for every address: how much the frame is sandboxed, which
 * Permissions-Policy features it may use, and what to tell the user when the
 * browser refuses to render it. Frame headers (`X-Frame-Options`,
 * `frame-ancestors`) are enforced by the browser *before* our code runs, so
 * nothing here can override them — the honest approach is a relaxed sandbox
 * plus a clear way out when a site blocks framing.
 */

/** Hosts that serve pages designed to be framed (embed endpoints, static docs). */
const EMBED_FRIENDLY = [
  "example.com",
  "wikipedia.org",
  "developer.mozilla.org",
  "archive.org",
  "openstreetmap.org",
  "bing.com",
  "youtube-nocookie.com",
  "vimeo.com",
];

/** Hosts whose normal pages send X-Frame-Options / frame-ancestors DENY. */
const EMBED_BLOCKED = [
  "google.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "linkedin.com",
  "amazon.com",
  "github.com",
  "microsoft.com",
  "apple.com",
  "netflix.com",
  "paypal.com",
];

export type EmbedMode = "trusted" | "standard" | "blocked";

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
};

const matches = (host: string, list: string[]) => list.some((h) => host === h || host.endsWith("." + h));

/** Best guess at how a host behaves, before the browser reports anything. */
export function embedMode(url: string): EmbedMode {
  const host = hostOf(url);
  if (!host) return "standard";
  if (matches(host, EMBED_BLOCKED)) return "blocked";
  if (matches(host, EMBED_FRIENDLY)) return "trusted";
  return "standard";
}

/** Everything a normal web page needs to work, minus what it has no business doing. */
const SANDBOX_BASE = [
  "allow-scripts",
  "allow-forms",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-modals",
  "allow-presentation",
  "allow-orientation-lock",
  "allow-pointer-lock",
  "allow-downloads",
  "allow-top-navigation-by-user-activation",
];

/**
 * Sandbox for a remote page.
 *
 * `allow-same-origin` is granted because the framed site is a *different*
 * origin from the shell: it keeps the site's own cookies and storage working
 * (logins, preferences, maps) without giving it any access to the desktop. The
 * combination is only unsafe when the frame is same-origin with the embedder,
 * which remote URLs never are.
 */
export function sandboxForRemote(): string {
  return [...SANDBOX_BASE, "allow-same-origin"].join(" ");
}

/**
 * Sandbox for a page out of the virtual file system (rendered via `srcDoc`).
 *
 * These *are* same-origin with the shell, so `allow-same-origin` is
 * deliberately withheld: scripts in a local .html file run (as they would in
 * IE), but the document gets an opaque origin and cannot reach the desktop's
 * storage or walk up into the simulator.
 */
export function sandboxForLocal(): string {
  return SANDBOX_BASE.join(" ");
}

/**
 * Permissions-Policy features a framed page may use. Maps, video players and
 * rich apps need these to work at all inside a frame; anything not listed
 * (USB, serial, NFC…) stays blocked.
 */
export const EMBED_ALLOW = [
  "clipboard-read",
  "clipboard-write",
  "fullscreen",
  "geolocation",
  "microphone",
  "camera",
  "autoplay",
  "encrypted-media",
  "picture-in-picture",
  "web-share",
  "accelerometer",
  "gyroscope",
  "magnetometer",
  "midi",
  "screen-wake-lock",
  "gamepad",
].join("; ");

/** The shell's address is never leaked to the framed page. */
export const EMBED_REFERRER = "strict-origin-when-cross-origin";

/** A `file:` address in the virtual file system has no scheme/host to parse. */
export function isLocalAddress(url: string): boolean {
  return url.startsWith("file:");
}

/**
 * Why a frame probably came up empty. The browser does not tell the embedding
 * page why it refused, so this stays a heuristic: known blockers get the
 * framing explanation, http content on an https shell gets the mixed-content
 * one, everything else gets the generic page.
 */
export function blockedReason(url: string): "framing" | "mixed" | "unknown" {
  if (matches(hostOf(url), EMBED_BLOCKED)) return "framing";
  try {
    const u = new URL(url);
    if (typeof location !== "undefined" && location.protocol === "https:" && u.protocol === "http:") return "mixed";
  } catch {
    /* not a parseable absolute URL */
  }
  return "unknown";
}

/**
 * Turn whatever the user typed into the address the frame should load, the way
 * the IE 8 address bar does: a bare host gets http://, a single word goes to
 * search, and a local address is kept as-is.
 */
export function normalizeAddress(input: string): string {
  const t = input.trim();
  if (!t) return "about:blank";
  if (/^(about|file|https?):/i.test(t)) return t;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(t)) return "http://" + t;
  if (/\s/.test(t) || !/\./.test(t)) return "about:bing?q=" + encodeURIComponent(t);
  return "http://" + t;
}
