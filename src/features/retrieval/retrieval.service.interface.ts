import type { Chunk } from "@/features/retrieval/retrieval.model";

/**
 * Finds the chunks in the knowledge base that match a topic. This is the one
 * interface the group's retriever implements. To switch from the stub, change
 * the line in `src/shared/dependency-container.ts` that creates it.
 */
export interface RetrievalServiceInterface {
  /**
   * Returns at most `limit` chunks that match the topic, best match first.
   *
   * Each chunk has its id, its text, its source's title and its similarity,
   * where higher means a closer match.
   *
   * Returns an empty list when no chunk passes the similarity threshold. The
   * threshold lives entirely in the implementation, and the app refuses to
   * write a quiz when the list is empty.
   */
  retrieve(topic: string, limit: number): Promise<Chunk[]>;
}
