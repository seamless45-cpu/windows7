"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Win, useStore, setWin, closeWin, openApp, msgBox, lsGet, lsSet, MenuItem } from "../store";
import { MenuBar, Btn, useNow } from "../ui";
import { Icon } from "../icons";

/* ============================================================== card model */
type Suit = "s" | "h" | "d" | "c";
interface Card { s: Suit; r: number; up: boolean; id: string }
const SUITS: Suit[] = ["s", "h", "d", "c"];
const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RED = (s: Suit) => s === "h" || s === "d";
const glyph = (s: Suit) => ({ s: "♠", h: "♥", d: "♦", c: "♣" })[s];

function freshDeck(): Card[] {
  const d: Card[] = [];
  SUITS.forEach((s) => {
    for (let r = 1; r <= 13; r++) d.push({ s, r, up: false, id: s + r });
  });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const cardStyle = (c: Card | null, back = "#0a4a8c"): React.CSSProperties =>
  c
    ? { background: "#fff", border: "1px solid #7a8698", borderRadius: 5, color: RED(c.s) ? "#c8102e" : "#111", boxShadow: "0 1px 2px rgba(0,0,0,.45)" }
    : { background: back, border: "1px solid #06284d", borderRadius: 5, boxShadow: "0 1px 2px rgba(0,0,0,.45), inset 0 0 0 2px rgba(255,255,255,.22)" };

const CARD_W = 60;
const CARD_H = 84;

function Flip({ children, up }: { children: React.ReactNode; up: boolean }) {
  return <div className={up ? "card-face up" : "card-face down"}>{up ? children : null}</div>;
}

function Stat({ l, v }: { l: string; v: React.ReactNode }) {
  return <span className="g-stat">{l}: <b>{v}</b></span>;
}

/* ================================================================ Klondike */
type KSel = { pile: "t" | "f" | "w"; i: number; n: number } | null;

function freshDeal() {
  const d = freshDeck();
  const t: Card[][] = Array.from({ length: 7 }, () => []);
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r <= c; r++) {
      const card = d.pop()!;
      card.up = r === c;
      t[c].push(card);
    }
  }
  return { tabl: t, tab: d };
}

export function Solitaire({ win }: { win: Win }) {
  const [init] = useState(freshDeal);
  const [tab, setTab] = useState<Card[]>(init.tab);
  const [found, setFound] = useState<Card[][]>([[], [], [], []]);
  const [tabl, setTabl] = useState<Card[][]>(init.tabl);
  const [waste, setWaste] = useState<Card[]>([]);
  const [sel, setSel] = useState<KSel>(null);
  const [draw3, setDraw3] = useState(() => lsGet("win7.sol.draw3", true));
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [skins, setSkins] = useState(() => lsGet("win7.sol.skin", 0));
  const [best, setBest] = useState(() => lsGet("win7.sol.best", 0));

  const deal = () => {
    const { tabl: t, tab: d } = freshDeal();
    setTabl(t);
    setTab(d);
    setFound([[], [], [], []]);
    setWaste([]);
    setSel(null);
    setScore(0);
    setMoves(0);
    setTime(0);
  };
  const done = found.reduce((a, f) => a + f.length, 0);
  // a game is won as soon as all 52 cards reach the foundations
  const won = done === 52;

  useEffect(() => {
    if (won) return;
    const i = setInterval(() => setTime((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [won]);
  useEffect(() => {
    lsSet("win7.sol.best", best);
  }, [best]);
  useEffect(() => {
    if (!won) return;
    const t = setTimeout(() => setBest((b) => (score > b ? score : b)), 400);
    return () => clearTimeout(t);
  }, [won, score]);

  const drawCard = () => {
    if (!tab.length) {
      if (!waste.length) return;
      setTab([...waste].reverse().map((c) => ({ ...c, up: false })));
      setWaste([]);
      setScore((s) => Math.max(0, s - 100));
      return;
    }
    const n = draw3 ? Math.min(3, tab.length) : 1;
    const take = tab.slice(-n).map((c) => ({ ...c, up: true }));
    setTab(tab.slice(0, -n));
    setWaste([...waste, ...take]);
    setSel(null);
    setMoves((m) => m + 1);
  };

  const top = (arr: Card[]) => (arr.length ? arr[arr.length - 1] : null);
  const canPlaceTabl = (c: Card, on: Card | null) => (!on ? c.r === 13 : on.up && RED(on.s) !== RED(c.s) && on.r === c.r + 1);
  const canPlaceFound = (c: Card, f: Card[]) => (f.length ? f[f.length - 1].s === c.s && f[f.length - 1].r === c.r - 1 : c.r === 1);

  const autoFound = (c: Card) => {
    for (let i = 0; i < 4; i++) {
      const f = found[i];
      if (f.length && f[0].s !== c.s) continue;
      if (canPlaceFound(c, f)) {
        const nf = found.map((q, k) => (k === i ? [...q, c] : q));
        setFound(nf);
        setScore((s) => s + 10);
        return true;
      }
    }
    return false;
  };

  const flipExposed = (t: Card[][]) =>
    t.map((p) => {
      if (!p.length) return p;
      const l = p[p.length - 1];
      return l.up ? p : [...p.slice(0, -1), { ...l, up: true }];
    });

  const clickTabl = (ci: number, idx: number) => {
    const pile = tabl[ci];
    const card = pile[idx];
    if (!card) {
      // empty column | drop selection
      if (sel) dropToTabl(ci);
      return;
    }
    if (!card.up) {
      if (idx === pile.length - 1) {
        setTabl(tabl.map((p, k) => (k === ci ? [...p.slice(0, -1), { ...card, up: true }] : p)));
        setScore((s) => Math.max(0, s - 5));
      }
      return;
    }
    if (sel) {
      const from = sel;
      if (from.pile === "w" && from.n === 1) {
        const c = waste[from.i];
        if (!canPlaceTabl(c, card)) return setSel(null);
        setWaste(waste.filter((_, k) => k !== from.i));
        setTabl(tabl.map((p, k) => (k === ci ? [...p, c] : p)));
        setScore((s) => s + 5);
        setMoves((m) => m + 1);
        setSel(null);
        return;
      }
      if (from.pile === "t") {
        const chunk = tabl[from.pile === "t" ? from.i : 0].slice(from.i);
        if (!canPlaceTabl(chunk[0], card)) return setSel(null);
        moveTablChunk(from.i, from.i, ci);
        return;
      }
      return setSel(null);
    }
    // begin selection
    if (idx === pile.length - 1) {
      if (autoFound(card)) {
        setTabl(flipExposed(tabl.map((p, k) => (k === ci ? p.slice(0, -1) : p))));
        setMoves((m) => m + 1);
        return;
      }
    }
    setSel({ pile: "t", i: ci, n: idx });
  };

  const moveTablChunk = (fromCol: number, startIdx: number, toCol: number) => {
    const chunk = tabl[fromCol].slice(startIdx);
    const rest = tabl[fromCol].slice(0, startIdx);
    const nt = tabl.map((p, k) => (k === fromCol ? rest : k === toCol ? [...p, ...chunk] : p));
    setTabl(flipExposed(nt));
    setScore((s) => s + (rest.length && !rest[rest.length - 1].up ? 5 : 0));
    setMoves((m) => m + 1);
    setSel(null);
  };

  const dropToTabl = (ci: number) => {
    if (!sel) return;
    if (sel.pile === "t") moveTablChunk(sel.i, sel.n, ci);
    else if (sel.pile === "w") {
      const c = waste[sel.i];
      if (!canPlaceTabl(c, tabl[ci][tabl[ci].length - 1] || null)) return setSel(null);
      setWaste(waste.filter((_, k) => k !== sel.i));
      setTabl(tabl.map((p, k) => (k === ci ? [...p, c] : p)));
      setMoves((m) => m + 1);
      setSel(null);
    } else {
      const pile = found[sel.i];
      const c = pile[pile.length - 1];
      if (!c) return;
      setFound(found.map((q, k) => (k === sel.i ? q.slice(0, -1) : q)));
      setTabl(tabl.map((p, k) => (k === ci ? [...p, c] : p)));
      setSel(null);
    }
  };

  const clickFound = (fi: number) => {
    const f = found[fi];
    if (sel) {
      if (sel.pile === "w") {
        const c = waste[sel.i];
        if (!canPlaceFound(c, f)) return setSel(null);
        setWaste(waste.filter((_, k) => k !== sel.i));
        setFound(found.map((q, k) => (k === fi ? [...q, c] : q)));
        setScore((s) => s + 10);
        setSel(null);
        return;
      }
      if (sel.pile === "t") {
        const chunk = tabl[sel.i].slice(sel.n);
        if (chunk.length !== 1 || !canPlaceFound(chunk[0], f)) return setSel(null);
        setTabl(flipExposed(tabl.map((p, k) => (k === sel.i ? p.slice(0, sel.n) : p))));
        setFound(found.map((q, k) => (k === fi ? [...q, chunk[0]] : q)));
        setScore((s) => s + 10);
        setSel(null);
        return;
      }
    }
    if (!f.length) return;
    setSel({ pile: "f", i: fi, n: f.length - 1 });
  };

  const autoAll = () => {
    let t = tabl;
    let f = found;
    let gained = 0;
    let again = true;
    while (again) {
      again = false;
      for (let ci = 0; ci < 7; ci++) {
        const p = t[ci];
        const c = p[p.length - 1];
        if (!c || !c.up) continue;
        for (let fi = 0; fi < 4; fi++) {
          if (canPlaceFound(c, f[fi])) {
            t = t.map((q, k) => (k === ci ? q.slice(0, -1) : q));
            f = f.map((q, k) => (k === fi ? [...q, c] : q));
            gained += 10;
            again = true;
            break;
          }
        }
        if (again) break;
      }
      if (!again && waste.length) {
        const c = waste[waste.length - 1];
        for (let fi = 0; fi < 4; fi++) {
          if (canPlaceFound(c, f[fi])) {
            setWaste(waste.slice(0, -1));
            f = f.map((q, k) => (k === fi ? [...q, c] : q));
            gained += 10;
            again = true;
            break;
          }
        }
      }
    }
    setTabl(flipExposed(t));
    setFound(f);
    setScore((s) => s + gained);
    if (gained) setMoves((m) => m + 1);
  };

  const hint = () => {
    for (let ci = 0; ci < 7; ci++) {
      const p = tabl[ci];
      for (let i = p.length - 1; i >= 0; i--) {
        if (!p[i].up) continue;
        for (let cj = 0; cj < 7; cj++) {
          if (ci === cj) continue;
          if (canPlaceTabl(p[i], tabl[cj][tabl[cj].length - 1] || null)) {
            msgBox({ title: "Solitaire", text: `Try moving the ${RANKS[p[i].r]}${glyph(p[i].s)} from column ${ci + 1} to column ${cj + 1}.`, icon: "info" });
            return;
          }
        }
      }
    }
    if (tab.length || waste.length) return msgBox({ title: "Solitaire", text: "No moves found. Click the deck to draw more cards.", icon: "info" });
    msgBox({ title: "Solitaire", text: "No moves available. Start a new game from the Game menu.", icon: "info" });
  };

  const newGame = () => {
    if (moves > 3 && !won) {
      msgBox({
        title: "Solitaire",
        text: "The current game is not finished. Start a new game anyway?",
        icon: "question",
        buttons: ["Yes", "No"],
        onResult: (b) => b === "Yes" && deal(),
      });
      return;
    }
    deal();
  };

  const menus = [
    {
      label: "Game",
      items: (): MenuItem[] => [
        { label: "Deal", shortcut: "F2", onClick: newGame },
        { label: "Undo", shortcut: "Ctrl+Z", onClick: () => msgBox({ title: "Solitaire", text: "Undo is not available in this version.", icon: "info" }) },
        { sep: true },
        { label: "Draw one", checked: !draw3, radio: true, onClick: () => { setDraw3(false); lsSet("win7.sol.draw3", false); } },
        { label: "Draw three", checked: draw3, radio: true, onClick: () => { setDraw3(true); lsSet("win7.sol.draw3", true); } },
        { sep: true },
        { label: "Change background", onClick: () => { const n = (skins + 1) % 3; setSkins(n); lsSet("win7.sol.skin", n); } },
        { sep: true },
        { label: "Exit", onClick: () => closeWin(win.id) },
      ],
    },
    {
      label: "Help",
      items: (): MenuItem[] => [
        { label: "How to play", onClick: () => msgBox({ title: "Solitaire Help", text: "Build the four foundations up from Ace to King by suit.\nOn the tableau, stack cards in descending order with alternating colors.\nMove any King to an empty column. Click the deck to turn cards.", icon: "info" }) },
        { label: "Auto complete", onClick: autoAll },
        { label: "About Solitaire", onClick: () => msgBox({ title: "About Solitaire", text: "Solitaire\nMicrosoft Windows 7\nVersion 6.1 (Build 7601)", icon: "info" }) },
      ],
    },
  ];

  const skinsCss = ["linear-gradient(#0d7a3a,#064a22)", "radial-gradient(circle at 50% 40%,#0a6a8a,#03223a)", "linear-gradient(#3a2a7a,#160c3a)"][skins];

  return (
    <div className="sol" tabIndex={0} onKeyDown={(e) => { if (e.key === "F2") newGame(); }} onPointerDown={() => sel && setSel(null)}>
      <MenuBar menus={menus} />
      <div className="sol-bar">
        <Stat l="Score" v={score} />
        <Stat l="Time" v={time} />
        <Stat l="Best" v={best} />
        <div style={{ flex: 1 }} />
        <button className="g-btn" onClick={autoAll}>Auto&nbsp;complete</button>
        <button className="g-btn" onClick={hint}>Hint</button>
      </div>
      <div className="sol-table" style={{ background: skinsCss }}>
        <div className="sol-top">
          <div className="sol-stock" onClick={drawCard} title="Click to draw">
            {tab.length ? <div className="card back" style={{ ...cardStyle(null), width: CARD_W, height: CARD_H }}><span className="card-back-art" /></div> : <div className="card empty-slot" />}
          </div>
          <div className="sol-waste">
            {waste.slice(-3).map((c, i, arr) => {
              const idx = waste.length - arr.length + i;
              const isSel = sel?.pile === "w" && sel.i === idx;
              return (
                <div
                  key={c.id}
                  className={"card " + (isSel ? "sel" : "")}
                  style={{ ...cardStyle(c), width: CARD_W, height: CARD_H, left: i * 15 }}
                  onPointerDown={(e) => { e.stopPropagation(); setSel({ pile: "w", i: idx, n: 1 }); }}
                  onDoubleClick={() => { if (autoFound(c)) { setWaste(waste.filter((_, k) => k !== idx)); setMoves((m) => m + 1); } }}
                >
                  <Flip up>{<CardFace c={c} />}</Flip>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          {found.map((f, i) => (
            <div key={i} className="sol-found" onClick={() => clickFound(i)}>
              {f.length ? (
                <div className="card" style={{ ...cardStyle(f[f.length - 1]), width: CARD_W, height: CARD_H }}>
                  <CardFace c={f[f.length - 1]} />
                </div>
              ) : (
                <div className="card empty-slot"><span className="slot-suit">{glyph(SUITS[i])}</span></div>
              )}
            </div>
          ))}
        </div>
        <div className="sol-cols">
          {tabl.map((p, ci) => (
            <div key={ci} className="sol-col">
              {p.length === 0 && <div className="card empty-slot" style={{ width: CARD_W, height: CARD_H }} onPointerDown={(e) => { e.stopPropagation(); dropToTabl(ci); }} />}
              {p.map((c, i) => {
                const isSel = sel?.pile === "t" && sel.i === ci && i >= sel.n;
                return (
                  <div
                    key={c.id}
                    className={"card " + (isSel ? "sel" : "") + (c.up ? "" : " back")}
                    style={{ ...cardStyle(c.up ? c : null), width: CARD_W, height: CARD_H, top: i * (c.up ? 22 : 7), zIndex: i }}
                    onPointerDown={(e) => { e.stopPropagation(); clickTabl(ci, i); }}
                    onDoubleClick={() => { if (c.up && i === p.length - 1 && autoFound(c)) { setTabl(flipExposed(tabl.map((q, k) => (k === ci ? q.slice(0, -1) : q)))); setMoves((m) => m + 1); } }}
                  >
                    {c.up && <CardFace c={c} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {won && (
        <div className="sol-won">
          <div>
            <b>You win!</b>
            <p>Score {score} · {time}s · {moves} moves</p>
            <div className="mb-row" style={{ justifyContent: "center" }}>
              <Btn def onClick={deal}>Deal again</Btn>
              <Btn onClick={() => closeWin(win.id)}>Close</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardFace({ c }: { c: Card }) {
  return (
    <div className="cf">
      <span className="cf-r">{RANKS[c.r]}</span>
      <span className="cf-s">{glyph(c.s)}</span>
      <span className="cf-big">{glyph(c.s)}</span>
    </div>
  );
}

/* ================================================================== Spider */
export function Spider({ win }: { win: Win }) {
  const [suits, setSuits] = useState(() => lsGet("win7.spider.suits", 1));
  const [cols, setCols] = useState<Card[][]>([]);
  const [stock, setStock] = useState<Card[][]>([]);
  const [score, setScore] = useState(500);
  const [moves, setMoves] = useState(0);
  const [sel, setSel] = useState<{ c: number; i: number } | null>(null);
  const [done, setDone] = useState(0);
  const [won, setWon] = useState(false);

  const deal = (ns = suits) => {
    let deck: Card[] = [];
    const use: Suit[] = ns === 1 ? ["s"] : ns === 2 ? ["s", "h"] : SUITS;
    for (let k = 0; k < 8 / use.length; k++)
      use.forEach((s) => {
        for (let r = 1; r <= 13; r++) deck.push({ s, r, up: false, id: s + r + "_" + k });
      });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const c: Card[][] = Array.from({ length: 10 }, () => []);
    for (let n = 0; n < 54; n++) {
      const card = deck.pop()!;
      card.up = c[n % 10].length === (n < 44 ? 5 : 4);
      c[n % 10].push(card);
    }
    c.forEach((p) => (p[p.length - 1].up = true));
    const st: Card[][] = [];
    while (deck.length) st.push(deck.splice(-10).map((x) => ({ ...x, up: false })));
    setCols(c);
    setStock(st);
    setScore(500);
    setMoves(0);
    setSel(null);
    setDone(0);
    setWon(false);
  };
  const stamp = useRef(0);
  useEffect(() => { stamp.current += 1; }, [cols.length, stock.length]);
  useEffect(() => {
    const t = setTimeout(() => { if (cols.length === 0) deal(); }, 0);
    return () => clearTimeout(t);
  }, [cols.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (p: Card[], from: number) => {
    for (let i = from; i < p.length - 1; i++) {
      if (!p[i].up) return false;
      if (p[i + 1].r !== p[i].r - 1) return false;
    }
    return p[from].up;
  };
  const canStack = (c: Card, on: Card | null) => (!on ? true : on.up && on.r === c.r + 1);

  const checkComplete = (c: Card[][]) => {
    let found = 0;
    const out = c.map((p) => {
      if (p.length < 13) return p;
      const tail = p.slice(-13);
      if (tail.every((x, i) => x.up && x.r === 13 - i && (suits === 3 || tail.every((y) => y.s === tail[0].s)))) {
        found++;
        const rest = p.slice(0, -13);
        if (rest.length) rest[rest.length - 1] = { ...rest[rest.length - 1], up: true };
        return rest;
      }
      return p;
    });
    if (found) {
      setDone((d) => d + found);
      setScore((s) => s + 100);
      for (let i = 0; i < found; i++) {
        if (out.reduce((a, p) => a + p.length, 0) === 0) setWon(true);
      }
    }
    return out;
  };

  const move = (to: number) => {
    if (!sel) return;
    const from = cols[sel.c];
    const chunk = from.slice(sel.i);
    if (!canStack(chunk[0], cols[to][cols[to].length - 1] || null)) return setSel(null);
    let nc = cols.map((p, k) => (k === sel.c ? p.slice(0, sel.i) : k === to ? [...p, ...chunk] : p));
    if (nc[sel.c].length) {
      const l = nc[sel.c][nc[sel.c].length - 1];
      if (!l.up) nc[sel.c] = [...nc[sel.c].slice(0, -1), { ...l, up: true }];
    }
    nc = checkComplete(nc);
    setCols(nc);
    setScore((s) => Math.max(0, s - 1));
    setMoves((m) => m + 1);
    setSel(null);
  };

  const click = (ci: number, i: number) => {
    if (sel) {
      if (sel.c === ci && sel.i === i) return setSel(null);
      if (sel.c !== ci) return move(ci);
    }
    const p = cols[ci];
    if (!p[i]?.up) return;
    if (run(p, i)) setSel({ c: ci, i });
  };

  const dealRow = () => {
    if (!stock.length) return;
    if (cols.some((p) => !p.length)) return msgBox({ title: "Spider Solitaire", text: "You must fill every empty column before dealing a new row.", icon: "warn" });
    const row = stock[stock.length - 1].map((c) => ({ ...c, up: true }));
    const nc = cols.map((p, k) => [...p, row[k]]);
    setCols(nc);
    setStock(stock.slice(0, -1));
    setMoves((m) => m + 1);
    setDone(done);
  };

  const menus = [
    {
      label: "Game",
      items: (): MenuItem[] => [
        { label: "New game", shortcut: "F2", onClick: () => deal() },
        { sep: true },
        { label: "One suit", checked: suits === 1, radio: true, onClick: () => { setSuits(1); lsSet("win7.spider.suits", 1); deal(1); } },
        { label: "Two suits", checked: suits === 2, radio: true, onClick: () => { setSuits(2); lsSet("win7.spider.suits", 2); deal(2); } },
        { label: "Four suits", checked: suits === 3, radio: true, onClick: () => { setSuits(3); lsSet("win7.spider.suits", 3); deal(3); } },
        { sep: true },
        { label: "Exit", onClick: () => closeWin(win.id) },
      ],
    },
    { label: "Help", items: (): MenuItem[] => [{ label: "How to play", onClick: () => msgBox({ title: "Spider Help", text: "Arrange cards in descending same-suit runs.\nDrag a run onto a card one rank higher (any suit).\nComplete runs of King to Ace are removed automatically.\nDeal a new row of ten cards when you are stuck.", icon: "info" }) }, { label: "About", onClick: () => msgBox({ title: "About Spider Solitaire", text: "Spider Solitaire\nMicrosoft Windows 7", icon: "info" }) }] },
  ];

  return (
    <div className="sol spider" tabIndex={0} onKeyDown={(e) => e.key === "F2" && deal()}>
      <MenuBar menus={menus} />
      <div className="sol-bar">
        <Stat l="Score" v={score} />
        <Stat l="Moves" v={moves} />
        <Stat l="Completed" v={done + " / 8"} />
        <div style={{ flex: 1 }} />
        <button className="g-btn" onClick={dealRow}>Deal row ({stock.length})</button>
      </div>
      <div className="sol-table" style={{ background: "linear-gradient(#0d7a3a,#064a22)" }}>
        <div className="sol-cols spider-cols">
          {cols.map((p, ci) => (
            <div key={ci} className="sol-col" style={{ minWidth: CARD_W }}>
              {p.length === 0 && <div className="card empty-slot" style={{ width: CARD_W, height: CARD_H }} onPointerDown={() => move(ci)} />}
              {p.map((c, i) => (
                <div key={c.id} className={"card " + (sel?.c === ci && i >= sel.i ? "sel " : "") + (c.up ? "" : "back")} style={{ ...cardStyle(c.up ? c : null), width: CARD_W, height: CARD_H, top: i * (c.up ? 20 : 7) }} onPointerDown={(e) => { e.stopPropagation(); click(ci, i); }}>
                  {c.up && <CardFace c={c} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {won && <div className="sol-won" onClick={() => setWon(false)}><div><b>You win!</b><p>Score {score} · {moves} moves</p><Btn def onClick={() => deal()}>New game</Btn></div></div>}
    </div>
  );
}

/* =================================================================== Hearts */
const HEARTS_NAMES = ["You", "West (Ralph)", "North (Pauline)", "East (Bella)"];

export function Hearts({ win }: { win: Win }) {
  const [hands, setHands] = useState<Card[][]>([[], [], [], []]);
  const [trick, setTrick] = useState<{ c: Card; p: number }[]>([]);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [turn, setTurn] = useState(0);
  const [passing, setPassing] = useState<string | null>("Pass Left");
  const [passed, setPassed] = useState<Card[]>([]);
  const [msg, setMsg] = useState("Select three cards to pass to the player on your left.");
  const [hb, setHb] = useState(false);
  const [sel, setSel] = useState<Card | null>(null);
  const [last, setLast] = useState<string>("");

  const sortHand = (h: Card[]) => [...h].sort((a, b) => (a.s === b.s ? a.r - b.r : SUITS.indexOf(a.s) - SUITS.indexOf(b.s)));
  const passDir = (p: string | null) => (p === "Pass Left" ? 1 : p === "Pass Right" ? 3 : p === "Pass Across" ? 2 : -1);

  const deal = (pass: string | null = "Pass Left") => {
    const deck = freshDeck();
    const h = [0, 1, 2, 3].map(() => sortHand(deck.splice(0, 13).map((c) => ({ ...c, up: true }))));
    const starter = h.findIndex((x) => x.some((c) => c.s === "c" && c.r === 2));
    setHands(h);
    setTrick([]);
    setPassing(pass);
    setPassed([]);
    setSel(null);
    setHb(false);
    setLast("");
    setTurn(starter);
    setMsg(pass ? `Select three cards to pass ${pass === "Pass Left" ? "to the player on your left" : pass === "Pass Right" ? "to the player on your right" : pass === "Pass Across" ? "to the player across from you" : ""}.` : starter === 0 ? "You have the 2 of Clubs — click it to lead." : "Waiting for the lead…");
  };
  useEffect(() => {
    const t = setTimeout(() => { if (hands[0].length === 0) deal(); }, 0);
    return () => clearTimeout(t);
  }, [hands]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishPass = () => {
    const dir = passDir(passing);
    let nh = hands.map((h) => [...h]);
    const gives: Card[][] = nh.map((h, i) =>
      i === 0 ? [...passed] : [...h].sort((a, b) => a.r - b.r || SUITS.indexOf(a.s) - SUITS.indexOf(b.s)).slice(0, 3)
    );
    if (dir >= 0) {
      nh = nh.map((h, i) => h.filter((c) => !gives[i].some((g) => g.id === c.id)));
      for (let i = 0; i < 4; i++) nh[(i + dir) % 4] = nh[(i + dir) % 4].concat(gives[i]);
    }
    nh = nh.map(sortHand);
    setHands(nh);
    setPassing(null);
    setPassed([]);
    setMsg(turn === 0 ? "You have the 2 of Clubs — click it to lead." : "Waiting for the lead…");
  };

  const legal = (h: Card[], c: Card, led: Suit | null) => {
    if (!led) return h.some((x) => x.s === "c" && x.r === 2) ? c.s === "c" && c.r === 2 : true;
    if (c.s === led) return true;
    return !h.some((x) => x.s === led);
  };

  const resolve = (t: { c: Card; p: number }[]) => {
    const ledSuit = t[0].c.s;
    const winner = t.filter((x) => x.c.s === ledSuit).sort((a, b) => b.c.r - a.c.r)[0];
    const pts = t.reduce((a, x) => a + (x.c.s === "h" ? 1 : x.c.s === "s" && x.c.r === 12 ? 13 : 0), 0);
    const winnerName = HEARTS_NAMES[winner.p];
    const nextScores = [...scores];
    nextScores[winner.p] += pts;
    setScores(nextScores);
    setTrick([]);
    setSel(null);
    setLast(`${winnerName} took the trick with ${RANKS[winner.c.r]}${glyph(winner.c.s)}${pts ? ` (+${pts})` : ""}.`);
    setMsg(`${winnerName} won the trick${pts ? ` for ${pts} point${pts > 1 ? "s" : ""}` : ""}. ${HEARTS_NAMES[(winner.p + 1) % 4] === "You" ? "Your turn to lead." : ""}`);
    setTurn(winner.p);
  };

  const playCard = (p: number, c: Card) => {
    const h = hands[p];
    if (!h.some((x) => x.id === c.id)) return;
    const ledSuit = trick.length ? trick[0].c.s : c.s;
    if (!legal(h, c, trick.length ? ledSuit : null)) return;
    const nh = hands.map((q, i) => (i === p ? q.filter((x) => x.id !== c.id) : q));
    const t = [...trick, { c, p }];
    setHands(nh);
    setTrick(t);
    setSel(null);
    if (!hb && c.s === "h") setHb(true);
    if (t.length === 4) resolve(t);
    else setTurn((p + 1) % 4);
  };

  /* bots take their turn automatically */
  useEffect(() => {
    if (passing || trick.length >= 4) return;
    if (turn === 0) return;
    if (!hands[turn]?.length) return;
    const t = setTimeout(() => {
      const h = hands[turn];
      const led = trick.length ? trick[0].c.s : null;
      const pool = led ? (h.some((c) => c.s === led) ? h.filter((c) => c.s === led) : h) : h;
      const two = pool.find((c) => c.s === "c" && c.r === 2);
      const pick = two || (led ? [...pool].sort((a, b) => a.r - b.r)[0] : [...pool].sort((a, b) => a.r - b.r)[0]);
      playCard(turn, pick);
    }, 780);
    return () => clearTimeout(t);
  });

  const togglePass = (c: Card) => {
    if (passed.some((x) => x.id === c.id)) setPassed(passed.filter((x) => x.id !== c.id));
    else if (passed.length < 3) setPassed([...passed, c]);
  };

  const round = Math.max(...scores) >= 100 ? "over" : "play";
  const winnerName = HEARTS_NAMES[scores.indexOf(Math.min(...scores))];

  const menus = [
    {
      label: "Game",
      items: (): MenuItem[] => [
        { label: "New game", shortcut: "F2", onClick: () => { setScores([0, 0, 0, 0]); deal(); } },
        { sep: true },
        ...["Pass Left", "Pass Right", "Pass Across", "No Pass"].map((p) => ({ label: p, checked: passing === p, radio: true, onClick: () => { setScores([0, 0, 0, 0]); deal(p); } })),
        { sep: true },
        { label: "Exit", onClick: () => closeWin(win.id) },
      ],
    },
    { label: "Help", items: (): MenuItem[] => [{ label: "How to play", onClick: () => msgBox({ title: "Hearts Help", text: "Pass three cards, then play to the trick following suit.\nThe highest card of the led suit wins the trick.\nHearts are worth 1 point; the Queen of Spades is worth 13.\nAvoid taking points. The lowest score wins when someone reaches 100.", icon: "info" }) }] },
  ];

  const myTurn = turn === 0 && !passing;

  return (
    <div className="sol hearts" tabIndex={0} onKeyDown={(e) => { if (e.key === "F2") { setScores([0, 0, 0, 0]); deal(); } }}>
      <MenuBar menus={menus} />
      <div className="sol-bar">
        {HEARTS_NAMES.map((n, i) => <span key={n} className={"g-stat" + (i === turn ? " cur" : "")}>{n}: <b>{scores[i]}</b></span>)}
        <div style={{ flex: 1 }} />
        {passing && <button className="g-btn" disabled={passed.length !== 3} onClick={finishPass}>Pass {passed.length}/3</button>}
        {hb && <span className="g-stat">Hearts broken</span>}
      </div>
      <div className="sol-table hearts-table" style={{ background: "linear-gradient(#0d7a3a,#064a22)" }}>
        <div className="ht-seat ht-n">{HEARTS_NAMES[2]} · {hands[2].length}</div>
        <div className="ht-seat ht-w">{HEARTS_NAMES[1]} · {hands[1].length}</div>
        <div className="ht-seat ht-e">{HEARTS_NAMES[3]} · {hands[3].length}</div>
        <div className="ht-center">
          {trick.length === 0 && <span className="ht-msg">{msg}</span>}
          {trick.map((x) => (
            <div key={x.c.id} className={"card ht-play ht-p" + x.p} style={{ ...cardStyle(x.c), width: CARD_W, height: CARD_H }}>
              <CardFace c={x.c} />
            </div>
          ))}
        </div>
        <div className="ht-hand">
          {hands[0].map((c) => (
            <div
              key={c.id}
              className={"card" + (passed.some((x) => x.id === c.id) ? " sel" : sel?.id === c.id ? " sel" : "") + (myTurn && !legal(hands[0], c, trick.length ? trick[0].c.s : null) ? " dim" : "")}
              style={{ ...cardStyle(c), width: CARD_W, height: CARD_H }}
              onDoubleClick={() => (passing ? togglePass(c) : myTurn && playCard(0, c))}
              onPointerDown={() => (passing ? togglePass(c) : setSel(c))}
            >
              <CardFace c={c} />
            </div>
          ))}
        </div>
      </div>
      <div className="hearts-actions">
        {passing ? (
          <span className="g-note">Choose three cards to pass, then click Pass.</span>
        ) : (
          <>
            <Btn def disabled={!sel || !myTurn} onClick={() => sel && playCard(0, sel)}>Play selected</Btn>
            <span className="g-note">{sel ? `Selected ${RANKS[sel.r]}${glyph(sel.s)}` : myTurn ? "It is your turn — select a card." : "Waiting for the other players…"}</span>
            {last && <span className="g-note" style={{ marginLeft: "auto" }}>{last}</span>}
          </>
        )}
      </div>
      {round === "over" && (
        <div className="sol-won" onClick={() => { setScores([0, 0, 0, 0]); deal(); }}>
          <div><b>Game over</b><p>{winnerName} wins with {Math.min(...scores)} points.</p><Btn def>New game</Btn></div>
        </div>
      )}
    </div>
  );
}

/* ========================================================== Games Explorer */
const GAME_LIST: { app: string; name: string; icon: string; desc: string }[] = [
  { app: "solitaire", name: "Solitaire", icon: "solitaire", desc: "The classic game of Klondike solitaire." },
  { app: "spider", name: "Spider Solitaire", icon: "spider", desc: "Arrange descending runs of cards to clear the table." },
  { app: "hearts", name: "Hearts", icon: "hearts", desc: "Play the classic trick-taking card game against three opponents." },
  { app: "minesweeper", name: "Minesweeper", icon: "mines", desc: "Clear the minefield without detonating a mine." },
];

export function GamesExplorer({ win }: { win: Win }) {
  const [sel, setSel] = useState<string>("solitaire");
  const g = GAME_LIST.find((x) => x.app === sel)!;
  const best = useStore(() => lsGet("win7.sol.best", 0));
  const [played, setPlayed] = useState<Record<string, number>>(() => lsGet("win7.games.plays", {}));
  const launch = (app: string) => {
    const n = { ...played, [app]: (played[app] || 0) + 1 };
    setPlayed(n);
    lsSet("win7.games.plays", n);
    openApp(app);
  };
  return (
    <div className="gamecenter">
      <div className="gc-head">
        <div className="gc-hl"><Icon name="gamecenter" size={40} /><div><b>Games</b><br /><span>{GAME_LIST.length} games installed</span></div></div>
        <div className="gc-tiles"><div><b>{best}</b><span>Best solitaire score</span></div><div><b>{Object.values(played).reduce((a, b) => a + b, 0)}</b><span>Games played</span></div></div>
      </div>
      <div className="gc-body">
        <div className="gc-grid">
          {GAME_LIST.map((x) => (
            <div key={x.app} className={"gc-tile" + (sel === x.app ? " sel" : "")} onClick={() => setSel(x.app)} onDoubleClick={() => launch(x.app)}>
              <Icon name={x.icon} size={56} />
              <span>{x.name}</span>
              <small>{played[x.app] || 0} played</small>
            </div>
          ))}
        </div>
        <div className="gc-detail">
          <Icon name={g.icon} size={64} />
          <div>
            <h3>{g.name}</h3>
            <p>{g.desc}</p>
            <p className="g-note">Times played: {played[g.app] || 0}</p>
            <Btn def onClick={() => launch(g.app)}>Play</Btn>
          </div>
        </div>
      </div>
      {void win}
    </div>
  );
}
