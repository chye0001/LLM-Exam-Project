import type { RetrievalConfig } from "@/features/retrieval/retrieval.config";
import type { EmbeddingClientInterface } from "@/features/retrieval/retrieval.embedding-client.interface";
import type { Chunk } from "@/features/retrieval/retrieval.model";
import type { RetrievalRepositoryInterface } from "@/features/retrieval/retrieval.repository.interface";
import type { RetrievalServiceInterface } from "@/features/retrieval/retrieval.service.interface";

/**
 * Finds the chunks whose meaning is closest to the topic. It embeds the topic
 * with the same model ingestion used for the chunks and asks the vector
 * database for the chunks with the highest cosine similarity, keeping only
 * those at or above the configured threshold.
 *
 * Throws `ModelUnavailableError` or `ModelTimeoutError` when the embedding
 * model fails, and `KnowledgeBaseUnavailableError` when the vector database
 * doesn't answer.
 */
export class RetrievalService implements RetrievalServiceInterface {
  constructor(
    private readonly embeddingClient: EmbeddingClientInterface,
    private readonly retrievalRepository: RetrievalRepositoryInterface,
    private readonly config: Pick<RetrievalConfig, "similarityThreshold">,
  ) {}

  async retrieve(topic: string, limit: number): Promise<Chunk[]> {
    const [topicVector] = await this.embeddingClient.embed([topic]);
    return this.retrievalRepository.search(
      topicVector,
      limit,
      this.config.similarityThreshold,
    );
  }
}
