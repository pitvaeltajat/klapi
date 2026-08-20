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
| huomio         | `Report` **or** `Announcement` | see "Huomiot" below — one UI concept, two tables |
| (huomio, käsittelemätön) | `Report`      | what a loaner wrote about a loan, at pickup or return |
| (huomio, julkaistu) | `Announcement`     | what an admin published on a kama, visible to everyone |
| pohja, valmis setti | `Template`         | pre-picked item set the loaner drops into the cart |
| käyttäjä       | `User`                  | group = ADMIN \| USER \| KIOSK |
| kiosk          | KIOSK group / `app/kiosk`| shared terminal; admins elevate via PIN |
| muokkaushistoria | `ItemHistory`         | per-item audit log |
| (loan) historia | `LoanHistory`          | per-loan audit log |

## Huomiot (one feature, two tables)

The UI has **one** concept — a *huomio*, something noticed about a kama — backed
by two models. They used to be two separate features ("raportit" and
"ilmoitukset") with their own pages and words, which is why nobody could tell
when to use which:

```
loaner writes a huomio          →  Report      (per Loan, at pickup or return)
   ↓  admin triages it at /notices
admin publishes a huomio        →  Announcement (per Item, everyone sees it)
```

- **`Report`** — untriaged, admin-visible only. `status` OPEN → IN_PROGRESS →
  RESOLVED; `created` says whether it was written at pickup or return.
- **`Announcement`** — published. `kind` is `KORJATTAVAA` (a fault: red, warns
  loaners) or `TIEDOKSI` (a neutral heads-up). `expiresAt` stamped = unpublished.
- **`Announcement.reportId`** links a published huomio back to the loaner's
  original; publishing onto N kamat writes N rows sharing one `reportId`.
- **`ReportAffectedItem`** tags which kamat a report concerns. It is bookkeeping
  only and **deliberately does not affect availability** — a tagged kama stays
  loanable. Don't wire it into `availability/getAvailabilities`; warn loaners by
  publishing a KORJATTAVAA announcement instead.

All labels/colours come from `utils/loanHelpers.ts`
(`getReportStatus*`, `getReportCreatedLabel`, `getAnnouncementKind*`) — add
vocabulary there, not in a per-page map.

Surfaces: `/notices` (both halves), `app/item/[id]/ItemNotices.tsx` (per kama),
`components/LoanNotices.tsx` (per loan; the owner sees their own),
`components/HandleNoticeDialog.tsx` (triage + publish).

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
| `promoteItem` | POST | temporary → normal item (`locationId` takes the `{ value, label }` sijainti shape, same as createItem/editItem); logs `PROMOTED` |
| `bulkItems` | POST | bulk `delete`/`restore`/`setCategory`/`setLocation`; logs per item |
| `getInventory` | GET | inventory listing (admin table source) |
| `uploadImage` | POST | S3 presigned URL for the item image (admin; any non-kiosk user for a `custom-<uuid>` key, or for a real kama that has **no** photo yet — HEADs the public bucket to check) |
| `createAnnouncement` | POST | publish a huomio onto one or more kamat (`{ itemIds, message, kind, reportId? }`) |
| `expireAnnouncement` | POST | unpublish one (stamps `expiresAt`) |

Items are **soft-deleted** (`deletedAt`), so reservations + history survive.
Temporary items ("omat kamat") are auto-created during `loan/submitLoan` and are
**not** history-logged. Their id is minted in the browser by
`utils/customItems.ts` (`custom-<uuid>`) so an optional photo can be uploaded to
S3 under that key before the row exists; `submitLoan` reuses the id verbatim
when it's free, which is what makes the picture line up.

### `loan/*` — loans
| Route | Method | Purpose |
|---|---|---|
| `submitLoan` | POST | create a loan (+ temporary items); logs `CREATED` |
| `updateLoan` | POST | edit reservations/details; logs `UPDATED` diff |
| `approveLoan` / `rejectLoan` / `cancelLoan` | POST | status transitions |
| `startLoan` | POST | mark in use |
| `loanReturned` | POST | returned to box |
| `loanProcessed` | POST | process returned-from-box |
| `editReport` | POST | triage a huomio: set status + re-tag affected kamat (admin only) |
| `handledReports` | GET | the huomiot archive: RESOLVED reports, newest 100 (admin only) |
| `myPendingPickups` | GET | current user's pending pickups |

`submitLoan` creates the loan already **ACCEPTED** (or **INUSE** when a kiosk
session makes it) — there is no approval queue. `approveLoan` therefore only
exists to bring a rejected loan back, which is why the "Hyväksy" button is
hidden for every other status (`app/loan/[id]/LoanView.tsx`, `canApprove`).

### `user/*`, `auth/*`, misc
| Route | Method | Purpose |
|---|---|---|
| `user/[userId]` | GET/PUT/PATCH/DELETE | user CRUD; role flip via PATCH `group`. DELETE **soft-deletes** (stamps `deletedAt`, `deletedBySync: false`) so loans + history survive; restore by clearing `deletedAt` |
| `user/getUsers` | GET | list **all** live users, full records (admin only); excludes `deletedAt` |
| `users/getUsers` | GET | list non-KIOSK live users (id/email/name only, admin/kiosk gated) — for `LoanerAutocomplete`; excludes `deletedAt`; raw SQL, ordered by name (email as fallback) with the `fi-FI-x-icu` collation |
| `user/kioskPassword` | GET/POST | read / rotate the reusable static kiosk password |
| `user/updateEmailPreferences` | POST | notification prefs — own by default; an ADMIN may pass `userId` to edit someone else's (for `/admin/user/[userId]`). Anyone else naming another `userId` gets a 401, never a silent write to their own row |
| `auth/createPin` | POST | set the admin kiosk-elevation PIN |
| `auth/elevatableAdmins` | GET | admins a kiosk session may elevate to (used by `TopBar`) |
| `auth/[...nextauth]` | — | NextAuth handler |
| `availability/getAvailabilities` | POST | item availability over a date range |
| `category/getCategories`, `location/getLocations` | GET | option lists |
| `template/getTemplates` | GET | the pre-picked item sets (any signed-in caller) |
| `template/createTemplate` | POST | create one from an item list (`items: [{ itemId, amount }]`) |
| `template/updateTemplate` | POST | rename + replace its item list |
| `template/deleteTemplate` | POST | hard delete (nothing references a template) |
| `reservation/checkInBox` | POST | mark a reservation checked into a box |
Transactional email is **not** a route: the senders live in `utils/emails/`
(one module per email, each split into a pure `render*Email` and a
`send*Email`), with the shared pieces in `utils/emailHelpers` and the
once-per-day dedup in `utils/emailLogHelpers`. Callers — `submitLoan` and the
cron sweeps — import and call them directly.
| `cron/checkExpiringLoans`, `cron/checkOverdueLoans`, `cron/startDueLoans` | GET | scheduled jobs; require `Authorization: Bearer $CRON_SECRET`. Schedules live in `vercel.json` |
| `cron/syncWorkspaceUsers` | GET | nightly Google Workspace → `User` reconciliation; `?dryRun=1` reports without writing. Same `CRON_SECRET` guard |

## Google Workspace user sync

The troop roster lives in Google Workspace and Klapi follows it — see
README § *Google Workspace user sync* for the setup and the env vars.

| | Where |
|---|---|
| Directory API client (service account, domain-wide delegation) | `utils/googleWorkspace.ts` |
| Reconciliation + guards | `utils/userSync.ts` |
| Cron wrapper | `app/api/cron/syncWorkspaceUsers/route.ts` |
| Tests | `__tests__/api/syncWorkspaceUsers.integration.test.ts` |

The split matters: `userSync` takes an already-fetched roster, so every
lock-people-out decision is testable without a key or a network.

**Merging duplicate accounts.** Members who predate the sync may hold two rows
— a personal Gmail one and a Workspace one — with loan history split across the
pair. `utils/mergeUsers.ts` folds one into the other: `Loan`, `EmailLog`,
`LoanHistory.actedById`, `ItemHistory.actedById`, `Account` and `Session` all
move, in one transaction, then the duplicate is soft-deleted with
`mergedIntoId` pointing at the survivor. The duplicate's row is **kept** so its
email stays claimed — `lib/auth.ts` then refuses that Google login instead of
minting a fresh empty account for it. `scripts/merge-users.ts` drives it over a
hand-reviewed list of email pairs (`--apply`; dry run by default).

**`User.deletedBySync` is the provenance of `deletedAt`** — true when the sync
stamped it, false when a human did. The sync only undoes its own deletions, so
an admin's manual delete in `/admin` survives the night. Anything that
soft-deletes a user must set it.

## Pages (`app/**/page.tsx`)

| Path | Purpose |
|---|---|
| `/` | home / catalog browse (admin: the inventory table + the kama create/edit dialogs — `components/AddItemDialog.tsx`, `components/EditItemDialog.tsx`; neither has a route of its own) |
| `/item/[id]` | item detail (+ **huomiot** — published & untriaged, **muokkaushistoria**). Admins edit nimi/kuvaus/määrä/sijainti/kategoriat inline on the page (`components/ui/inline-edit.tsx`); the photo and a batch edit stay in `EditItemDialog`, and a väliaikainen kama gets "Siirrä kirjastoon" (`components/PromoteItemDialog.tsx`, shared with the inventory table) |
| `/notices` | the huomiot page: published list for everyone, triage queue + handled archive ("Näytä käsitellyt") for admins |
| `/item/announcements`, `/admin/reports` | permanent redirects to `/notices` (kept for old links) |
| `/admin/boxes` | permanent redirect to `/loan` (kept for old links) — see "Laatikot" below |
| `/loan`, `/loan/[id]`, `/loan/[id]/edit` | loan list / detail (+ history) / edit |
| `/admin` | user management |
| `/admin/user/[userId]` | one person as an admin sees them: role, email-ilmoitukset, lainahistoria — `/account` for somebody else. Reached by clicking a name in `/admin`. Gated server-side: another member's loan history must not reach a non-admin's browser |
| `/admin/editLoan/[id]` | admin loan edit |
| `/admin/templates` | manage the loan templates ("valmiit setit") |
| `/return` | return a loan (own loans for users; everyone's for admin/kiosk). `/kiosk/return` permanently redirects here |
| `/kiosk/startloan` | kiosk pickup queue |
| `/account`, `/login` | account settings / sign-in |

### Laatikot (no page of its own)

There is one physical palautuslaatikko, so "what's in the box" is a filter, not
a place: the **Laatikossa** chip on `/loan` (preselected, alongside the other
status chips). It is the one chip that is *not* a plain derived-status match —
it also catches loans deriving as `PARTIALLY_RETURNED`, whose returned half is
sitting in the box while the rest is still out (`app/loan/LoanListClient.tsx`).
`LoanCard` badges those with "Laatikossa: N"; checking items back in stays on
`/loan/[id]`, per item.

`Box` is still a model — `loan/loanReturned` assigns the emptiest box on return
and `/loan/[id]` shows its name. Only the page is gone.

## Prisma models (`prisma/schema.prisma`)

`User` (group enum, soft-delete via `deletedAt` — filtered out of auth, listings,
elevation, and email recipients so `Loan.user` history survives) ·
`Account`/`Session` (NextAuth) · `Item` (soft-delete via
`deletedAt`, m2m `Category`, optional `Location`) · `Reservation` (Item↔Loan
line) · `Loan` (status enum, optional `Box`) · `Box` · `Location` · `Category` ·
`Report` + `ReportAffectedItem` · `Announcement` (both are "huomiot" — see above) · `LoanHistory` /
`ItemHistory` (audit) · `EmailLog` · `Template` + `TemplateItem` (loan
templates; **no** back-reference from `Loan` — a loan doesn't record whether it
came from one). Migrations in `prisma/migrations/`; seed in
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
- `utils/templateQueries.ts` — server-side template helpers (read include,
  payload validation, loan→template aggregation). Template reads filter out
  archived items rather than deleting the join row, so restoring an item brings
  it back to every template that had it; `updateTemplate` therefore replaces
  only the rows the admin could see. Client components take `TemplateView` from
  `@/types` instead — that module imports Prisma.
- `hooks/useItemImage.ts` — item image with theme-aware placeholder + SSR guard.
- `utils/customItems.ts` — the `custom-<uuid>` id for a loaner's own item: minted
  client-side, recognised by the cart, and accepted as an upload key / explicit
  `Item.id` only in its strict UUID form.
- `contexts/CartContext`, `contexts/DatesContext` — loan-cart + date-range state
  (mounted in `app/providers.tsx`). Both mirror themselves into `sessionStorage`
  via `utils/sessionState.ts` so a reload doesn't lose a half-built loan; entries
  older than its TTL are dropped rather than restored, which is what stops one
  kiosk visitor inheriting the previous one's basket.
- `utils/sessionState.ts` — the timestamped `sessionStorage` envelope behind that.
