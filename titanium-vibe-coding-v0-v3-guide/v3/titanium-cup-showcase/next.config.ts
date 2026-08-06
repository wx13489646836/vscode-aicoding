import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Support for Turbopack (Next.js 16 default)
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ['babylonjs'],
};

export default nextConfig;
