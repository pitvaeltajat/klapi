# Klapi — agent notes

Equipment loan management app. Next.js 16 **App Router**, React 19, TypeScript
strict, Prisma 7, PostgreSQL, NextAuth v4, Tailwind v4 + shadcn/ui, sonner for
toasts, next-themes for dark mode, SWR for data fetching. UI is in Finnish.

See `README.md` for the product overview, tech stack, and project layout.

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
- Design tokens are CSS variables in `styles/globals.css` with `.dark` overrides.
  Tailwind maps them via `bg-primary`, `text-muted-foreground`, etc.
- Dark mode is class-based via `next-themes` (`attribute="class"`).
- Toasts: `import { toast } from 'sonner'` — use `toast.success/error/warning`.
  The `Toaster` is already mounted in `app/providers.tsx`.
- Creatable/multi selects: use `CreatableSelect` from
  `components/ui/creatable-select.tsx` (react-select styled via the `classNames`
  API so it respects dark mode + tokens).
- Form labels/fields: use `Label` from `components/ui/label.tsx` and the small
  `Field` wrapper in `components/ui/field.tsx` for label + error + helper.
- Icons: `lucide-react` preferred; `react-icons` (Fa*, Io*, Lu*) is also in use
  from the Chakra era — keep existing usages, don't churn them.
- Color scale when picking a Badge/Button variant:
  - `default` = primary (blue)
  - `success` = green
  - `warning` = orange
  - `destructive` = red
  - `secondary` / `gray` = muted

## Scripts

- `pnpm dev` — Next dev + local SES mock on :8005
- `pnpm build` — `prisma migrate deploy && next build`
- `pnpm type-check` — `tsc --noEmit`
- `pnpm lint` — ESLint (Next config)
- `pnpm test` — Vitest against a disposable Postgres (docker-compose)

## Known gotchas

- `react-datepicker` has no dark-mode styling — it retains its default light
  calendar appearance even when the app is in dark mode. Fix with CSS overrides
  in `globals.css` if needed.
- `useItemImage` reads `resolvedTheme` from `next-themes`, which is undefined
  until mount — the hook handles SSR by defaulting to the light placeholder.
- The Chakra-era color helpers in `utils/loanHelpers.ts` return shadcn `Badge`
  variants now (`success`, `destructive`, `warning`, `default`, `secondary`,
  `gray`). Keep them returning those literals — the `BadgeVariant` type is
  exported from that file.

## Package versions held back

When running a dependency update sweep, leave these on their current major and
revisit deliberately:

- **eslint 9 → 10**: held back. Major bump and the Next 16 ecosystem
  (`eslint-config-next`, `typescript-eslint`) hasn't fully caught up — wait for
  Next/typescript-eslint to publish v10-ready releases before bumping.
- **@types/node**: track the runtime (currently Node 24 LTS) — don't jump to
  `^25` until we're actually running Node 25.
