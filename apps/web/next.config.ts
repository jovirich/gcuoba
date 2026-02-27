import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gcuoba.com.ng",
      },
      {
        protocol: "https",
        hostname: "www.gcuoba.com.ng",
      },
    ],
  },
};

export default nextConfig;
