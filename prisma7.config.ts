import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src/shared/db/schema.prisma",
  migrations: {
    path: "src/shared/db/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
