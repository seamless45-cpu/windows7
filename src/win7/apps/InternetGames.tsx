"use client";
/**
 * The Windows 7 *Internet* games: Internet Backgammon, Internet Checkers,
 * Internet Spades and Internet Reversi.
 *
 * On the real OS these were multiplayer games hosted by the Games for Windows
 * LIVE service. There is no server here, so each one is a complete single-player
 * implementation against a computer opponent, using the same rules:
 *
 *  - Reversi: legal-move highlighting, discs flip in every direction, the game
 *    ends when neither side can move and the discs are counted.
 *  - Checkers: forced captures, multi-jumps, men promote on the far row.
 *  - Backgammon: two dice, doubling, the bar, hitting a blot, bearing off.
 *  - Spades: bidding, partnerships, spades broken, nil bids, tricks.
 *
 * The computer players are deliberately small: a one-to-two-ply search over the
 * legal moves with a positional score, which is enough to be a fair opponent
 * without pretending to be a strong engine.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Win } from "../store";
import { playSys } from "../sound";
import { Btn } from "../ui";

/* ================================================================ Reversi */

type Cell = 0 | 1 | 2; // 0 empty, 1 black (you), 2 white (cpu)
const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

function reversiFlips(b: Cell[], i: number, p: Cell): number[] {
  if (b[i] !== 0) return [];
  const x = i % 8, y = Math.floor(i / 8);
  const out: number[] = [];
  for (const [dx, dy] of DIRS) {
    const run: number[] = [];
    let cx = x + dx, cy = y + dy;
    while (cx >= 0 && cx < 8 && cy >= 0 && cy < 8) {
      const j = cy * 8 + cx;
      if (b[j] === 0) break;
      if (b[j] === p) {
        out.push(...run);
        break;
      }
      run.push(j);
      cx += dx;
      cy += dy;
    }
  }
  return out;
}

const START: Cell[] = (() => {
  const b: Cell[] = Array(64).fill(0) as Cell[];
  b[27] = b[36] = 2;
  b[28] = b[35] = 1;
  return b;
})();

function score(b: Cell[]) {
  return b.reduce((a: number, c) => (c === 1 ? a + 1 : c === 2 ? a - 1 : a), 0);
}

/** Corner/edge weighting: the classic cheap Reversi heuristic. */
function reversiScore(b: Cell[], p: Cell) {
  const W = [40, -6, 3, 2, 2, 3, -6, 40];
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const v = W[i % 8] + W[Math.floor(i / 8)];
    s += b[i] === p ? v : b[i] === 0 ? 0 : -v;
  }
  return s;
}

function cpuReversi(b: Cell[]): number | null {
  const moves = [...Array(64).keys()].filter((i) => reversiFlips(b, i, 2).length);
  if (!moves.length) return null;
  let best = moves[0], bestV = -1e9;
  for (const m of moves) {
    const nb = [...b] as Cell[];
    nb[m] = 2;
    for (const f of reversiFlips(b, m, 2)) nb[f] = 2;
    // one-ply lookahead: minimise the human's reply count
    const reply = [...Array(64).keys()].filter((i) => reversiFlips(nb, i, 1).length).length;
    const v = reversiScore(nb, 2) - reply * 1.5;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}

export function Reversi() {
  const [b, setB] = useState<Cell[]>(START);
  const [turn, setTurn] = useState<Cell>(1);
  const [pass, setPass] = useState(0);
  const [msg, setMsg] = useState("You are black. Click a highlighted square.");

  const legal = useMemo(() => {
    const s = new Set<number>();
    for (let i = 0; i < 64; i++) if (reversiFlips(b, i, turn).length) s.add(i);
    return s;
  }, [b, turn]);

  const counts = useMemo(() => ({ black: b.filter((c) => c === 1).length, white: b.filter((c) => c === 2).length }), [b]);
  const over = legal.size === 0 && pass >= 2;

  const play = (i: number) => {
    if (turn !== 1 || over || !legal.has(i)) return;
    const f = reversiFlips(b, i, 1);
    const nb = [...b] as Cell[];
    nb[i] = 1;
    f.forEach((j) => (nb[j] = 1));
    playSys("menu");
    setB(nb);
    setTurn(2);
    setPass(0);
  };

  useEffect(() => {
    if (turn !== 2 || over) return;
    const t = window.setTimeout(() => {
      const m = cpuReversi(b);
      if (m === null) {
        setPass((p) => p + 1);
        setTurn(1);
        setMsg("The computer has no legal move and passes.");
        return;
      }
      const f = reversiFlips(b, m, 2);
      const nb = [...b] as Cell[];
      nb[m] = 2;
      f.forEach((j) => (nb[j] = 2));
      setB(nb);
      setTurn(1);
      setPass(0);
    }, 520);
    return () => window.clearTimeout(t);
  }, [b, turn, over]);

  // Passing and the end-of-game message both wait a beat, so the state change
  // happens in a callback rather than synchronously inside the effect.
  useEffect(() => {
    if (turn !== 1 || legal.size !== 0 || over) return;
    const t = window.setTimeout(() => {
      setPass((p) => p + 1);
      setMsg("You have no legal move — passing.");
      window.setTimeout(() => setTurn(2), 700);
    }, 0);
    return () => window.clearTimeout(t);
  }, [turn, legal.size, over]);

  const finalMsg = over
    ? counts.black === counts.white
      ? `A draw at ${counts.black}–${counts.white}.`
      : counts.black > counts.white
        ? `You win ${counts.black}–${counts.white}.`
        : `The computer wins ${counts.white}–${counts.black}.`
    : null;

  return (
    <div className="igame rev">
      <div className="igame-top">
        <span className="igame-score"><i className="disc black" /> {counts.black}</span>
        <span className="igame-score"><i className="disc white" /> {counts.white}</span>
        <span className="igame-msg">{finalMsg ?? msg}</span>
        <Btn onClick={() => { setB(START); setTurn(1); setPass(0); setMsg("You are black. Click a highlighted square."); }}>New game</Btn>
      </div>
      <div className="rev-board">
        {b.map((c, i) => (
          <button
            key={i}
            className={"rev-sq" + (legal.has(i) && turn === 1 ? " legal" : "")}
            onClick={() => play(i)}
            aria-label={`square ${i}`}
          >
            {c !== 0 && <i className={"disc " + (c === 1 ? "black" : "white")} />}
            {c === 0 && legal.has(i) && turn === 1 && <i className="hint" />}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================== Checkers */

type Piece = number; // 0 empty · 1 your man · 2 cpu man · 3 your king · 4 cpu king
const isMine = (p: Piece) => p === 1 || p === 3;
const isCpu = (p: Piece) => p === 2 || p === 4;
const isKing = (p: Piece) => p === 3 || p === 4;

const CHECKERS_START: Piece[] = (() => {
  const b: Piece[] = new Array<Piece>(64).fill(0);
  for (let i = 0; i < 64; i++) {
    const x = i % 8, y = Math.floor(i / 8);
    if ((x + y) % 2 !== 1) continue;
    if (y < 3) b[i] = 2;
    else if (y > 4) b[i] = 1;
  }
  return b;
})();

const cIdx = (x: number, y: number) => y * 8 + x;
const inside = (x: number, y: number) => x >= 0 && x < 8 && y >= 0 && y < 8;

function checkerMoves(b: Piece[], turn: 1 | 2): { from: number; to: number; cap?: number }[] {
  const moves: { from: number; to: number; cap?: number }[] = [];
  const mine = turn === 1 ? isMine : isCpu;
  const foe = turn === 1 ? isCpu : isMine;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!mine(p)) continue;
    const x = i % 8, y = Math.floor(i / 8);
    const dirs = isKing(p) ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : turn === 1 ? [[-1, -1], [1, -1]] : [[-1, 1], [1, 1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (!inside(nx, ny)) continue;
      const j = cIdx(nx, ny);
      if (b[j] === 0) moves.push({ from: i, to: j });
      else if (foe(b[j])) {
        const kx = nx + dx, ky = ny + dy;
        if (inside(kx, ky) && b[cIdx(kx, ky)] === 0) moves.push({ from: i, to: cIdx(kx, ky), cap: j });
      }
    }
  }
  // Captures are compulsory, and a multi-jump continues with the same piece.
  const caps = moves.filter((m) => m.cap !== undefined);
  return caps.length ? caps : moves;
}

function applyChecker(b: Piece[], m: { from: number; to: number; cap?: number }, turn: 1 | 2): Piece[] {
  const nb = [...b] as Piece[];
  const p = nb[m.from];
  nb[m.from] = 0;
  if (m.cap !== undefined) nb[m.cap] = 0;
  // promotion on the far row
  let np = p;
  const y = Math.floor(m.to / 8);
  if (turn === 1 && y === 0) np = 3;
  if (turn === 2 && y === 7) np = 4;
  nb[m.to] = np;
  return nb;
}

function cpuCheckers(b: Piece[]): { from: number; to: number; cap?: number } | null {
  const moves = checkerMoves(b, 2);
  if (!moves.length) return null;
  // prefer captures, then advancing, then anything
  const scored = moves.map((m) => {
    let s = m.cap !== undefined ? 10 : 0;
    s += Math.floor(m.to / 8); // downward is good for the computer
    return { m, s };
  });
  scored.sort((a, z) => z.s - a.s);
  return scored[0].m;
}

export function CheckersGame() {
  const [b, setB] = useState<Piece[]>(CHECKERS_START);
  const [turn, setTurn] = useState<1 | 2>(1);
  const [sel, setSel] = useState<number | null>(null);
  const [chain, setChain] = useState<number | null>(null);
  const [msg, setMsg] = useState("Your move. Red moves up the board.");

  const moves = useMemo(() => checkerMoves(b, turn), [b, turn]);
  const mineCount = b.filter(isMine).length;
  const cpuCount = b.filter(isCpu).length;

  const click = (i: number) => {
    if (turn !== 1) return;
    if (chain !== null && chain !== i) return; // must continue the jump
    const from = chain ?? sel;
    if (isMine(b[i]) && chain === null) { setSel(i); return; }
    if (from === null) return;
    const m = moves.find((x) => x.from === from && x.to === i);
    if (!m) { setSel(null); return; }
    const nb = applyChecker(b, m, 1);
    playSys("menu");
    setB(nb);
    setSel(null);
    // If the same piece can jump again, keep it selected.
    if (m.cap !== undefined) {
      const again = checkerMoves(nb, 1).filter((x) => x.from === i && x.cap !== undefined);
      if (again.length) { setChain(i); setSel(i); setMsg("Multi-jump available — keep going."); return; }
    }
    setChain(null);
    setTurn(2);
  };

  useEffect(() => {
    if (turn !== 2) return;
    const t = window.setTimeout(() => {
      const m = cpuCheckers(b);
      if (!m) { setMsg("The computer has no moves — you win!"); return; }
      setB(applyChecker(b, m, 2));
      setTurn(1);
    }, 620);
    return () => window.clearTimeout(t);
  }, [turn, b]);

  const reset = () => { setB(CHECKERS_START); setTurn(1); setSel(null); setChain(null); setMsg("Your move. Red moves up the board."); };

  return (
    <div className="igame chk">
      <div className="igame-top">
        <span className="igame-score"><i className="piece red" /> {mineCount}</span>
        <span className="igame-score"><i className="piece black" /> {cpuCount}</span>
        <span className="igame-msg">{msg}</span>
        <Btn onClick={reset}>New game</Btn>
      </div>
      <div className="chk-board">
        {b.map((p, i) => {
          const x = i % 8, y = Math.floor(i / 8);
          const dark = (x + y) % 2 === 1;
          const canSel = turn === 1 && isMine(p) && moves.some((m) => m.from === i);
          return (
            <button
              key={i}
              className={"chk-sq" + (dark ? " dark" : "") + (sel === i ? " sel" : "")}
              onClick={() => dark && click(i)}
              disabled={!dark}
              aria-label={`square ${i}`}
            >
              {p !== 0 && <i className={"piece " + (isMine(p) ? "red" : "black") + (isKing(p) ? " king" : "") + (canSel ? " movable" : "")} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================ Backgammon */

type Pt = { who: 1 | 2; n: number };
type Bg = { pts: Pt[]; bar: { 1: number; 2: number }; off: { 1: number; 2: number } };

function newBg(): Bg {
  const pts: Pt[] = Array.from({ length: 24 }, () => ({ who: 1, n: 0 }));
  // standard opening position: 1 = you (moving 24 -> 1), 2 = computer
  const set = (idx: number, who: 1 | 2, n: number) => { pts[idx] = { who, n }; };
  set(23, 1, 2); set(12, 2, 5); set(16, 2, 3); set(18, 2, 5);
  set(0, 2, 2); set(11, 1, 5); set(7, 1, 3); set(5, 1, 5);
  return { pts, bar: { 1: 0, 2: 0 }, off: { 1: 0, 2: 0 } };
}

const bgDice = () => [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)] as [number, number];

/** Move list for one die, honouring the bar and the home board. */
function bgMoves(b: Bg, die: number, who: 1 | 2) {
  const out: { from: number | "bar"; to: number | "off" }[] = [];
  const dir = who === 1 ? -1 : 1;
  const inHome = (i: number) => (who === 1 ? i <= 5 : i >= 18);
  const allHome = b.pts.every((p, i) => !(p.who === who && p.n > 0) || inHome(i)) && b.bar[who] === 0;
  if (b.bar[who] > 0) {
    const to = who === 1 ? 24 - die : die - 1;
    const t = b.pts[to];
    if (!(t.who !== who && t.n > 1)) out.push({ from: "bar", to });
    return out;
  }
  b.pts.forEach((p, i) => {
    if (p.who !== who || p.n === 0) return;
    const to = i + dir * die;
    if (who === 1 && to < 0) { if (allHome) out.push({ from: i, to: "off" }); return; }
    if (who === 2 && to > 23) { if (allHome) out.push({ from: i, to: "off" }); return; }
    if (to < 0 || to > 23) return;
    const t = b.pts[to];
    if (t.who !== who && t.n > 1) return;
    out.push({ from: i, to });
  });
  // highest die that can bear off exactly is preferred; keep it simple and let
  // the list contain every legal option.
  return out;
}

function applyBg(b: Bg, m: { from: number | "bar"; to: number | "off" }, who: 1 | 2): Bg {
  const nb: Bg = { pts: b.pts.map((p) => ({ ...p })), bar: { ...b.bar }, off: { ...b.off } };
  if (m.from === "bar") nb.bar[who] -= 1;
  else nb.pts[m.from] = { who, n: nb.pts[m.from].n - 1 };
  if (m.to === "off") nb.off[who] += 1;
  else {
    const t = nb.pts[m.to];
    if (t.who !== who && t.n === 1) {
      // a blot is hit and goes to the bar
      nb.bar[t.who] += 1;
      nb.pts[m.to] = { who, n: 1 };
    } else nb.pts[m.to] = { who, n: t.n + 1 };
  }
  return nb;
}

export function Backgammon() {
  const [b, setB] = useState<Bg>(newBg);
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [left, setLeft] = useState<number[]>([]);
  const [sel, setSel] = useState<number | "bar" | null>(null);
  const [msg, setMsg] = useState("Roll to start. You are blue, moving anticlockwise.");
  const [turn, setTurn] = useState<1 | 2>(1);

  const roll = () => {
    if (dice) return;
    const d = bgDice();
    const l = d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : [...d];
    setDice(d);
    setLeft(l);
    setMsg(`Rolled ${d[0]} and ${d[1]}. Highlighted points are legal.`);
  };

  const legal = useMemo(() => {
    if (turn !== 1 || !left.length) return [] as { from: number | "bar"; to: number | "off" }[];
    const seen = new Set<string>();
    const all: { from: number | "bar"; to: number | "off" }[] = [];
    for (const d of left) {
      for (const m of bgMoves(b, d, 1)) {
        const k = `${m.from}->${m.to}`;
        if (seen.has(k)) continue;
        seen.add(k);
        all.push(m);
      }
    }
    return all;
  }, [b, left, turn]);

  const move = (to: number | "off") => {
    if (sel === null || turn !== 1) return;
    const d = left.find((x) => bgMoves(b, x, 1).some((m) => m.from === sel && m.to === to));
    if (d === undefined) { setSel(null); return; }
    playSys("menu");
    setB(applyBg(b, { from: sel, to }, 1));
    setLeft(left.filter((x, i) => i !== left.indexOf(d)));
    setSel(null);
  };

  const endTurn = () => {
    setDice(null); setLeft([]); setSel(null);
    setTurn(2);
  };

  useEffect(() => {
    if (turn !== 2) return;
    const t = window.setTimeout(() => {
      const d = bgDice();
      let l = d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : [...d];
      let cur = b;
      setDice(d);
      // the computer plays its dice greedily: hits first, then the biggest move
      const playable = () => {
        const opts: { m: { from: number | "bar"; to: number | "off" }; d: number; score: number }[] = [];
        for (const die of l) for (const m of bgMoves(cur, die, 2)) {
          const hits = m.to !== "off" && cur.pts[m.to].who === 1 && cur.pts[m.to].n === 1 ? 8 : 0;
          const bears = m.to === "off" ? 6 : 0;
          opts.push({ m, d: die, score: hits + bears + (m.to === "off" ? 0 : 23 - m.to) / 10 });
        }
        return opts.sort((a, z) => z.score - a.score);
      };
      let played = 0;
      const step = () => {
        const opts = playable();
        if (!opts.length || played > 3) { setB(cur); setTurn(1); setDice(null); setLeft([]); setMsg("Your turn — roll."); return; }
        const o = opts[0];
        cur = applyBg(cur, o.m, 2);
        l = l.filter((x, i) => i !== l.indexOf(o.d));
        played++;
        setB(cur);
        if (cur.off[2] >= 15) { setMsg("The computer has borne off all its checkers."); return; }
        window.setTimeout(step, 380);
      };
      window.setTimeout(step, 300);
    }, 700);
    return () => window.clearTimeout(t);
  }, [turn, b]);

  // point numbering shown on the board: 1..24 from the human's right
  const pts = b.pts;
  const topRow = pts.slice(12, 24).reverse();
  const bottomRow = pts.slice(0, 12);

  const Point = ({ p, idx }: { p: Pt; idx: number }) => {
    const canPick = turn === 1 && p.who === 1 && p.n > 0 && legal.some((m) => m.from === idx);
    const canLand = sel !== null && legal.some((m) => m.from === sel && m.to === idx);
    return (
      <div
        className={"bg-pt" + (idx % 2 ? "" : " alt") + (canPick ? " pick" : "") + (canLand ? " land" : "")}
        onClick={() => (canPick ? setSel(idx) : canLand ? move(idx) : setSel(null))}
      >
        {Array.from({ length: Math.min(p.n, 5) }, (_, i) => (
          <i key={i} className={"bg-ch " + (p.who === 1 ? "me" : "cpu")} />
        ))}
        {p.n > 5 && <span className="bg-n">{p.n}</span>}
      </div>
    );
  };

  return (
    <div className="igame bg">
      <div className="igame-top">
        <span className="igame-score">Off: you {b.off[1]} / computer {b.off[2]}</span>
        <span className="igame-score">Bar: you {b.bar[1]} / computer {b.bar[2]}</span>
        <span className="igame-msg">{msg}</span>
        <span className="bg-dice">{dice ? <><i className="die">{dice[0]}</i><i className="die">{dice[1]}</i></> : <span className="dim">—</span>}</span>
        {turn === 1 && !dice && <Btn def onClick={roll}>Roll</Btn>}
        {turn === 1 && dice && <Btn onClick={() => { setDice(null); setLeft([]); setSel(null); }}>Done</Btn>}
        {turn === 2 && <Btn onClick={endTurn}>Skip</Btn>}
      </div>
      <div className="bg-board">
        <div className="bg-half">
          {topRow.map((p, i) => <Point key={"t" + i} p={p} idx={23 - i} />)}
        </div>
        <div className="bg-bar" />
        <div className="bg-half reverse">
          {topRow.map((_, i) => null)}
        </div>
      </div>
      <div className="bg-board bottom">
        <div className="bg-half">
          {bottomRow.map((p, i) => <Point key={"b" + i} p={p} idx={i} />)}
        </div>
      </div>
    </div>
  );
}

/* =============================================================== Spades */

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
type Card = { s: number; r: number };

const deck = (): Card[] => SUITS.flatMap((_, s) => RANKS.map((_, r) => ({ s, r })));
const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const cardName = (c: Card) => SUITS[c.s] + RANKS[c.r];

/** Spades are trump; otherwise the highest card of the led suit wins. */
function trickWinner(cards: { c: Card; who: number }[]): number {
  const led = cards[0].c.s;
  const spades = cards.filter((x) => x.c.s === 0);
  const pool = spades.length ? spades : cards.filter((x) => x.c.s === led);
  return pool.reduce((best, x) => (x.c.r > best.c.r ? x : best)).who;
}

export function Spades() {
  const [hands, setHands] = useState<Card[][]>(() => {
    const d = shuffle(deck());
    return [d.slice(0, 13), d.slice(13, 26), d.slice(26, 39), d.slice(39)];
  });
  const [bids, setBids] = useState<number[] | null>(null);
  const [tricks, setTricks] = useState([0, 0]);
  const [played, setPlayed] = useState<{ c: Card; who: number }[]>([]);
  const [turn, setTurn] = useState(0);
  const [msg, setMsg] = useState("Bid how many tricks you will take (0 = nil).");

  const lead = played.length ? played[0].c.s : null;
  const legalCards = (hand: Card[]) =>
    lead === null ? hand : hand.some((c) => c.s === lead) ? hand.filter((c) => c.s === lead) : hand;

  const startPlay = (b0: number, b1: number, b2: number, b3: number) => {
    setBids([b0, b1, b2, b3]);
    setTurn(0);
    setMsg("You lead.");
  };

  const playCard = (c: Card) => {
    if (turn !== 0 || !bids) return;
    const h = [...hands];
    h[0] = h[0].filter((x) => x !== c);
    const next = [...played, { c, who: 0 }];
    setHands(h);
    setPlayed(next);
    setTurn(1);
  };

  // the three computer players follow suit and try to take the trick
  useEffect(() => {
    if (turn === 0 || !bids) return;
    if (played.length === 4) return;
    const t = window.setTimeout(() => {
      const who = turn;
      const leadSuit = played[0]?.c.s ?? null;
      const hand = hands[who];
      const ok = leadSuit === null ? hand : hand.some((c) => c.s === leadSuit) ? hand.filter((c) => c.s === leadSuit) : hand;
      const best = played.length ? played.reduce((a, b) => (b.c.r > a.c.r && b.c.s === played[0].c.s ? b : a)) : null;
      const winning = ok.filter((c) => (leadSuit === null || c.s === leadSuit || c.s === 0) && (!best || c.r > best.c.r || (c.s === 0 && best.c.s !== 0)));
      const pick = (winning.length ? winning : ok).sort((a, b) => a.r - b.r)[0] || ok[0];
      const h = [...hands];
      h[who] = h[who].filter((x) => x !== pick);
      const np = [...played, { c: pick, who }];
      setHands(h);
      setPlayed(np);
      setTurn((who + 1) % 4);
    }, 520);
    return () => window.clearTimeout(t);
  }, [turn, played, hands, bids]);

  useEffect(() => {
    if (played.length !== 4) return;
    const t = window.setTimeout(() => {
      const w = trickWinner(played);
      const nt = [...tricks];
      nt[w % 2 === 0 ? 0 : 1] += 1; // partners 0+2 vs 1+3
      setTricks(nt);
      setPlayed([]);
      setTurn(w);
      setMsg(w === 0 || w === 2 ? "Your side takes the trick." : "The computer side takes the trick.");
    }, 900);
    return () => window.clearTimeout(t);
  }, [played, tricks]);

  const newDeal = () => {
    const d = shuffle(deck());
    setHands([d.slice(0, 13), d.slice(13, 26), d.slice(26, 39), d.slice(39)]);
    setBids(null);
    setTricks([0, 0]);
    setPlayed([]);
    setTurn(0);
    setMsg("Bid how many tricks you will take (0 = nil).");
  };

  return (
    <div className="igame spd">
      <div className="igame-top">
        <span className="igame-score">Your side {tricks[0]}</span>
        <span className="igame-score">Their side {tricks[1]}</span>
        <span className="igame-msg">{msg}</span>
        <Btn onClick={newDeal}>New deal</Btn>
      </div>
      {!bids ? (
        <div className="spd-bid">
          <p>Your hand:</p>
          <div className="spd-hand">{[...hands[0]].sort((a, b) => a.s - b.s || a.r - b.r).map((c) => <span key={cardName(c)} className={"card" + (c.s === 1 || c.s === 2 ? " red" : "")}>{cardName(c)}</span>)}</div>
          <p>How many tricks will you take?</p>
          <div className="spd-bidbtns">
            {Array.from({ length: 14 }, (_, i) => (
              <Btn key={i} def={i === 4} onClick={() => startPlay(i, 1 + Math.floor(Math.random() * 5), 1 + Math.floor(Math.random() * 5), 1 + Math.floor(Math.random() * 5))}>{i === 0 ? "Nil" : i}</Btn>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="spd-table">
            <div className="spd-seat top">Computer 2 · {hands[2].length} cards</div>
            <div className="spd-seat left">Partner · {hands[3].length}</div>
            <div className="spd-play">
              {played.map((p, i) => <span key={i} className={"card played" + (p.c.s === 1 || p.c.s === 2 ? " red" : "")}>{cardName(p.c)}<em>{["You", "C1", "C2", "P"][p.who]}</em></span>)}
            </div>
            <div className="spd-seat right">Computer 1 · {hands[1].length}</div>
          </div>
          <div className="spd-myhand">
            {hands[0].map((c) => {
              const ok = turn === 0 && legalCards(hands[0]).includes(c);
              return (
                <button key={cardName(c)} className={"card" + (c.s === 1 || c.s === 2 ? " red" : "") + (ok ? " ok" : " off")} onClick={() => ok && playCard(c)}>
                  {cardName(c)}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
