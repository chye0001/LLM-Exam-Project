import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { getDatabaseUrl } from "@/shared/db/database-url";
import { PrismaClient } from "@/shared/db/generated/client";

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: getDatabaseUrl() }),
  });
}

// The dev server re-runs modules when files change. Keeping the client on
// globalThis stops each reload from opening another database connection.
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
