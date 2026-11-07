import "dotenv/config";
import { defineConfig } from "prisma/config";

import { getDatabaseUrl } from "./database/database-url";

export default defineConfig({
  schema: "database/schema.prisma",
  migrations: {
    path: "database/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
