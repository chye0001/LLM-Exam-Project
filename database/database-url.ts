/**
 * Where the SQLite file lives. DATABASE_URL overrides the default, which is the
 * gitignored `database/data/` folder. A relative path starts at the folder the
 * app runs from, which is the project root.
 */
export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || "file:./database/data/quiz.db";
}
