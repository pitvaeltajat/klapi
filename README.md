# Klapi

A web-based equipment loan management system for organizations. Browse inventory, request loans, and manage returns with automated email notifications.

## Features

- Browse equipment catalog with search and filtering
- Request loans with flexible date ranges
- Automated email notifications for loan reminders and updates
- Admin dashboard for managing inventory, locations, and loan approvals
- Multi-user support with role-based permissions (Admin, User, Kiosk)
- Support for normal and temporary items
- Organized inventory with categories, locations, and boxes

## Workflows

### For Users

1. Browse available equipment in the catalog
2. Request a loan by selecting dates and items
3. Receive email confirmation when admin approves
4. Get automated weekly reminders for active loans
5. Return items and view loan history

### For Admins

1. Manage equipment catalog (add, edit, remove items)
2. Organize items by categories, locations, and boxes
3. Review and approve/reject loan requests
4. Track all active and past loans
5. Manage user accounts and permissions

### For Kiosk Mode

- Self-service stations for quick item checkout and returns
- Simplified interface for public access points

## Tech Stack

- [Next.js 16](https://nextjs.org) (Pages Router) — React framework
- [React 18](https://react.dev) with TypeScript (strict)
- [Prisma 7](https://www.prisma.io) — Database ORM
- [PostgreSQL](https://www.postgresql.org) — Database
- [NextAuth.js](https://next-auth.js.org/) — Authentication
- [Tailwind CSS 3](https://tailwindcss.com) — Utility-first styling
- [shadcn/ui](https://ui.shadcn.com) — Component primitives (owned in `components/ui/`)
- [Radix UI](https://www.radix-ui.com) — Unstyled accessible primitives (Dialog, Dropdown, Switch, Tooltip, Label)
- [next-themes](https://github.com/pacocoursey/next-themes) — Dark mode (class-based)
- [sonner](https://sonner.emilkowal.ski/) — Toast notifications
- [react-select](https://react-select.com/) — Creatable/multi selects (shadcn-styled wrapper)
- [lucide-react](https://lucide.dev/) + [react-icons](https://react-icons.github.io/react-icons/) — Icons
- [SWR](https://swr.vercel.app/) — Client-side data fetching
- [AWS SES](https://aws.amazon.com/ses/) — Email notifications

## UI & theming

- All UI primitives live in `components/ui/` — they're source files you own and edit freely (shadcn pattern, not an installed library).
- Design tokens are CSS variables in `styles/globals.css`. Colors map to HSL vars (`--primary`, `--background`, `--card`, `--destructive`, `--success`, `--warning`, etc.) with `.dark` overrides.
- Tailwind config in `tailwind.config.ts` exposes those tokens via `bg-primary`, `text-muted-foreground`, etc. Dark mode is class-based — toggled by `next-themes` via the `class` attribute on `<html>`.
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

## Database

Schema is defined in [prisma/schema.prisma](prisma/schema.prisma). After schema changes:

```bash
pnpm prisma migrate dev --name description_of_change
```

Generate test data:

```bash
pnpm prisma db seed
```

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

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Public URL of your deployment
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS SES for emails
- `EMAIL_FROM`: Sender email address

## Project layout

```
pages/              Next.js Pages Router — routes, API handlers, SSR via getServerSideProps
components/         App-specific React components
components/ui/      shadcn/ui primitives (owned source, edit freely)
contexts/           React contexts (cart, dates)
hooks/              Custom hooks
lib/utils.ts        `cn()` className merger
styles/globals.css  Tailwind base + CSS token variables (light/dark)
tailwind.config.ts  Tailwind config (content paths, token mapping, dark mode)
utils/              Server and shared helpers (Prisma client, loan helpers, etc.)
prisma/             Schema, migrations, seed
```
