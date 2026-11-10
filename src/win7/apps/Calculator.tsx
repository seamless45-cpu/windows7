"use client";
/**
 * Windows 7 Calculator (calc.exe).
 *
 * The real program is one window with five *modes*, switched from the View menu
 * or with the documented accelerators:
 *
 *   Alt+1 Standard · Alt+2 Scientific · Alt+3 Programmer · Alt+4 Statistics
 *   Ctrl+U Unit conversion · Ctrl+E Date calculation · Ctrl+H History
 *
 * Each mode keeps its own window size (the real window resizes when you switch)
 * and its own history, which is what makes the modes feel like the original
 * rather than a single busier keypad.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Win, setWin, openApp, msgBox, showMenu, MenuItem } from "../store";
import { MenuBar } from "../ui";

/* ------------------------------------------------------------ arithmetic */

/** Only numbers, + - * / and ^ get here; nothing user-authored is eval'd. */
function safeEval(expr: string): number {
  const toks = expr.match(/(\d+\.?\d*|\.\d+|[+\-*/^()])/g) || [];
  let i = 0;
  const peek = () => toks[i];
  const eat = (t: string) => (toks[i] === t ? (i++, true) : false);
  const atom = (): number => {
    if (eat("(")) {
      const v = expr2();
      eat(")");
      return v;
    }
    if (eat("-")) return -atom();
    const t = toks[i++];
    const n = parseFloat(t);
    if (!isFinite(n)) throw new Error("Invalid input");
    return n;
  };
  const pow = (): number => {
    const b = atom();
    if (eat("^")) return Math.pow(b, pow());
    return b;
  };
  const term = (): number => {
    let v = pow();
    for (;;) {
      if (eat("*")) v *= pow();
      else if (eat("/")) {
        const d = pow();
        if (d === 0) throw new Error("Cannot divide by zero");
        v /= d;
      } else return v;
    }
  };
  function expr2(): number {
    let v = term();
    for (;;) {
      if (eat("+")) v += term();
      else if (eat("-")) v -= term();
      else return v;
    }
  }
  const r = expr2();
  if (i !== toks.length && peek() !== ")") throw new Error("Invalid input");
  return r;
}

const fmt = (n: number) => (Number.isFinite(n) ? String(parseFloat(n.toPrecision(15))) : "Invalid input");
const fmtG = (n: number, d = 8) => (Number.isFinite(n) ? String(parseFloat(n.toPrecision(d))) : "Invalid input");

/* ------------------------------------------------------------- keypads */

type Btn = { l: React.ReactNode; f: () => void; cls?: string; title?: string };

function Pad({ cols, rows }: { cols: number; rows: Btn[][] }) {
  return (
    <div className="calc-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {rows.flat().map((b, i) => (
        <button key={i} className={"cb2 " + (b.cls || "")} onClick={b.f} title={b.title}>
          {b.l}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ programmer */

const BASES = [
  { key: "hex", label: "Hex", radix: 16, accel: "F5" },
  { key: "dec", label: "Dec", radix: 10, accel: "F6" },
  { key: "oct", label: "Oct", radix: 8, accel: "F7" },
  { key: "bin", label: "Bin", radix: 2, accel: "F8" },
] as const;
const WIDTHS = [
  { key: 64, label: "Qword" },
  { key: 32, label: "Dword" },
  { key: 16, label: "Word" },
  { key: 8, label: "Byte" },
] as const;

/** Two's-complement read/write of a value inside a bit width. */
function toSigned(v: number, bits: number) {
  const mod = 2 ** bits;
  const u = ((v % mod) + mod) % mod;
  return u >= mod / 2 ? u - mod : u;
}
function toBits(v: number, bits: number) {
  const mod = 2 ** bits;
  return ((v % mod) + mod) % mod;
}

function Programmer() {
  const [bits, setBits] = useState<8 | 16 | 32 | 64>(32);
  const [base, setBase] = useState<"hex" | "dec" | "oct" | "bin">("dec");
  const [value, setValue] = useState(0); // always the unsigned bit pattern
  const [entry, setEntry] = useState("0");
  const [pending, setPending] = useState<{ op: string; a: number } | null>(null);
  const [fresh, setFresh] = useState(true);

  const radix = BASES.find((b) => b.key === base)!.radix;
  const show = useMemo(() => {
    const signed = toSigned(value, bits);
    if (base === "dec") return String(signed);
    const u = base === "hex" ? value.toString(16).toUpperCase() : base === "oct" ? value.toString(8) : value.toString(2);
    // Windows groups hex and binary nibbles for readability
    if (base === "bin") return u.padStart(Math.ceil(u.length / 4) * 4, "0").replace(/(.{4})(?=.)/g, "$1 ");
    return base === "hex" ? u : u;
  }, [value, bits, base]);

  const setVal = (v: number) => {
    const nv = toBits(v, bits);
    setValue(nv);
    setEntry(base === "dec" ? String(toSigned(nv, bits)) : nv.toString(radix).toUpperCase());
  };

  const typed = (d: string) => {
    const cur = fresh ? "" : entry;
    const next = (cur + d).replace(/^0+(?=.)/, "");
    const n = parseInt(next || "0", radix);
    if (Number.isNaN(n)) return;
    setValue(toBits(base === "dec" ? toBits(n, bits) : n, bits));
    setEntry(next);
    setFresh(false);
  };

  const apply = (op: string) => {
    const a = value;
    if (pending) {
      const r = doOp(pending.op, pending.a, a);
      setVal(r);
      setPending({ op, a: r });
    } else setPending({ op, a });
    setFresh(true);
  };
  const doOp = (op: string, a: number, b: number): number => {
    const A = toSigned(a, bits);
    const Bv = toSigned(b, bits);
    switch (op) {
      case "+": return A + Bv;
      case "-": return A - Bv;
      case "*": return A * Bv;
      case "/": return Bv === 0 ? 0 : Math.trunc(A / Bv);
      case "mod": return Bv === 0 ? 0 : A % Bv;
      case "and": return a & b;
      case "or": return a | b;
      case "xor": return a ^ b;
      case "lsh": return a * 2 ** (Bv % bits);
      case "rsh": return Math.floor(a / 2 ** (Bv % bits));
      case "rol": return toBits(a * 2 ** (Bv % bits) + Math.floor(a / 2 ** (bits - (Bv % bits))), bits);
      case "ror": return toBits(Math.floor(a / 2 ** (Bv % bits)) + toBits(a * 2 ** (bits - (Bv % bits)), bits), bits);
      default: return b;
    }
  };
  const equals = () => {
    if (!pending) return;
    const r = doOp(pending.op, pending.a, value);
    setPending(null);
    setVal(r);
    setFresh(true);
  };

  const digits: Record<string, string[]> = {
    hex: ["A", "B", "C", "D", "E", "F"],
  };

  return (
    <div className="calc-prog">
      <div className="calc-prog-bases">
        {BASES.map((b) => (
          <div key={b.key} className={"calc-base-row" + (base === b.key ? " on" : "")}>
            <label>
              <input type="radio" checked={base === b.key} onChange={() => { setBase(b.key); setFresh(true); setEntry(toSigned(value, bits).toString(b.radix).toUpperCase()); }} />
              {b.label}
            </label>
            <span className="calc-base-v">{b.radix === 16 ? value.toString(16).toUpperCase().padStart(Math.ceil(bits / 4), "0") : b.radix === 10 ? String(toSigned(value, bits)) : b.radix === 8 ? value.toString(8) : value.toString(2).padStart(bits, "0")}</span>
          </div>
        ))}
      </div>
      <div className="calc-bits">
        {Array.from({ length: bits / 4 }, (_, nib) => bits / 4 - 1 - nib).map((nib) => (
          <div key={nib} className="calc-nib">
            {[3, 2, 1, 0].map((b) => {
              const bit = nib * 4 + b;
              const on = ((value >> bit) & 1) === 1;
              return (
                <button
                  key={bit}
                  className={"calc-bit" + (on ? " on" : "")}
                  title={`Bit ${bit}`}
                  onClick={() => setVal(value ^ (1 << bit))}
                >
                  {(value >> bit) & 1}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="calc-prog-sizes">
        {WIDTHS.map((s) => (
          <label key={s.key}>
            <input type="radio" checked={bits === s.key} onChange={() => { setBits(s.key); setValue(toBits(value, s.key)); }} />
            {s.label}
          </label>
        ))}
      </div>
      <div className="calc-prog-main">
        <div className="calc-grid c4">
          <button className="cb2 s" onClick={() => setVal(~value)}>Not</button>
          <button className="cb2 s" onClick={() => apply("and")}>And</button>
          <button className="cb2 s" onClick={() => apply("or")}>Or</button>
          <button className="cb2 s" onClick={() => apply("xor")}>Xor</button>
          <button className="cb2 s" onClick={() => apply("lsh")}>Lsh</button>
          <button className="cb2 s" onClick={() => apply("rsh")}>Rsh</button>
          <button className="cb2 s" onClick={() => apply("rol")}>RoL</button>
          <button className="cb2 s" onClick={() => apply("ror")}>RoR</button>
        </div>
        <div className="calc-grid c4">
          <button className="cb2 o" onClick={() => { setVal(0); setEntry("0"); }}>C</button>
          <button className="cb2 o" onClick={() => { setEntry("0"); setVal(0); }}>CE</button>
          <button className="cb2 o" onClick={() => setVal(Math.trunc(value / radix))}>⌫</button>
          <button className="cb2 o" onClick={() => apply("/")}>÷</button>
          {digits.hex[0].split("").map((h, i) => {
            const d = ["A", "B", "C", "D", "E", "F"][i];
            const n = 10 + i;
            return <button key={d} className="cb2" disabled={n >= radix} onClick={() => typed(radix === 16 ? d : String(n))}>{d}</button>;
          }).slice(3)}
          <button className="cb2" onClick={() => typed("7")}>7</button>
          <button className="cb2" onClick={() => typed("8")}>8</button>
          <button className="cb2" onClick={() => typed("9")}>9</button>
          <button className="cb2 o" onClick={() => apply("*")}>×</button>
          <button className="cb2" disabled={radix > 10} onClick={() => typed("4")}>4</button>
          <button className="cb2" disabled={radix > 10} onClick={() => typed("5")}>5</button>
          <button className="cb2" disabled={radix > 10} onClick={() => typed("6")}>6</button>
          <button className="cb2 o" onClick={() => apply("-")}>−</button>
          <button className="cb2" disabled={radix > 10} onClick={() => typed("1")}>1</button>
          <button className="cb2" disabled={radix > 10} onClick={() => typed("2")}>2</button>
          <button className="cb2" disabled={radix > 10} onClick={() => typed("3")}>3</button>
          <button className="cb2 o" onClick={() => apply("+")}>+</button>
          <button className="cb2 zero" disabled={radix > 10} onClick={() => typed("0")}>0</button>
          <button className="cb2 eq" onClick={equals}>=</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ statistics */

function Statistics() {
  const [data, setData] = useState<number[]>([]);
  const [entry, setEntry] = useState("0");
  const [result, setResult] = useState("");

  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const sq = data.reduce((a, b) => a + b * b, 0);
  const mean = n ? sum / n : 0;
  const variance = n > 1 ? (sq - (sum * sum) / n) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const calc = (label: string, f: () => number) => setResult(`${label} = ${fmtG(f())}`);

  return (
    <div className="calc-stats">
      <div className="calc-stats-list">
        {data.length ? data.map((d, i) => <div key={i}>{d}</div>) : <div className="dim">Enter values and press Add.</div>}
      </div>
      <div className="calc-stats-btns">
        <button className="cb2 s" onClick={() => { const v = parseFloat(entry); if (!Number.isNaN(v)) { setData([...data, v]); setEntry("0"); } }}>Add</button>
        <button className="cb2 s" onClick={() => setData(data.slice(0, -1))} disabled={!data.length}>Clear</button>
        <button className="cb2 s" onClick={() => calc("Count", () => n)}>Count</button>
        <button className="cb2 s" onClick={() => calc("Sum", () => sum)}>Σx</button>
        <button className="cb2 s" onClick={() => calc("Σx²", () => sq)}>Σx²</button>
        <button className="cb2 s" onClick={() => calc("Average", () => mean)}>Ave</button>
        <button className="cb2 s" onClick={() => calc("Average of squares", () => (n ? sq / n : 0))}>Ave²</button>
        <button className="cb2 s" onClick={() => calc("Standard deviation", () => sd)}>S.D.</button>
        <button className="cb2 s" onClick={() => calc("Standard deviation of the population", () => Math.sqrt(variance || 0))}>S.D.p</button>
      </div>
      <div className="calc-stats-res">{result}</div>
    </div>
  );
}

/* ------------------------------------------------------- unit conversion */

const UNITS: Record<string, { units: [string, number][]; note?: string }> = {
  // factors are "how many of the base unit is one of this"
  Length: { units: [["Meters", 1], ["Kilometers", 1000], ["Centimeters", 0.01], ["Millimeters", 0.001], ["Miles", 1609.344], ["Yards", 0.9144], ["Feet", 0.3048], ["Inches", 0.0254], ["Nautical miles", 1852]] },
  Mass: { units: [["Kilograms", 1], ["Grams", 0.001], ["Milligrams", 1e-6], ["Metric tons", 1000], ["Pounds", 0.45359237], ["Ounces", 0.028349523125], ["Stone", 6.35029318]] },
  Volume: { units: [["Liters", 1], ["Milliliters", 0.001], ["Cubic meters", 1000], ["US gallons", 3.785411784], ["US quarts", 0.946352946], ["US pints", 0.473176473], ["US cups", 0.2365882365], ["UK gallons", 4.54609], ["Fluid ounces", 0.0295735295625]] },
  Temperature: { units: [["Celsius", 1], ["Fahrenheit", 1], ["Kelvin", 1], ["Rankine", 1]], note: "affine" },
  Area: { units: [["Square meters", 1], ["Square kilometers", 1e6], ["Square feet", 0.09290304], ["Square yards", 0.83612736], ["Acres", 4046.8564224], ["Hectares", 10000], ["Square miles", 2589988.110336]] },
  Speed: { units: [["Kilometers per hour", 1], ["Meters per second", 3.6], ["Miles per hour", 1.609344], ["Knots", 1.852], ["Feet per second", 1.09728]] },
  Time: { units: [["Seconds", 1], ["Minutes", 60], ["Hours", 3600], ["Days", 86400], ["Weeks", 604800], ["Years", 31536000]] },
  Energy: { units: [["Joules", 1], ["Kilojoules", 1000], ["Calories", 4.184], ["Kilocalories", 4184], ["Watt hours", 3600], ["Kilowatt hours", 3.6e6], ["BTU", 1055.05585262]] },
  Power: { units: [["Watts", 1], ["Kilowatts", 1000], ["Horsepower", 745.699871582], ["BTU per minute", 17.58426421]] },
  Data: { units: [["Bytes", 1], ["Kilobytes", 1024], ["Megabytes", 1024 ** 2], ["Gigabytes", 1024 ** 3], ["Terabytes", 1024 ** 4], ["Bits", 0.125]] },
  Pressure: { units: [["Pascals", 1], ["Kilopascals", 1000], ["Bars", 100000], ["Atmospheres", 101325], ["PSI", 6894.757293168], ["mmHg", 133.322387415]] },
  Angle: { units: [["Degrees", 1], ["Radians", 57.29577951308232], ["Gradians", 0.9]] },
};

function toCelsius(v: number, from: string) {
  switch (from) {
    case "Fahrenheit": return (v - 32) / 1.8;
    case "Kelvin": return v - 273.15;
    case "Rankine": return (v - 491.67) / 1.8;
    default: return v;
  }
}
function fromCelsius(v: number, to: string) {
  switch (to) {
    case "Fahrenheit": return v * 1.8 + 32;
    case "Kelvin": return v + 273.15;
    case "Rankine": return (v + 273.15) * 1.8;
    default: return v;
  }
}

function UnitConversion() {
  const [kind, setKind] = useState("Length");
  const [from, setFrom] = useState("Meters");
  const [to, setTo] = useState("Feet");
  const [val, setVal] = useState("1");
  const units = UNITS[kind].units.map(([n]) => n);
  const convert = () => {
    const v = parseFloat(val);
    if (Number.isNaN(v)) return "";
    if (kind === "Temperature") return fmtG(fromCelsius(toCelsius(v, from), to) === 0 ? 0 : fromCelsius(toCelsius(v, from), to));
    const f = UNITS[kind].units.find(([n]) => n === from)?.[1] ?? 1;
    const t = UNITS[kind].units.find(([n]) => n === to)?.[1] ?? 1;
    return fmtG((v * f) / t);
  };
  return (
    <div className="calc-conv">
      <label>Select a category:
        <select className="w7input" value={kind} onChange={(e) => {
          const k = e.target.value;
          setKind(k);
          setFrom(UNITS[k].units[0][0]);
          setTo(UNITS[k].units[1][0]);
        }}>
          {Object.keys(UNITS).map((k) => <option key={k}>{k}</option>)}
        </select>
      </label>
      <div className="calc-conv-row">
        <div>
          <span>From:</span>
          <select className="w7input" value={from} onChange={(e) => setFrom(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select>
          <input className="w7input calc-conv-in" value={val} onChange={(e) => setVal(e.target.value)} />
        </div>
        <button className="calc-swap" title="Swap units" onClick={() => { setFrom(to); setTo(from); setVal(convert() || val); }}>⇄</button>
        <div>
          <span>To:</span>
          <select className="w7input" value={to} onChange={(e) => setTo(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select>
          <div className="calc-conv-out">{convert()}</div>
        </div>
      </div>
      <p className="dim">{UNITS[kind].units.length} units in {kind.toLowerCase()}.</p>
    </div>
  );
}

/* ------------------------------------------------------- date calculation */

function DateCalc() {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const [mode, setMode] = useState<"diff" | "add">("diff");
  const [a, setA] = useState(iso(new Date()));
  const [b, setB] = useState(iso(new Date()));
  const [add, setAdd] = useState({ y: 0, m: 0, d: 0, sign: 1 as 1 | -1 });

  const diff = useMemo(() => {
    const x = new Date(a + "T00:00:00");
    const y = new Date(b + "T00:00:00");
    if (Number.isNaN(x.getTime()) || Number.isNaN(y.getTime())) return null;
    const [s, e] = x <= y ? [x, y] : [y, x];
    let years = e.getFullYear() - s.getFullYear();
    let months = e.getMonth() - s.getMonth();
    let days = e.getDate() - s.getDate();
    if (days < 0) {
      months -= 1;
      days += new Date(e.getFullYear(), e.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    const totalDays = Math.round((e.getTime() - s.getTime()) / 86400000);
    return { years, months, days, weeks: Math.floor(totalDays / 7), totalDays };
  }, [a, b]);

  const result = useMemo(() => {
    const d = new Date(a + "T00:00:00");
    if (Number.isNaN(d.getTime())) return null;
    const r = new Date(d);
    r.setFullYear(r.getFullYear() + add.sign * add.y);
    r.setMonth(r.getMonth() + add.sign * add.m);
    r.setDate(r.getDate() + add.sign * add.d);
    return r;
  }, [a, add]);

  return (
    <div className="calc-date">
      <label><input type="radio" checked={mode === "diff"} onChange={() => setMode("diff")} /> Difference between dates</label>
      <label><input type="radio" checked={mode === "add"} onChange={() => setMode("add")} /> Add or subtract days</label>
      {mode === "diff" ? (
        <>
          <div className="calc-date-row"><span>From</span><input className="w7input" type="date" value={a} onChange={(e) => setA(e.target.value)} /><span>To</span><input className="w7input" type="date" value={b} onChange={(e) => setB(e.target.value)} /></div>
          <div className="calc-date-out">
            {diff ? (
              <>
                <div><b>{diff.years}</b> years <b>{diff.months}</b> months <b>{diff.days}</b> days</div>
                <div className="dim">{diff.weeks} weeks · {diff.totalDays} total days</div>
              </>
            ) : <span className="dim">Pick two dates.</span>}
          </div>
        </>
      ) : (
        <>
          <div className="calc-date-row"><span>From</span><input className="w7input" type="date" value={a} onChange={(e) => setA(e.target.value)} /></div>
          <div className="calc-date-row">
            <select className="w7input" value={add.sign} onChange={(e) => setAdd({ ...add, sign: Number(e.target.value) as 1 | -1 })}><option value={1}>Add</option><option value={-1}>Subtract</option></select>
            <input className="w7input" type="number" value={add.y} onChange={(e) => setAdd({ ...add, y: Number(e.target.value) || 0 })} /> years
            <input className="w7input" type="number" value={add.m} onChange={(e) => setAdd({ ...add, m: Number(e.target.value) || 0 })} /> months
            <input className="w7input" type="number" value={add.d} onChange={(e) => setAdd({ ...add, d: Number(e.target.value) || 0 })} /> days
          </div>
          <div className="calc-date-out">{result ? <div><b>{iso(result)}</b> <span className="dim">({result.toLocaleDateString(undefined, { weekday: "long" })})</span></div> : <span className="dim">Pick a date.</span>}</div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ worksheets */

interface SheetField {
  key: string;
  label: string;
  unit?: string;
  def?: number;
}
interface Sheet {
  title: string;
  fields: SheetField[];
  result: string;
  unit?: string;
  calc: (v: Record<string, number>) => number;
}

const WORKSHEETS: Sheet[] = [
  {
    title: "Mortgage payment",
    fields: [
      { key: "amount", label: "Loan amount", unit: "$", def: 250000 },
      { key: "years", label: "Number of years", def: 30 },
      { key: "rate", label: "Annual interest rate", unit: "%", def: 5 },
    ],
    result: "Monthly payment",
    unit: "$",
    calc: (v) => {
      const r = v.rate / 100 / 12;
      const n = v.years * 12;
      return r === 0 ? v.amount / n : (v.amount * r) / (1 - Math.pow(1 + r, -n));
    },
  },
  {
    title: "Vehicle lease",
    fields: [
      { key: "price", label: "Vehicle price", unit: "$", def: 30000 },
      { key: "residual", label: "Residual value", unit: "$", def: 16000 },
      { key: "months", label: "Term (months)", def: 36 },
      { key: "rate", label: "Annual interest rate", unit: "%", def: 4 },
    ],
    result: "Monthly lease",
    unit: "$",
    calc: (v) => (v.price - v.residual) / v.months + (v.price + v.residual) * (v.rate / 100 / 12),
  },
  {
    title: "Fuel economy",
    fields: [
      { key: "distance", label: "Distance", unit: "km", def: 500 },
      { key: "fuel", label: "Fuel used", unit: "L", def: 38 },
    ],
    result: "Consumption",
    unit: "L/100 km",
    calc: (v) => (v.fuel / v.distance) * 100,
  },
];

function Worksheets() {
  const [which, setWhich] = useState(0);
  const w = WORKSHEETS[which];
  const [vals, setVals] = useState<Record<string, number>>({});
  const get = (f: SheetField) => vals[f.key] ?? f.def ?? 0;
  const sheetVals = () => Object.fromEntries(w.fields.map((f) => [f.key, get(f)]));
  return (
    <div className="calc-sheet">
      <label>Worksheet:
        <select className="w7input" value={which} onChange={(e) => { setWhich(Number(e.target.value)); setVals({}); }}>{WORKSHEETS.map((x, i) => <option key={x.title} value={i}>{x.title}</option>)}</select>
      </label>
      {w.fields.map((f) => (
        <label key={f.key} className="calc-sheet-row">
          {f.label}
          <input className="w7input" type="number" value={get(f)} onChange={(e) => setVals({ ...vals, [f.key]: Number(e.target.value) || 0 })} />
          {f.unit && <span className="dim">{f.unit}</span>}
        </label>
      ))}
      <div className="calc-sheet-out">
        {w.result}: <b>{w.unit === "$" ? "$" : ""}{fmtG(w.calc(sheetVals()), 7)}{w.unit && w.unit !== "$" ? " " + w.unit : ""}</b>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ the window */

type Mode = "standard" | "scientific" | "programmer" | "statistics" | "units" | "date" | "worksheet";

const SIZES: Record<Mode, { w: number; h: number }> = {
  standard: { w: 262, h: 392 },
  scientific: { w: 548, h: 392 },
  programmer: { w: 470, h: 430 },
  statistics: { w: 360, h: 400 },
  units: { w: 460, h: 300 },
  date: { w: 470, h: 330 },
  worksheet: { w: 380, h: 330 },
};

function CalcKey({ l, f, cls = "", refocus }: { l: React.ReactNode; f: () => void; cls?: string; refocus: () => void }) {
  return (
    <button className={"cb2 " + cls} onClick={() => { f(); refocus(); }}>
      {l}
    </button>
  );
}

export function Calculator({ win }: { win: Win }) {
  const [mode, setMode] = useState<Mode>("standard");
  const [tokens, setTokens] = useState<string[]>([]);
  const [entry, setEntry] = useState("0");
  const [fresh, setFresh] = useState(true);
  const [mem, setMem] = useState(0);
  const [deg, setDeg] = useState(true);
  const [inv, setInv] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hist, setHist] = useState<string[]>([]);
  const [showHist, setShowHist] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sci = mode === "scientific";

  useEffect(() => {
    const s = SIZES[mode];
    setWin(win.id, { w: s.w, h: s.h + (showHist && (mode === "standard" || mode === "scientific") ? 90 : 0) });
  }, [mode, win.id, showHist]);

  const cur = () => parseFloat(entry);
  const digit = (d: string) => { if (err) clearAll(); setEntry(fresh || entry === "0" ? d : entry.length < 16 ? entry + d : entry); setFresh(false); };
  const dot = () => { if (fresh) { setEntry("0."); setFresh(false); } else if (!entry.includes(".")) setEntry(entry + "."); };
  const clearAll = () => { setTokens([]); setEntry("0"); setFresh(true); setErr(null); };
  const op = (o: string) => {
    if (err) return;
    let t = [...tokens];
    if (fresh && t.length && t[t.length - 1] !== "(" && t[t.length - 1] !== ")") {
      if (/[+\-×÷^]$/.test(t[t.length - 1])) t[t.length - 1] = o;
      else t.push(o);
    } else {
      if (t[t.length - 1] !== ")") t.push(entry);
      t.push(o);
    }
    setTokens(t);
    setFresh(true);
  };
  const paren = (p: "(" | ")") => {
    const t = [...tokens];
    if (p === "(") t.push("(");
    else { if (t[t.length - 1] !== "(") t.push(entry); t.push(")"); }
    setTokens(t);
    setFresh(true);
  };
  const equals = () => {
    if (err) return;
    const t = [...tokens];
    if (!t.length) return setFresh(true);
    if (t[t.length - 1] !== ")" && t[t.length - 1] !== "(") t.push(entry);
    try {
      const expr = t.join(" ").replace(/×/g, "*").replace(/÷/g, "/");
      const r = safeEval(expr);
      const s = fmt(r);
      setHist((h) => [`${t.join(" ")} = ${s}`, ...h].slice(0, 40));
      setEntry(s);
      setTokens([]);
      setFresh(true);
    } catch (e) {
      setErr((e as Error).message);
      setTokens([]);
    }
  };
  const un = (f: (x: number) => number) => {
    if (err) return;
    const r = f(cur());
    if (!Number.isFinite(r)) { setErr(r !== r ? "Invalid input" : "Overflow"); return; }
    setEntry(fmt(r));
    setFresh(true);
  };
  const rad = (x: number) => (deg ? (x * Math.PI) / 180 : x);
  const unrad = (x: number) => (deg ? (x * 180) / Math.PI : x);
  const percent = () => { const prev = tokens.length >= 2 ? parseFloat(tokens[tokens.length - 2]) : 0; un((x) => (prev * x) / 100); };
  const back = () => { if (fresh || err) return; setEntry(entry.length > 1 && !(entry.length === 2 && entry.startsWith("-")) ? entry.slice(0, -1) : "0"); };
  const sign = () => setEntry(entry.startsWith("-") ? entry.slice(1) : entry === "0" ? entry : "-" + entry);
  const fact = (x: number) => { if (x < 0 || !Number.isInteger(x)) throw new Error("Invalid input"); let r = 1; for (let i = 2; i <= x; i++) r *= i; return r; };

  useEffect(() => { ref.current?.focus(); }, []);

  const setM = (how: "c" | "r" | "s" | "add" | "sub") => {
    if (how === "c") setMem(0);
    else if (how === "r") { setEntry(fmt(mem)); setFresh(true); }
    else if (how === "s") setMem(cur());
    else if (how === "add") setMem(mem + cur());
    else setMem(mem - cur());
  };

  const key = (e: React.KeyboardEvent) => {
    const k = e.key;
    const alt = e.altKey;
    if (alt && k === "1") { setMode("standard"); return; }
    if (alt && k === "2") { setMode("scientific"); return; }
    if (alt && k === "3") { setMode("programmer"); return; }
    if (alt && k === "4") { setMode("statistics"); return; }
    if (e.ctrlKey && k.toLowerCase() === "u") { setMode("units"); return; }
    if (e.ctrlKey && k.toLowerCase() === "e") { setMode("date"); return; }
    if (e.ctrlKey && k.toLowerCase() === "h") { setShowHist((v) => !v); return; }
    if (mode === "programmer" || mode === "statistics" || mode === "units" || mode === "date" || mode === "worksheet") return;
    if (/^[0-9]$/.test(k)) digit(k);
    else if (k === ".") dot();
    else if (k === "+") op("+");
    else if (k === "-") op("-");
    else if (k === "*") op("×");
    else if (k === "/") { e.preventDefault(); op("÷"); }
    else if (k === "Enter" || k === "=") { e.preventDefault(); equals(); }
    else if (k === "Backspace") back();
    else if (k === "Escape") clearAll();
    else if (k === "Delete") { setEntry("0"); setFresh(true); }
    else if (k === "%") percent();
    else if (k === "(" && sci) paren("(");
    else if (k === ")" && sci) paren(")");
    else if (e.ctrlKey && k.toLowerCase() === "c") navigator.clipboard?.writeText(entry).catch(() => {});
    else if (e.ctrlKey && k.toLowerCase() === "l") setMem(0);
    else if (e.ctrlKey && k.toLowerCase() === "m") setMem(cur());
    else if (e.ctrlKey && k.toLowerCase() === "r") { setEntry(fmt(mem)); setFresh(true); }
    else if (e.ctrlKey && k.toLowerCase() === "p") setMem(mem + cur());
    else if (e.ctrlKey && k.toLowerCase() === "q") setMem(mem - cur());
  };

  const B = CalcKey;
  const setModeAndClear = (m: Mode) => { setMode(m); clearAll(); };
  const menus = [
    {
      label: "View", items: (): MenuItem[] => [
        { label: "Standard", shortcut: "Alt+1", checked: mode === "standard", radio: true, onClick: () => setModeAndClear("standard") },
        { label: "Scientific", shortcut: "Alt+2", checked: sci, radio: true, onClick: () => setModeAndClear("scientific") },
        { label: "Programmer", shortcut: "Alt+3", checked: mode === "programmer", radio: true, onClick: () => setModeAndClear("programmer") },
        { label: "Statistics", shortcut: "Alt+4", checked: mode === "statistics", radio: true, onClick: () => setModeAndClear("statistics") },
        { sep: true },
        { label: "Unit conversion", shortcut: "Ctrl+U", checked: mode === "units", radio: true, onClick: () => setModeAndClear("units") },
        { label: "Date calculation", shortcut: "Ctrl+E", checked: mode === "date", radio: true, onClick: () => setModeAndClear("date") },
        { label: "Worksheets", checked: mode === "worksheet", radio: true, onClick: () => setModeAndClear("worksheet") },
        { sep: true },
        { label: "History", shortcut: "Ctrl+H", checked: showHist, onClick: () => setShowHist(!showHist) },
        { label: "Digit grouping", onClick: () => msgBox({ title: "Calculator", text: "Digit grouping is on: 1,234,567.", icon: "info" }) },
      ],
    },
    {
      label: "Edit", items: (): MenuItem[] => [
        { label: "Copy", shortcut: "Ctrl+C", onClick: () => navigator.clipboard?.writeText(entry).catch(() => {}) },
        { label: "Paste", shortcut: "Ctrl+V", onClick: () => navigator.clipboard?.readText().then((t) => { const n = parseFloat(t); if (!isNaN(n)) { setEntry(fmt(n)); setFresh(true); } }).catch(() => {}) },
        { sep: true },
        { label: "History", sub: [{ label: "Clear history", shortcut: "Ctrl+Shift+D", onClick: () => setHist([]) }] },
      ],
    },
    {
      label: "Help", items: (): MenuItem[] => [
        { label: "View Help", onClick: () => openApp("help") },
        { sep: true },
        { label: "About Calculator", onClick: () => msgBox({ title: "About Calculator", text: "Windows 7 Calculator\nVersion 6.1 (Build 7601: Service Pack 1)", icon: "info" }) },
      ],
    },
  ];

  const display = err ?? (entry.length > 18 ? Number(entry).toExponential(8) : entry);

  return (
    <div className="calc" ref={ref} tabIndex={0} onKeyDown={key}>
      <MenuBar menus={menus} />
      {mode === "programmer" ? (
        <>
          <div className="calc-disp prog"><div className="calc-num">{display}</div></div>
          <Programmer />
        </>
      ) : mode === "statistics" ? (
        <>
          <div className="calc-disp"><div className="calc-num">{entry}</div></div>
          <Statistics />
        </>
      ) : mode === "units" ? (
        <UnitConversion />
      ) : mode === "date" ? (
        <DateCalc />
      ) : mode === "worksheet" ? (
        <Worksheets />
      ) : (
        <>
          <div className="calc-disp">
            <div className="calc-expr">{tokens.join(" ")}</div>
            <div className="calc-num">{display}</div>
          </div>
          <div className="calc-mem"><span>{mem !== 0 ? "M" : ""}</span></div>
          <div className="calc-body">
            {sci && (
              <div className="calc-sci">
                <div className="calc-radio">
                  <label><input type="radio" checked={deg} onChange={() => setDeg(true)} /> Degrees</label>
                  <label><input type="radio" checked={!deg} onChange={() => setDeg(false)} /> Radians</label>
                  <label><input type="checkbox" checked={inv} onChange={(e) => setInv(e.target.checked)} /> Inv</label>
                  <label><input type="checkbox" checked={showHist} onChange={(e) => setShowHist(e.target.checked)} /> Hist</label>
                </div>
                <div className="calc-grid c5">
                  <B refocus={() => ref.current?.focus()} l="(" f={() => paren("(")} cls="s" /><B refocus={() => ref.current?.focus()} l=")" f={() => paren(")")} cls="s" /><B refocus={() => ref.current?.focus()} l="mod" f={() => op("%")} cls="s" /><B refocus={() => ref.current?.focus()} l="n!" f={() => un(fact)} cls="s" /><B refocus={() => ref.current?.focus()} l="π" f={() => { setEntry(String(Math.PI)); setFresh(true); }} cls="s" />
                  <B refocus={() => ref.current?.focus()} l={inv ? "asin" : "sin"} f={() => un((x) => (inv ? unrad(Math.asin(x)) : Math.sin(rad(x))))} cls="s" />
                  <B refocus={() => ref.current?.focus()} l={inv ? "acos" : "cos"} f={() => un((x) => (inv ? unrad(Math.acos(x)) : Math.cos(rad(x))))} cls="s" />
                  <B refocus={() => ref.current?.focus()} l={inv ? "atan" : "tan"} f={() => un((x) => (inv ? unrad(Math.atan(x)) : Math.tan(rad(x))))} cls="s" />
                  <B refocus={() => ref.current?.focus()} l={inv ? "10ˣ" : "log"} f={() => un((x) => (inv ? Math.pow(10, x) : Math.log10(x)))} cls="s" />
                  <B refocus={() => ref.current?.focus()} l={inv ? "eˣ" : "ln"} f={() => un((x) => (inv ? Math.exp(x) : Math.log(x)))} cls="s" />
                  <B refocus={() => ref.current?.focus()} l="x²" f={() => un((x) => x * x)} cls="s" /><B refocus={() => ref.current?.focus()} l="x³" f={() => un((x) => x * x * x)} cls="s" /><B refocus={() => ref.current?.focus()} l="xʸ" f={() => op("^")} cls="s" /><B refocus={() => ref.current?.focus()} l="e" f={() => { setEntry(String(Math.E)); setFresh(true); }} cls="s" /><B refocus={() => ref.current?.focus()} l="Exp" f={() => op("^")} cls="s" />
                </div>
              </div>
            )}
            <div className="calc-main">
              <div className="calc-grid c5 mem">
                <B refocus={() => ref.current?.focus()} l="MC" f={() => setM("c")} cls="m" /><B refocus={() => ref.current?.focus()} l="MR" f={() => setM("r")} cls="m" /><B refocus={() => ref.current?.focus()} l="MS" f={() => setM("s")} cls="m" /><B refocus={() => ref.current?.focus()} l="M+" f={() => setM("add")} cls="m" /><B refocus={() => ref.current?.focus()} l="M−" f={() => setM("sub")} cls="m" />
              </div>
              <div className="calc-grid c5">
                <B refocus={() => ref.current?.focus()} l="←" f={back} cls="o" /><B refocus={() => ref.current?.focus()} l="CE" f={() => { setEntry("0"); setFresh(true); setErr(null); }} cls="o" /><B refocus={() => ref.current?.focus()} l="C" f={clearAll} cls="o" /><B refocus={() => ref.current?.focus()} l="±" f={sign} cls="o" /><B refocus={() => ref.current?.focus()} l="√" f={() => un(Math.sqrt)} cls="o" />
                <B refocus={() => ref.current?.focus()} l="7" f={() => digit("7")} /><B refocus={() => ref.current?.focus()} l="8" f={() => digit("8")} /><B refocus={() => ref.current?.focus()} l="9" f={() => digit("9")} /><B refocus={() => ref.current?.focus()} l="÷" f={() => op("÷")} cls="o" /><B refocus={() => ref.current?.focus()} l="%" f={percent} cls="o" />
                <B refocus={() => ref.current?.focus()} l="4" f={() => digit("4")} /><B refocus={() => ref.current?.focus()} l="5" f={() => digit("5")} /><B refocus={() => ref.current?.focus()} l="6" f={() => digit("6")} /><B refocus={() => ref.current?.focus()} l="×" f={() => op("×")} cls="o" /><B refocus={() => ref.current?.focus()} l="1/x" f={() => un((x) => 1 / x)} cls="o" />
                <B refocus={() => ref.current?.focus()} l="1" f={() => digit("1")} /><B refocus={() => ref.current?.focus()} l="2" f={() => digit("2")} /><B refocus={() => ref.current?.focus()} l="3" f={() => digit("3")} /><B refocus={() => ref.current?.focus()} l="−" f={() => op("-")} cls="o" /><B refocus={() => ref.current?.focus()} l="=" f={equals} cls="eq" />
                <B refocus={() => ref.current?.focus()} l="0" f={() => digit("0")} cls="zero" /><B refocus={() => ref.current?.focus()} l="." f={dot} /><B refocus={() => ref.current?.focus()} l="+" f={() => op("+")} cls="o" />
              </div>
            </div>
          </div>
          {showHist && (
            <div className="calc-hist">
              <b>History</b>
              {hist.length ? hist.map((h, i) => <div key={i}>{h}</div>) : <div style={{ color: "#777" }}>There&apos;s no history yet.</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
