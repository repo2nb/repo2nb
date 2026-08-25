import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // a stray lockfile elsewhere on the machine confuses Next's workspace-root inference
  outputFileTracingRoot: __dirname,
  devIndicators: false,
  // In dev, proxy /api to the local FastAPI server (uvicorn api.index:app --port 8000).
  // In production the same paths are served by Vercel Python functions from apps/web/api.
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" }]
      : [];
  },
};

export default nextConfig;
