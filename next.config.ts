import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable React strict mode for consistent development behavior
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
};

export default nextConfig;
