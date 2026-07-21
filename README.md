# Klapi

A web-based equipment loan management system for organizations. Browse inventory, request loans, and manage returns with automated email notifications.

## Features

- Browse equipment catalog with search and filtering
- Request loans with flexible date ranges
- Automated email notifications for loan reminders and updates
- Admin dashboard for managing inventory, locations, and loans
- Multi-user support with role-based permissions (Admin, User, Kiosk)
- Support for normal and temporary items
- Organized inventory with categories, locations, and boxes

## Workflows

### For Users

1. Browse available equipment in the catalog
2. Request a loan by selecting dates and items
3. Receive an email confirmation right away — requests are accepted
   automatically, there is no approval queue to wait for
4. Get automated reminders before pickup, and when a loan runs late
5. Return items and view loan history

### For Admins

1. Manage equipment catalog (add, edit, remove items)
2. Organize items by categories, locations, and boxes
3. Track all active and past loans; reject or cancel ones that shouldn't run
   (rejecting is after the fact — see the note on automatic acceptance above)
4. Handle returns, including items dropped into a return box
5. Manage user accounts and permissions

### For Kiosk Mode

- Self-service stations for quick item checkout and returns
- Simplified interface for public access points

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router) — React framework
- [React 19](https://react.dev) with TypeScript (strict)
- [Prisma 7](https://www.prisma.io) — Database ORM
- [PostgreSQL](https://www.postgresql.org) — Database
- [NextAuth.js](https://next-auth.js.org/) — Authentication
- [Tailwind CSS 4](https://tailwindcss.com) — Utility-first styling (CSS-first config)
- [shadcn/ui](https://ui.shadcn.com) — Component primitives (owned in `components/ui/`)
- [Radix UI](https://www.radix-ui.com) — Unstyled accessible primitives (Dialog, Switch, Tooltip, Label)
- [next-themes](https://github.com/pacocoursey/next-themes) — Dark mode (class-based)
- [sonner](https://sonner.emilkowal.ski/) — Toast notifications
- [react-select](https://react-select.com/) — Creatable/multi selects (shadcn-styled wrapper)
- [lucide-react](https://lucide.dev/) + [react-icons](https://react-icons.github.io/react-icons/) — Icons
- [SWR](https://swr.vercel.app/) — Client-side data fetching
- [AWS SES](https://aws.amazon.com/ses/) — Email notifications

## UI & theming

- All UI primitives live in `components/ui/` — they're source files you own and edit freely (shadcn pattern, not an installed library).
- Design tokens are CSS variables in `styles/globals.css`. Colors map to HSL vars (`--primary`, `--background`, `--card`, `--destructive`, `--success`, `--warning`, etc.) with `.dark` overrides.
- There is no `tailwind.config.ts` — Tailwind 4 is configured CSS-first. `styles/globals.css` does `@import 'tailwindcss'` and exposes the tokens through an `@theme` block, which is what makes `bg-primary`, `text-muted-foreground` etc. work. PostCSS wires it up via `@tailwindcss/postcss` in `postcss.config.js`. Dark mode is class-based — toggled by `next-themes` via the `class` attribute on `<html>`.
- Toasts use `sonner`. Import `toast` from `sonner` and call `toast.success(...)`, `toast.error(...)`, `toast.warning(...)`.
- Creatable selects use the `CreatableSelect` wrapper in `components/ui/creatable-select.tsx` — it styles `react-select`'s creatable via the `classNames` API so it respects dark mode and tokens without runtime theme juggling.

## Development

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

The defaults in `.env.example` match `docker-compose.yml`, so the database
works out of the box; the AWS and Google values are only needed for real email,
photo uploads, and Google sign-in.

3. Start local database:

```bash
docker-compose up -d
```

4. Run migrations and seed data:

```bash
pnpm prisma migrate dev
pnpm prisma db seed
```

5. Start development server (also boots the local SES mock automatically):

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Useful scripts

- `pnpm dev` — Next dev server + local SES mock
- `pnpm build` — `prisma migrate deploy` + `next build`
- `pnpm start` — Production server
- `pnpm type-check` — `tsc --noEmit`
- `pnpm lint` — ESLint (Next config)
- `pnpm test` — Vitest against a disposable Postgres (docker-compose)
- `pnpm test:ci` — Vitest without docker (expects `DATABASE_URL` already set)

## Local Email Testing

The dev script starts [aws-ses-v2-local](https://github.com/domdomegg/aws-ses-v2-local) in parallel. All emails are captured instead of being sent.

Open the email viewer at [http://localhost:8005](http://localhost:8005) to see sent emails.

To review the templates without triggering the flows that send them:

```bash
pnpm tsx scripts/preview-emails.ts
```

It renders every template with sample data — no app or database needed — to
`/tmp/klapi-emails/`, with an `index.html` linking them all.

## Database

Schema is defined in [prisma/schema.prisma](prisma/schema.prisma). After schema changes:

```bash
pnpm prisma migrate dev --name description_of_change
```

Generate test data:

```bash
pnpm prisma db seed
```

### Entity-relationship diagram

[ERD.pdf](ERD.pdf) is generated by `prisma-erd-generator`. The generator block
in [prisma/schema.prisma](prisma/schema.prisma) is commented out on purpose —
it launches puppeteer on every `prisma generate`, which is slow and pointless
for a schema that rarely changes. To refresh the diagram, uncomment the block,
run `pnpm prisma generate`, then comment it out again.

## Authentication

Supports Google OAuth and username/password authentication via NextAuth.js. Configure providers in the NextAuth API route.

**User Roles:**

- **Admin**: Full access to manage catalog, users, and loans
- **User**: Browse catalog, request loans, view own history
- **Kiosk**: Simplified interface for self-service stations

Admins can elevate a kiosk session to ADMIN temporarily via a 4-digit PIN (set in `/admin`). The elevated session auto-expires after 30 minutes.

## Hosting

### Production Deployment

Klapi is deployed automatically when a new commit lands on `main`.

### Environment Variables

See [.env.example](.env.example) for the full list with comments. The ones a
deployment cannot run without:

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Public URL of your deployment
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `KLAPI_AWS_REGION`, `KLAPI_AWS_ACCESS_KEY_ID`, `KLAPI_AWS_SECRET_ACCESS_KEY`: AWS credentials for SES and S3 (prefixed because Vercel reserves `AWS_*`)
- `AWS_SES_FROM_EMAIL`: Sender address for all notification email
- `AWS_BUCKET_NAME`, `NEXT_PUBLIC_AWS_ITEM_PHOTOS_URL`: S3 bucket for item photos, and its public URL
- `CRON_SECRET`: Shared secret the `/api/cron/*` routes require as `Authorization: Bearer …`. Without it the nightly reminder/overdue/auto-start jobs return 401 and silently stop working.

## Project layout

```
app/                App Router — pages (server components by default) and
app/api/            route handlers (`route.ts`), including the cron jobs
components/         App-specific React components
components/ui/      shadcn/ui primitives (owned source, edit freely)
contexts/           React contexts (cart, dates)
hooks/              Custom hooks
lib/                `cn()` className merger and the NextAuth config
styles/globals.css  Tailwind import + `@theme` design tokens (light/dark)
types/              Shared types and the next-auth session augmentation
utils/              Server and shared helpers (Prisma client, loan helpers, etc.)
prisma/             Schema, migrations, seed
scripts/            Operator scripts run with `tsx` (kiosk user, email previews)
__tests__/          Vitest suites — mostly API integration tests
```
