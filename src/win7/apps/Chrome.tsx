"use client";
import React, { useEffect, useRef, useState } from "react";
import { Win, useStore, getState, setWin, setSettings, openApp, msgBox, view, notify, closeWin, setState } from "../store";
import { playSys } from "../sound";
import { Icon } from "../icons";
import { GlassBar } from "../ui";
import { Btn } from "../ui";

interface Tab { id: number; url: string; title: string; hist: string[]; hi: number; nonce: number }
let tabSeq = 1;
const mk = (url: string): Tab => ({ id: tabSeq++, url, title: "Loading...", hist: [url], hi: 0, nonce: 0 });

function normalize(input: string): string {
  const t = input.trim();
  if (!t) return "about:blank";
  if (t.startsWith("about:") || t.startsWith("file:") || t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.includes(" ") || !t.includes(".")) return "https://www.google.com/search?q=" + encodeURIComponent(t);
  return "https://" + t;
}
function titleFor(url: string): string {
  if (url === "about:blank") return "New Tab";
  if (url.startsWith("https://www.google.com/search?q=")) return decodeURIComponent(url.split("q=")[1] || "") + " - Google Search";
  try { return new URL(url).hostname; } catch { return url; }
}

function NewTabPage({ go }: { go: (u: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <div className="crpg home">
      <div className="cr-hero"><Icon name="chrome" size={64} /><div><h1>Google Chrome</h1><p>Fast, secure, and easy to use.</p></div></div>
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) go("https://www.google.com/search?q=" + encodeURIComponent(q)); }} className="cr-search-big"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Google or type a URL" autoFocus /><button type="submit">Search</button></form>
      <div className="cr-links">{[["Google", "https://www.google.com"], ["Gmail", "https://mail.google.com"], ["YouTube", "https://www.youtube.com"], ["Google Maps", "https://maps.google.com"], ["Example.com", "https://example.com"], ["Microsoft", "https://www.microsoft.com"]].map(([l, u]) => <a key={l} onClick={() => go(u)}>{l}</a>)}</div>
    </div>
  );
}

export function Chrome({ win }: { win: Win }) {
  const s = useStore((st) => st.settings);
  const [tabs, setTabs] = useState<Tab[]>(() => [mk(normalize(win.props.url || "about:blank"))]);
  const [active, setActive] = useState(() => tabs[0]?.id);
  const [addr, setAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [twidth, setTwidth] = useState(170);
  const [closing, setClosing] = useState<Set<number>>(new Set());
  const rowRef = useRef<HTMLDivElement>(null);
  const tab = tabs.find((t) => t.id === active) || tabs[0];

  const upd = (id: number, p: Partial<Tab>) => setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const nav = (url: string, id = tab.id) => {
    url = normalize(url);
    playSys("navigation");
    const t = tabs.find((x) => x.id === id)!;
    upd(id, { url, hist: [...t.hist.slice(0, t.hi + 1), url], hi: t.hi + 1, title: "Loading..." });
  };
  useEffect(() => {
    setAddr(tab.url);
    setLoading(true);
    const t = setTimeout(() => {
      setLoading(false);
      upd(tab.id, { title: titleFor(tab.url) });
    }, 350);
    return () => clearTimeout(t);
  }, [tab.id, tab.url]);
  useEffect(() => setWin(win.id, { title: tab.title + " - Google Chrome" }), [tab.title, win.id]);

  const back = () => tab.hi > 0 && upd(tab.id, { hi: tab.hi - 1, url: tab.hist[tab.hi - 1] });
  const fwd = () => tab.hi < tab.hist.length - 1 && upd(tab.id, { hi: tab.hi + 1, url: tab.hist[tab.hi + 1] });
  const refresh = () => upd(tab.id, { nonce: tab.nonce + 1 });
  const newTab = (url = "about:blank") => { const t = mk(url); setTabs((ts) => [...ts, t]); setActive(t.id); };
  const closeTab = (id: number) => {
    if (tabs.length === 1) return closeWin(win.id);
    setClosing((c) => new Set([...c, id]));
    setTimeout(() => {
      const nt = tabs.filter((t) => t.id !== id);
      setTabs(nt);
      setClosing((c) => { const n = new Set(c); n.delete(id); return n; });
      if (active === id) setActive(nt[Math.max(0, tabs.findIndex((t) => t.id === id) - 1)].id);
    }, 220); // matches the cr-tabclose animation duration
  };

  const content = () => {
    const u = tab.url;
    if (u === "about:blank") return <NewTabPage go={nav} />;
    if (u.startsWith("https://www.google.com/search?q=")) {
      const q = decodeURIComponent((u.split("q=")[1] || "").replace(/\+/g, " "));
      return (
        <div className="crpg">
          <div className="cr-bar"><b>Google</b><form onSubmit={(e) => { e.preventDefault(); nav("https://www.google.com/search?q=" + encodeURIComponent((e.target as any).elements[0].value)); }}><input defaultValue={q} /><button>🔍</button></form></div>
          <div className="cr-res"><p className="dim">About {(1000 + q.length * 31).toLocaleString()} results (0.31 seconds)</p>
            {[`${q} - Wikipedia`, `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`, "en.wikipedia.org", `Read about ${q} on Wikipedia.`].map(([t, u2, d, s]) => <div key={t} className="cr-r"><a onClick={() => nav(u2)}>{t}</a><div className="url">{d}</div><div>{s}</div></div>)}
          </div>
        </div>
      );
    }
    return (
      <div className="crpg err">
        <h2>Google Chrome cannot display the webpage</h2>
        <hr />
        <p>What you can try:</p>
        <ul><li>Reload this page later</li><li>Check your Internet connection</li></ul>
        <p style={{ color: "#555" }}>{u}</p>
      </div>
    );
  };

  const key = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === "t") { e.preventDefault(); newTab(); }
    else if (e.ctrlKey && e.key.toLowerCase() === "w") { e.preventDefault(); closeTab(tab.id); }
    else if (e.key === "F5") { e.preventDefault(); refresh(); }
    else if (e.ctrlKey && e.key.toLowerCase() === "l") { e.preventDefault(); (e.target as any).select(); }
  };

  return (
    <div className="cr" tabIndex={0} onKeyDown={key}>
      <GlassBar winId={win.id}>
        <div className="cr-navbar">
          <div className="cr-navbtns">
            <button className="navbtn" disabled={tab.hi === 0} onClick={back} title="Back (Alt+Left)"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 2L4 8l6 6" stroke="#5f6368" strokeWidth="2" fill="none" strokeLinejoin="round" /></svg></button>
            <button className="navbtn fwd" disabled={tab.hi >= tab.hist.length - 1} onClick={fwd} title="Forward"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 2l6 6-6 6" stroke="#5f6368" strokeWidth="2" fill="none" strokeLinejoin="round" /></svg></button>
            <button className="navbtn refresh" onClick={loading ? () => setLoading(false) : refresh} title={loading ? "Stop" : "Refresh (F5)"}>{loading ? "✕" : "⟳"}</button>
          </div>
          <div className="cr-addr">
            <Icon name="chrome" size={16} />
            <input ref={rowRef as any} className="cr-addr-in" value={addr} onChange={(e) => setAddr(e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") nav(addr); }} />
          </div>
        </div>
      </GlassBar>
      <div className="cr-tabs">
        <div className="cr-tabrow" ref={rowRef as any} style={{ ["--tw" as string]: twidth + "px" }}>
          {tabs.map((t, i) => (
            <div
              key={t.id}
              className={"cr-tab" + (t.id === tab.id ? " sel" : "") + (closing.has(t.id) ? " x-closing" : "")}
              onPointerDown={() => setActive(t.id)}
              title={t.title}
            >
              <Icon name="chrome" size={14} /><span>{t.title}</span>
              <i className="cr-tabx" onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}>✕</i>
            </div>
          ))}
          <div className="cr-newtab" onClick={() => newTab()} title="New tab (Ctrl+T)">+</div>
        </div>
        <div className="cr-cmds">
          <span title="Home" onClick={() => nav("https://www.google.com")}>⌂ Home</span>
          <span title="Bookmarks" onClick={() => msgBox({ title: "Bookmarks", text: "No bookmarks have been added yet.", icon: "info" })}>★ Bookmarks ▾</span>
          <span title="History" onClick={() => msgBox({ title: "History", text: "No browsing history.", icon: "info" })}>⏲ History ▾</span>
          <span onClick={(e) => { e.preventDefault(); }}>Customize ▾</span>
        </div>
      </div>
      <div className="cr-main">
        <div className="cr-content" style={{ overflow: "hidden" }}>{content()}</div>
      </div>
      <div className="cr-status"><span>{loading ? "Loading..." : "Done"}</span><span style={{ flex: 1 }} /><span>🔍 100% ▾</span></div>
      {void setState}
    </div>
  );
}
