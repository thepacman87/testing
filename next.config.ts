import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "onnxruntime-node"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fal.media" },
      { protocol: "https", hostname: "v3.fal.media" },
      { protocol: "https", hostname: "v3b.fal.media" },
      { protocol: "https", hostname: "huggingface.co" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      sharp: "./src/lib/empty-stub.js",
      "onnxruntime-node": "./src/lib/empty-stub.js",
    },
  },
};

export default nextConfig;
