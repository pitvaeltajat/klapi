# Local-dev container. Production deploys go through Vercel (see vercel.json),
# so this image deliberately runs `pnpm dev` rather than a standalone build.
#
#   docker build -t klapi .
#   docker run --rm -p 3000:3000 -p 8005:8005 --env-file .env klapi
#
# Point DATABASE_URL at a reachable Postgres — `host.docker.internal:5432` for
# the one in docker-compose.yml.
FROM node:24-alpine

# Prisma's query engine links against OpenSSL, which node:*-alpine doesn't ship.
RUN apk add --no-cache openssl

RUN corepack enable

WORKDIR /app

# Install dependencies first so editing app code doesn't bust this layer.
# --ignore-scripts because the postinstall hook is `prisma generate`, and the
# schema isn't in the image yet at this point.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . ./
RUN pnpm prisma generate

# 3000 = Next, 8005 = the aws-ses-v2-local mock that `pnpm dev` starts alongside.
EXPOSE 3000 8005

CMD ["pnpm", "dev"]
