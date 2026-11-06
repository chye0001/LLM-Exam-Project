import "dotenv/config";
import { defineConfig } from "prisma/config";

import { getDatabaseUrl } from "./src/shared/db/database-url";

export default defineConfig({
  schema: "src/shared/db/schema.prisma",
  migrations: {
    path: "src/shared/db/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
