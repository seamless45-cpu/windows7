"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MenuItem, hideMenu, showMenu, useStore, view, locale, baseOf, Settings, getState, tbThick } from "./store";
import { Icon } from "./icons";

/* ------------------------------------------------------------ clock utils */
export function nowTz(tz: number | null): Date {
  const d = new Date();
  if (tz === null) return d;
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000 + tz * 60000);
}
export function useNow(ms = 1000): Date {
  const tz = useStore((s) => s.settings.tz);
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(i);
  }, [ms]);
  return nowTz(tz);
}
export function fmtTime(d: Date, s: Settings, seconds = false): string {
  return d.toLocaleTimeString(s.region, { hour: "numeric", minute: "2-digit", second: seconds ? "2-digit" : undefined, hour12: !s.clock24 });
}
export function fmtShortDate(d: Date, s: Settings): string {
  return d.toLocaleDateString(s.region, { year: "numeric", month: "numeric", day: "numeric" });
}
export function fmtLongDate(d: Date, s: Settings): string {
  return d.toLocaleDateString(s.region, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/* ----------------------------------------------------------- context menu */
function MenuPanel({ items, onClose, sub, flip }: { items: MenuItem[]; onClose: () => void; sub?: boolean; flip?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [fl, setFl] = useState(!!flip);
  useLayoutEffect(() => {
    if (sub && ref.current) {
      const r = ref.current.getBoundingClientRect();
      if (r.right > window.innerWidth + 2) setFl(true);
    }
  }, [sub]);
  return (
    <div ref={ref} className={"ctx" + (sub ? " sub" : "") + (fl ? " flip" : "")} onContextMenu={(e) => e.preventDefault()} onPointerDown={(e) => e.stopPropagation()}>
      {items.map((it, i) =>
        it.sep ? (
          <div key={i} className="ctx-sep" />
        ) : (
          <div
            key={i}
            className={"ctx-item" + (it.disabled ? " disabled" : "") + (open === i ? " open" : "") + (it.bold ? " bold" : "")}
            onMouseEnter={() => setOpen(it.sub && !it.disabled ? i : null)}
            onClick={(e) => {
              e.stopPropagation();
              if (it.disabled || it.sub) return;
              onClose();
              setTimeout(() => it.onClick?.(), 0);
            }}
          >
            <span className="ctx-check">{it.checked ? (it.radio ? "●" : "✓") : it.icon ? <Icon name={it.icon} size={16} /> : null}</span>
            <span className="ctx-label">{it.label}</span>
            {it.shortcut && <span className="ctx-sc">{it.shortcut}</span>}
            {it.sub && <span className="ctx-arrow">▶</span>}
            {it.sub && open === i && <MenuPanel items={it.sub} onClose={onClose} sub />}
          </div>
        )
      )}
    </div>
  );
}

export function ContextMenuHost() {
  const menu = useStore((s) => s.menu);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (!menu || !ref.current) return setPos(null);
    const r = ref.current.getBoundingClientRect();
    const w = r.width / view.scale;
    const h = r.height / view.scale;
    const sw = window.innerWidth / view.scale;
    const st = getState();
    const tbb = st.settings.taskbar.pos === "bottom" && !st.settings.taskbar.autohide ? tbThick(st.settings) : 0;
    const sh = window.innerHeight / view.scale - tbb;
    setPos({ x: Math.max(0, menu.x + w > sw ? menu.x - w : menu.x), y: Math.max(0, menu.y + h > sh ? sh - h - 2 : menu.y) });
  }, [menu]);
  if (!menu) return null;
  return (
    <div ref={ref} className="ctx-host" style={{ left: (pos || menu).x, top: (pos || menu).y, visibility: pos ? "visible" : "hidden" }}>
      <MenuPanel items={menu.items} onClose={hideMenu} />
    </div>
  );
}

/* --------------------------------------------------------------- menu bar */
export function MenuBar({ menus }: { menus: { label: string; items: () => MenuItem[] }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const menu = useStore((s) => s.menu);
  useEffect(() => {
    if (!menu) setOpen(null);
  }, [menu]);
  const show = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setOpen(i);
    showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, menus[i].items());
  };
  return (
    <div className="menubar">
      {menus.map((m, i) => (
        <div
          key={m.label}
          className={"mb-item" + (open === i ? " on" : "")}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => (open === i ? hideMenu() : show(i, e.currentTarget))}
          onMouseEnter={(e) => open !== null && open !== i && show(i, e.currentTarget)}
        >
          {m.label}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------- MDI menu bar (Windows 7) */
/**
 * The Windows 7 program menu bar: the "Alt+" access keys are underlined while
 * Alt is held, and a thin divider separates the menu strip from the client area.
 */
export function ClassicMenu({ menus }: { menus: { label: string; items: () => MenuItem[] }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [alt, setAlt] = useState(false);
  const menu = useStore((s) => s.menu);
  useEffect(() => {
    if (!menu) setOpen(null);
  }, [menu]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Alt") setAlt(true); };
    const up = (e: KeyboardEvent) => { if (e.key === "Alt") setAlt(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  const show = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setOpen(i);
    showMenu({ x: r.left / view.scale, y: r.bottom / view.scale }, menus[i].items());
  };
  return (
    <div className={"cmenubar" + (alt ? " alt" : "")}>
      {menus.map((m, i) => (
        <div key={m.label} className={"cm-item" + (open === i ? " on" : "")} onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => (open === i ? hideMenu() : show(i, e.currentTarget))}
          onMouseEnter={(e) => open !== null && open !== i && show(i, e.currentTarget)}>
          <u>{m.label.charAt(0)}</u>{m.label.slice(1)}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ small parts */
export function Btn({ children, onClick, disabled, def, style, className = "" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; def?: boolean; style?: React.CSSProperties; className?: string }) {
  return (
    <button className={"w7btn " + (def ? "def " : "") + className} disabled={disabled} onClick={onClick} style={style}>
      {children}
    </button>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (t: string) => void }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <div key={t} className={"tab" + (t === value ? " sel" : "")} onClick={() => onChange(t)}>
          {t}
        </div>
      ))}
    </div>
  );
}

export function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; disabled?: boolean }) {
  return (
    <label className="w7check" style={disabled ? { opacity: 0.5 } : undefined}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
export function Radio({ checked, onChange, label, name }: { checked: boolean; onChange: () => void; label: React.ReactNode; name?: string }) {
  return (
    <label className="w7check">
      <input type="radio" name={name} checked={checked} onChange={onChange} /> {label}
    </label>
  );
}

export function GroupBox({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <fieldset className="groupbox" style={style}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

export function InlineEdit({ value, onDone, folder, multiline }: { value: string; onDone: (v: string | null) => void; folder?: boolean; multiline?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(0, folder ? value.length : baseOf(value).length);
  }, [value, folder]);
  const finish = (v: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(v);
  };
  return (
    <input
      ref={ref}
      className={"inline-edit" + (multiline ? " ml" : "")}
      defaultValue={value}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish((e.target as HTMLInputElement).value);
        if (e.key === "Escape") finish(null);
      }}
      onBlur={(e) => finish(e.target.value)}
    />
  );
}

export function Slider({ value, min = 0, max = 100, onChange, style }: { value: number; min?: number; max?: number; onChange: (v: number) => void; style?: React.CSSProperties }) {
  return <input type="range" className="w7range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} style={style} />;
}

export function Spinner({ text }: { text: string }) {
  return (
    <div className="busy">
      <div className="busy-ring" />
      <span>{text}</span>
    </div>
  );
}

export function cmpLocale(a: string, b: string) {
  return a.localeCompare(b, locale, { numeric: true, sensitivity: "base" });
}

export function download(name: string, content: string) {
  const a = document.createElement("a");
  if (content.startsWith("data:")) a.href = content;
  else a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  a.download = name;
  a.click();
}

export function GlassBar({ winId, children }: { winId: string; children: React.ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setEl(document.getElementById("gs-" + winId));
  }, [winId]);
  return el ? createPortal(children, el) : null;
}
