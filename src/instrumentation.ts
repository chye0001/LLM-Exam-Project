// Ingests the knowledge base when the server starts, so quizzes can draw on
// the sources in `knowledge-base/` without anyone running `npm run ingest`.
// Next.js calls `register` once per server, waits for it before handling
// requests and skips it during `next build`.

export async function register() {
  // The dependency container only runs on Node.js, not on the edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { ingestionService } = await import("@/shared/dependency-container");
  const { summarizeIngestion } = await import("@/features/ingestion/ingestion.service");
  const { AppError } = await import("@/shared/errors");

  try {
    console.log(summarizeIngestion(await ingestionService.ingest()));
  } catch (error) {
    // The app still starts. Retrieval reports the problem when a student asks for a quiz.
    const reason = error instanceof AppError ? error.message : error;
    console.warn("Couldn't ingest the knowledge base at startup:", reason);
  }
}
