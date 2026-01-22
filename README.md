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

- [Next.js 15](https://nextjs.org) - React framework
- [Prisma](https://www.prisma.io) - Database ORM
- [PostgreSQL](https://www.postgresql.org) - Database
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Chakra UI](https://chakra-ui.com) - Component library
- [AWS SES](https://aws.amazon.com/ses/) - Email notifications

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

5. Start development server:

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Local Email Testing

To test emails locally without sending real emails, use [aws-ses-v2-local](https://github.com/domdomegg/aws-ses-v2-local). The email server is started automatically on dev server startup.

Open the email viewer at [http://localhost:8005](http://localhost:8005) to see sent emails.

All emails sent by the application will be captured and displayed in the web interface instead of being sent to real recipients.

## Database

Schema is defined in [prisma/schema.prisma](prisma/schema.prisma). After schema changes, run:

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

## Hosting

### Production Deployment

Klapi is deployed automatically when a new commit to main branch is made.

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Public URL of your deployment
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS SES for emails
- `EMAIL_FROM`: Sender email address
