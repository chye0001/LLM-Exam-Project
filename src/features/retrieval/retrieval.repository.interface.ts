import type {
  Chunk,
  ChunkRecord,
  SourceVersion,
} from "@/features/retrieval/retrieval.model";

/**
 * The vector database: the stored chunks of every source, with their vectors.
 * Every method throws `KnowledgeBaseUnavailableError` when the database
 * doesn't answer.
 */
export interface RetrievalRepositoryInterface {
  /**
   * Makes sure the collection exists and holds vectors of this length. A
   * collection with another vector length is deleted and created again,
   * which removes every stored chunk.
   */
  ensureCollection(dimensions: number): Promise<void>;

  /** Whether the stored chunks of the source came from this content and this model. */
  isSourceCurrent(version: SourceVersion): Promise<boolean>;

  /** Deletes the source's stored chunks and stores these instead. */
  replaceSource(sourceName: string, records: ChunkRecord[]): Promise<void>;

  /** The names of every source with stored chunks. */
  listSourceNames(): Promise<string[]>;

  /** Deletes the source's stored chunks. */
  deleteSource(sourceName: string): Promise<void>;

  /**
   * Returns at most `limit` chunks whose cosine similarity to the vector is
   * at least `threshold`, best match first. Returns an empty list when nothing
   * passes or nothing has been stored yet.
   */
  search(vector: number[], limit: number, threshold: number): Promise<Chunk[]>;
}
