import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cediwise.app',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
