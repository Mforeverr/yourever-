import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable React strict mode for consistent development behavior
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  webpack: (config, { dev }) => {
    if (dev) {
      // 禁用 webpack 的热模块替换
      config.watchOptions = {
        ignored: ['**/*'], // 忽略所有文件变化
      };
    }
    return config;
  },
  };

export default nextConfig;
