import type { NextConfig } from 'next';

// In a git worktree under `.claude/worktrees/<name>`, `node_modules` is a
// symlink back to the main checkout. Turbopack rejects symlinks that point
// outside its `root`, so widen the root to the main repo when we detect a
// worktree path. Outside a worktree this is a no-op.
const dir = import.meta.dirname;
const worktreeMatch = dir.match(/^(.*)\/\.claude\/worktrees\/[^/]+$/);
const turbopackRoot = worktreeMatch ? worktreeMatch[1] : dir;

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
