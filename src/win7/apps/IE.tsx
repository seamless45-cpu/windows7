"use client";
import React, { useEffect, useRef, useState } from "react";
import { Win, useStore, getState, setWin, setSettings, openApp, openCP, msgBox, showMenu, view, notify, closeWin, MenuItem, setState } from "../store";
import { playSys } from "../sound";
import { Icon } from "../icons";
import { GlassBar } from "../ui";
import { Btn } from "../ui";

interface Tab { id: number; url: string; title: string; hist: string[]; hi: number; nonce: number }
/** A tab while it is being dragged inside (or out of) the tab strip. */
interface TabDrag { id: number; from: number; dx: number; x: number; over: number; torn: boolean }
let tabSeq = 1;
const mk = (url: string): Tab => ({ id: tabSeq++, url, title: "Loading...", hist: [url], hi: 0, nonce: 0 });

function normalize(input: string): string {
  const t = input.trim();
  if (!t) return "about:blank";
  if (/^(about:|file:|https?:\/\/)/i.test(t)) return t;
  if (/\s/.test(t) || !/\./.test(t)) return "about:bing?q=" + encodeURIComponent(t);
  return "http://" + t;
}
function titleFor(url: string, fsName?: string): string {
  if (url === "about:home") return "Windows Internet Explorer 8 — Welcome";
  if (url === "about:blank") return "Blank Page";
  if (url.startsWith("about:bing")) return url.includes("q=") ? decodeURIComponent(url.split("q=")[1] || "") + " - Bing" : "Bing";
  if (url === "about:news") return "MSN News — Top stories";
  if (url === "about:gadgets") return "Windows Desktop Gadgets";
  if (url.startsWith("file:")) return fsName || "Local file";
  try { return new URL(url).hostname; } catch { return url; }
}
const NEWS = [
  ["Windows 7 reaches 150 million licenses", "Microsoft announced that Windows 7 has become the fastest-selling operating system in history, thanks to the new taskbar, Aero Peek and Jump Lists."],
  ["Tips: get the most from the new taskbar", "Pin your favorite programs, right-click for Jump Lists, and hover for live thumbnail previews."],
  ["Sunny weekend ahead for most of the region", "Forecasters expect clear skies and mild temperatures through Sunday with a slight chance of showers on Monday."],
  ["Solid-state drives get faster and cheaper", "Analysts say flash-based storage prices will fall again this year, bringing near-instant boot times to mainstream PCs."],
  ["Students build solar car for cross-country race", "A university team unveiled a lightweight solar-powered car designed to cover 3,000 km on sunlight alone."],
];

function HomePage({ go }: { go: (u: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <div className="iepg home">
      <div className="ie-hero"><Icon name="ie" size={64} /><div><h1>Windows Internet Explorer 8</h1><p>Faster. Safer. Easier.</p></div></div>
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) go("about:bing?q=" + encodeURIComponent(q)); }} className="ie-search-big"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the web with Bing" autoFocus /><button type="submit">Search</button></form>
      <div className="ie-links">{[["Wikipedia", "https://en.m.wikipedia.org"], ["Bing", "about:bing"], ["MSN News", "about:news"], ["Windows Gadgets", "about:gadgets"], ["Example.com", "https://example.com"], ["Microsoft", "https://www.microsoft.com"]].map(([l, u]) => <a key={l} onClick={() => go(u)}>{l}</a>)}</div>
      <div className="ie-news"><h3>Top stories</h3>{NEWS.slice(0, 3).map(([t]) => <div key={t}><a onClick={() => go("about:news")}>{t}</a></div>)}</div>
    </div>
  );
}
function BingPage({ q, go }: { q: string; go: (u: string) => void }) {
  const [v, setV] = useState(q);
  const enc = encodeURIComponent(q);
  return (
    <div className="iepg bing">
      <div className="bing-bar"><b>bing</b><form onSubmit={(e) => { e.preventDefault(); go("about:bing?q=" + encodeURIComponent(v)); }}><input value={v} onChange={(e) => setV(e.target.value)} /><button>🔍</button></form></div>
      {q ? (
        <div className="bing-res">
          <p className="dim">About {(1000 + q.length * 7919).toLocaleString()} results</p>
          {[
            [`${q} - Wikipedia, the free encyclopedia`, `https://en.m.wikipedia.org/wiki/Special:Search?search=${enc}`, "en.wikipedia.org", `Read about ${q} on Wikipedia, the free encyclopedia that anyone can edit.`],
            [`${q} — Official site`, `https://www.example.com/?q=${enc}`, "www.example.com", `The official home of ${q}. Find news, downloads and support.`],
            [`Images of ${q}`, `https://www.bing.com/images/search?q=${enc}`, "www.bing.com/images", `Browse thousands of ${q} photos and pictures.`],
            [`Search ${q} on the real Bing`, `https://www.bing.com/search?q=${enc}`, "www.bing.com", "Open this search in a new browser tab for live web results."],
          ].map(([t, u, d, s]) => <div key={t} className="bing-r"><a onClick={() => (u.includes("bing.com") ? window.open(u, "_blank") : go(u))}>{t}</a><div className="url">{d}</div><div>{s}</div></div>)}
        </div>
      ) : <p style={{ padding: 20 }}>Type a search above.</p>}
    </div>
  );
}
function ErrorPage({ offline, url }: { offline: boolean; url: string }) {
  return (
    <div className="iepg err">
      <h2>{offline ? "Internet Explorer cannot display the webpage" : "The page cannot be displayed"}</h2>
      <hr />
      <p><b>What you can try:</b></p>
      <ul><li>Diagnose Connection Problems</li><li>More information</li></ul>
      <p style={{ color: "#555" }}>{url}</p>
      {offline && <Btn onClick={() => openCP("network")}>Open Network and Sharing Center</Btn>}
    </div>
  );
}

export function IE({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const s = useStore((st) => st.settings);
  const online = s.defaults.net !== "off";
  const [tabs, setTabs] = useState<Tab[]>(() => [mk(normalize(win.props.url || (win.props.newtab ? "about:blank" : s.ie.home)))]);
  const [active, setActive] = useState(() => tabs[0]?.id);
  const [addr, setAddr] = useState("");
  const [zoom, setZoom] = useState(100);
  const [panel, setPanel] = useState<null | "fav" | "hist">(null);
  const [info, setInfo] = useState(true);
  const [priv] = useState(!!win.props.private);
  const [loading, setLoading] = useState(false);
  const [twidth, setTwidth] = useState(170);
  const [drag, setDrag] = useState<TabDrag | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const tab = tabs.find((t) => t.id === active) || tabs[0];
  const addrRef = useRef<HTMLInputElement>(null);

  const upd = (id: number, p: Partial<Tab>) => setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const nav = (url: string, id = tab.id) => {
    url = normalize(url);
    playSys("navigation");
    const t = tabs.find((x) => x.id === id)!;
    upd(id, { url, hist: [...t.hist.slice(0, t.hi + 1), url], hi: t.hi + 1, title: "Loading..." });
    setInfo(true);
  };
  useEffect(() => {
    setAddr(tab.url.startsWith("file:") ? "file:///" + (fs[tab.url.slice(5)]?.name || "") : tab.url === "about:blank" ? "about:blank" : tab.url);
    setLoading(true);
    const t = setTimeout(() => {
      setLoading(false);
      const t2 = getState();
      upd(tab.id, { title: titleFor(tab.url, fs[tab.url.slice(5)]?.name) });
      if (!priv && tab.url !== "about:blank" && !tab.url.startsWith("file:")) setSettings({ ie: { ...t2.settings.ie, history: [tab.url, ...t2.settings.ie.history.filter((h) => h !== tab.url)].slice(0, 60) } });
    }, 350);
    return () => clearTimeout(t);
  }, [tab.id, tab.url, tab.nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setWin(win.id, { title: `${tab.title}${priv ? " [InPrivate]" : ""} - Windows Internet Explorer` }), [tab.title, win.id, priv]);

  const back = () => tab.hi > 0 && upd(tab.id, { hi: tab.hi - 1, url: tab.hist[tab.hi - 1] });
  const fwd = () => tab.hi < tab.hist.length - 1 && upd(tab.id, { hi: tab.hi + 1, url: tab.hist[tab.hi + 1] });
  const refresh = () => upd(tab.id, { nonce: tab.nonce + 1 });
  const newTab = (url = "about:blank") => { const t = mk(url); setTabs((ts) => [...ts, t]); setActive(t.id); };
  const closeTab = (id: number) => {
    if (tabs.length === 1) return closeWin(win.id);
    const i = tabs.findIndex((t) => t.id === id);
    const nt = tabs.filter((t) => t.id !== id);
    setTabs(nt);
    if (active === id) setActive(nt[Math.max(0, i - 1)].id);
  };
  const menuAt = (e: React.MouseEvent, items: MenuItem[]) => {
    const r = e.currentTarget.getBoundingClientRect();
    showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, items);
  };
  /* ---------------------------------------------------------- tab dragging
   * Windows 7 lets you grab a tab and drop it somewhere else in the strip to
   * reorder tabs, or pull it clear of the strip to open it in its own window.
   * A live ghost follows the pointer; the other tabs slide out of its way. */
  const tabDown = (e: React.PointerEvent, t: Tab, index: number) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".ie-tabx")) return;
    const startX = e.clientX;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grab = e.clientX - rect.left;
    let moved = false;
    let st: TabDrag | null = null;
    const row = () => rowRef.current?.getBoundingClientRect();
    const mv = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) < 5) return;
      moved = true;
      const r = row();
      if (!r) return;
      const rel = ev.clientX - r.left - grab;
      const idx = Math.max(0, Math.min(tabs.length - 1, Math.round(rel / (twidth + 2))));
      const torn = ev.clientY < r.top - 14 || ev.clientY > r.bottom + 60;
      st = { id: t.id, from: index, dx: ev.clientX - startX, x: rel, over: idx, torn };
      setDrag(st);
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      const fin = st;
      setDrag(null);
      if (!moved) return setActive(t.id);
      if (!fin) return;
      if (fin.torn) {
        // tear the tab off into a new Internet Explorer window
        closeInPlace(t.id);
        openApp("ie", { url: t.url });
        return;
      }
      if (fin.over !== fin.from) {
        setTabs((ts) => {
          const next = ts.slice();
          const [m] = next.splice(fin.from, 1);
          next.splice(fin.over, 0, m);
          return next;
        });
      }
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const closeInPlace = (id: number) => {
    const i = tabs.findIndex((t) => t.id === id);
    const nt = tabs.filter((t) => t.id !== id);
    if (!nt.length) return;
    setTabs(nt);
    if (active === id) setActive(nt[Math.max(0, i - 1)].id);
  };
  /** resize handle on the right edge of the strip: all tabs grow/shrink */
  const widthDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX;
    const w0 = twidth;
    const mv = (ev: PointerEvent) => setTwidth(Math.max(84, Math.min(320, w0 + (ev.clientX - sx) / view.scale)));
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); document.body.classList.remove("col-resize"); };
    document.body.classList.add("col-resize");
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const addFav = () => {
    const f = s.ie.favs.some((x) => x.url === tab.url) ? s.ie.favs : [...s.ie.favs, { title: tab.title.slice(0, 40), url: tab.url }];
    setSettings({ ie: { ...s.ie, favs: f } });
    notify({ title: "Add a Favorite", text: `"${tab.title}" was added to Favorites.`, icon: "info" });
  };
  const clearHist = () => { setSettings({ ie: { ...s.ie, history: [] } }); msgBox({ title: "Delete Browsing History", text: "Your browsing history has been deleted.", icon: "info" }); };

  const content = () => {
    const u = tab.url;
    if (u === "about:home") return <HomePage go={nav} />;
    if (u === "about:blank") return <div className="iepg" />;
    if (u.startsWith("about:bing")) return <BingPage q={decodeURIComponent((u.split("q=")[1] || "").replace(/\+/g, " "))} go={nav} />;
    if (u === "about:news") return <div className="iepg news"><h1>MSN News</h1>{NEWS.map(([t, d]) => <div key={t} className="news-i"><h3>{t}</h3><p>{d}</p></div>)}</div>;
    if (u === "about:gadgets") return <div className="iepg"><h1>Windows Desktop Gadgets</h1><p>Gadgets are available from the Desktop Gadget Gallery included with Windows 7.</p><Btn def onClick={() => openApp("gadgets")}>Open Gadget Gallery</Btn></div>;
    if (u.startsWith("file:")) {
      const n = fs[u.slice(5)];
      return n ? <iframe className="ie-frame" title="local" sandbox="allow-same-origin" srcDoc={n.content || ""} /> : <ErrorPage offline={false} url={u} />;
    }
    if (!online) return <ErrorPage offline url={u} />;
    return (
      <>
        {info && <div className="ie-info"><Icon name="shield" size={16} /> If the page doesn&apos;t appear, the website may not allow display inside another page. <a onClick={() => window.open(u, "_blank")}>Open in a new browser tab</a><span onClick={() => setInfo(false)}>✕</span></div>}
        <iframe key={tab.nonce + u} className="ie-frame" title={u} src={u} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="no-referrer" />
      </>
    );
  };

  const key = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === "t") { e.preventDefault(); newTab(); }
    else if (e.ctrlKey && e.key.toLowerCase() === "w") { e.preventDefault(); closeTab(tab.id); }
    else if (e.ctrlKey && e.key === "Tab") { e.preventDefault(); const i = tabs.findIndex((t) => t.id === tab.id); setActive(tabs[(i + 1) % tabs.length].id); }
    else if (e.key === "F5") { e.preventDefault(); refresh(); }
    else if (e.ctrlKey && e.key.toLowerCase() === "l") { e.preventDefault(); addrRef.current?.select(); }
    else if (e.ctrlKey && e.key.toLowerCase() === "d") { e.preventDefault(); addFav(); }
    else if (e.altKey && e.key === "ArrowLeft") back();
    else if (e.altKey && e.key === "ArrowRight") fwd();
  };

  return (
    <div className="ie" tabIndex={0} onKeyDown={key}>
      <GlassBar winId={win.id}>
        <div className="ex-navbar">
          <div className="ex-navbtns">
            <button className="navbtn" disabled={tab.hi === 0} onClick={back} title="Back (Alt+Left)"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 2L4 8l6 6" stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" /></svg></button>
            <button className="navbtn fwd" disabled={tab.hi >= tab.hist.length - 1} onClick={fwd} title="Forward"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 2l6 6-6 6" stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" /></svg></button>
          </div>
          <div className="ex-addr">
            <Icon name="ie" size={16} />
            <input ref={addrRef} className="ex-addr-in" value={addr} onChange={(e) => setAddr(e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") nav(addr); }} />
            <button className="ex-refresh" onClick={loading ? () => setLoading(false) : refresh} title={loading ? "Stop" : "Refresh (F5)"}>{loading ? "✕" : "⟳"}</button>
          </div>
          <div className="ex-search"><input placeholder="Bing" onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") { nav("about:bing?q=" + encodeURIComponent((e.target as HTMLInputElement).value)); (e.target as HTMLInputElement).value = ""; } }} /><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="5.500" cy="5.500" r="4" fill="none" stroke="#5a7aa8" strokeWidth="1.600" /><path d="M8.500 8.500L13 13" stroke="#5a7aa8" strokeWidth="2" /></svg></div>
        </div>
      </GlassBar>
      <div className="ie-fav">
        <span className="ie-favbtn" onClick={() => setPanel(panel === "fav" ? null : "fav")}>★ Favorites</span>
        <span className="ie-favbtn" onClick={addFav}>Add to Favorites</span>
        <span className="sep" />
        {s.ie.favs.slice(0, 6).map((f) => <span key={f.url} className="ie-favbtn" onClick={() => nav(f.url)}><Icon name="ie" size={14} /> {f.title}</span>)}
      </div>
      <div className="ie-tabs">
        <div className={"ie-tabrow" + (drag ? " dragging" : "")} ref={rowRef} style={{ ["--tw" as string]: twidth + "px" }}>
          {tabs.map((t, i) => {
            const d = drag && drag.id === t.id ? drag : null;
            const shift = drag && !d && drag.from < i && drag.over >= i ? -1 : drag && !d && drag.from > i && drag.over <= i ? 1 : 0;
            return (
              <div
                key={t.id}
                className={"ie-tab" + (t.id === tab.id ? " sel" : "") + (d ? " dragging" + (d.torn ? " torn" : "") : "")}
                style={{
                  ["--shift" as string]: `${shift * (twidth + 2)}px`,
                  ...(d ? { ["--dx" as string]: d.dx + "px", zIndex: 5 } : {}),
                }}
                onPointerDown={(e) => tabDown(e, t, i)}
                onAuxClick={(e) => e.button === 1 && closeTab(t.id)}
                title={t.title}
              >
                <Icon name="ie" size={14} /><span>{t.title}</span>
                <i className="ie-tabx" onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}>✕</i>
              </div>
            );
          })}
          <div className="ie-newtab" onClick={() => newTab()} title="New Tab (Ctrl+T)">+</div>
          <div className="ie-tabgrip" onPointerDown={widthDown} title="Drag to resize all tabs" />
        </div>
        <div className="ie-cmds">
          <span title="Home" onClick={() => nav(s.ie.home)}>⌂ Home</span>
          <span title="Feeds" onClick={() => nav("about:news")}>◔ Feeds</span>
          <span title="History" onClick={() => setPanel(panel === "hist" ? null : "hist")}>⏲ History</span>
          <span title="Print" onClick={() => msgBox({ title: "Print", text: "No printer is installed.", icon: "warn" })}>⎙ Print ▾</span>
          <span onClick={(e) => menuAt(e, [{ label: "New window", onClick: () => openApp("ie") }, { label: "New tab", shortcut: "Ctrl+T", onClick: () => newTab() }, { label: "Duplicate tab", onClick: () => newTab(tab.url) }, { sep: true }, { label: "Zoom", sub: [200, 150, 125, 100, 75, 50].map((z) => ({ label: z + "%", checked: zoom === z, radio: true, onClick: () => setZoom(z) })) }, { label: "View source", onClick: () => openApp("notepad", { file: tab.url.startsWith("file:") ? tab.url.slice(5) : undefined }) }, { sep: true }, { label: "Close tab", shortcut: "Ctrl+W", onClick: () => closeTab(tab.id) }])}>Page ▾</span>
          <span onClick={(e) => menuAt(e, [{ label: "Delete browsing history...", onClick: clearHist }, { label: "InPrivate Browsing", onClick: () => openApp("ie", { private: true }) }, { label: "Pop-up Blocker", checked: true }, { label: "SmartScreen Filter", checked: true }])}>Safety ▾</span>
          <span onClick={(e) => menuAt(e, [{ label: "Delete browsing history...", onClick: clearHist }, { label: "InPrivate Browsing", onClick: () => openApp("ie", { private: true }) }, { label: "Compatibility View", onClick: () => msgBox({ title: "Compatibility View", text: "This website is displayed in Compatibility View.", icon: "info" }) }, { sep: true }, { label: "Full screen", shortcut: "F11", onClick: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()) }, { label: "Internet options", onClick: () => openCP("inetopts") }, { sep: true }, { label: "Set this page as home page", onClick: () => { setSettings({ ie: { ...s.ie, home: tab.url } }); notify({ title: "Internet Explorer", text: "Home page set.", icon: "info" }); } }])}>Tools ▾</span>
          <span onClick={(e) => menuAt(e, [{ label: "Help and Support", onClick: () => openApp("help") }, { label: "About Internet Explorer", onClick: () => msgBox({ title: "About Internet Explorer", text: "Windows® Internet Explorer 8\nVersion: 8.0.7601.17514\nCipher Strength: 128-bit\nCopyright © 2009 Microsoft Corporation", icon: "info" }) }])}>❓ Help ▾</span>
        </div>
      </div>
      <div className="ie-main">
        {panel && (
          <div className="ie-panel">
            <div className="ie-panel-h"><b>{panel === "fav" ? "Favorites" : "History"}</b><span onClick={() => setPanel(null)}>✕</span></div>
            {panel === "fav" ? s.ie.favs.map((f) => <div key={f.url} className="ie-pi" onClick={() => nav(f.url)} onContextMenu={(e) => { e.preventDefault(); showMenu(e, [{ label: "Open", onClick: () => nav(f.url) }, { label: "Delete", onClick: () => setSettings({ ie: { ...s.ie, favs: s.ie.favs.filter((x) => x.url !== f.url) } }) }]); }}><Icon name="favorites" size={14} /> {f.title}</div>)
              : s.ie.history.length ? s.ie.history.map((h) => <div key={h} className="ie-pi" onClick={() => nav(h)}><Icon name="ie" size={14} /> {h.replace(/^https?:\/\//, "")}</div>) : <div className="ie-pi dim">No history.</div>}
          </div>
        )}
        <div className="ie-content" style={{ zoom: zoom / 100 }}>{content()}</div>
      </div>
      <div className="ie-status"><span>{loading ? "Opening page " + tab.url : "Done"}</span><span style={{ flex: 1 }} />{priv && <span>InPrivate</span>}<span>{online ? "Internet | Protected Mode: On" : "Offline"}</span><span onClick={(e) => menuAt(e, [200, 150, 125, 100, 75, 50].map((z) => ({ label: z + "%", checked: zoom === z, radio: true, onClick: () => setZoom(z) })))}>🔍 {zoom}% ▾</span></div>
      {void setState}
    </div>
  );
}
