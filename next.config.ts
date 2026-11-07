import type { NextConfig } from "next";

// The simulator is published as a static site on GitHub Pages, where it lives
// under https://<owner>.github.io/windows7/ instead of the domain root. The
// prefix is only applied when PAGES_BASE_PATH is set (the Pages workflow sets
// it), so local development and server hosting stay at /.
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  // The desktop simulation is served through a preview proxy in hosted
  // environments (https://<port>-<sandbox>.e2b.app). Next.js blocks
  // cross-origin requests for /_next/* in development by default, which
  // leaves the page as an empty black screen. Allow the proxy origins.
  allowedDevOrigins: [
    "*.e2b.app",
    "*.arena.ai",
    "*.arena.dev",
    "*.localhost",
    "localhost",
    "127.0.0.1",
  ],
  // Public assets (icons, sounds) are referenced by URL, so the base path has
  // to be available to client code as well.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // ---- static export for GitHub Pages ----
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
