/**
 * Where the SQLite file lives. DATABASE_URL overrides the default, which is the
 * gitignored data folder in this folder. A relative path starts at the folder
 * the app runs from, which is the project root.
 */
export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || "file:./src/shared/db/data/quiz.db";
}
