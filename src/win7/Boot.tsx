"use client";
import dynamic from "next/dynamic";

const Shell = dynamic(() => import("./Shell"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, background: "#000" }} />,
});

export default function Boot() {
  return <Shell />;
}
