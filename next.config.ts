import { withSuperjson } from 'next-superjson';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default withSuperjson()(nextConfig);
