import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
