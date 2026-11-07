"use client";
import dynamic from "next/dynamic";
import "../win7/icon-art.css";

// The desktop is a single-page, browser-only application. It is imported on
// the client only because it depends on localStorage, screen size and pointer
// input. While its bundle loads, the Windows boot screen is shown.
const Boot = dynamic(() => import("@/win7/Boot"), {
  ssr: false,
  loading: () => (
    <div className="boot" aria-busy="true" style={{ position: "fixed" }}>
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

export default function HomePage() {
  return <Boot />;
}
