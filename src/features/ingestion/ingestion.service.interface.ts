import type { IngestionReport } from "@/features/ingestion/ingestion.model";

/** Loads the knowledge base folder into the vector database. */
export interface IngestionServiceInterface {
  /**
   * Chunks, embeds and stores every source that is new or changed, skips the
   * ones whose stored chunks are current and removes the ones whose file is
   * gone. Returns what it did.
   *
   * Throws `KnowledgeBaseUnavailableError` when the vector database doesn't
   * answer, and `ModelUnavailableError` or `ModelTimeoutError` when the
   * embedding model fails.
   */
  ingest(): Promise<IngestionReport>;
}
