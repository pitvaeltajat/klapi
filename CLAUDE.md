# Klapi — agent notes

Equipment loan management app. Next.js 16 **App Router**, React 19, TypeScript
strict, Prisma 7, PostgreSQL, NextAuth v4, Tailwind v4 + shadcn/ui, sonner for
toasts, next-themes for dark mode, SWR for data fetching. UI is in Finnish.

See `README.md` for the product overview, tech stack, and project layout.

**Before exploring the codebase to answer "where is X done?", read
`ARCHITECTURE.md`** — it's a lookup map of every API route, the Prisma models,
the page list, the auth/audit patterns, and the Finnish→code vocabulary. It
exists to save you a fan-out search across `app/api/**`; keep it in sync when you
add or rename routes/models.

## Worktree bootstrap (important)

Git worktrees under `.claude/worktrees/*` do **not** inherit `.env` files from the
main repo. Before `pnpm dev` will work in a fresh worktree you must:

```bash
cp ../../../.env .env
cp ../../../.env.local .env.local
docker compose up -d
pnpm prisma migrate deploy
pnpm prisma db seed
```

If `pnpm dev` was started before the env files existed, **kill and restart it** —
Next caches the env at boot and will keep failing with `ECONNREFUSED` / SASL errors
even after the files appear.

## Landing work (git workflow in a worktree)

Sessions are started with `claude --worktree` (the `c` shell alias), so you begin
on an auto-named `worktree-<adjective-animal>` branch in
`.claude/worktrees/<name>/`. `main` is checked out in the **primary** worktree
(`/Users/petrusholm/pitva/klapi`) — this is normal. You **cannot** `git checkout
main` here and you must not `cd` into the primary worktree; that is expected, not
an error, so don't narrate it. Land work with this exact procedure instead:

```bash
# 1. Rename the throwaway branch to match the task, once the task is clear.
git branch -m feat/<slug>            # or fix/… chore/… — descriptive, not the random name

# 2. Commit your work on that branch.
git add -A && git commit -m "…"

# 3. Catch up to remote main, THEN replay onto it (main may have moved since the
#    worktree was created — skipping this makes the push in step 4 get rejected).
git fetch origin main
git rebase origin/main               # no-op if already current; stop & resolve if it conflicts

# 4. Push straight to main (this is the chosen workflow — no PR).
git push origin HEAD:main

# 5. Fast-forward the LOCAL main (checked out in the primary worktree) so it never
#    goes stale. ff-only + clean-tree guarded: if the primary has uncommitted
#    changes this aborts harmlessly — then just tell the user to run
#    `git pull --ff-only` there when convenient. NEVER force-update the ref.
git -C "$(git worktree list --porcelain | awk 'NR==1{print $2}')" pull --ff-only origin main
```

Only push when the user asks to land the work. Commit message footer convention is
in the global notes (`Co-Authored-By: Claude …`).

## Seeded credentials (local dev only)

- **Admin**: username `admin`, password `admin123`
- **Kiosk**: username `pitva`, password `pitva`
- **Regular users** (8 of them, e.g. `matti.virtanen`): password `password123`

## Router reminder

This project is **App Router** (no `pages/` directory). Route handlers live under
`app/api/*/route.ts` and use `NextResponse` + `Request`. Pages are server
components by default; components using hooks or browser APIs must start with
`'use client'`. The root layout is `app/layout.tsx`; client-side providers
(NextAuth `SessionProvider`, SWR, Cart/Dates contexts, `Toaster`, `TooltipProvider`,
`Layout`) are wrapped in `app/providers.tsx`.

Use `next/navigation` (not `next/router`); no `getServerSideProps` — fetch in
server components or route handlers.

## UI conventions

- All UI primitives are in `components/ui/` — owned source files (shadcn pattern).
  Edit freely; do not install shadcn as a dependency.
- **Compose pages from the primitives, never from raw Tailwind recipes.** Every
  panel, callout, page title and empty state has one component; hand-rolling
  another `rounded-lg border bg-card p-6 shadow-xs` is how the UI drifted apart
  before. Reach for:
  - `Card` / `CardTitle` / `CardHeader` (`card.tsx`) — the page panel.
    `variant="inset" | "muted"` are the nested blocks inside one; `as="section"`
    / `as="details"` / `as="li"` when the element matters.
  - `Alert` (`alert.tsx`) — tinted callout, `variant="info" | "warning" |
    "success" | "destructive"`. Don't invent new `border-x/NN bg-x/NN` pairs.
  - `PageHeader` (`page-header.tsx`) — the page `h1` row. Owns its own `mb-6`.
  - `EmptyState` (`empty-state.tsx`) — `variant="card"` for a whole empty list,
    `variant="inline"` for one muted line inside a panel.
  - `Checkbox` / `CheckboxIndicator` (`checkbox.tsx`) — never a raw
    `<input type="checkbox">`.
  - `InlineEdit` / `InlineEditShell` (`inline-edit.tsx`) — click-to-edit for one
    value shown in place, the way an admin edits a kama on `/item/[id]`. Both
    render as phrasing content, so they drop into an `h1` or a `<p>` unchanged;
    `InlineEditShell` wraps a picker (CreatableSelect) in the same affordance.
  - `ConfirmDialog` (`confirm-dialog.tsx`) — every "are you sure?". Cancel is
    always left and `outline`; the destructive action is always right. Plain
    `Dialog` is for forms, and their cancel button is `variant="outline"` too.
  - `SelectableRow`, `FilterChip`, `CountBadge` for tickable rows, pill toggles
    and the little number bubbles.
- **Phones are the default size, not an afterthought.** The primitives already
  carry the responsive step-down — `Card` padding is `p-4 sm:p-6`, `CardTitle`
  `text-lg sm:text-xl`, `PageHeader`'s h1 `text-2xl sm:text-3xl`, the layout's
  `main` `py-6 sm:py-10`, `DialogContent` `p-4 sm:p-6` with
  `max-h-[calc(100dvh-2rem)] overflow-y-auto` so a long dialog scrolls itself
  instead of running off both ends of a 390px screen. Compose from them and a
  page is mobile-correct for free; hand-rolling `p-6`/`text-3xl` re-introduces
  the "zoomed in" look. For dense metadata prefer a label/value row
  (`<dl>` with `text-sm sm:text-base`) over full sentences — see
  `app/loan/[id]/LoanView.tsx`.
- Design tokens are CSS variables in `styles/globals.css` with `.dark` overrides.
  Tailwind maps them via `bg-primary`, `text-muted-foreground`, etc. Nothing
  outside that file should hard-code a colour — the app bar has its own
  `--header` / `--header-foreground` pair rather than `text-white`.
- Dark mode is class-based via `next-themes` (`attribute="class"`).
- Toasts: `import { toast } from 'sonner'` — use `toast.success/error/warning`.
  The `Toaster` is already mounted in `app/providers.tsx`.
- Creatable/multi selects: use `CreatableSelect` from
  `components/ui/creatable-select.tsx` (react-select styled via the `classNames`
  API so it respects dark mode + tokens).
- Form labels/fields: use `Label` from `components/ui/label.tsx` and the small
  `Field` wrapper in `components/ui/field.tsx` for label + error + helper.
- Icons: `lucide-react` only. `react-icons` (the Chakra-era Fa*/Io*/Md*/Lu*
  imports) is gone — don't reintroduce it. Note lucide defaults to a 24px icon
  where react-icons used `1em`, so **always pass an explicit size class**
  (`h-4 w-4` in a default/`icon-sm` Button, `h-5 w-5` where the surrounding text
  is larger); `Button` does not normalize child SVG size. Prefer the current
  lucide names over deprecated aliases (`TriangleAlert`, not `AlertTriangle`).
- Color scale when picking a Badge/Button variant:
  - `default` = primary (blue)
  - `success` = green
  - `warning` = orange
  - `destructive` = red
  - `secondary` / `gray` = muted

## Scripts

- `pnpm dev` — Next dev + local SES mock on :8005
- `pnpm build` — `prisma migrate deploy && DISABLE_ERD=true prisma generate && next build`
- `pnpm type-check` — `tsc --noEmit` (native TS 7)
- `pnpm type-check:ts6` — same check through the TS 6 API (`tsc6`), the version
  eslint and the editor use — see the TypeScript note further down
- `pnpm lint` — ESLint (Next config)
- `pnpm test` — Vitest against a disposable Postgres (docker-compose)

**`build` regenerates the Prisma client on purpose — don't drop that step.**
Generation used to live only in `postinstall`, and Vercel skips `postinstall`
whenever it restores a cached `node_modules` (i.e. whenever the lockfile hasn't
changed). A schema-only change then built against a *stale* client and failed
with `'"@prisma/client"' has no exported member named 'X'` — green locally,
red on deploy. `DISABLE_ERD=true` keeps the ERD generator out of the deploy;
it's a docs artifact, regenerated locally with `pnpm erd`.

Because of that, **`pnpm type-check` and a local `next build` can both pass
against a client you generated by hand earlier.** To reproduce what CI does,
run the real `pnpm build`.

## Known gotchas

- `react-datepicker` ships only a light theme. We repaint it for dark mode with
  CSS overrides at the bottom of `styles/globals.css` (a block of `.dark
  .react-datepicker__*` rules using our design tokens). They're un-layered and
  `.dark`-scoped so they outrank the bundled `react-datepicker.css`. If a picker
  surface still looks light in dark mode, add the missing class there.
- `useItemImage` reads `resolvedTheme` from `next-themes`, which is undefined
  until mount — the hook handles SSR by defaulting to the light placeholder.
- **A kaman kuva always goes in a box; it never sizes itself.** The photo's
  dimensions aren't known until it has loaded, so a `max-h`/`max-w` `<img>`
  leaves the skeleton standing in for a box of the wrong size and the page
  jumps when the picture lands. Give the container the size (`aspect-5/3` for
  the big ones, a square `h-N w-N` for thumbnails) plus `overflow-hidden
  bg-muted`, and let the image fill it with `object-contain`/`object-cover`;
  the skeleton then fills the identical box. `components/ItemThumb.tsx` is the
  list/table thumbnail, `ItemCardShell` the card, and `components/ItemPhoto.tsx`
  the `/item/[id]` detail photo — reach for one of those before hand-rolling a
  fourth.
- The detail photo is the one box that doesn't keep a fixed ratio: `ItemPhoto`
  opens at the placeholder's 5:3 and then adopts the picture's own ratio from
  `onLoad` (clamped to 3:4…3:1), so a 4:3 phone snap fills it instead of sitting
  in a letterbox of grey. It is still a *box* — the skeleton and the empty state
  have the same footprint — it just stops guessing the shape once it knows it.
  `ItemPhoto` also owns the "Lisää kuva" empty state: any signed-in non-kiosk
  user may add a *missing* photo, and `item/uploadImage` enforces that (the kama
  must exist and have no picture yet); replacing one stays admin-only.
- Prefer `useItemImageState` over `useItemImage`: the plain hook answers with
  the "Ei kuvaa" placeholder while it is still probing, so every row flashes
  the placeholder before the real photo. The `…State` variant reports
  `status: 'loading'` so the box can pulse instead.
- The Chakra-era color helpers in `utils/loanHelpers.ts` return shadcn `Badge`
  variants now (`success`, `destructive`, `warning`, `default`, `secondary`,
  `gray`). Keep them returning those literals — the `BadgeVariant` type is
  exported from that file.

## Package versions held back

When running a dependency update sweep, leave these on their current major and
revisit deliberately:

- **@types/node**: track the runtime (currently Node 24 LTS — CI/deploy pin
  `node-version: 24`) — don't jump to `^25` until we're actually running Node 25.

**TypeScript is installed twice, on purpose.** `typescript-eslint` (8.65)
refuses to load against TS 7 (`typescript-eslint does not support TS 7.0`), and
`eslint-config-next` depends on it directly — so a plain `typescript@7` kills
`pnpm lint` even though `tsc --noEmit` is clean. The side-by-side layout keeps
both:

- `typescript` → `npm:@typescript/typescript6` — the TS 6 **JS API**, which is
  what `require('typescript')` resolves to for typescript-eslint, Next and your
  editor. Its binary is `tsc6` (`pnpm type-check:ts6`).
- `typescript-7` → `npm:typescript@7` — the real, native TS 7. It owns the plain
  `tsc` binary, so `pnpm type-check` is the fast native check.

Don't collapse these back into one `typescript` entry until typescript-eslint
ships TS ≥7.1 support (typescript-eslint/typescript-eslint#10940).

That alias is also why `next.config.ts` sets `experimental.useTypeScriptCli:
false`. Next 16.3 flipped that default to `true`, which makes it run
`typescript/bin/tsc` — a path `@typescript/typescript6` doesn't have (its binary
is `tsc6`). Next then declares typescript missing, prints "you don't have the
required package(s) installed" and tries to **auto-install** it on every `next
dev` / `next build`. `false` keeps it on the compiler API at
`typescript/lib/typescript.js`, which that package does ship. Revisit only if the
`typescript` entry stops being an alias.

ESLint is now on **10**. The flat config (`eslint.config.mjs`) pins
`settings.react.version` so `eslint-plugin-react` skips React auto-detection,
which still calls the legacy `context.getFilename()` API removed in ESLint 10.
Don't drop that setting.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
