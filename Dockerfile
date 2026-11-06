# Builds the standalone Next.js app. On start the container applies the Prisma
# migrations and then serves the app on port 3000.

FROM node:24.22.1-alpine AS base
# Prisma's schema engine needs OpenSSL to apply migrations.
RUN apk add --no-cache openssl
WORKDIR /app

# Installs the dependencies. The postinstall script generates the Prisma client,
# so it needs the Prisma config and the schema.
FROM base AS deps
COPY package.json package-lock.json prisma7.config.ts ./
COPY src/shared/db/schema.prisma src/shared/db/database-url.ts ./src/shared/db/
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/src/shared/db/generated ./src/shared/db/generated
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
  HOSTNAME=0.0.0.0
# The full node_modules holds the Prisma CLI that applies the migrations. The
# standalone app is copied on top of it.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/prisma7.config.ts ./
# The schema, the migrations and the empty data folder the volume mounts on.
COPY --from=build --chown=node:node /app/src/shared/db ./src/shared/db
USER node
EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node server.js"]
