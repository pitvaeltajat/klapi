# Kaho

Kaho is a web-based application to manage simple equipment reserve/loan/return transactions.

## Development

1. Run database with docker-compose:

```
docker-compose up -d
```

2. Run development server:

```
yarn dev
```

### Prisma

Kaho uses Prisma as ORM provider to connect Next.js to the database. Database schema is defined in `prisma/schema.prisma`. After making changes to the schema, remember to run `yarn prisma migrate dev`.

To generate dummy data, run `yarn prisma db seed`. The data is defined in `prisma/seed.ts`.

More information about Prisma can be found [here](https://www.prisma.io/docs/concepts/overview/what-is-prisma).

## Deployment

There will be a production-ready docker-compose file.
