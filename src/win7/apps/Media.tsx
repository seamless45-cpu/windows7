"use client";
import React, { useEffect, useRef, useState } from "react";
import { Win, useStore, getState, setWin, openApp, msgBox, children, extOf, FsNode, mkfile, trashNodes, notify, progressDialog, closeWin, showMenu, view } from "../store";
import { Icon } from "../icons";
import { Btn, Check, Slider } from "../ui";
import { tone, snd, ac } from "../sound";
import { openFileDialog } from "../dialogs";
import { TRACKS } from "../data";

/* ============================================================ Media Player */
interface Track { id: string; title: string; artist: string; album: string; len: number; kind: "audio" | "video"; src: string }
const AUDIO_EXT = ["mp3", "wma", "wav", "m4a", "ogg"];
const VIDEO_EXT = ["wmv", "mp4", "avi", "webm", "mpg"];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const trackOf = (n: FsNode): Track => {
  const e = extOf(n.name);
  return { id: n.id, title: n.name.replace(/\.[^.]+$/, ""), artist: n.meta?.artist || "Unknown Artist", album: n.meta?.album || "Unknown Album", len: n.meta?.len || 120, kind: VIDEO_EXT.includes(e) ? "video" : "audio", src: n.content || "" };
};
const rnd = (seed: number, n: number) => { const x = Math.sin((seed + 1) * 999 + n * 12.9898) * 43758.5453; return x - Math.floor(x); };

export function MediaPlayer({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const [view2, setView2] = useState<"library" | "now">("library");
  const [section, setSection] = useState<"music" | "videos" | "pictures" | "playlists">("music");
  const [extra, setExtra] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [cur, setCur] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [vol, setVol] = useState(70);
  const [mute, setMute] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "all" | "one">("off");
  const [nonce, setNonce] = useState(0);
  const [selRow, setSelRow] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<{ name: string; items: Track[] }[]>([]);
  const el = useRef(0);
  const aud = useRef<HTMLAudioElement | null>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const volRef = useRef(vol);
  volRef.current = mute ? 0 : vol;

  const music = children("music", fs).filter((n) => AUDIO_EXT.includes(extOf(n.name))).map(trackOf).concat(extra.filter((t) => t.kind === "audio"));
  const videos = children("vids", fs).filter((n) => VIDEO_EXT.includes(extOf(n.name))).map(trackOf).concat(extra.filter((t) => t.kind === "video"));
  const pics = children("pics", fs).filter((n) => n.content?.startsWith("data:image"));
  const track = queue[cur];

  const play = (list: Track[], i: number) => {
    if (!list.length) return;
    setQueue(list);
    setCur(i);
    el.current = 0;
    setElapsed(0);
    setPlaying(true);
    setNonce((n) => n + 1);
    setView2("now");
  };
  useEffect(() => {
    const p = win.props;
    if (p.file && fs[p.file]) {
      const t = trackOf(fs[p.file]);
      play([t], 0);
    } else if (p.playAll) {
      const l = p.playAll === "vids" ? videos : music;
      play(l, 0);
    }
  }, [win.props]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = (auto = false) => {
    if (!queue.length) return;
    if (auto && repeat === "one") { el.current = 0; setNonce((n) => n + 1); return; }
    let n = shuffle ? Math.floor(Math.random() * queue.length) : cur + 1;
    if (n >= queue.length) {
      if (repeat === "all" || !auto) n = 0;
      else { setPlaying(false); el.current = 0; setElapsed(0); return; }
    }
    setCur(n);
    el.current = 0;
    setElapsed(0);
    setNonce((x) => x + 1);
  };
  const prev = () => {
    if (!queue.length) return;
    if (el.current > 3) { el.current = 0; setElapsed(0); setNonce((x) => x + 1); return; }
    setCur((cur - 1 + queue.length) % queue.length);
    el.current = 0;
    setElapsed(0);
    setNonce((x) => x + 1);
  };

  // playback engine
  useEffect(() => {
    if (!track || !playing) return;
    const real = track.src.startsWith("data:") || track.src.startsWith("blob:");
    let timer: ReturnType<typeof setInterval> | undefined;
    const t0 = performance.now() - el.current * 1000;
    let a: HTMLAudioElement | HTMLVideoElement | null = null;
    if (real) {
      a = track.kind === "video" ? vid.current : (aud.current ||= new Audio());
      if (a) {
        a.src = track.src;
        a.currentTime = el.current;
        a.volume = Math.min(1, (volRef.current / 100) * (snd.muted ? 0 : snd.vol * 1.4 + 0.1));
        a.onended = () => next(true);
        a.play().catch(() => {});
      }
    } else {
      const seed = track.kind === "video" ? (track.title.length % 5) + 2 : Math.max(0, parseInt(track.src.replace("synth:", "")) || 0);
      let step = Math.floor(el.current / (60 / (70 + seed * 12) / 2));
      const ms = 60000 / (70 + seed * 12) / 2;
      const base = [220, 246.94, 261.63, 196, 293.66, 174.61][seed % 6];
      const scale = [0, 2, 4, 7, 9, 12];
      const note = () => {
        const v = (volRef.current / 100) * (snd.muted ? 0 : Math.max(0.15, snd.vol));
        const idx = Math.floor(rnd(seed, step) * 6);
        const f = base * Math.pow(2, scale[idx] / 12) * (rnd(seed, step + 100) > 0.75 ? 2 : 1);
        if (rnd(seed, step + 7) > 0.25) tone(f, 0, 0.55, "triangle", 0.16 * v);
        if (step % 8 === 0) { tone(base / 2, 0, 1.7, "sine", 0.18 * v); tone(base * 1.5, 0, 1.7, "sine", 0.1 * v); }
        step++;
      };
      note();
      timer = setInterval(note, ms);
    }
    const prog = setInterval(() => {
      const e = a && real ? a.currentTime : (performance.now() - t0) / 1000;
      el.current = e;
      setElapsed(e);
      if (!real && e >= track.len) next(true);
    }, 250);
    return () => {
      if (timer) clearInterval(timer);
      clearInterval(prog);
      if (a) { a.onended = null; a.pause(); }
    };
  }, [track?.id, playing, nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const a = aud.current;
    if (a) a.volume = Math.min(1, (volRef.current / 100) * (snd.muted ? 0 : snd.vol * 1.4 + 0.1));
    if (vid.current) vid.current.volume = Math.min(1, volRef.current / 100);
  }, [vol, mute]);
  useEffect(() => () => { aud.current?.pause(); }, []);

  // visualisation
  useEffect(() => {
    const c = cvs.current;
    if (!c || view2 !== "now") return;
    const g = c.getContext("2d")!;
    let raf = 0;
    let t = 0;
    const draw = () => {
      const W = (c.width = c.clientWidth), H = (c.height = c.clientHeight);
      t += playing ? 0.05 : 0.004;
      const isVid = track?.kind === "video" && !(track.src.startsWith("data:") || track.src.startsWith("blob:"));
      const gr = g.createLinearGradient(0, 0, W, H);
      gr.addColorStop(0, isVid ? "#102a58" : "#0b1830");
      gr.addColorStop(1, isVid ? "#4a2a78" : "#1d3d6e");
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      if (isVid) {
        for (let i = 0; i < 6; i++) {
          g.fillStyle = `hsla(${(t * 30 + i * 60) % 360},80%,60%,.5)`;
          g.beginPath();
          g.arc(W / 2 + Math.cos(t + i) * W * 0.3, H / 2 + Math.sin(t * 1.3 + i * 2) * H * 0.3, 30 + 20 * Math.sin(t + i), 0, 7);
          g.fill();
        }
        g.fillStyle = "#fff";
        g.font = "20px Segoe UI";
        g.fillText(track.title, 20, H - 24);
      } else {
        const n = 36;
        for (let i = 0; i < n; i++) {
          const h = (playing ? 0.15 + 0.85 * Math.abs(Math.sin(t * (1.1 + (i % 5) * 0.3) + i)) : 0.04) * H * 0.55;
          const x = (W / n) * i + 2;
          const gg = g.createLinearGradient(0, H, 0, H - h);
          gg.addColorStop(0, "#1a5fd0");
          gg.addColorStop(1, "#7fe0ff");
          g.fillStyle = gg;
          g.fillRect(x, H - h - 20, W / n - 4, h);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [view2, playing, track]);

  const openExternal = () => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "audio/*,video/*";
    i.multiple = true;
    i.onchange = () => {
      const ts: Track[] = Array.from(i.files || []).map((f) => ({ id: "x" + f.name + f.size, title: f.name.replace(/\.[^.]+$/, ""), artist: "Local file", album: "Imported", len: 180, kind: f.type.startsWith("video") ? "video" : "audio", src: URL.createObjectURL(f) }));
      if (ts.length) { setExtra((x) => [...x, ...ts]); play(ts, 0); }
    };
    i.click();
  };
  const toggle = () => {
    if (!queue.length) return play(section === "videos" ? videos : music, 0);
    setPlaying(!playing);
  };
  const stop = () => { setPlaying(false); el.current = 0; setElapsed(0); };
  const seek = (v: number) => { el.current = v; setElapsed(v); setNonce((n) => n + 1); };
  const list = section === "videos" ? videos : music;
  const dur = track ? (track.src.startsWith("data:") || track.src.startsWith("blob:") ? (aud.current?.duration && isFinite(aud.current.duration) ? aud.current.duration : vid.current?.duration && isFinite(vid.current.duration) ? vid.current.duration : track.len) : track.len) : 0;

  return (
    <div className="wmp" tabIndex={0} onKeyDown={(e) => { if (e.key === " ") { e.preventDefault(); toggle(); } }}>
      <div className="wmp-top">
        <div className="wmp-navbtns"><button className="navbtn" onClick={() => setView2("library")}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 2L4 8l6 6" stroke="#fff" strokeWidth="3" fill="none" /></svg></button><button className="navbtn fwd" onClick={() => track && setView2("now")}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 2l6 6-6 6" stroke="#fff" strokeWidth="3" fill="none" /></svg></button></div>
        <div className="wmp-menus">
          <span onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, [{ label: "Open file...", onClick: openExternal }, { label: "Add to library from Music folder", onClick: () => openApp("explorer", { path: "music" }) }, { label: "Manage libraries", onClick: () => openApp("explorer", { path: "libraries" }) }, { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }]); }}>Organize ▾</span>
          <span onClick={() => msgBox({ title: "Stream", text: "Allow Internet access to home media is not enabled. Streaming is unavailable in this simulation.", icon: "info" })}>Stream ▾</span>
          <span onClick={() => { if (!queue.length) return; setPlaylists((p) => [...p, { name: "Playlist " + (p.length + 1), items: queue }]); notify({ title: "Windows Media Player", text: "Playlist saved.", icon: "info" }); }}>Create playlist ▾</span>
        </div>
        <div className="wmp-tabs"><span className={view2 === "library" ? "on" : ""} onClick={() => setView2("library")}>Library</span><span className={view2 === "now" ? "on" : ""} onClick={() => setView2("now")}>Now Playing</span></div>
      </div>
      <div className="wmp-body">
        {view2 === "library" ? (
          <>
            <div className="wmp-left">
              <div className="wl-h">Playlists</div>
              {playlists.map((p) => <div key={p.name} className="wl-i sub" onClick={() => { setSection("playlists"); }} onDoubleClick={() => play(p.items, 0)}>{p.name}</div>)}
              <div className="wl-h">Library</div>
              {([["music", "Music", "music"], ["videos", "Videos", "videos"], ["pictures", "Pictures", "pictures"]] as const).map(([k, l, ic]) => <div key={k} className={"wl-i" + (section === k ? " sel" : "")} onClick={() => setSection(k)}><Icon name={ic} size={16} /> {l}</div>)}
              <div className="wl-h">Other Libraries</div>
              <div className="wl-i" onClick={openExternal}>Open local file...</div>
            </div>
            <div className="wmp-center">
              {section === "pictures" ? (
                <div className="wmp-pics">{pics.map((p) => <div key={p.id} className="wmp-pic" onDoubleClick={() => openApp("photos", { file: p.id })}><img src={p.content} alt="" /><span>{p.name}</span></div>)}</div>
              ) : section === "playlists" ? (
                <div className="wmp-empty">Double-click a playlist on the left to play it.</div>
              ) : (
                <>
                  <div className="wmp-th"><span style={{ width: 30 }}>#</span><span style={{ flex: 2 }}>Title</span><span style={{ width: 60 }}>Length</span><span style={{ flex: 1.4 }}>Contributing artist</span><span style={{ flex: 1.4 }}>Album</span></div>
                  <div className="wmp-rows">
                    {list.map((t, i) => (
                      <div key={t.id} className={"wmp-row" + (selRow === t.id ? " sel" : "") + (track?.id === t.id ? " now" : "")} onClick={() => setSelRow(t.id)} onDoubleClick={() => play(list, i)}>
                        <span style={{ width: 30 }}>{track?.id === t.id && playing ? "▶" : i + 1}</span><span style={{ flex: 2 }}>{t.title}</span><span style={{ width: 60 }}>{fmt(t.len)}</span><span style={{ flex: 1.4 }}>{t.artist}</span><span style={{ flex: 1.4 }}>{t.album}</span>
                      </div>
                    ))}
                    {!list.length && <div className="wmp-empty">No items found. Add files to your {section === "videos" ? "Videos" : "Music"} folder.</div>}
                  </div>
                </>
              )}
            </div>
            <div className="wmp-right">
              <div className="wr-h"><b>Play</b><span>Burn</span><span>Sync</span></div>
              <div className="wr-list">
                {queue.length ? queue.map((t, i) => <div key={t.id + i} className={"wr-i" + (i === cur ? " cur" : "")} onDoubleClick={() => { setCur(i); el.current = 0; setElapsed(0); setPlaying(true); setNonce((n) => n + 1); }}><span>{t.title}</span><em>{fmt(t.len)}</em></div>) : <div className="wr-empty">Drag items here to create a playlist, or double-click an item in the library.</div>}
              </div>
              <div className="wr-foot"><a onClick={() => { setQueue([]); setCur(-1); stop(); }}>Clear list</a><span>{queue.length} items</span></div>
            </div>
          </>
        ) : (
          <div className="wmp-now">
            <canvas ref={cvs} className="wmp-vis" />
            {track?.kind === "video" && (track.src.startsWith("data:") || track.src.startsWith("blob:")) && <video ref={vid} className="wmp-video" />}
            <div className="wmp-art"><div className="wmp-art-img"><Icon name={track?.kind === "video" ? "videos" : "music"} size={72} /></div><div className="wmp-meta"><b>{track?.title || "Nothing playing"}</b><br />{track?.artist}<br />{track?.album}</div></div>
          </div>
        )}
      </div>
      <div className="wmp-bar">
        <div className="wmp-seek"><span>{fmt(elapsed)}</span><input type="range" className="w7range" min={0} max={Math.max(1, Math.floor(dur))} value={Math.min(Math.floor(elapsed), Math.floor(dur))} onChange={(e) => seek(+e.target.value)} disabled={!track} style={{ flex: 1 }} /><span>{fmt(dur)}</span></div>
        <div className="wmp-ctrl">
          <button className={"wc" + (shuffle ? " on" : "")} title="Turn shuffle on" onClick={() => setShuffle(!shuffle)}>⤨</button>
          <button className={"wc" + (repeat !== "off" ? " on" : "")} title="Turn repeat on" onClick={() => setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")}>{repeat === "one" ? "↻1" : "↻"}</button>
          <button className="wc" title="Stop" onClick={stop}>■</button>
          <button className="wc" title="Previous" onClick={prev}>⏮</button>
          <button className="wc play" title={playing ? "Pause" : "Play"} onClick={toggle}>{playing ? "❚❚" : "▶"}</button>
          <button className="wc" title="Next" onClick={() => next()}>⏭</button>
          <button className="wc" title="Mute" onClick={() => setMute(!mute)}>{mute || vol === 0 ? "🔇" : "🔊"}</button>
          <Slider value={mute ? 0 : vol} onChange={(v) => { setVol(v); setMute(false); }} style={{ width: 90 }} />
          <button className="wc" title="Switch view" onClick={() => setView2(view2 === "now" ? "library" : "now")}>⧉</button>
        </div>
      </div>
      {void TRACKS}{void setWin}{void getState}
    </div>
  );
}

/* ============================================================= Photo Viewer */
export function PhotoViewer({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const fileId0 = win.props.file as string | undefined;
  const folder = fileId0 && fs[fileId0] ? fs[fileId0].parent || "pics" : "pics";
  const imgs = children(folder, fs).filter((n) => ["jpg", "jpeg", "png", "bmp", "gif", "svg"].includes(extOf(n.name)) && n.content);
  const [idx, setIdx] = useState(() => Math.max(0, imgs.findIndex((n) => n.id === fileId0)));
  const [rot, setRot] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [slide, setSlide] = useState(false);
  const cur = imgs[Math.min(idx, imgs.length - 1)];
  useEffect(() => setWin(win.id, { title: `${cur ? cur.name : "Windows Photo Viewer"} - Windows Photo Viewer` }), [cur?.name, win.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!slide) return;
    const t = setInterval(() => { setIdx((i) => (i + 1) % Math.max(1, imgs.length)); setRot(0); }, 2800);
    return () => clearInterval(t);
  }, [slide, imgs.length]);
  const go = (d: number) => { setIdx((i) => (i + d + imgs.length) % Math.max(1, imgs.length)); setRot(0); setZoom(1); setPan({ x: 0, y: 0 }); };
  const down = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    const sx = e.clientX, sy = e.clientY, ox = pan.x, oy = pan.y;
    const mv = (ev: PointerEvent) => setPan({ x: ox + (ev.clientX - sx) / view.scale, y: oy + (ev.clientY - sy) / view.scale });
    const upf = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", upf); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", upf);
  };
  if (!cur) return <div className="pv"><div className="pv-empty">There are no pictures to display.<br /><Btn onClick={() => openApp("explorer", { path: "pics" })}>Open Pictures</Btn></div></div>;
  return (
    <div className="pv" tabIndex={0} onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "+" ) setZoom(Math.min(5, zoom + 0.25)); else if (e.key === "-") setZoom(Math.max(0.25, zoom - 0.25)); else if (e.key === "Delete") del(); }}>
      <div className="pv-top"><button className="rb-btn" onClick={() => openApp("paint", { file: cur.id })}>Open ▾</button><button className="rb-btn" onClick={() => msgBox({ title: "Print", text: "No printer is installed.", icon: "warn" })}>Print ▾</button><button className="rb-btn" onClick={() => openApp("explorer", { path: folder })}>Folder</button></div>
      <div className={"pv-stage" + (slide ? " slide" : "")} onPointerDown={down} onWheel={(e) => setZoom(Math.min(5, Math.max(0.25, zoom + (e.deltaY < 0 ? 0.2 : -0.2))))} onDoubleClick={() => { setZoom(zoom === 1 ? 2 : 1); setPan({ x: 0, y: 0 }); }}>
        <img key={cur.id} src={cur.content} alt={cur.name} draggable={false} style={{ transform: `translate(${pan.x}px,${pan.y}px) rotate(${rot}deg) scale(${zoom})` }} />
      </div>
      <div className="pv-bar">
        <button title="Previous (Left arrow key)" onClick={() => go(-1)}>◀</button>
        <button title="Play slide show (F11)" className={slide ? "on" : ""} onClick={() => setSlide(!slide)}>{slide ? "❚❚" : "▶"}</button>
        <button title="Next (Right arrow key)" onClick={() => go(1)}>▶</button>
        <span className="sep" />
        <button title="Rotate counterclockwise" onClick={() => setRot(rot - 90)}>⟲</button>
        <button title="Rotate clockwise" onClick={() => setRot(rot + 90)}>⟳</button>
        <span className="sep" />
        <button title="Zoom out" onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}>−</button>
        <button title="Zoom in" onClick={() => setZoom(Math.min(5, zoom + 0.25))}>+</button>
        <button title="Best fit" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>⛶</button>
        <span className="sep" />
        <button title="Delete" onClick={() => del()}>✕</button>
        <span className="pv-info">{idx + 1} / {imgs.length}</span>
      </div>
    </div>
  );
  function del() {
    if (!cur) return;
    msgBox({ title: "Delete File", text: `Are you sure you want to move this file to the Recycle Bin?\n\n${cur.name}`, icon: "question", buttons: ["Yes", "No"], onResult: (b) => { if (b === "Yes") { trashNodes([cur.id]); setIdx(0); } } });
  }
}

/* ============================================================= DVD Maker */
const STYLES = ["Scenic", "Full Screen", "Widescreen", "Photo Album", "Old Movies", "Special Occasion"];
export function DvdMaker({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const items = [...children("pics", fs).filter((n) => n.content?.startsWith("data:image")), ...children("vids", fs).filter((n) => VIDEO_EXT.includes(extOf(n.name)))];
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [style, setStyle] = useState(STYLES[0]);
  const [title, setTitle] = useState("My DVD " + new Date().toLocaleDateString());
  const [burn, setBurn] = useState(0);
  const [phase, setPhase] = useState("");
  useEffect(() => {
    if (step !== 3) return;
    const i = setInterval(() => setBurn((b) => Math.min(100, b + 1.8)), 120);
    return () => clearInterval(i);
  }, [step]);
  useEffect(() => {
    setPhase(burn < 40 ? "Converting video files..." : burn < 80 ? "Encoding menu and slide show..." : burn < 100 ? "Writing disc image..." : "Done");
    if (burn >= 100 && step === 3) {
      mkfile("vids", title.replace(/[\\/:*?"<>|]/g, "") + ".iso", "", 4.2e9);
      setStep(4);
    }
  }, [burn, step, title]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const titles = ["Add pictures and videos to the DVD", "Ready to burn disc", "Choose menu style", "Burning", "Finished"];
  return (
    <div className="dvd">
      <div className="dvd-head"><Icon name="dvd" size={36} /><div><b>{step === 1 ? titles[2] : step === 2 ? titles[1] : titles[step]}</b><br /><span>{step === 0 ? "Click Add items, or select items below. DVD capacity: 4.7 GB." : step === 1 ? "Choose a DVD menu style and enter a title." : step === 2 ? "Review your DVD settings, then click Burn." : step === 3 ? "Please wait while your DVD is created." : "Your DVD image has been saved to the Videos folder."}</span></div></div>
      <div className="dvd-body">
        {step === 0 && (
          <>
            <div className="dvd-toolbar"><Btn onClick={() => openFileDialog({ mode: "open", exts: ["jpg", "png", "wmv", "mp4"], start: "pics", onDone: (id) => id && !picked.includes(id) && setPicked([...picked, id]) })}>Add items</Btn><Btn onClick={() => setPicked([])}>Remove all</Btn><span style={{ marginLeft: "auto" }}>{picked.length} item(s) selected</span></div>
            <div className="dvd-grid">{items.map((n) => <div key={n.id} className={"dvd-item" + (picked.includes(n.id) ? " sel" : "")} onClick={() => toggle(n.id)}>{n.content?.startsWith("data:image") ? <img src={n.content} alt="" /> : <Icon name="video" size={48} />}<span>{n.name}</span><Check checked={picked.includes(n.id)} onChange={() => toggle(n.id)} label="" /></div>)}</div>
          </>
        )}
        {step === 1 && (
          <div className="dvd-styles">
            <div className="dvd-grid">{STYLES.map((s) => <div key={s} className={"dvd-style" + (style === s ? " sel" : "")} onClick={() => setStyle(s)}><div className={"dvd-prev s-" + s.replace(/\s/g, "")}><b>{title}</b><div><i>Play</i><i>Scenes</i></div></div>{s}</div>)}</div>
            <p>DVD title: <input className="w7input" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: 280 }} /></p>
          </div>
        )}
        {step === 2 && <div style={{ padding: 20 }}><p><b>{title}</b></p><p>Menu style: {style}</p><p>Items: {picked.length}</p><p>Disc: No recordable DVD drive detected — a disc image (.iso) will be saved to your Videos folder instead.</p></div>}
        {step === 3 && <div style={{ padding: 30 }}><p>{phase}</p><div className="pbar"><div style={{ width: burn + "%" }} /></div><p>{Math.round(burn)}% complete</p></div>}
        {step === 4 && <div style={{ padding: 30 }}><Icon name="iso" size={64} /><p>The disc image <b>{title}.iso</b> was created successfully.</p><Btn onClick={() => openApp("explorer", { path: "vids" })}>Open Videos folder</Btn></div>}
      </div>
      <div className="dvd-foot">
        {step > 0 && step < 3 && <Btn onClick={() => setStep(step - 1)}>Back</Btn>}
        {step === 0 && <Btn def disabled={!picked.length} onClick={() => setStep(1)}>Next</Btn>}
        {step === 1 && <Btn def onClick={() => setStep(2)}>Next</Btn>}
        {step === 2 && <Btn def onClick={() => { setBurn(0); setStep(3); }}>Burn</Btn>}
        {step === 4 && <Btn def onClick={() => closeWin(win.id)}>Close</Btn>}
        {step < 3 && <Btn onClick={() => closeWin(win.id)}>Cancel</Btn>}
        {void progressDialog}
      </div>
    </div>
  );
}

/* ========================================================= Sound Recorder */
export function SoundRecorder({ win }: { win: Win }) {
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!rec) return;
    const t0 = Date.now();
    const i = setInterval(() => setSecs((Date.now() - t0) / 1000), 200);
    return () => clearInterval(i);
  }, [rec]);
  useEffect(() => () => { cleanup.current?.(); }, []);

  const start = async () => {
    const c = ac();
    if (!c) return msgBox({ title: "Sound Recorder", text: "Audio is not supported in this browser.", icon: "error" });
    let stream: MediaStream;
    let sim = false;
    let osc: OscillatorNode | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      const dest = c.createMediaStreamDestination();
      osc = c.createOscillator();
      const g = c.createGain();
      g.gain.value = 0.05;
      osc.frequency.value = 440;
      osc.connect(g);
      g.connect(dest);
      osc.start();
      stream = dest.stream;
      sim = true;
    }
    setSimulated(sim);
    const src = c.createMediaStreamSource(stream);
    const an = c.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    const meter = setInterval(() => {
      an.getByteTimeDomainData(data);
      let m = 0;
      data.forEach((v) => (m = Math.max(m, Math.abs(v - 128))));
      setLevel(sim ? 20 + Math.random() * 50 : Math.min(100, m * 1.6));
    }, 80);
    chunks.current = [];
    const r = new MediaRecorder(stream);
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      const b = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
      setBlobUrl(URL.createObjectURL(b));
      const fr = new FileReader();
      fr.onload = () => ((window as unknown as { __rec?: string }).__rec = String(fr.result));
      fr.readAsDataURL(b);
    };
    r.start();
    mr.current = r;
    cleanup.current = () => {
      clearInterval(meter);
      stream.getTracks().forEach((t) => t.stop());
      osc?.stop();
    };
    setSecs(0);
    setBlobUrl(null);
    setRec(true);
  };
  const stop = () => {
    mr.current?.stop();
    cleanup.current?.();
    cleanup.current = null;
    setRec(false);
    setLevel(0);
    setTimeout(() => {
      const data = (window as unknown as { __rec?: string }).__rec;
      openFileDialog({ mode: "save", exts: ["wav"], name: "Recording.wav", start: "music", title: "Save As", onDone: (id, nm, dir) => {
        if (!data) return;
        const n = id ? (import("../store").then((m) => m.writeFile(id, data)), id) : mkfile(dir, nm, data, Math.round(data.length * 0.75));
        notify({ title: "Sound Recorder", text: "Recording saved" + (n ? "" : ""), icon: "info" });
      } });
    }, 400);
  };
  return (
    <div className="sr">
      <div className="sr-top"><button className="w7btn sr-btn" onClick={rec ? stop : start}>{rec ? <><i className="sq" /> Stop Recording</> : <><i className="dot" /> Start Recording</>}</button><div className="sr-time">{Math.floor(secs / 60)}:{String(Math.floor(secs % 60)).padStart(2, "0")}</div></div>
      <div className="sr-meter"><div style={{ width: level + "%" }} /></div>
      <div className="sr-note">{simulated ? "No microphone available — recording a simulated tone." : rec ? "Recording from Microphone…" : "Click Start Recording, speak, then click Stop. You can play your recording in Windows Media Player."}</div>
      {blobUrl && <audio controls src={blobUrl} style={{ width: "100%", height: 28 }} />}
      {void win}
    </div>
  );
}
