"use client";
/**
 * Web Frame — a bare "load whatever address I paste" program.
 *
 * This is deliberately not Internet Explorer: no history model, no favourites,
 * no synthetic pages. It is one address box and one <iframe>. Type a link, press
 * Enter, the site runs.
 *
 * The honest limit: a page can refuse to be framed. If a site sends
 * `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'`
 * the browser blocks it *before* any of our code runs, and no amount of sandbox
 * relaxation changes that. So the program renders the frame, watches for the
 * load event, and when the frame is still empty after a grace period it shows
 * why and offers a one-click open in a real browser tab. It also ships a list of
 * sites that *do* allow framing, which makes the failure recoverable instead of
 * mysterious.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Win, lsGet, lsSet } from "../store";
import { Icon } from "../icons";
import { sandboxForRemote, EMBED_ALLOW, EMBED_REFERRER, blockedReason, embedMode } from "../embed";

const LS_RECENT = "win7.frame.recent";
const LS_BOOKMARKS = "win7.frame.bookmarks";

/**
 * Sites that serve pages designed to be framed. Nothing here is guaranteed
 * forever (a site can change its headers tomorrow), but every one of these is
 * known to work inside an iframe today, so they are the useful examples when a
 * user's first URL is refused.
 */
const FRIENDLY: { name: string; url: string; note: string }[] = [
  { name: "example.com", url: "https://example.com", note: "The IANA example page" },
  { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/Windows_7", note: "Encyclopedia" },
  { name: "Wikimedia Commons", url: "https://commons.wikimedia.org", note: "Free media archive" },
  { name: "archive.org", url: "https://archive.org", note: "Internet Archive" },
  { name: "OpenStreetMap", url: "https://www.openstreetmap.org", note: "Map embed endpoint" },
  { name: "MDN", url: "https://developer.mozilla.org", note: "Web documentation" },
  { name: "Hacker News", url: "https://news.ycombinator.com", note: "Usually framable" },
  { name: "lite.duckduckgo.com", url: "https://lite.duckduckgo.com/lite/", note: "Text search" },
  { name: "This simulator", url: "https://seamless45-cpu.github.io/windows7/", note: "Recursive, why not" },
];

/** Turn what the user typed into a URL to load. Bare hosts get https://. */
export function frameUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (/^(https?|file|about|data):/i.test(t)) return t;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(t)) return "http://" + t;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(t) || /^[\w-]+:\d+/.test(t)) return "https://" + t;
  // anything else is a search, because that is what a user pasting prose means
  return "https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(t);
}

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
};

interface Entry {
  url: string;
  at: number;
}

export function FrameViewer({ win }: { win: Win }) {
  const start = typeof win.props.url === "string" ? frameUrl(win.props.url) : "";
  const [url, setUrl] = useState(start);
  /** what the frame is actually pointed at (empty = home screen) */
  const [loaded, setLoaded] = useState(start);
  const [draft, setDraft] = useState(start);
  const [nonce, setNonce] = useState(0);
  const [recent, setRecent] = useState<Entry[]>(() => lsGet<Entry[]>(LS_RECENT, []));
  const [books, setBooks] = useState<string[]>(() => lsGet<string[]>(LS_BOOKMARKS, []));
  /** the frame fired `load` — it rendered *something* (a blocked page also loads) */
  const [loadFired, setLoadFired] = useState(false);
  /** the user says it came up blank, so stop waiting and explain */
  const [reported, setReported] = useState(false);
  const [showPanel, setShowPanel] = useState<null | "recent" | "saved">(null);
  const addr = useRef<HTMLInputElement>(null);

  // A frame of a refused page fires `load` with a blank document, and there is
  // no API that tells us which. So "still blank" is a judgement: after 6 s
  // without a load event the address is treated as refused, and the user can
  // also say so immediately with the "came up blank" button.
  const [timedOut, setTimedOut] = useState(false);
  // Reset the "did it load?" bookkeeping inside the timer callback rather than
  // synchronously in the effect body, which would cascade a render on every
  // navigation.
  useEffect(() => {
    if (!loaded) return;
    const reset = window.setTimeout(() => {
      setLoadFired(false);
      setTimedOut(false);
      setReported(false);
    }, 0);
    const t = window.setTimeout(() => setTimedOut(true), 6000);
    return () => {
      window.clearTimeout(reset);
      window.clearTimeout(t);
    };
  }, [loaded, nonce]);

  const remember = (u: string) => {
    const next = [{ url: u, at: Date.now() }, ...recent.filter((r) => r.url !== u)].slice(0, 40);
    setRecent(next);
    lsSet(LS_RECENT, next);
  };

  const go = (raw: string) => {
    const u = frameUrl(raw);
    if (!u) return;
    setUrl(u);
    setDraft(u);
    setLoaded(u);
    setNonce((n) => n + 1);
    setShowPanel(null);
    remember(u);
  };

  const reload = () => {
    if (!loaded) return;
    setNonce((n) => n + 1);
  };

  const save = () => {
    if (!loaded || books.includes(loaded)) return;
    const next = [loaded, ...books].slice(0, 30);
    setBooks(next);
    lsSet(LS_BOOKMARKS, next);
  };

  const forget = (u: string) => {
    const next = books.filter((b) => b !== u);
    setBooks(next);
    lsSet(LS_BOOKMARKS, next);
  };

  const openExternal = (u: string) => window.open(u, "_blank", "noopener,noreferrer");

  const refused = useMemo(() => {
    if (!loaded) return false;
    // a host we already know refuses framing is not worth a 6 s wait
    if (embedMode(loaded) === "blocked") return true;
    return reported || (!!loaded && !loadFired && timedOut);
  }, [loaded, reported, loadFired, timedOut]);

  const key = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDraft(url);
      setShowPanel(null);
    } else if (e.key === "F5") {
      e.preventDefault();
      reload();
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      addr.current?.select();
    }
  };

  return (
    <div className="fv" tabIndex={0} onKeyDown={key}>
      <div className="fv-bar">
        <div className="fv-nav">
          <button className="fv-btn" title="Back to the start page" disabled={!loaded} onClick={() => { setLoaded(""); setUrl(""); setDraft(""); }}>
            <svg width="14" height="14" viewBox="0 0 16 16"><path d="M10 2L4 8l6 6" stroke="#0b3d6b" strokeWidth="2.4" fill="none" strokeLinejoin="round" /></svg>
          </button>
          <button className="fv-btn" title="Reload (F5)" disabled={!loaded} onClick={reload}>
            <svg width="14" height="14" viewBox="0 0 16 16"><path d="M13 8a5 5 0 1 1-1.6-3.7" stroke="#0b3d6b" strokeWidth="2.2" fill="none" strokeLinecap="round" /><path d="M13 1.6V5h-3.4" stroke="#0b3d6b" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="fv-addr">
          <Icon name="globe" size={16} />
          <input
            ref={addr}
            value={draft}
            spellCheck={false}
            autoComplete="off"
            placeholder="Type a link and press Enter — https://example.com"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                go(draft);
              }
            }}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button className="fv-go" title="Go (Enter)" onClick={() => go(draft)}>Go</button>
        </div>
        <button className="fv-btn star" title={loaded && books.includes(loaded) ? "Already saved" : "Save this address"} disabled={!loaded || books.includes(loaded)} onClick={save}>
          <svg width="15" height="15" viewBox="0 0 16 16"><path d="M8 1.6l2 4.1 4.5.6-3.3 3.2.8 4.5L8 11.9l-4 2.1.8-4.5L1.5 6.3 6 5.7z" fill={loaded && books.includes(loaded) ? "#f0b323" : "none"} stroke="#7a6207" strokeWidth="1.2" strokeLinejoin="round" /></svg>
        </button>
        <button className={"fv-btn" + (showPanel === "saved" ? " on" : "")} title="Saved addresses" onClick={() => setShowPanel(showPanel === "saved" ? null : "saved")}>Saved</button>
        <button className={"fv-btn" + (showPanel === "recent" ? " on" : "")} title="Recent addresses" onClick={() => setShowPanel(showPanel === "recent" ? null : "recent")}>Recent</button>
        <button className="fv-btn" title="Open in a real browser tab" disabled={!loaded} onClick={() => openExternal(loaded || url)}>External</button>
      </div>

      {showPanel && (
        <div className="fv-panel">
          {(showPanel === "saved" ? books : recent.map((r) => r.url)).length === 0 && <div className="fv-empty">{showPanel === "saved" ? "Nothing saved yet." : "Nothing loaded yet."}</div>}
          {showPanel === "saved"
            ? books.map((b) => (
                <div key={b} className="fv-row">
                  <a onClick={() => go(b)} title={b}>{hostOf(b)}</a>
                  <span className="fv-dim">{new URL(b, "https://x").pathname}</span>
                  <button className="fv-x" title="Remove" onClick={() => forget(b)}>✕</button>
                </div>
              ))
            : recent.map((r) => (
                <div key={r.url} className="fv-row">
                  <a onClick={() => go(r.url)} title={r.url}>{hostOf(r.url)}</a>
                  <span className="fv-dim">{new Date(r.at).toLocaleDateString()}</span>
                </div>
              ))}
        </div>
      )}

      <div className="fv-stage">
        {!loaded ? (
          <div className="fv-home">
            <h1><Icon name="globe" size={34} /> Web Frame</h1>
            <p>
              Paste any link into the address bar and press <b>Enter</b>. The page runs inside this window exactly as the site
              serves it — its own scripts, its own video, its own maps.
            </p>
            <p className="fv-note">
              Some sites refuse to be shown inside another page. If yours comes up blank, use <b>Open in a real browser tab</b> —
              that always works.
            </p>
            <h2>Known to load in a frame</h2>
            <div className="fv-grid">
              {FRIENDLY.map((f) => (
                <button key={f.url} className="fv-card" onClick={() => go(f.url)}>
                  <b>{f.name}</b>
                  <span>{f.note}</span>
                </button>
              ))}
            </div>
          </div>
        ) : refused ? (
          <div className="fv-blocked">
            <Icon name="shield" size={44} />
            <h2>{hostOf(loaded)} refuses to open inside a frame</h2>
            <p>
              The site sends an <code>X-Frame-Options</code> or <code>Content-Security-Policy: frame-ancestors</code> header. Your
              browser enforces that before any code on this page runs, so no setting here can override it.
            </p>
            {blockedReason(loaded) === "mixed" && <p className="fv-warn">This address is plain <code>http:</code> on an <code>https:</code> page, so the browser may be blocking it as mixed content.</p>}
            <div className="fv-blocked-btns">
              <button className="fv-primary" onClick={() => openExternal(loaded)}>Open in a real browser tab</button>
              <button className="fv-btn" onClick={() => { setReported(false); reload(); }}>Try again</button>
              <button className="fv-btn" onClick={() => { const u = loaded; setLoaded(""); setUrl(""); setDraft(""); }}>Start page</button>
            </div>
            <h3>These will load here</h3>
            <div className="fv-grid">
              {FRIENDLY.slice(0, 6).map((f) => (
                <button key={f.url} className="fv-card" onClick={() => go(f.url)}>
                  <b>{f.name}</b>
                  <span>{f.note}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <iframe
              key={nonce + loaded}
              className="fv-frame"
              title={loaded}
              src={loaded}
              sandbox={sandboxForRemote()}
              allow={EMBED_ALLOW}
              referrerPolicy={EMBED_REFERRER as React.HTMLAttributeReferrerPolicy}
              allowFullScreen
              onLoad={() => setLoadFired(true)}
            />
            <div className="fv-status">
              <span>{hostOf(loaded)}</span>
              {!loadFired && <span className="fv-wait">Loading…</span>}
              <button className="fv-link" onClick={() => setReported(true)}>Came up blank?</button>
              <button className="fv-link" onClick={() => openExternal(loaded)}>Open in a browser tab</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
