// Splices the generated entity-relationship diagram into README.md.
//
// prisma-erd-generator can only write a whole file, so it emits the mermaid
// fence to .erd.md and this script drops that block between the ERD markers in
// the README. Run via `pnpm erd` (which regenerates .erd.md first).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.join(root, '.erd.md');
const readme = path.join(root, 'README.md');

const START = '<!-- ERD:START -->';
const END = '<!-- ERD:END -->';

let diagram;
try {
  diagram = readFileSync(generated, 'utf8').trim();
} catch {
  console.error(
    `Missing ${path.relative(root, generated)} — run \`pnpm prisma generate\` first (or just \`pnpm erd\`).`,
  );
  process.exit(1);
}

const current = readFileSync(readme, 'utf8');
const start = current.indexOf(START);
const end = current.indexOf(END);

if (start === -1 || end === -1 || end < start) {
  console.error(`README.md is missing the ${START} / ${END} markers.`);
  process.exit(1);
}

const next =
  current.slice(0, start + START.length) + '\n\n' + diagram + '\n\n' + current.slice(end);

if (next === current) {
  console.log('README.md ERD already up to date.');
} else {
  writeFileSync(readme, next);
  console.log('README.md ERD updated.');
}
