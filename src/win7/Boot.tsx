"use client";
import dynamic from "next/dynamic";
import { ShellBoundary } from "./ShellBoundary";
import { BootAnimation } from "./BootAnimation";

// The shell is browser-only (it reads localStorage, layout size and pointer
// state), so it is loaded dynamically. `ssr: false` keeps the server render
// cheap; the placeholder below matches the Windows boot screen instead of a
// bare black rectangle, so a slow chunk or a blocked request never looks like
// a broken page.
const Shell = dynamic(() => import("./Shell"), {
  ssr: false,
  loading: () => (
    <div className="boot" aria-busy="true">
      <BootAnimation />
      <div className="boot-text">Starting Windows</div>
      <div className="boot-copy">© Microsoft Corporation</div>
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
