"use client";
/**
 * Real document formats for the built-in programs.
 *
 * WordPad saves RTF the way WordPad does (a `{\rtf1\ansi` document with the
 * formatting converted from HTML), and Paint saves a real PNG from its canvas.
 * Both files are written to the simulated file system, so they can be opened
 * again and exported to the user's real computer.
 */

/* --------------------------------------------------------------- WordPad */
const esc = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/[\u0080-\uffff]/g, (c) => `\\u${c.charCodeAt(0)}?`);

/**
 * Convert the HTML that contenteditable produced into RTF. WordPad writes
 * `\fonttbl` + `\colortbl` and then the text runs with bold/italic/underline
 * and paragraph breaks; this mirrors that structure.
 */
export function htmlToRtf(html: string): string {
  const doc = typeof DOMParser !== "undefined" ? new DOMParser().parseFromString(html, "text/html") : null;
  const out: string[] = [];
  // WordPad's default font table
  out.push("{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1033");
  out.push("{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}{\\f1\\fmodern\\fcharset0 Courier New;}{\\f2\\fnil\\fcharset0 Calibri;}}");
  out.push("{\\colortbl ;\\red0\\green0\\blue0;\\red255\\green0\\blue0;\\red0\\green0\\blue255;}");
  out.push("\\viewkind4\\uc1\\pard\\f2\\fs20");

  const walk = (node: Node, style: { b: boolean; i: boolean; u: boolean }) => {
    if (node.nodeType === 3) {
      const t = (node.textContent || "").replace(/\u00a0/g, " ");
      if (!t) return;
      if (style.b) out.push("\\b");
      if (style.i) out.push("\\i");
      if (style.u) out.push("\\ul");
      out.push(esc(t));
      if (style.b) out.push("\\b0");
      if (style.i) out.push("\\i0");
      if (style.u) out.push("\\ulnone");
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      out.push("\\par\n");
      return;
    }
    const next = {
      b: style.b || tag === "b" || tag === "strong" || /font-weight:\s*(bold|[6-9]00)/.test(el.getAttribute("style") || ""),
      i: style.i || tag === "i" || tag === "em" || /font-style:\s*italic/.test(el.getAttribute("style") || ""),
      u: style.u || tag === "u" || /text-decoration:\s*underline/.test(el.getAttribute("style") || ""),
    };
    if (tag === "p" || tag === "div") {
      out.push("\\pard ");
      el.childNodes.forEach((c) => walk(c, next));
      out.push("\\par\n");
      return;
    }
    if (tag === "li") {
      out.push("\\pard\\bullet\\tab ");
      el.childNodes.forEach((c) => walk(c, next));
      out.push("\\par\n");
      return;
    }
    el.childNodes.forEach((c) => walk(c, next));
  };

  if (doc?.body) {
    const kids = Array.from(doc.body.childNodes);
    if (!kids.length) out.push("\\par");
    kids.forEach((n) => {
      walk(n, { b: false, i: false, u: false });
      // plain text nodes with no block element still need a paragraph
      if (n.nodeType === 3) out.push("\\par\n");
    });
  }
  out.push("}");
  return out.join("");
}

/** Turn RTF back into the HTML WordPad's editor expects. */
export function rtfToHtml(rtf: string): string {
  if (!/^\s*\{\\rtf/.test(rtf)) return ""; // not RTF — the caller falls back
  // drop the font/colour tables
  let s = rtf
    .replace(/\{\\fonttbl[\s\S]*?\}\}/g, "")
    .replace(/\{\\colortbl[^}]*\}/g, "")
    .replace(/\{\\\*[^}]*\}/g, "");
  const paras = s.split(/\\par[d]?\s?/);
  const conv = (t: string) => {
    let h = t
      .replace(/\\u(-?\d+)\?/g, (_m, n) => String.fromCharCode(((Number(n) + 65536) % 65536)))
      .replace(/\\'([0-9a-f]{2})/gi, (_m, hx) => String.fromCharCode(parseInt(hx, 16)))
      .replace(/\\[a-z]+-?\d* ?/gi, "")
      .replace(/[{}]/g, "")
      .replace(/\\\\([{}\\])/g, "$1");
    h = escHtml(h);
    // formatting runs
    h = h.replace(/\\b\b/g, "");
    return h;
  };
  const body = paras
    .map((p) => {
      const plain = conv(p);
      return `<p>${plain}</p>`;
    })
    .join("");
  return body || "<p></p>";
}

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ------------------------------------------------------------------ Paint */
/** Encode the Paint canvas as a PNG data URL. */
export function canvasPng(canvas: HTMLCanvasElement | null): string {
  if (!canvas) return "";
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

/** Decode a stored PNG (or any image data URL) back onto a canvas. */
export function drawPng(canvas: HTMLCanvasElement | null, dataUrl: string, done?: () => void) {
  if (!canvas || !dataUrl) return;
  const g = canvas.getContext("2d");
  if (!g) return;
  const img = new Image();
  img.onload = () => {
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    done?.();
  };
  img.src = dataUrl;
}

/** The size of a PNG data URL, in bytes, for the file listing. */
export const dataUrlBytes = (u: string) => Math.round((u.length - (u.indexOf(",") + 1)) * 0.75);
