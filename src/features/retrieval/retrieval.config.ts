export type RetrievalConfig = {
  /** The Ollama model that embeds chunks and topics. */
  embeddingModel: string;
  ollamaBaseUrl: string;
  qdrantUrl: string;
  /** The Qdrant collection that holds the chunks and their vectors. */
  collectionName: string;
  /** The folder ingestion reads sources from, relative to the project root. */
  knowledgeBaseDir: string;
  /**
   * The longest chunk, in characters. `all-minilm` reads at most 256 word
   * pieces, and 800 characters is about 200 of them, which leaves room for
   * the heading path in front of the chunk.
   */
  maxChunkCharacters: number;
  /** How much of the chunk before, in whole sentences, a split section's next chunk repeats. */
  overlapCharacters: number;
  /**
   * The lowest cosine similarity a chunk needs to be retrieved. It depends on
   * the embedding model, so a new model needs a new threshold.
   */
  similarityThreshold: number;
  /** How many texts go to Ollama in one embedding call. */
  embeddingBatchSize: number;
  /** How long one embedding call may take before the app gives up on it. */
  embeddingTimeoutMs: number;
};

/** Every retrieval default, in one place. */
export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  embeddingModel: "all-minilm",
  ollamaBaseUrl: "http://localhost:11434",
  qdrantUrl: "http://localhost:6333",
  collectionName: "chunks",
  knowledgeBaseDir: "knowledge-base",
  maxChunkCharacters: 800,
  overlapCharacters: 120,
  // A first measurement with the sample sources put a paraphrased topic at
  // 0.31 and unrelated topics below 0.17. The group calibrates it with more topics.
  similarityThreshold: 0.25,
  embeddingBatchSize: 32,
  embeddingTimeoutMs: 60 * 1000,
};

/**
 * The defaults, with the embedding model, the Ollama URL, the Qdrant URL and
 * the knowledge base folder taken from `OLLAMA_EMBEDDING_MODEL`,
 * `OLLAMA_BASE_URL`, `QDRANT_URL` and `KNOWLEDGE_BASE_DIR` when they are set.
 */
export function loadRetrievalConfig(
  env: Record<string, string | undefined> = process.env,
): RetrievalConfig {
  return {
    ...DEFAULT_RETRIEVAL_CONFIG,
    embeddingModel:
      env.OLLAMA_EMBEDDING_MODEL || DEFAULT_RETRIEVAL_CONFIG.embeddingModel,
    ollamaBaseUrl: env.OLLAMA_BASE_URL || DEFAULT_RETRIEVAL_CONFIG.ollamaBaseUrl,
    qdrantUrl: env.QDRANT_URL || DEFAULT_RETRIEVAL_CONFIG.qdrantUrl,
    knowledgeBaseDir:
      env.KNOWLEDGE_BASE_DIR || DEFAULT_RETRIEVAL_CONFIG.knowledgeBaseDir,
  };
}
