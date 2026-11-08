"use client";
/**
 * Windows Calendar (Windows Live Calendar is not part of Windows 7, but
 * Windows 7's clock flyout and the Date and Time page only *show* calendar
 * days). This is the small month calendar that the taskbar clock opens into a
 * full program: month grid, day details and reminders stored locally.
 */
import React, { useState } from "react";
import { Win, lsGet, lsSet, notify, MenuItem, closeWin } from "../store";
import { MenuBar, Btn } from "../ui";
import { Icon } from "../icons";

interface Event { id: string; date: string; time: string; title: string; note: string }

const KEY = "win7.calendar";
const D = (d: Date) => d.toISOString().slice(0, 10);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Calendar({ win }: { win: Win }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [sel, setSel] = useState(D(today));
  const [events, setEvents] = useState<Event[]>(() => lsGet<Event[]>(KEY, [
    { id: "e1", date: D(today), time: "09:00", title: "Team meeting", note: "Conference room B" },
    { id: "e2", date: D(new Date(today.getTime() + 2 * 864e5)), time: "14:30", title: "Dentist", note: "" },
  ]));
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("12:00");
  const [note, setNote] = useState("");

  const save = (e: Event[]) => { setEvents(e); lsSet(KEY, e); };
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => D(new Date(year, month, i + 1)))];
  while (cells.length % 7) cells.push(null);

  const shift = (n: number) => {
    const d = new Date(year, month + n, 1);
    setMonth(d.getMonth()); setYear(d.getFullYear());
  };
  const add = () => {
    if (!title.trim()) return;
    save([...events, { id: "e" + Date.now().toString(36), date: sel, time, title: title.trim(), note: note.trim() }]);
    setTitle(""); setNote("");
  };
  const dayEvents = events.filter((e) => e.date === sel).sort((a, b) => a.time.localeCompare(b.time));

  const menus: { label: string; items: () => MenuItem[] }[] = [
    { label: "File", items: () => [{ label: "New appointment", onClick: () => { setTitle("New appointment"); } }, { sep: true }, { label: "Exit", onClick: () => closeWin(win.id) }] },
    { label: "View", items: () => [{ label: "Today", onClick: () => { const t = new Date(); setMonth(t.getMonth()); setYear(t.getFullYear()); setSel(D(t)); } }, { label: "Go to today", onClick: () => shift(0) }, { sep: true }, { label: "Next month", onClick: () => shift(1) }, { label: "Previous month", onClick: () => shift(-1) }] },
    { label: "Help", items: () => [{ label: "Calendar Help", onClick: () => import("../store").then((m) => m.openApp("help")) }] },
  ];

  return (
    <div className="calwin">
      <MenuBar menus={menus} />
      <div className="calwin-bar">
        <Btn onClick={() => shift(-1)}>◀</Btn>
        <b className="calwin-month">{MONTHS[month]} {year}</b>
        <Btn onClick={() => shift(1)}>▶</Btn>
        <Btn onClick={() => { const t = new Date(); setMonth(t.getMonth()); setYear(t.getFullYear()); setSel(D(t)); }}>Today</Btn>
      </div>
      <div className="calwin-body">
        <div className="calwin-grid">
          {DAYS.map((d) => <div key={d} className="calwin-dow">{d.slice(0, 3)}</div>)}
          {cells.map((c, i) => (
            <div key={i} className={"calwin-day" + (c ? "" : " blank") + (c === sel ? " sel" : "") + (c === D(today) ? " today" : "")} onClick={() => c && setSel(c)}>
              {c && <><span>{Number(c.slice(-2))}</span>{events.some((e) => e.date === c) && <i className="calwin-dot" />}</>}
            </div>
          ))}
        </div>
        <div className="calwin-side">
          <div className="calwin-side-h">{new Date(sel + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
          {dayEvents.map((e) => (
            <div key={e.id} className="calwin-ev" onDoubleClick={() => { save(events.filter((x) => x.id !== e.id)); notify({ title: "Calendar", text: "The appointment was deleted.", icon: "info" }); }}>
              <b>{e.time}</b> {e.title}{e.note && <span>{e.note}</span>}
            </div>
          ))}
          {!dayEvents.length && <div className="calwin-none">No appointments on this day.</div>}
          <div className="calwin-new">
            <div className="calwin-side-h">New appointment</div>
            <input className="w7input" placeholder="Subject" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="w7input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <input className="w7input" placeholder="Location or note" value={note} onChange={(e) => setNote(e.target.value)} />
            <Btn def onClick={add}>Add to {new Date(sel + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Btn>
          </div>
        </div>
      </div>
      <div className="calwin-status"><Icon name="clock" size={14} /> {events.length} appointments · {new Date().toLocaleTimeString()}</div>
    </div>
  );
}
