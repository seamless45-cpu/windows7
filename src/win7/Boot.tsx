"use client";
import dynamic from "next/dynamic";
import { ShellBoundary } from "./ShellBoundary";

// The shell is browser-only (it reads localStorage, layout size and pointer
// state), so it is loaded dynamically. `ssr: false` keeps the server render
// cheap; the placeholder below matches the Windows boot screen instead of a
// bare black rectangle, so a slow chunk or a blocked request never looks like
// a broken page.
const Shell = dynamic(() => import("./Shell"), {
  ssr: false,
  loading: () => (
    <div className="boot" aria-busy="true">
      <div className="boot-logo">
        <div className="boot-orbs">
          {[0, 1, 2, 3].map((i) => (
            <i key={i} style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
      <div className="boot-text">Starting Windows</div>
    </div>
  ),
});

export default function Boot() {
  return (
    <ShellBoundary>
      <Shell />
    </ShellBoundary>
  );
}
