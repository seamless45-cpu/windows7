"use client";
/**
 * Windows Media Center (ehshell.exe) — the ten-foot interface that shipped with
 * Windows 7 Home Premium and Ultimate.
 *
 * The real product is a full-screen console with a Start menu strip, a rotating
 * background of your pictures, and horizontal "shelves" of tiles. This is the
 * same layout: Pictures + Videos, Music, TV & Movies, Tasks and Settings, with
 * the media it browses taken from the simulated Pictures, Music and Videos
 * libraries. The green-and-blue colour scheme and the arrow-key navigation are
 * the ones Media Center used.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Win, useStore, getState, closeWin, children, notify } from "../store";
import { Icon } from "../icons";

type Page = "home" | "pictures" | "music" | "video" | "tv" | "tasks" | "settings" | "playing" | "slideshow";

const MENU: { id: Page; label: string; sub: string; icon: string }[] = [
  { id: "pictures", label: "Pictures + Videos", sub: "Browse your pictures and videos", icon: "pictures" },
  { id: "music", label: "Music", sub: "Play albums, songs and playlists", icon: "music" },
  { id: "tv", label: "TV + Movies", sub: "Play recorded TV and DVDs", icon: "video" },
  { id: "tasks", label: "Tasks", sub: "Burn, sync and manage media", icon: "programs" },
  { id: "settings", label: "Settings", sub: "Set up Media Center", icon: "services" },
];

const TRACKS = [
  { name: "Aero", artist: "Windows", album: "Windows 7 Sounds", len: 214 },
  { name: "Kalimba", artist: "Mr. Scruff", album: "Ninja Tuna", len: 302 },
  { name: "Beyond the Sea", artist: "Bobby Darin", album: "That's All", len: 168 },
  { name: "Gymnopédie No. 1", artist: "Erik Satie", album: "Trois Gymnopédies", len: 214 },
  { name: "Symphony No. 9 — Ode to Joy", artist: "Beethoven", album: "Symphony No. 9", len: 392 },
];

const mediaFiles = (dir: string, ext: string) => children(dir).filter((n) => n.name.toLowerCase().endsWith(ext));

export function MediaCenter({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const [page, setPage] = useState<Page>("home");
  const [cursor, setCursor] = useState(0);
  const [sub, setSub] = useState(0);
  const [now, setNow] = useState<{ title: string; artist: string; art: string; pos: number; len: number } | null>(null);
  const [tick, setTick] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [volume, setVolume] = useState(60);
  const [muted, setMuted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // children() reads the live store, so fs is the dependency that re-reads them
  const pics = useMemo(() => { void fs; return mediaFiles("pics", ".jpg"); }, [fs]);
  const vids = useMemo(() => { void fs; return children("vids"); }, [fs]);
  const art = pics[0]?.content || "";

  useEffect(() => { ref.current?.focus(); }, [page]);
  useEffect(() => {
    if (!now) return;
    const i = setInterval(() => {
      setNow((n) => {
        if (!n) return n;
        const pos = n.pos + 1;
        return pos > n.len ? { ...n, pos: 0 } : { ...n, pos };
      });
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(i);
  }, [now?.title]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (page !== "slideshow") return;
    const i = setInterval(() => setSlideIdx((n) => (n + 1) % Math.max(1, pics.length)), 4000);
    return () => clearInterval(i);
  }, [page, pics.length]);

  const play = (title: string, artist: string, len: number, image: string) => {
    setNow({ title, artist, art: image, pos: 0, len });
    setPage("playing");
  };

  const items = (): { label: string; sub?: string; icon?: string; image?: string; action: () => void }[] => {
    if (page === "pictures") return pics.map((p) => ({ label: p.name.replace(/\.jpg$/, ""), image: p.content, action: () => { setSlideIdx(Math.max(0, pics.findIndex((x) => x.id === p.id))); setPage("slideshow"); } }));
    if (page === "video") return vids.map((v) => ({ label: v.name, icon: "video", sub: `${(v.size / 1e6).toFixed(1)} MB`, action: () => play(v.name, "Videos library", 30, art) }));
    if (page === "music") return TRACKS.map((t, i) => ({ label: t.name, sub: t.artist, icon: "music", action: () => play(t.name, t.artist, t.len, art) }));
    if (page === "tv") return [
      { label: "Recorded TV", icon: "video", sub: "No recordings yet", action: () => notify({ title: "Media Center", text: "No TV tuner is installed, so there is nothing recorded.", icon: "info" }) },
      { label: "Play DVD", icon: "dvd", sub: "Insert a disc", action: () => notify({ title: "Media Center", text: "There is no disc in the DVD drive.", icon: "warn" }) },
      { label: "Internet TV", icon: "ie", sub: "Not available offline", action: () => notify({ title: "Media Center", text: "Internet TV needs a connection to the Internet.", icon: "info" }) },
      { label: "Movies", icon: "video", sub: "Videos library", action: () => setPage("video") },
    ];
    if (page === "tasks") return [
      { label: "Burn CD/DVD", icon: "cd", sub: "Create a disc", action: () => notify({ title: "Media Center", text: "There is no recordable disc in the drive.", icon: "info" }) },
      { label: "Sync portable device", icon: "usb", sub: "Copy music to a player", action: () => notify({ title: "Media Center", text: "No portable device is connected.", icon: "info" }) },
      { label: "Add Extender", icon: "network", sub: "Media Center Extender", action: () => notify({ title: "Media Center", text: "No Media Center Extender was found on the network.", icon: "info" }) },
      { label: "Settings", icon: "services", sub: "General, TV, Pictures, Music", action: () => setPage("settings") },
    ];
    if (page === "settings") return [
      { label: "General", icon: "services", sub: "Startup and behaviour", action: () => notify({ title: "Media Center", text: "General settings: start Media Center as a window; media-only UI off.", icon: "info" }) },
      { label: "TV", icon: "video", sub: "Set up a TV signal", action: () => notify({ title: "Media Center", text: "No TV tuner hardware was found.", icon: "warn" }) },
      { label: "Pictures", icon: "pictures", sub: "Slide show behaviour", action: () => notify({ title: "Media Center", text: "Slide show: 4 second delay, shuffle on, music from Pictures library.", icon: "info" }) },
      { label: "Music", icon: "music", sub: "Now playing options", action: () => notify({ title: "Media Center", text: "Music: visualisation on, cross-fade 3 s.", icon: "info" }) },
      { label: "Extender", icon: "network", sub: "Add an Extender", action: () => notify({ title: "Media Center", text: "No Extender was found.", icon: "info" }) },
    ];
    return MENU.map((m) => ({ label: m.label, sub: m.sub, icon: m.icon, action: () => { setPage(m.id); setCursor(0); } }));
  };

  const list = items();
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const onKey = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "ArrowRight") setCursor((c) => Math.min(list.length - 1, c + 1));
    else if (e.key === "ArrowLeft") setCursor((c) => Math.max(0, c - 1));
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { if (page !== "home") setCursor((c) => Math.min(list.length - 1, Math.max(0, c))); }
    else if (e.key === "Enter") list[cursor]?.action();
    else if (e.key === "Escape" || e.key === "Backspace") { if (page === "home") closeWin(win.id); else setPage("home"); }
    else if (e.key === " ") { if (now) setNow({ ...now }); }
  };

  const bgPics = pics.length ? pics : [{ id: "none", name: "Sample picture", content: art }];
  const bg = bgPics[(sub + tick / 8 | 0) % bgPics.length]?.content || art;

  return (
    <div className="mc" tabIndex={-1} ref={ref} onKeyDown={onKey} onClick={() => ref.current?.focus()}>
      <div className="mc-fan" style={{ backgroundImage: `url("${bg}")` }} />
      <div className="mc-shade" />
      <div className="mc-top">
        {page !== "home" ? <button className="mc-back" onClick={() => setPage("home")}>‹ back</button> : <span className="mc-back ghost">‹ back</span>}
        <span className="mc-title">{page === "home" ? "Windows Media Center" : page === "playing" ? "Now Playing" : page === "slideshow" ? "Slide show" : MENU.find((m) => m.id === page)?.label || "Settings"}</span>
        <span className="mc-clock">{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
        <button className="mc-vol" onClick={() => setMuted(!muted)} title="Mute">{muted ? "🔇" : "🔊"}</button>
      </div>

      {page === "home" && (
        <div className="mc-home">
          <div className="mc-strip">
            {list.map((it, i) => (
              <div key={it.label} className={"mc-tile" + (i === cursor ? " sel" : "")} onMouseEnter={() => setCursor(i)} onClick={() => it.action()}>
                <Icon name={it.icon || "folder"} size={54} />
                <b>{it.label}</b>
                <span>{it.sub}</span>
              </div>
            ))}
          </div>
          {now && (
            <div className="mc-now" onClick={() => setPage("playing")}>
              <div className="mc-now-art" style={{ backgroundImage: `url("${now.art}")` }} />
              <div><b>Now playing — {now.title}</b><span>{now.artist} · {mmss(now.pos)} / {mmss(now.len)}</span></div>
              <button onClick={(e) => { e.stopPropagation(); setNow(null); }}>■</button>
            </div>
          )}
        </div>
      )}

      {(page === "pictures" || page === "music" || page === "video" || page === "tv" || page === "tasks" || page === "settings") && (
        <div className="mc-shelf">
          {list.map((it, i) => (
            <div key={it.label + i} className={"mc-cell" + (i === cursor ? " sel" : "")} onMouseEnter={() => setCursor(i)} onClick={() => it.action()} onDoubleClick={() => it.action()}>
              {it.image ? <div className="mc-thumb" style={{ backgroundImage: `url("${it.image}")` }} /> : <div className="mc-thumb icon"><Icon name={it.icon || "folder"} size={44} /></div>}
              <b>{it.label}</b>
              {it.sub && <span>{it.sub}</span>}
            </div>
          ))}
          {!list.length && <div className="mc-empty">There is nothing in this library yet.</div>}
        </div>
      )}

      {page === "playing" && now && (
        <div className="mc-play">
          <div className="mc-play-art" style={{ backgroundImage: `url("${now.art}")` }} />
          <div className="mc-play-info">
            <b>{now.title}</b><span>{now.artist}</span>
            <div className="mc-bar"><i style={{ width: (now.len ? (now.pos / now.len) * 100 : 0) + "%" }} /></div>
            <div className="mc-times"><span>{mmss(now.pos)}</span><span>{mmss(now.len)}</span></div>
            <div className="mc-controls">
              <button onClick={() => setNow({ ...now, pos: 0 })}>⏮</button>
              <button className="big" onClick={() => setNow({ ...now })}>⏸</button>
              <button onClick={() => setNow({ ...now, pos: Math.max(0, now.pos - 10) })}>⏪</button>
              <button onClick={() => setNow({ ...now, pos: Math.min(now.len, now.pos + 10) })}>⏩</button>
              <button onClick={() => setNow({ ...now, pos: now.len })}>⏭</button>
            </div>
            <div className="mc-volume"><span>Volume {muted ? "muted" : volume + "%"}</span><input type="range" min={0} max={100} value={muted ? 0 : volume} onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }} /></div>
          </div>
        </div>
      )}

      {page === "slideshow" && (
        <div className="mc-slide" onClick={() => setPage("pictures")}>
          <div className="mc-slide-img" style={{ backgroundImage: `url("${bgPics[slideIdx]?.content || art}")` }} />
          <div className="mc-slide-foot">
            <span>{bgPics[slideIdx]?.name.replace(/\.jpg$/, "")}</span>
            <span>{slideIdx + 1} of {bgPics.length}</span>
            <button onClick={(e) => { e.stopPropagation(); setSlideIdx((n) => (n + 1) % bgPics.length); }}>next ›</button>
          </div>
        </div>
      )}

      <div className="mc-foot">
        <span>Use the arrow keys and Enter · Esc goes back</span>
        <span style={{ marginLeft: "auto" }}>{getState().settings.currentUser} · Windows Media Center</span>
      </div>
    </div>
  );
}
