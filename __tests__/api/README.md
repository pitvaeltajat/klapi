# API Integration Tests

These tests verify that the API endpoints work correctly against a real database.

## Running Tests

```bash
pnpm test
```

This automatically starts the PostgreSQL database via docker-compose and runs all tests.

## Test Data

Tests create their own test data and clean up after themselves. Each test suite:
- Creates test users, items, and loans in `beforeAll`
- Cleans up loans between tests in `beforeEach`
- Removes all test data in `afterAll`

## Test Coverage

### updateLoan.integration.test.ts

Tests for the loan update API:

**Authorization:**
- Rejects unauthenticated requests
- Allows users to edit their own loans
- Prevents users from editing other users' loans
- Allows admins to edit any loan
- Prevents non-admins from editing INUSE loans
- Prevents non-admins from editing RETURNED loans

**Availability validation:**
- Allows editing within available quantity
- Rejects editing beyond available quantity
- Considers overlapping loans when calculating availability
- Allows full availability when loans don't overlap
- Ignores REJECTED loans in availability calculation
- Ignores RETURNED loans in availability calculation

**Data persistence:**
- Correctly updates reservations in database
- Removes items when not included in update
- Updates loan dates correctly
- Updates description correctly
