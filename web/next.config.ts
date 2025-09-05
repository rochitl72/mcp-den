import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Tell Next to treat the repo root as the tracing root,
  // since our API spawns ../dist/server.js (outside /web).
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
