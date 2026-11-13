import type {
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
