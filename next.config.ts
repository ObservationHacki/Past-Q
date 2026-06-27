import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We have a lockfile in this directory; pin the tracing root to avoid Next.js
  // inferring a parent directory as the workspace root.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
