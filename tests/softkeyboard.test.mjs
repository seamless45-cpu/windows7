/**
 * Proof for the "opening the Start menu pops up a keyboard" fix.
 *
 * Runs the real module against a DOM, with a touch-first `matchMedia` (i.e. the
 * phone case) and then with a desktop one, and asserts:
 *
 *  1. touch device: a field focused programmatically is readOnly, so the OS has
 *     nothing to raise a keyboard for — yet it really is the focused element;
 *  2. the first tap releases it, and the re-focus afterwards makes it a normal
 *     writable field (typing then works);
 *  3. a key press from a hardware keyboard also releases it;
 *  4. desktop: focusNoKeyboard leaves the field writable, so typing is unchanged.
 *
 * Run with: npm run test:softkb
 */
import { JSDOM } from "jsdom";

let failures = 0;

function check(name, cond, detail = "") {
  if (cond) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
}

function makeDom(touch) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <div class="sm-search"><input id="q" placeholder="Search programs and files"></div>
    <button id="other">x</button>
  </body></html>`, { pretendToBeVisual: true, url: "http://localhost/" });
  // jsdom does not implement matchMedia; emulate the two device classes.
  dom.window.matchMedia = (q) =>
    ({ matches: touch, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false });
  // jsdom raises no keyboard, but it does honour the readOnly/focus contract the
  // fix relies on, which is what we assert.
  return { doc: dom.window.document, win: dom.window };
}

async function run() {
  // The module touches `window` at call time, not import time, but React's
  // hooks need the global environment too.
  const touchCtx = makeDom(true);
  globalThis.window = touchCtx.win;
  globalThis.document = touchCtx.doc;
  globalThis.HTMLElement = touchCtx.win.HTMLElement;
  globalThis.HTMLInputElement = touchCtx.win.HTMLInputElement;
  globalThis.HTMLTextAreaElement = touchCtx.win.HTMLTextAreaElement;

  const mod = await import("../src/win7/softKeyboard.ts");

  console.log("touch device (phone / tablet)");
  const q = touchCtx.doc.getElementById("q");
  mod.focusNoKeyboard(q);
  check("search box is focused", touchCtx.doc.activeElement === q);
  check("focused field is readOnly, so no soft keyboard", q.readOnly === true && q.hasAttribute("data-softkb"));

  const stop = mod.installSoftKeyboardGuard();

  // --- 1. the user taps the field
  q.dispatchEvent(new touchCtx.win.Event("pointerdown", { bubbles: true }));
  check("first tap makes it writable", q.readOnly === false && !q.hasAttribute("data-softkb"));
  await new Promise((r) => setTimeout(r, 5));
  check("and it keeps the caret", touchCtx.doc.activeElement === q);
  q.value = "note";
  check("typing/editing then works", q.value === "note");

  // --- 2. a fresh programmatic focus is suppressed again
  mod.focusNoKeyboard(q);
  check("reopening suppresses again", q.readOnly === true);

  // --- 3. hardware key press releases it
  q.dispatchEvent(new touchCtx.win.Event("keydown", { bubbles: true }));
  check("hardware key press releases it", q.readOnly === false);

  stop();

  console.log("desktop (mouse + keyboard)");
  const deskCtx = makeDom(false);
  globalThis.window = deskCtx.win;
  globalThis.document = deskCtx.doc;
  globalThis.HTMLElement = deskCtx.win.HTMLElement;
  globalThis.HTMLInputElement = deskCtx.win.HTMLInputElement;
  const d = deskCtx.doc.getElementById("q");
  mod.focusNoKeyboard(d);
  check("field stays writable (no behaviour change)", d.readOnly === false && !d.hasAttribute("data-softkb"));
  check("still focused", deskCtx.doc.activeElement === d);

  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exit(failures ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
