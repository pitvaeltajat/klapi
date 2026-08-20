# API Integration Tests

These tests verify that the API endpoints work correctly against a real database.

## Running Tests

```bash
pnpm test
```

That starts a disposable PostgreSQL via `docker-compose.test.yml` on port
**5433** — separate from the dev database on 5432, so running tests never
touches your local data — applies migrations, and runs every suite.

`pnpm test:ci` skips the docker step and expects `DATABASE_URL` to point at an
already-migrated database (that's what CI does with its own postgres service).

Suites run one file at a time (`fileParallelism: false` in `vitest.config.mts`)
because they share the one database and several read globally; the reasoning is
documented in that file.

## Test Data

Tests create their own test data and clean up after themselves. Each test suite:

- Creates test users, items, and loans in `beforeAll`
- Cleans up loans between tests in `beforeEach`
- Removes all test data in `afterAll`

## Coverage

The suites in this directory cover: loan submission and updates (including the
before-start path), approve/reject, starting a loan, returns, availability
calculation, inventory, the kiosk password, email-log dedup, the `startDueLoans`
cron, the Google Workspace user sync, and duplicate-account merging. `__tests__/` one level up holds the unit tests (auth
elevation, loan status derivation, email helpers, serialization).

Deliberately not enumerated per file — that list rots faster than it helps. Run
`pnpm test` and read the reporter output for the current picture.

Known gaps worth filling: user soft-delete (`user/[userId]` DELETE),
`item/bulkItems`, `loan/cancelLoan`, `loan/loanProcessed`,
`reservation/checkInBox`, and the `checkExpiringLoans` / `checkOverdueLoans`
crons. `utils/googleWorkspace` is untested on purpose — it is the Directory API
adapter, and the sync suite covers the decisions by handing `syncWorkspaceUsers`
a roster directly.
