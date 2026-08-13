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
  experimental: {
    // Next 16.3 flipped this default to true, which makes it shell out to
    // `typescript/bin/tsc`. We deliberately alias `typescript` to the TS 6 *JS
    // API* package (`@typescript/typescript6`, whose binary is `tsc6`) so
    // typescript-eslint keeps working — see the TypeScript note in CLAUDE.md —
    // so there is no `bin/tsc` to find and Next reports typescript as missing,
    // then tries to auto-install it. Keep it on the compiler API, which that
    // package does provide at `typescript/lib/typescript.js`.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
