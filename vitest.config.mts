import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
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
