import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Enable server actions for enhanced features
  },
};

export default nextConfig;
