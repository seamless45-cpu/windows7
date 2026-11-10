import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Windows 7 Ultimate",
  description: "A browser-based recreation of the Microsoft Windows 7 Ultimate desktop environment.",
  applicationName: "Windows 7 Ultimate",
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: {
    // iOS only reads the apple-prefixed tag for the full-screen (installed) mode.
    capable: true,
    title: "Windows 7",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Android/Chrome read the unprefixed one.
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: `${BASE}/icons/pwa/favicon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${BASE}/icons/pwa/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: `${BASE}/icons/pwa/apple-touch-icon.png`, sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // The Aero taskbar and the glass frame sit on a dark desktop; colouring the
  // OS chrome to match is what makes an installed copy look like a desktop app.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a2c5c" },
    { media: "(prefers-color-scheme: dark)", color: "#061627" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
