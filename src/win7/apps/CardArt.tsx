"use client";
/**
 * Windows 7 playing-card faces.
 *
 * The old face in Games.tsx / Games7.tsx was a rank plus one oversized suit
 * glyph tucked into the bottom-right corner. Windows 7 draws a real card:
 *
 *  - an indexed corner at the top-left (rank above suit) and the same pair
 *    rotated 180° in the bottom-right,
 *  - a proper **pip layout** for A–10 (the columns/rows Microsoft uses, with the
 *    lower pips inverted),
 *  - a framed **court panel** for J/Q/K.
 *
 * Red suits are #c8102e and black #131313, which is what the Windows 7 deck
 * uses. Everything is sized in `em` off the card's own font size, so one face
 * works at the 60 × 84 px Solitaire size and the larger FreeCell size.
 */
import React from "react";

export type Suit = "s" | "h" | "d" | "c";
export interface CardLike {
  s: Suit;
  r: number;
}

export const RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const SUIT_GLYPH: Record<Suit, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
export const isRed = (s: Suit) => s === "h" || s === "d";
export const glyph = (s: Suit) => SUIT_GLYPH[s];

/**
 * Pip placement per rank, as [column, row, inverted?].
 *
 * Columns are 0..2 (left, centre, right) and rows 0..3 (top..bottom). This is
 * the standard Anglo-American layout Windows 7 uses:
 *   2  centre top/bottom      3  centre top/middle/bottom
 *   4  four corners           5  four corners + centre
 *   6  two columns of three   7  six + centre top
 *   8  six + centre top/bottom   9  two columns of four + centre
 *  10  two columns of four + two centre
 */
const PIPS: Record<number, [number, number, boolean][]> = {
  2: [[1, 0, false], [1, 3, true]],
  3: [[1, 0, false], [1, 1.5, false], [1, 3, true]],
  4: [[0, 0, false], [2, 0, false], [0, 3, true], [2, 3, true]],
  5: [[0, 0, false], [2, 0, false], [1, 1.5, false], [0, 3, true], [2, 3, true]],
  6: [[0, 0, false], [2, 0, false], [0, 1.5, false], [2, 1.5, false], [0, 3, true], [2, 3, true]],
  7: [[0, 0, false], [2, 0, false], [1, 0.7, false], [0, 1.5, false], [2, 1.5, false], [0, 3, true], [2, 3, true]],
  8: [[0, 0, false], [2, 0, false], [1, 0.7, false], [0, 1.5, false], [2, 1.5, false], [1, 2.3, true], [0, 3, true], [2, 3, true]],
  9: [[0, 0, false], [2, 0, false], [0, 1, false], [2, 1, false], [1, 1.5, false], [0, 2, true], [2, 2, true], [0, 3, true], [2, 3, true]],
  10: [[0, 0, false], [2, 0, false], [1, 0.7, false], [0, 1, false], [2, 1, false], [0, 2, true], [2, 2, true], [1, 2.3, true], [0, 3, true], [2, 3, true]],
};

/** Fractional rows are placed with an explicit translate so the grid stays simple. */
export function CardFace({ c }: { c: CardLike }) {
  const red = isRed(c.s);
  const court = c.r >= 11;
  const pips = PIPS[c.r];
  return (
    <div className={"cf " + (red ? "red" : "black") + (court ? " court" : "")} aria-label={RANKS[c.r] + SUIT_GLYPH[c.s]}>
      <div className="cf-corner tl">
        <span className="cf-rank">{RANKS[c.r]}</span>
        <span className="cf-suit">{SUIT_GLYPH[c.s]}</span>
      </div>
      {court ? (
        <div className="cf-court">
          <span className="glyph">{SUIT_GLYPH[c.s]}</span>
          <span className="big">{RANKS[c.r]}</span>
          <span className="nm">{c.r === 11 ? "Jack" : c.r === 12 ? "Queen" : "King"}</span>
        </div>
      ) : pips ? (
        <div className="cf-pips">
          {pips.map(([col, row, flip], i) => (
            <span
              key={i}
              className={"cf-pip" + (flip ? " flip" : "")}
              style={{ gridColumn: col + 1, gridRow: Math.floor(row) + 1, transform: row % 1 ? `translateY(${(row % 1) * 100}%)` : undefined }}
            >
              {SUIT_GLYPH[c.s]}
            </span>
          ))}
        </div>
      ) : (
        // the Ace: one large centred pip, as Windows 7 draws it
        <div className="cf-ace">{SUIT_GLYPH[c.s]}</div>
      )}
      <div className="cf-corner br">
        <span className="cf-rank">{RANKS[c.r]}</span>
        <span className="cf-suit">{SUIT_GLYPH[c.s]}</span>
      </div>
    </div>
  );
}

/** The Win 7 blue lattice back, as a standalone element. */
export function CardBack() {
  return <span className="card-back-art" />;
}
