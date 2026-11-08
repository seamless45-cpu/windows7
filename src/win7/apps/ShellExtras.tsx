"use client";
/**
 * Windows 7 Explorer shell extras that the real product puts on the desktop
 * rather than in a window:
 *
 *  - Desktop Gadgets platform: the gadget gallery and the per-gadget options
 *    dialog (the desktop itself and the seven gadgets already exist in
 *    aero.tsx — this adds the gallery window, which Windows 7 shows from
 *    Control Panel → Desktop Gadgets and from the desktop context menu).
 *  - Play To — the "Play to" context-menu verb that streams a picture, video
 *    or song to a DLNA device on the network.
 *  - Windows CardSpace — the identity selector shipped with .NET 3.x.
 *  - The "Open With" chooser, which decides how a file is opened when no
 *    default is set.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Win, getState, useStore, openApp, closeWin, notify, msgBox, lsSet, children, setState } from "../store";
import { Icon } from "../icons";
import { Btn, Check } from "../ui";

/* ================================================== Play To */
export function PlayTo({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const fileId = (win.props.file as string) || "";
  const node = fs[fileId];
  const [dev, setDev] = useState("Living room TV");
  const [sent, setSent] = useState(false);
  const [turnOn, setTurnOn] = useState(true);
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => {
      notify({ title: "Play To", text: `The media can't be played on ${dev} because the device is not responding.`, icon: "warn" });
    }, 2200);
    return () => clearTimeout(t);
  }, [sent, dev]);
  const devices = ["Living room TV", "Media PC", "Xbox 360", "Kitchen speaker"];
  return (
    <div className="playto">
      <div className="cp-sec">Play To</div>
      <div className="pt-card">
        <Icon name={node?.name.endsWith(".mp3") ? "music" : node?.name.endsWith(".wmv") ? "video" : "pictures"} size={52} />
        <div>
          <b>{node?.name || "No media selected"}</b>
          <span>Choose a device on your home network to play this media on.</span>
        </div>
      </div>
      <div className="pt-devices">
        {devices.map((d) => (
          <div key={d} className={"pt-dev" + (dev === d ? " sel" : "")} onClick={() => setDev(d)}>
            <Icon name="network" size={26} />
            <b>{d}</b>
            <span>{d === "Living room TV" ? "Available" : d === "Media PC" ? "This computer" : "Available"}</span>
          </div>
        ))}
      </div>
      <div style={{ margin: "10px 0" }}><Check checked={turnOn} onChange={setTurnOn} label={`Turn on media sharing with ${dev}`} /></div>
      {sent && <div className="pt-status">Connecting to <b>{dev}</b>…</div>}
      <p>
        <Btn def onClick={() => setSent(true)}>Play</Btn>
        <Btn onClick={() => closeWin(win.id)}>Close</Btn>
      </p>
      <p className="pt-note">Play To uses the <b>Digital Media Renderer</b> (DMR) profile of the DLNA network protocol. Windows Media Player can also play to a device.</p>
    </div>
  );
}

/* ================================================== Windows CardSpace */
export function CardSpace() {
  const [card, setCard] = useState<number | null>(null);
  const [info, setInfo] = useState(false);
  const cards = [
    { name: "Personal card", id: "user@example.com", kind: "Personal", issuer: "This computer" },
    { name: "Contoso Employee", id: "jdoe", kind: "Managed", issuer: "contoso.com" },
  ];
  return (
    <div className="cards">
      <div className="cards-head">
        <Icon name="user" size={38} />
        <div><b>Windows CardSpace</b><span>Choose an Information Card to sign in.</span></div>
        <button className="w7btn" onClick={() => setInfo(!info)}>What is a card?</button>
      </div>
      {info && <p className="cards-info">An Information Card holds the claims a website asks for — a user name, an e-mail address, a birth date — and releases only the ones you agree to share. Windows CardSpace is the selector that ships with .NET Framework 3.5.</p>}
      <div className="cards-list">
        {cards.map((c, i) => (
          <div key={c.name} className={"cards-card" + (card === i ? " sel" : "")} onClick={() => setCard(i)} onDoubleClick={() => msgBox({ title: "Windows CardSpace", text: `The site did not request a token from ${c.name}.`, icon: "info" })}>
            <div className="cards-art"><Icon name={c.kind === "Managed" ? "shield" : "user"} size={44} /></div>
            <b>{c.name}</b><span>{c.id}</span><em>{c.issuer}</em>
          </div>
        ))}
        <div className="cards-card add"><div className="cards-art">+</div><b>Add a card</b><span>Create or import</span></div>
      </div>
      <div className="cards-foot"><span>Windows CardSpace 2.0</span><div style={{ marginLeft: "auto" }}><Btn onClick={() => msgBox({ title: "Windows CardSpace", text: "CardSpace has been deprecated in this version of Windows.", icon: "info" })}>Send</Btn></div></div>
    </div>
  );
}

/* ================================================== Open With */
const CHOICES: Record<string, { app: string; label: string }[]> = {
  txt: [{ app: "notepad", label: "Notepad" }, { app: "wordpad", label: "WordPad" }, { app: "ie", label: "Internet Explorer" }],
  rtf: [{ app: "wordpad", label: "WordPad" }, { app: "notepad", label: "Notepad" }],
  jpg: [{ app: "photos", label: "Windows Photo Viewer" }, { app: "paint", label: "Paint" }, { app: "ie", label: "Internet Explorer" }],
  png: [{ app: "photos", label: "Windows Photo Viewer" }, { app: "paint", label: "Paint" }],
  mp3: [{ app: "wmp", label: "Windows Media Player" }, { app: "mce", label: "Windows Media Center" }],
  wmv: [{ app: "wmp", label: "Windows Media Player" }, { app: "mce", label: "Windows Media Center" }],
  html: [{ app: "ie", label: "Internet Explorer" }, { app: "notepad", label: "Notepad" }],
  xps: [{ app: "xps", label: "XPS Viewer" }],
};
export function OpenWith({ win }: { win: Win }) {
  const fs = useStore((s) => s.fs);
  const ext = (win.props.ext as string) || (fs[win.props.file as string]?.name.split(".").pop() || "txt").toLowerCase();
  const opts = CHOICES[ext] || [{ app: "notepad", label: "Notepad" }, { app: "wordpad", label: "WordPad" }];
  const [pick, setPick] = useState(opts[0].app);
  const [always, setAlways] = useState(false);
  const file = fs[win.props.file as string];

  const open = () => {
    if (always) {
      const st = getState();
      setState({ settings: { ...st.settings, defaults: { ...st.settings.defaults, [ext]: pick } } });
    }
    if (file) openApp(pick, { file: file.id });
    else openApp(pick);
    closeWin(win.id);
  };
  return (
    <div className="openwith">
      <div className="ow-head">
        <Icon name="question" size={38} />
        <div>
          <b>How do you want to open this file?</b>
          <span>{file ? file.name : "*." + ext} — .{ext} file ({(file?.size || 0) / 1024 < 1 ? "<1" : Math.round((file?.size || 0) / 1024)} KB)</span>
        </div>
      </div>
      <div className="ow-list">
        {opts.map((o) => (
          <label key={o.app} className={"ow-row" + (pick === o.app ? " sel" : "")} onClick={() => setPick(o.app)}>
            <Icon name={o.app === "photos" ? "photos" : o.app} size={28} />
            <b>{o.label}</b>
            <input type="radio" readOnly checked={pick === o.app} />
          </label>
        ))}
      </div>
      <div style={{ margin: "8px 0" }}><Check checked={always} onChange={setAlways} label={`Always use the selected program to open this kind of file`} /></div>
      <p className="ow-more">Look for an app in the Store is not available in Windows 7. Use <a onClick={() => openApp("defaultprogs")}>Default Programs</a> to change every association at once.</p>
      <p><Btn def onClick={open}>OK</Btn><Btn onClick={() => closeWin(win.id)}>Cancel</Btn></p>
    </div>
  );
}

/* ================================================== Desktop context helpers */
export function ScreenResolution() {
  const s = useStore((st) => st.settings);
  const [res, setRes] = useState(s.resolution);
  const MODES: [string, string][] = [["1024 × 768", "1024 × 768"], ["1280 × 720", "1280 × 720"], ["1280 × 1024", "1280 × 1024"], ["1440 × 900", "1440 × 900"], ["1600 × 900", "1600 × 900"], ["1920 × 1080", "1920 × 1080"]];
  return (
    <div className="cp-tool">
      <h1 className="cp-h1">Screen Resolution</h1>
      <p className="cp-desc">Choose the resolution and orientation that fit your display. Higher resolutions show more of the desktop but make text smaller.</p>
      <div className="sr-monitor">
        <div className="sr-screen"><span>{res}</span></div>
        <div className="sr-stand" />
        <b>1. Generic PnP Monitor</b>
        <em>Display 1 · Your display</em>
      </div>
      <div className="sr-row"><span>Resolution:</span>
        <select className="w7input" value={res} onChange={(e) => setRes(e.target.value)}>{MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>
      <div className="sr-row"><span>Orientation:</span>
        <select className="w7input">{["Landscape", "Portrait", "Landscape (flipped)", "Portrait (flipped)"].map((o) => <option key={o}>{o}</option>)}</select>
      </div>
      <p className="sr-note">The simulated desktop always fills your browser window; the resolution is recorded so that the Display page, the System page and screenshots agree.</p>
      <p><Btn def onClick={() => { setState({ settings: { ...getState().settings, resolution: res } }); notify({ title: "Display Settings", text: `The resolution is now ${res}.`, icon: "info" }); }}>OK</Btn><Btn onClick={() => setRes(s.resolution)}>Cancel</Btn></p>
    </div>
  );
}

/* keep imports the other windows rely on alive */
void children; void useMemo; void React;
