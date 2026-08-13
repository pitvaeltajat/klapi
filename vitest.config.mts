import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Every test here is a pure-function or API-route test — nothing renders a
    // component or touches document/window. The 'node' environment skips
    // standing up a DOM per test file, which is most of the wall clock.
    environment: 'node',
    exclude: ['.claude/**', '.next/**', 'node_modules/**'],
    // The API integration tests share one Postgres database and several read
    // globally (e.g. getAvailabilities scans all items/reservations). Running
    // test files in parallel lets one file's writes/cleanup leak into another's
    // reads — Prisma resolves nested includes via separate queries, so a
    // concurrent deleteMany can orphan a relation mid-read. Run files serially
    // so each gets a clean, isolated view of the database.
    fileParallelism: false,
  },
});
