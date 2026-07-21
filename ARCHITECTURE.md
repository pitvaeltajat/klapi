# Klapi — architecture map

A lookup table for **where things live**, so you can answer "where is X done?"
without fanning out across the route tree. Product overview, tech stack and
directory layout are in `README.md`; conventions and git workflow are in
`CLAUDE.md`. Keep this file in sync when you add/rename routes or models.

App Router project: every endpoint is its own `app/api/<domain>/<name>/route.ts`
exporting `GET`/`POST`/`PATCH`/etc. Pages are `app/**/page.tsx` (server
components) paired with a `*View.tsx` client component where interactivity is
needed.

## Domain vocabulary (Finnish UI → code)

The UI is Finnish; models/code are English. Map concepts before grepping:

| Finnish        | Code / model            | Notes |
|----------------|-------------------------|-------|
| kama, kalusto  | `Item`                  | a piece of equipment ("kama" = one item) |
| laina          | `Loan`                  | a loan/booking |
| varaus         | `Reservation`           | one item line within a loan |
| laatikko       | `Box`                   | physical return box at the kiosk |
| sijainti       | `Location`              | storage location of an item |
| kategoria      | `Category`              | item category (many-to-many) |
| raportti       | `Report`                | condition report tied to a loan |
| ilmoitus       | `Announcement`          | per-item notice |
| käyttäjä       | `User`                  | group = ADMIN \| USER \| KIOSK |
| kiosk          | KIOSK group / `app/kiosk`| shared terminal; admins elevate via PIN |
| muokkaushistoria | `ItemHistory`         | per-item audit log |
| (loan) historia | `LoanHistory`          | per-loan audit log |

## Auth pattern

Protected routes use the guards in `utils/apiAuth.ts` — `requireUser`,
`requireAdmin`, `requireAdminOrKiosk`:

```ts
const { session, denied } = await requireAdmin();
if (denied) return denied;
// session is non-null from here on
```

They only answer "may this caller call this route at all". Per-resource checks
(is this the caller's own loan?) stay in the route. A few routes still call
`getServerSession` directly because their rule isn't a simple group check —
`user/[userId]` GET (admin *or* the user themselves) and `loan/myPendingPickups`
(answers with an empty list rather than a 401).

`session.user` carries `id`, `group`, `email`, and — for a PIN-elevated kiosk
session — `elevatedById`, `elevatedByName` and `adminExpiry`. `adminExpiry` is
load-bearing, not decoration: `isElevationInvalid` in `lib/auth.ts` demotes the
session back to KIOSK once it passes. NextAuth config + the credentials
provider live in `lib/auth.ts`.

## Audit / history pattern

Two parallel audit logs, same shape (`{ id, <fk>, action, details Json?,
actedById, createdAt }`, FK cascade, actor `SetNull`), rendered server-side on
the entity's detail page:

| | Model | Server logger | Client labels/format | Shown on |
|---|---|---|---|---|
| Loans | `LoanHistory` | `utils/loanHistory.ts` (`logLoanHistory`, `resolveLoanActor`) | `utils/loanHelpers.ts` | `/loan/[id]` |
| Items | `ItemHistory` | `utils/itemHistory.ts` (`logItemHistory`, `diffItemFields`) | `utils/itemHelpers.ts` | `/item/[id]` (admin only) |

`logItemHistory` is best-effort (never throws). Item edits store a field-level
`{ changed: { field: { from, to } } }` diff; bulk ops carry a `bulk` flag.
**Client components must import labels from `*Helpers.ts`, never the
`*History.ts` loggers** (those import Prisma).

## API routes

### `item/*` — equipment (admin-gated except reads)
| Route | Method | Purpose |
|---|---|---|
| `createItem` | POST | create an item; logs `CREATED` |
| `editItem` | POST | full edit (name/description/amount/categories); logs `UPDATED` diff |
| `patchItem` | PATCH | single-field inline edit (name/description/amount/locationId); logs `UPDATED` |
| `deleteItem` | POST | soft-delete (stamp `deletedAt`); logs `ARCHIVED` |
| `restoreItem` | POST | clear `deletedAt`; logs `RESTORED` |
| `promoteItem` | POST | temporary → normal item; logs `PROMOTED` |
| `bulkItems` | POST | bulk `delete`/`restore`/`setCategory`/`setLocation`; logs per item |
| `getInventory` | GET | inventory listing (admin table source) |
| `uploadImage` | POST | S3 presigned URL for the item image |
| `createAnnouncement` / `expireAnnouncement` | POST | item notices |

Items are **soft-deleted** (`deletedAt`), so reservations + history survive.
Temporary items are auto-created during `loan/submitLoan` and are **not**
history-logged.

### `loan/*` — loans
| Route | Method | Purpose |
|---|---|---|
| `submitLoan` | POST | create a loan (+ temporary items); logs `CREATED` |
| `updateLoan` | POST | edit reservations/details; logs `UPDATED` diff |
| `approveLoan` / `rejectLoan` / `cancelLoan` | POST | status transitions |
| `startLoan` | POST | mark in use |
| `loanReturned` | POST | returned to box |
| `loanProcessed` | POST | process returned-from-box |
| `editReport` | POST | edit a condition report |
| `myPendingPickups` | GET | current user's pending pickups |

`submitLoan` creates the loan already **ACCEPTED** (or **INUSE** when a kiosk
session makes it) — there is no approval queue. `approveLoan` therefore only
exists to bring a rejected loan back, which is why the "Hyväksy" button is
hidden for every other status (`app/loan/[id]/LoanView.tsx`, `canApprove`).

### `user/*`, `auth/*`, misc
| Route | Method | Purpose |
|---|---|---|
| `user/[userId]` | GET/PUT/PATCH/DELETE | user CRUD; role flip via PATCH `group`. DELETE **soft-deletes** (stamps `deletedAt`) so loans + history survive; restore by clearing `deletedAt` |
| `user/getUsers` | GET | list **all** live users, full records (admin only); excludes `deletedAt` |
| `users/getUsers` | GET | list non-KIOSK live users (id/email/name only, admin/kiosk gated) — for `LoanerAutocomplete`; excludes `deletedAt` |
| `user/kioskPassword` | GET/POST | read / rotate the reusable static kiosk password |
| `user/updateEmailPreferences` | POST | notification prefs |
| `auth/createPin` | POST | set the admin kiosk-elevation PIN |
| `auth/elevatableAdmins` | GET | admins a kiosk session may elevate to (used by `TopBar`) |
| `auth/[...nextauth]` | — | NextAuth handler |
| `availability/getAvailabilities` | POST | item availability over a date range |
| `category/getCategories`, `location/getLocations` | GET | option lists |
| `reservation/checkInBox` | POST | mark a reservation checked into a box |
Transactional email is **not** a route: the senders live in `utils/emails/`
(one module per email, each split into a pure `render*Email` and a
`send*Email`), with the shared pieces in `utils/emailHelpers` and the
once-per-day dedup in `utils/emailLogHelpers`. Callers — `submitLoan` and the
cron sweeps — import and call them directly.
| `cron/checkExpiringLoans`, `cron/checkOverdueLoans`, `cron/startDueLoans` | GET | scheduled jobs; require `Authorization: Bearer $CRON_SECRET`. Schedules live in `vercel.json` |

## Pages (`app/**/page.tsx`)

| Path | Purpose |
|---|---|
| `/` | home / catalog browse |
| `/item/[id]` | item detail (+ admin announcements, reports, **muokkaushistoria**) |
| `/item/announcements` | announcements overview |
| `/loan`, `/loan/[id]`, `/loan/[id]/edit` | loan list / detail (+ history) / edit |
| `/admin` | user management |
| `/admin/createItem`, `/admin/edititem/[id]` | item create / edit forms |
| `/admin/editLoan/[id]`, `/admin/reports`, `/admin/boxes` | admin loan edit / reports / boxes |
| `/kiosk/startloan`, `/kiosk/return` | kiosk flows |
| `/account`, `/login` | account settings / sign-in |

## Prisma models (`prisma/schema.prisma`)

`User` (group enum, soft-delete via `deletedAt` — filtered out of auth, listings,
elevation, and email recipients so `Loan.user` history survives) ·
`Account`/`Session` (NextAuth) · `Item` (soft-delete via
`deletedAt`, m2m `Category`, optional `Location`) · `Reservation` (Item↔Loan
line) · `Loan` (status enum, optional `Box`) · `Box` · `Location` · `Category` ·
`Report` + `ReportAffectedItem` · `Announcement` · `LoanHistory` /
`ItemHistory` (audit) · `EmailLog`. Migrations in `prisma/migrations/`; seed in
`prisma/seed.ts`.

## Cross-cutting helpers

- `utils/prisma` — Prisma client singleton.
- `utils/serialize.ts` — serialize server data (Date → string) before passing to
  client components.
- `lib/auth.ts` — NextAuth `authOptions`; `lib/utils.ts` — `cn()` etc.
- `utils/dateFormat.ts` / `dateRange.ts` + `components/DateTime` — date display.
- `utils/loanHelpers.ts` / `itemHelpers.ts` — **client-safe** badge variants +
  history labels (no Prisma import).
- `utils/itemQueries.ts` — shared item query builders.
- `hooks/useItemImage.ts` — item image with theme-aware placeholder + SSR guard.
- `contexts/CartContext`, `contexts/DatesContext` — loan-cart + date-range state
  (mounted in `app/providers.tsx`).
