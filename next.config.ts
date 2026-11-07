import type { NextConfig } from "next";

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
};

export default nextConfig;
