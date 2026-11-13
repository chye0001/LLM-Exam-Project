import type {
  Chunk,
  ChunkRecord,
  SourceVersion,
} from "@/features/retrieval/retrieval.model";
import type { RetrievalRepositoryInterface } from "@/features/retrieval/retrieval.repository.interface";

/** A vector database in memory, with the stored chunks grouped by source. */
export class RetrievalRepositoryFake implements RetrievalRepositoryInterface {
  /** The vector length of the collection, or null before it exists. */
  dimensions: number | null = null;
  private readonly sources = new Map<string, ChunkRecord[]>();

  async ensureCollection(dimensions: number): Promise<void> {
    if (this.dimensions !== dimensions) {
      this.sources.clear();
      this.dimensions = dimensions;
    }
  }

  async isSourceCurrent(version: SourceVersion): Promise<boolean> {
    const [first] = this.sources.get(version.sourceName) ?? [];
    return (
      first !== undefined &&
      first.contentHash === version.contentHash &&
      first.embeddingModel === version.embeddingModel
    );
  }

  async replaceSource(sourceName: string, records: ChunkRecord[]): Promise<void> {
    this.sources.delete(sourceName);
    if (records.length > 0) {
      this.sources.set(sourceName, structuredClone(records));
    }
  }

  async listSourceNames(): Promise<string[]> {
    return [...this.sources.keys()];
  }

  async deleteSource(sourceName: string): Promise<void> {
    this.sources.delete(sourceName);
  }

  /** Ranks every stored chunk by cosine similarity, the way Qdrant does with cosine distance. */
  async search(vector: number[], limit: number, threshold: number): Promise<Chunk[]> {
    return this.storedChunks()
      .map((record) => ({
        id: record.chunkId,
        text: record.text,
        sourceTitle: record.sourceTitle,
        similarity: cosineSimilarity(vector, record.vector),
      }))
      .filter((chunk) => chunk.similarity >= threshold)
      .toSorted((first, second) => second.similarity - first.similarity)
      .slice(0, limit);
  }

  /** Every stored chunk, in source and then chunk order. */
  storedChunks(): ChunkRecord[] {
    return [...this.sources.values()].flat();
  }

  /** Stores chunks directly, as a run with another model or older content would have left them. */
  seed(records: ChunkRecord[]): void {
    for (const record of records) {
      this.sources.set(record.sourceName, [
        ...(this.sources.get(record.sourceName) ?? []),
        structuredClone(record),
      ]);
    }
  }
}

function cosineSimilarity(first: number[], second: number[]): number {
  let dot = 0;
  let firstLength = 0;
  let secondLength = 0;
  for (let index = 0; index < first.length; index++) {
    dot += first[index] * second[index];
    firstLength += first[index] ** 2;
    secondLength += second[index] ** 2;
  }
  return dot / (Math.sqrt(firstLength) * Math.sqrt(secondLength));
}
