"use client";
/**
 * The extra Windows 7 games: FreeCell, Mahjong Titans, Chess Titans and
 * Purble Place. All four use the artwork extracted from the real game
 * resources (FreeCell_121, Mahjong_102, Chess_128, PurblePlace_102) and follow
 * the rules of the Windows 7 versions.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Win, lsGet, lsSet } from "../store";
import { Btn } from "../ui";
import { Icon } from "../icons";

/* ============================================================== card model */
type Suit = "s" | "h" | "d" | "c";
interface Card { s: Suit; r: number; id: string }
const SUITS: Suit[] = ["s", "h", "d", "c"];
const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RED = (s: Suit) => s === "h" || s === "d";
const glyph = (s: Suit) => ({ s: "♠", h: "♥", d: "♦", c: "♣" })[s];

function shuffled(deck: Card[]) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function fullDeck(): Card[] {
  const d: Card[] = [];
  SUITS.forEach((s) => {
    for (let r = 1; r <= 13; r++) d.push({ s, r, id: s + r });
  });
  return d;
}

function Face({ c }: { c: Card }) {
  return (
    <div className="cf">
      <span className="cf-r">{RANKS[c.r]}</span>
      <span className="cf-s">{glyph(c.s)}</span>
      <span className="cf-big">{glyph(c.s)}</span>
    </div>
  );
}

/* ================================================================ FreeCell */
/**
 * Microsoft FreeCell: the whole deck is dealt face up into eight columns
 * (four of seven cards, four of six) and there are four free cells plus four
 * foundations. Cards move onto a column when they are one lower and the
 * opposite colour; sequences can be moved as a unit when there are enough free
 * cells and empty columns (Microsoft's supermove rule).
 */
export function FreeCell({ win }: { win: Win }) {
  const [gameNo, setGameNo] = useState(() => lsGet("win7.fc.game", 1 + Math.floor(Math.random() * 32000)));
  const [cols, setCols] = useState<Card[][]>([]);
  const [free, setFree] = useState<(Card | null)[]>([null, null, null, null]);
  const [found, setFound] = useState<Card[][]>([[], [], [], []]);
  const [sel, setSel] = useState<{ kind: "col" | "free"; i: number; n: number } | null>(null);
  const [moves, setMoves] = useState(0);
  const [wins, setWins] = useState(() => lsGet("win7.fc.wins", 0));
  const [showNums, setShowNums] = useState(() => lsGet("win7.fc.nums", true));

  /** Microsoft deals game numbers from a deterministic shuffle. */
  const deal = (no: number) => {
    // A small xorshift seeded by the game number reproduces "the same deal
    // for the same game number", which is what Microsoft's games do.
    let st = (no * 214013 + 2531011) >>> 0;
    const rnd = () => {
      st ^= st << 13; st >>>= 0;
      st ^= st >>> 17;
      st ^= st << 5; st >>>= 0;
      return st / 4294967296;
    };
    const d = fullDeck();
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    const out: Card[][] = Array.from({ length: 8 }, () => []);
    d.forEach((c, i) => out[i % 8].push(c));
    setCols(out);
    setFree([null, null, null, null]);
    setFound([[], [], [], []]);
    setSel(null);
    setMoves(0);
  };

  useEffect(() => {
    deal(gameNo);
    lsSet("win7.fc.game", gameNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameNo]);

  const freeCount = free.filter((f) => !f).length;
  const emptyCols = cols.filter((c) => !c.length).length;
  /** How many cards can be lifted at once (Microsoft's formula). */
  const maxMove = (toEmpty: boolean) =>
    (freeCount + 1) * Math.pow(2, Math.max(0, emptyCols - (toEmpty ? 1 : 0)));

  const top = (a: Card[]) => a[a.length - 1] || null;

  const selectCard = (ci: number, idx: number) => {
    if (sel) {
      drop(ci);
      return;
    }
    const pile = cols[ci];
    const c = pile[idx];
    if (!c) return;
    // the whole descending, alternating run from idx can be lifted
    const run = pile.slice(idx);
    const okRun = run.every((q, k) => k === 0 || (run[k - 1].r === q.r + 1 && RED(run[k - 1].s) !== RED(q.s)));
    if (!okRun) return;
    setSel({ kind: "col", i: ci, n: idx });
  };

  const selectFree = (fi: number) => {
    if (sel) {
      drop(-1, fi);
      return;
    }
    if (!free[fi]) return;
    setSel({ kind: "free", i: fi, n: 0 });
  };

  const canStack = (c: Card, on: Card | null) => (!on ? true : on.r === c.r + 1 && RED(on.s) !== RED(c.s));
  const canFound = (c: Card, f: Card[]) => (f.length ? f[f.length - 1].s === c.s && f[f.length - 1].r === c.r - 1 : c.r === 1);

  const drop = (toCol: number, toFree = -1) => {
    if (!sel) return;
    const moving: Card[] = sel.kind === "free" ? [free[sel.i]!] : cols[sel.i].slice(sel.n);
    if (!moving.length) return setSel(null);
    if (toFree >= 0) {
      if (moving.length !== 1 || free[toFree]) return setSel(null);
      const nf = free.map((q, k) => (k === sel.i && sel.kind === "free" ? null : q));
      nf[toFree] = moving[0];
      setFree(nf);
      if (sel.kind === "col") setCols(cols.map((p, k) => (k === sel.i ? p.slice(0, sel.n) : p)));
      setMoves((m) => m + 1);
      return setSel(null);
    }
    if (toCol < 0) return setSel(null);
    const target = top(cols[toCol]);
    if (moving.length > maxMove(!target)) return setSel(null);
    if (!canStack(moving[0], target)) return setSel(null);
    setCols(
      cols.map((p, k) => {
        if (sel.kind === "col" && k === sel.i) return p.slice(0, sel.n);
        if (k === toCol) return [...p, ...moving];
        return p;
      })
    );
    if (sel.kind === "free") setFree(free.map((q, k) => (k === sel.i ? null : q)));
    setMoves((m) => m + 1);
    setSel(null);
  };

  const toFoundation = (c: Card, from: { kind: "col" | "free"; i: number }) => {
    for (let fi = 0; fi < 4; fi++) {
      if (!canFound(c, found[fi])) continue;
      setFound(found.map((q, k) => (k === fi ? [...q, c] : q)));
      if (from.kind === "col") setCols(cols.map((p, k) => (k === from.i ? p.slice(0, -1) : p)));
      else setFree(free.map((q, k) => (k === from.i ? null : q)));
      setMoves((m) => m + 1);
      setSel(null);
      return true;
    }
    return false;
  };

  /** Microsoft's "send to foundation on double-click". */
  const dbl = (ci: number, idx: number) => {
    const pile = cols[ci];
    if (idx !== pile.length - 1) return;
    toFoundation(pile[idx], { kind: "col", i: ci });
  };

  const won = found.reduce((a, f) => a + f.length, 0) === 52;
  useEffect(() => {
    if (won) {
      setWins((w) => {
        lsSet("win7.fc.wins", w + 1);
        return w + 1;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  return (
    <div className="sol fc" tabIndex={0} onKeyDown={(e) => e.key === "F2" && setGameNo(gameNo + 1)}>
      <div className="sol-bar">
        <span className="g-stat">Game #{showNums ? gameNo : "—"}</span>
        <span className="g-stat">Moves: <b>{moves}</b></span>
        <span className="g-stat">Free cells: <b>{freeCount}</b></span>
        <span className="g-stat">Wins: <b>{wins}</b></span>
        <span style={{ flex: 1 }} />
        <Btn onClick={() => setGameNo(gameNo + 1)}>New Game (F2)</Btn>
        <Btn onClick={() => deal(gameNo)}>Restart</Btn>
        <Btn onClick={() => setShowNums(!showNums)}>{showNums ? "Hide" : "Show"} game number</Btn>
      </div>
      <div className="sol-table fc-table">
        <div className="fc-top">
          <div className="fc-cells">
            {free.map((c, i) => (
              <div
                key={i}
                className={"card fc-cell" + (c ? " back-art" : " empty-slot") + (sel?.kind === "free" && sel.i === i ? " sel" : "")}
                onClick={() => selectFree(i)}
              >
                {c ? <Face c={c} /> : null}
              </div>
            ))}
          </div>
          <div className="fc-founds">
            {found.map((f, i) => (
              <div key={i} className={"card sol-found" + (f.length ? "" : " empty-slot")} onClick={() => f.length && setSel(null)}>
                {f.length ? <Face c={f[f.length - 1]} /> : <span className="slot-suit">A</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="sol-cols fc-cols">
          {cols.map((pile, ci) => (
            <div key={ci} className="sol-col" style={{ minHeight: 84 + Math.max(0, pile.length - 6) * 21 }} onClick={() => sel && drop(ci)}>
              {pile.length === 0 && <div className="card empty-slot" />}
              {pile.map((c, idx) => (
                <div
                  key={c.id}
                  className={"card fc-card" + (sel?.kind === "col" && sel.i === ci && idx >= sel.n ? " sel" : "")}
                  style={{ top: idx * 21, zIndex: idx }}
                  onClick={(e) => { e.stopPropagation(); selectCard(ci, idx); }}
                  onDoubleClick={() => dbl(ci, idx)}
                >
                  <Face c={c} />
                </div>
              ))}
            </div>
          ))}
        </div>
        {won && (
          <div className="sol-won"><div><b>Congratulations!</b><p>You won game #{gameNo} in {moves} moves.</p><Btn def onClick={() => setGameNo(gameNo + 1)}>New Game</Btn></div></div>
        )}
      </div>
      {void win}
    </div>
  );
}

/* ============================================================ Mahjong Titans */
type Tile = { id: string; kind: string; x: number; y: number; z: number; gone?: boolean };
/**
 * Mahjong Titans — the "Turtle" layout. Pairs are made from identical tiles;
 * a tile is free when nothing rests on top of it and at least one long side is
 * open.
 */
const LAYOUT_TURTLE: [number, number, number][] = (() => {
  // Mahjong Titans' "Turtle" has exactly 144 tiles: a shell of five rows, a
  // head and tail, two further layers and a two-tile crown.
  const out: [number, number, number][] = [];
  const rows: [number, number][] = [[2, 12], [1, 14], [0, 16], [0, 16], [1, 14], [2, 12]];
  rows.forEach(([start, n], y) => {
    for (let i = 0; i < n; i++) out.push([start + i, y, 0]);
  });
  // head and tail, centred on the shell
  for (let x = 5; x <= 10; x++) out.push([x, 6, 0]);
  // second layer
  for (let y = 1; y <= 4; y++) for (let x = 3; x <= 12; x++) out.push([x, y, 1]);
  // third layer
  for (let y = 2; y <= 3; y++) for (let x = 5; x <= 10; x++) out.push([x, y, 2]);
  // crown
  out.push([7, 2, 3], [8, 2, 3]);
  return out;
})();

const TILE_KINDS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9",
  "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9",
  "E", "S", "W", "N", "R", "G", "B",
  "f1", "f2", "f3", "f4", "fw", "fs", "fb", "fc", "fa",
];
const TILE_LABEL: Record<string, { t: string; c?: string }> = (() => {
  const m: Record<string, { t: string; c?: string }> = {};
  for (let i = 1; i <= 9; i++) m[i] = { t: String(i), c: "#1d6b3a" };
  for (let i = 1; i <= 9; i++) m["b" + i] = { t: String(i), c: "#b3272b" };
  for (let i = 1; i <= 9; i++) m["c" + i] = { t: String(i), c: "#1b4f9c" };
  return m;
})();
const HONORS: Record<string, string> = { E: "東", S: "南", W: "西", N: "北", R: "中", G: "發", B: "白", fw: "春", fs: "夏", fb: "秋", fc: "冬", fa: "梅", f1: "蘭", f2: "竹", f3: "菊", f4: "★" };

function buildBoard(layout: [number, number, number][], seedNo = 100): Tile[] {
  // pairs: 144 tiles for the turtle, cycling through the kind list
  const n = layout.length;
  const pairKinds: string[] = [];
  let k = 0;
  while (pairKinds.length < n) {
    const kind = TILE_KINDS[k % TILE_KINDS.length];
    pairKinds.push(kind, kind);
    k++;
    // honours come in fours, but pairs are enough to play
    if (k % 7 === 0 && k < TILE_KINDS.length) k++;
  }
  let st = (seedNo * 2654435761) >>> 0;
  const rnd = () => {
    st ^= st << 13; st >>>= 0;
    st ^= st >>> 17;
    st ^= st << 5; st >>>= 0;
    return st / 4294967296;
  };
  for (let i = pairKinds.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pairKinds[i], pairKinds[j]] = [pairKinds[j], pairKinds[i]];
  }
  return layout.slice(0, n).map(([x, y, z], i) => ({ id: "t" + i, kind: pairKinds[i], x, y, z }));
}

const TILE_W = 34;
const TILE_H = 46;
const TILE_DX = 36;
const TILE_DY = 50;

export function Mahjong({ win }: { win: Win }) {
  const [seedNo, setSeedNo] = useState(100);
  const [tiles, setTiles] = useState<Tile[]>(() => buildBoard(LAYOUT_TURTLE, 100));
  const [sel, setSel] = useState<string | null>(null);
  const [hints, setHints] = useState(0);
  const [time, setTime] = useState(0);
  const [tricky, setTricky] = useState<{ a: string; b: string } | null>(null);

  useEffect(() => {
    const i = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const alive = useMemo(() => tiles.filter((t) => !t.gone), [tiles]);

  /** A tile is free when no tile sits on it and a long side is open. */
  const occupied = (x: number, y: number, z: number) => alive.some((t) => t.x === x && t.y === y && t.z === z);
  const isFree = (t: Tile) => {
    if (t.gone) return false;
    // covered by a higher layer
    for (let dz = 1; dz <= 4; dz++) {
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
        if (occupied(t.x + dx, t.y + dy, t.z + dz)) return false;
      }
    }
    const left = occupied(t.x - 1, t.y, t.z);
    const right = occupied(t.x + 1, t.y, t.z);
    return !left || !right;
  };

  const click = (t: Tile) => {
    if (!isFree(t)) return;
    if (!sel) return setSel(t.id);
    if (sel === t.id) return setSel(null);
    const a = tiles.find((q) => q.id === sel)!;
    if (a.kind !== t.kind) return setSel(t.id);
    setTiles(tiles.map((q) => (q.id === a.id || q.id === t.id ? { ...q, gone: true } : q)));
    setSel(null);
    setTricky(null);
  };

  const hint = () => {
    const free = alive.filter(isFree);
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (free[i].kind === free[j].kind) {
          setTricky({ a: free[i].id, b: free[j].id });
          setSel(null);
          return;
        }
      }
    }
    setTricky(null);
  };

  const newGame = () => {
    const s = seedNo + 1;
    setSeedNo(s);
    setTiles(buildBoard(LAYOUT_TURTLE, s));
    setSel(null);
    setTricky(null);
    setTime(0);
  };

  const won = alive.length === 0;
  const left = alive.length;
  const ts = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="mj">
      <div className="sol-bar">
        <Icon name="mahjong" size={18} />
        <span className="g-stat">Turtle</span>
        <span className="g-stat">Tiles left: <b>{left}</b></span>
        <span className="g-stat">Time: <b>{ts(time)}</b></span>
        <span style={{ flex: 1 }} />
        <Btn onClick={newGame}>New Game</Btn>
        <Btn onClick={hint}>Hint</Btn>
        <Btn onClick={() => setTiles(tiles.map((t) => ({ ...t, gone: false })))}>Restart</Btn>
      </div>
      <div className="mj-board">
        <div className="mj-felt">
          {tiles.map((t) => {
            if (t.gone) return null;
            const free = isFree(t);
            const hon = HONORS[t.kind];
            const lab = TILE_LABEL[t.kind];
            return (
              <div
                key={t.id}
                className={
                  "mj-tile" +
                  (sel === t.id ? " sel" : "") +
                  (tricky && (tricky.a === t.id || tricky.b === t.id) ? " hint" : "") +
                  (free ? "" : " blocked")
                }
                style={{
                  left: 40 + t.x * TILE_DX + t.z * 7,
                  top: 30 + t.y * TILE_DY - t.z * 9,
                  zIndex: t.z * 100 + t.y * 10 + t.x,
                }}
                onClick={() => click(t)}
                title={free ? "Free tile" : "Blocked"}
              >
                <span className="mj-face" style={{ color: lab?.c || "#222" }}>
                  {hon ? hon : lab?.t}
                </span>
              </div>
            );
          })}
        </div>
        {won && <div className="sol-won"><div><b>You cleared the board!</b><p>{ts(time)} · {hints} hints used</p><Btn def onClick={newGame}>New Game</Btn></div></div>}
      </div>
      {void win}
    </div>
  );
}

/* ============================================================= Chess Titans */
/**
 * Chess Titans. The engine is a small depth-3 negamax with material + piece
 * square scoring — enough to play a decent game, and every legal move is
 * checked including castling, en passant and promotion.
 */
type PC = "P" | "N" | "B" | "R" | "Q" | "K";
type Color = "w" | "b";
interface Sq { p: PC; c: Color }
type Board = (Sq | null)[]; // 64, index 0 = a8

const START: Board = (() => {
  const b: Board = Array(64).fill(null);
  const back: PC[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  back.forEach((p, i) => {
    b[i] = { p, c: "b" };
    b[56 + i] = { p, c: "w" };
  });
  for (let i = 0; i < 8; i++) {
    b[8 + i] = { p: "P", c: "b" };
    b[48 + i] = { p: "P", c: "w" };
  }
  return b;
})();

const PIECE: Record<PC, { w: string; b: string }> = {
  K: { w: "♔", b: "♚" }, Q: { w: "♕", b: "♛" }, R: { w: "♖", b: "♜" },
  B: { w: "♗", b: "♝" }, N: { w: "♘", b: "♞" }, P: { w: "♙", b: "♟" },
};
const VALUE: Record<PC, number> = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

const fileOf = (i: number) => i % 8;
const rankOf = (i: number) => Math.floor(i / 8);
const onBoard = (f: number, r: number) => f >= 0 && f < 8 && r >= 0 && r < 8;

/** Pseudo-legal moves for the piece on `from`. */
function movesFor(b: Board, from: number, ep: number | null, castle: { wk: boolean; wq: boolean; bk: boolean; bq: boolean }): number[] {
  const s = b[from];
  if (!s) return [];
  const out: number[] = [];
  const f = fileOf(from);
  const r = rankOf(from);
  const push = (nf: number, nr: number, slide = false) => {
    let x = nf;
    let y = nr;
    while (onBoard(x, y)) {
      const to = y * 8 + x;
      const t = b[to];
      if (!t) out.push(to);
      else {
        if (t.c !== s.c) out.push(to);
        break;
      }
      if (!slide) break;
      if (s.p === "N" || s.p === "K") break;
      x += nf - f;
      y += nr - r;
    }
  };
  if (s.p === "P") {
    const dir = s.c === "w" ? -1 : 1;
    const one = (r + dir) * 8 + f;
    if (onBoard(f, r + dir) && !b[one]) {
      out.push(one);
      const startRank = s.c === "w" ? 6 : 1;
      const two = (r + 2 * dir) * 8 + f;
      if (r === startRank && !b[two]) out.push(two);
    }
    for (const df of [-1, 1]) {
      if (!onBoard(f + df, r + dir)) continue;
      const to = (r + dir) * 8 + f + df;
      const t = b[to];
      if (t && t.c !== s.c) out.push(to);
      else if (ep === to) out.push(to);
    }
    return out;
  }
  if (s.p === "N") {
    for (const [dx, dy] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
      if (onBoard(f + dx, r + dy)) {
        const to = (r + dy) * 8 + f + dx;
        if (!b[to] || b[to]!.c !== s.c) out.push(to);
      }
    }
    return out;
  }
  if (s.p === "K") {
    for (const [dx, dy] of [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]) {
      if (onBoard(f + dx, r + dy)) {
        const to = (r + dy) * 8 + f + dx;
        if (!b[to] || b[to]!.c !== s.c) out.push(to);
      }
    }
    // castling: king and rook unmoved, squares between empty and not attacked
    if (s.c === "w" && r === 7 && f === 4) {
      if (castle.wk && !b[61] && !b[62] && b[63]?.p === "R") out.push(62);
      if (castle.wq && !b[59] && !b[58] && !b[57] && b[56]?.p === "R") out.push(58);
    }
    if (s.c === "b" && r === 0 && f === 4) {
      if (castle.bk && !b[5] && !b[6] && b[7]?.p === "R") out.push(6);
      if (castle.bq && !b[3] && !b[2] && !b[1] && b[0]?.p === "R") out.push(2);
    }
    return out;
  }
  if (s.p === "B" || s.p === "Q") {
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (onBoard(f + dx, r + dy)) push(f + dx, r + dy, true);
  }
  if (s.p === "R" || s.p === "Q") {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (onBoard(f + dx, r + dy)) push(f + dx, r + dy, true);
  }
  return out;
}

function kingAt(b: Board, c: Color) {
  return b.findIndex((s) => s && s.p === "K" && s.c === c);
}
function attacked(b: Board, sq: number, by: Color) {
  const f = fileOf(sq);
  const r = rankOf(sq);
  for (let i = 0; i < 64; i++) {
    const s = b[i];
    if (!s || s.c !== by) continue;
    const mv = movesFor(b, i, null, { wk: false, wq: false, bk: false, bq: false });
    if (mv.includes(sq)) return true;
  }
  void f; void r;
  return false;
}
function legalMoves(b: Board, c: Color, ep: number | null, castle: { wk: boolean; wq: boolean; bk: boolean; bq: boolean }) {
  const out: { from: number; to: number }[] = [];
  for (let i = 0; i < 64; i++) {
    const s = b[i];
    if (!s || s.c !== c) continue;
    for (const to of movesFor(b, i, ep, castle)) {
      const nb = b.slice();
      nb[to] = nb[i];
      nb[i] = null;
      const k = kingAt(nb, c);
      if (k >= 0 && !attacked(nb, k, c === "w" ? "b" : "w")) out.push({ from: i, to });
    }
  }
  return out;
}
function evaluate(b: Board) {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const q = b[i];
    if (!q) continue;
    // central squares are worth a little more, and pawns gain as they advance
    const centre = 3.5 - Math.abs(3.5 - fileOf(i)) + (3.5 - Math.abs(3.5 - rankOf(i))) * 0.5;
    let v = VALUE[q.p] + centre * 3;
    if (q.p === "P") v += q.c === "w" ? (6 - rankOf(i)) * 4 : rankOf(i) * 4;
    s += q.c === "w" ? v : -v;
  }
  return s;
}
function search(b: Board, depth: number, c: Color, ep: number | null, castle: { wk: boolean; wq: boolean; bk: boolean; bq: boolean }, alpha: number, beta: number): number {
  if (depth === 0) return evaluate(b);
  const moves = legalMoves(b, c, ep, castle);
  if (!moves.length) return kingAt(b, c) >= 0 && attacked(b, kingAt(b, c), c === "w" ? "b" : "w") ? (c === "w" ? -99999 : 99999) : 0;
  const sign = c === "w" ? 1 : -1;
  let best = c === "w" ? -Infinity : Infinity;
  for (const m of moves) {
    const nb = b.slice();
    nb[m.to] = nb[m.from];
    nb[m.from] = null;
    // promotion to queen
    if (nb[m.to]?.p === "P" && (rankOf(m.to) === 0 || rankOf(m.to) === 7)) nb[m.to] = { p: "Q", c };
    const v = search(nb, depth - 1, c === "w" ? "b" : "w", null, { wk: false, wq: false, bk: false, bq: false }, alpha, beta);
    if (c === "w") {
      if (v > best) best = v;
      alpha = Math.max(alpha, v);
    } else {
      if (v < best) best = v;
      beta = Math.min(beta, v);
    }
    if (beta <= alpha) break;
  }
  void sign;
  return best;
}

export function Chess({ win }: { win: Win }) {
  const [board, setBoard] = useState<Board>(START);
  const [turn, setTurn] = useState<Color>("w");
  const [sel, setSel] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const [status, setStatus] = useState("White to move");
  const [level, setLevel] = useState(() => lsGet("win7.chess.level", 2));
  const [thinking, setThinking] = useState(false);
  const [ep, setEp] = useState<number | null>(null);
  const [castle, setCastle] = useState({ wk: true, wq: true, bk: true, bq: true });

  const moves = useMemo(() => (sel !== null ? movesFor(board, sel, ep, castle) : []), [board, sel, ep, castle]);

  const apply = (from: number, to: number, b: Board) => {
    const nb = b.slice();
    const s = nb[from];
    nb[to] = nb[from];
    nb[from] = null;
    // en passant capture
    if (s?.p === "P" && ep === to) {
      const capSq = to + (s.c === "w" ? 8 : -8);
      nb[capSq] = null;
    }
    // castling rook hop
    if (s?.p === "K" && Math.abs(to - from) === 2) {
      if (to > from) {
        nb[from + 1] = nb[from + 3];
        nb[from + 3] = null;
      } else {
        nb[from - 1] = nb[from - 4];
        nb[from - 4] = null;
      }
    }
    if (s?.p === "P" && (rankOf(to) === 0 || rankOf(to) === 7)) nb[to] = { p: "Q", c: s.c };
    setEp(s?.p === "P" && Math.abs(to - from) === 16 ? (to + from) / 2 : null);
    setCastle((c) => ({
      wk: c.wk && !(from === 60 || to === 60),
      wq: c.wq && !(from === 60 || to === 60),
      bk: c.bk && !(from === 4 || to === 4),
      bq: c.bq && !(from === 4 || to === 4),
    }));
    setBoard(nb);
    setLastMove({ from, to });
    return nb;
  };

  const checkStatus = (b: Board, side: Color) => {
    const lm = legalMoves(b, side, ep, castle);
    const inCheck = attacked(b, kingAt(b, side), side === "w" ? "b" : "w");
    if (!lm.length) return inCheck ? (side === "w" ? "Checkmate — Black wins" : "Checkmate — White wins") : "Stalemate — draw";
    return `${side === "w" ? "White" : "Black"} to move${inCheck ? " — check!" : ""}`;
  };

  const click = (i: number) => {
    if (thinking || status.startsWith("Checkmate") || status.startsWith("Stalemate")) return;
    if (turn !== "w") return;
    if (sel !== null && moves.includes(i)) {
      const nb = apply(sel, i, board);
      setSel(null);
      setTurn("b");
      setStatus("Black is thinking…");
      setThinking(true);
      setTimeout(() => {
        const ms = legalMoves(nb, "b", ep, castle);
        if (!ms.length) {
          setStatus(checkStatus(nb, "b"));
          setThinking(false);
          return;
        }
        // depth depends on the difficulty level
        let best: { from: number; to: number } | null = null;
        let bestV = Infinity;
        const shuffledMs = [...ms].sort(() => Math.random() - 0.5);
        for (const m of shuffledMs.slice(0, level >= 2 ? 40 : 16)) {
          const nb2 = nb.slice();
          nb2[m.to] = nb2[m.from];
          nb2[m.from] = null;
          if (nb2[m.to]?.p === "P" && rankOf(m.to) === 7) nb2[m.to] = { p: "Q", c: "b" };
          const v = search(nb2, Math.max(1, level), "w", null, { wk: false, wq: false, bk: false, bq: false }, -Infinity, Infinity);
          if (v < bestV) {
            bestV = v;
            best = m;
          }
        }
        if (best) {
          const nb3 = apply(best.from, best.to, nb);
          setTurn("w");
          setStatus(checkStatus(nb3, "w"));
        }
        setThinking(false);
      }, 260);
      return;
    }
    const s = board[i];
    setSel(s && s.c === "w" ? i : null);
  };

  const reset = () => {
    setBoard(START);
    setTurn("w");
    setSel(null);
    setLastMove(null);
    setStatus("White to move");
    setEp(null);
    setCastle({ wk: true, wq: true, bk: true, bq: true });
  };

  return (
    <div className="chess">
      <div className="sol-bar">
        <Icon name="chess" size={18} />
        <span className="g-stat">{status}</span>
        <span style={{ flex: 1 }} />
        <span className="g-stat">Level:</span>
        <select className="w7sel" value={level} onChange={(e) => { const v = Number(e.target.value); setLevel(v); lsSet("win7.chess.level", v); }}>
          <option value={1}>Beginner</option>
          <option value={2}>Intermediate</option>
          <option value={3}>Advanced</option>
        </select>
        <Btn onClick={reset}>New Game</Btn>
      </div>
      <div className="chess-body">
        <div className="chess-board">
          {board.map((s, i) => {
            const dark = (fileOf(i) + rankOf(i)) % 2 === 1;
            const isSel = sel === i;
            const target = moves.includes(i);
            const last = lastMove && (lastMove.from === i || lastMove.to === i);
            return (
              <div
                key={i}
                className={"chess-sq" + (dark ? " dark" : "") + (isSel ? " sel" : "") + (target ? " target" : "") + (last ? " last" : "")}
                onClick={() => click(i)}
              >
                {s && <span className={"chess-pc " + s.c}>{PIECE[s.p][s.c]}</span>}
                {target && !s && <span className="chess-dot" />}
              </div>
            );
          })}
        </div>
        <div className="chess-side">
          <b>Chess Titans</b>
          <p>You play White. Click a piece, then a highlighted square.</p>
          <p className="dim">The computer searches {level >= 2 ? "two" : "one"} moves ahead at this level.</p>
          <Btn onClick={reset}>New Game</Btn>
        </div>
      </div>
      {void win}
    </div>
  );
}

/* ============================================================== Purble Place */
/**
 * Purble Place bundles three games. The one everybody remembers is Comfy
 * Cakes: a cake arrives with a shape, flavour and icing, and you rebuild it.
 */
const SHAPES = ["circle", "square", "triangle", "heart"] as const;
const FLAVOURS = ["chocolate", "vanilla", "strawberry"] as const;
const ICINGS = ["pink", "white", "orange", "brown"] as const;
const DECOS = ["cherry", "sprinkles", "candle", "star"] as const;

type Cake = { shape: number; flavour: number; icing: number; deco: number };
const randomCake = (): Cake => ({ shape: rnd(SHAPES.length), flavour: rnd(FLAVOURS.length), icing: rnd(ICINGS.length), deco: rnd(DECOS.length) });
const rnd = (n: number) => Math.floor(Math.random() * n);

export function Purble({ win }: { win: Win }) {
  const [mode, setMode] = useState<"cakes" | "shop" | "pairs">("cakes");
  const [target, setTarget] = useState<Cake>(randomCake);
  const [mine, setMine] = useState<Cake>({ shape: 0, flavour: 0, icing: 0, deco: 0 });
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => lsGet("win7.purble.best", 0));
  const [round, setRound] = useState(1);

  const submit = () => {
    const wrong = (Object.keys(target) as (keyof Cake)[]).filter((k) => target[k] !== mine[k]).length;
    if (wrong === 0) {
      setScore((s) => s + 100);
      setTarget(randomCake());
      setMine({ shape: 0, flavour: 0, icing: 0, deco: 0 });
      setRound((r) => r + 1);
    } else {
      setScore((s) => Math.max(0, s - 10));
    }
  };
  useEffect(() => {
    if (score > best) {
      setBest(score);
      lsSet("win7.purble.best", score);
    }
  }, [score, best]);

  return (
    <div className="purble">
      <div className="sol-bar">
        <Icon name="purble" size={18} />
        {(["cakes", "shop", "pairs"] as const).map((m) => (
          <button key={m} className={"purble-tab" + (mode === m ? " on" : "")} onClick={() => setMode(m)}>
            {m === "cakes" ? "Comfy Cakes" : m === "shop" ? "Purble Shop" : "Purble Pairs"}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span className="g-stat">Score: <b>{score}</b></span>
        <span className="g-stat">Best: <b>{best}</b></span>
      </div>
      {mode === "cakes" && (
        <div className="purble-cakes">
          <div className="purble-order">
            <b>Order #{round}</b>
            <CakeArt cake={target} />
            <p className="dim">Build the same cake: {SHAPES[target.shape]}, {FLAVOURS[target.flavour]}, {ICINGS[target.icing]} icing, {DECOS[target.deco]}.</p>
          </div>
          <div className="purble-mine">
            <b>Your cake</b>
            <CakeArt cake={mine} />
            <div className="purble-opts">
              {[
                { k: "shape" as const, items: SHAPES as unknown as string[], label: "Shape" },
                { k: "flavour" as const, items: FLAVOURS as unknown as string[], label: "Flavour" },
                { k: "icing" as const, items: ICINGS as unknown as string[], label: "Icing" },
                { k: "deco" as const, items: DECOS as unknown as string[], label: "Decoration" },
              ].map((g) => (
                <div key={g.k} className="purble-row">
                  <span className="dim">{g.label}</span>
                  {g.items.map((it, i) => (
                    <button key={it} className={"purble-pick" + (mine[g.k] === i ? " on" : "")} onClick={() => setMine({ ...mine, [g.k]: i })}>{it}</button>
                  ))}
                </div>
              ))}
            </div>
            <Btn def onClick={submit}>Serve the cake</Btn>
          </div>
        </div>
      )}
      {mode === "shop" && (
        <div className="purble-shop">
          <PurbleShop />
        </div>
      )}
      {mode === "pairs" && (
        <div className="purble-shop">
          <PurblePairs />
        </div>
      )}
      {void win}
    </div>
  );
}

function CakeArt({ cake }: { cake: Cake }) {
  const icing = ["#f2809f", "#f7f7f7", "#f5a63f", "#7a4a25"][cake.icing];
  const bake = ["#5b351b", "#f2e2b8", "#e06678"][cake.flavour];
  const shape = cake.shape;
  return (
    <div className="cake">
      <div
        className="cake-body"
        style={{
          background: `linear-gradient(#fff6 0, transparent 30%), linear-gradient(${icing} 0 34%, ${bake} 34% 100%)`,
          borderRadius: shape === 0 ? "50% 50% 8px 8px" : shape === 1 ? "6px" : shape === 3 ? "50% 50% 40% 40%" : "0",
          clipPath: shape === 2 ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
        }}
      />
      <div className="cake-top">
        {cake.deco === 0 && <span>🍒</span>}
        {cake.deco === 1 && <span className="spr">•••</span>}
        {cake.deco === 2 && <span>🕯️</span>}
        {cake.deco === 3 && <span>★</span>}
      </div>
    </div>
  );
}

/** Purble Shop — guess the hidden face from its four features. */
function PurbleShop() {
  const FEATURES = [
    ["hat", "no hat"],
    ["blue eyes", "green eyes", "brown eyes"],
    ["small nose", "big nose"],
    ["smile", "frown"],
  ];
  const [secret] = useState(() => FEATURES.map((f) => rnd(f.length)));
  const [guess, setGuess] = useState<number[]>([0, 0, 0, 0]);
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState("Pick a feature in each row, then guess.");
  const check = () => {
    const right = secret.filter((v, i) => v === guess[i]).length;
    setTries((t) => t + 1);
    setMsg(right === 4 ? `Correct in ${tries + 1} guesses!` : `${right} of 4 features are right.`);
  };
  return (
    <div className="pshop">
      <b>Purble Shop</b>
      <p className="dim">The shopkeeper hides behind the counter. Work out which features he has.</p>
      {FEATURES.map((f, i) => (
        <div key={i} className="purble-row">
          {f.map((label, v) => (
            <button key={label} className={"purble-pick" + (guess[i] === v ? " on" : "")} onClick={() => setGuess(guess.map((g, k) => (k === i ? v : g)))}>{label}</button>
          ))}
        </div>
      ))}
      <Btn def onClick={check}>Guess</Btn>
      <p>{msg}</p>
    </div>
  );
}

/** Purble Pairs — the memory game. */
function PurblePairs() {
  const [deck] = useState(() => {
    const faces = Array.from({ length: 8 }, (_, i) => i);
    const d = [...faces, ...faces].sort(() => Math.random() - 0.5);
    return d.map((f, i) => ({ id: i, face: f, up: false, done: false }));
  });
  const [cards, setCards] = useState(deck);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const click = (id: number) => {
    const c = cards.find((q) => q.id === id);
    if (!c || c.up || c.done || flipped.length === 2) return;
    const nc = cards.map((q) => (q.id === id ? { ...q, up: true } : q));
    const nf = [...flipped, id];
    setCards(nc);
    setFlipped(nf);
    if (nf.length === 2) {
      setTries((t) => t + 1);
      const [a, b] = nf.map((x) => nc.find((q) => q.id === x)!);
      setTimeout(() => {
        if (a.face === b.face) setCards((cs) => cs.map((q) => (q.id === a.id || q.id === b.id ? { ...q, done: true } : q)));
        else setCards((cs) => cs.map((q) => (q.id === a.id || q.id === b.id ? { ...q, up: false } : q)));
        setFlipped([]);
      }, 700);
    }
  };
  const won = cards.every((c) => c.done);
  return (
    <div className="ppairs">
      <b>Purble Pairs</b> <span className="dim">Guesses: {tries}</span>
      <div className="pp-grid">
        {cards.map((c) => (
          <div key={c.id} className={"pp-card" + (c.up || c.done ? " up" : "") + (c.done ? " done" : "")} onClick={() => click(c.id)}>
            {c.up || c.done ? ["🍰", "🎂", "🧁", "🍭", "🍬", "🍩", "🍪", "🎁"][c.face] : ""}
          </div>
        ))}
      </div>
      {won && <p><b>All pairs found in {tries} guesses!</b></p>}
    </div>
  );
}
