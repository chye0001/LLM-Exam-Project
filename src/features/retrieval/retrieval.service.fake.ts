import type { Chunk } from "@/features/retrieval/retrieval.model";
import type { RetrievalServiceInterface } from "@/features/retrieval/retrieval.service.interface";

/** Returns the chunks a test gives it, whatever the topic. Without chunks it finds nothing. */
export class RetrievalServiceFake implements RetrievalServiceInterface {
  constructor(private readonly chunks: Chunk[] = []) {}

  async retrieve(_topic: string, limit: number): Promise<Chunk[]> {
    return structuredClone(this.chunks.slice(0, limit));
  }
}
