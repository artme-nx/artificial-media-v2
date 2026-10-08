import type { NextConfig } from "next";

// Static export for GitHub Pages (served at /artificial-media-v2/).
// basePath only in production; every asset path (textures, frame sequences, posters)
// goes through lib/asset.ts, which reads NEXT_PUBLIC_BASE_PATH.
const basePath = process.env.NODE_ENV === "production" ? "/artificial-media-v2" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  devIndicators: false,
};

export default nextConfig;
