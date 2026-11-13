// Loads the markdown sources in the knowledge base folder into Qdrant and
// prints what it did. Run it with `npm run ingest`. It needs Qdrant and Ollama
// with the embedding model. The dependency container imports `server-only`, so
// the script runs with the `react-server` export condition.

import type { IngestionReport } from "@/features/ingestion/ingestion.model";
import { summarizeIngestion } from "@/features/ingestion/ingestion.service";
import { ingestionService } from "@/shared/dependency-container";
import { AppError } from "@/shared/errors";

const REPORT_LINES: [keyof Omit<IngestionReport, "chunksStored">, string][] = [
  ["added", "Added"],
  ["updated", "Updated"],
  ["unchanged", "Unchanged"],
  ["removed", "Removed"],
  ["empty", "Empty, so not stored"],
];

async function main() {
  const report = await ingestionService.ingest();

  console.log(summarizeIngestion(report));
  for (const [key, label] of REPORT_LINES) {
    if (report[key].length > 0) {
      console.log(`  ${label}: ${report[key].join(", ")}`);
    }
  }
}

main().catch((error: unknown) => {
  // An expected error, such as Qdrant not running, needs only its message.
  console.error(error instanceof AppError ? `Ingestion failed: ${error.message}` : error);
  process.exitCode = 1;
});
