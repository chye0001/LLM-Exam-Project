import { randomUUID } from "node:crypto";

import { QdrantClient, QdrantClientTimeoutError } from "@qdrant/js-client-rest";

import type { RetrievalConfig } from "@/features/retrieval/retrieval.config";
import {
  chunkPayloadSchema,
  type Chunk,
  type ChunkRecord,
  type SourceVersion,
} from "@/features/retrieval/retrieval.model";
import type { RetrievalRepositoryInterface } from "@/features/retrieval/retrieval.repository.interface";
import { KnowledgeBaseUnavailableError } from "@/shared/errors";

/** How long one call to Qdrant may take before the app gives up on it. */
const QDRANT_TIMEOUT_MS = 30 * 1000;

/** How many points one page of a scroll through the collection returns. */
const SCROLL_PAGE_SIZE = 256;

/**
 * Stores the chunks in Qdrant, one point per chunk, with cosine distance.
 * This is the only file that imports the Qdrant client.
 */
export class RetrievalRepository implements RetrievalRepositoryInterface {
  private readonly client: QdrantClient;
  private readonly collectionName: string;

  constructor(config: Pick<RetrievalConfig, "qdrantUrl" | "collectionName">) {
    this.client = new QdrantClient({
      url: config.qdrantUrl,
      timeout: QDRANT_TIMEOUT_MS,
      // Skips the version check the client otherwise runs when it's created,
      // so creating the repository never calls Qdrant.
      checkCompatibility: false,
    });
    this.collectionName = config.collectionName;
  }

  async ensureCollection(dimensions: number): Promise<void> {
    await this.call(async () => {
      const { exists } = await this.client.collectionExists(this.collectionName);
      if (exists) {
        if ((await this.vectorSize()) === dimensions) {
          return;
        }
        await this.client.deleteCollection(this.collectionName);
      }
      await this.client.createCollection(this.collectionName, {
        vectors: { size: dimensions, distance: "Cosine" },
      });
    });
  }

  async isSourceCurrent(version: SourceVersion): Promise<boolean> {
    return this.call(async () => {
      const { count } = await this.client.count(this.collectionName, {
        filter: {
          must: [
            { key: "sourceName", match: { value: version.sourceName } },
            { key: "contentHash", match: { value: version.contentHash } },
            { key: "embeddingModel", match: { value: version.embeddingModel } },
          ],
        },
        exact: true,
      });
      return count > 0;
    });
  }

  async replaceSource(sourceName: string, records: ChunkRecord[]): Promise<void> {
    await this.call(async () => {
      await this.deleteSourcePoints(sourceName);
      if (records.length === 0) {
        return;
      }
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: records.map(({ vector, ...payload }) => ({
          // Qdrant only takes UUIDs and integers as ids, so the chunk id lives in the payload.
          id: randomUUID(),
          vector,
          payload,
        })),
      });
    });
  }

  async listSourceNames(): Promise<string[]> {
    return this.call(async () => {
      const names = new Set<string>();
      let offset: string | number | undefined;
      do {
        const page = await this.client.scroll(this.collectionName, {
          limit: SCROLL_PAGE_SIZE,
          offset,
          with_payload: ["sourceName"],
          with_vector: false,
        });
        for (const point of page.points) {
          const sourceName = point.payload?.sourceName;
          if (typeof sourceName === "string") {
            names.add(sourceName);
          }
        }
        offset = toPointId(page.next_page_offset);
      } while (offset !== undefined);
      return [...names];
    });
  }

  async deleteSource(sourceName: string): Promise<void> {
    await this.call(() => this.deleteSourcePoints(sourceName));
  }

  async search(vector: number[], limit: number, threshold: number): Promise<Chunk[]> {
    return this.call(async () => {
      let points;
      try {
        ({ points } = await this.client.query(this.collectionName, {
          query: vector,
          limit,
          // Qdrant drops points below this cosine similarity itself.
          score_threshold: threshold,
          with_payload: true,
          with_vector: false,
        }));
      } catch (error) {
        // Qdrant answers 404 until the first ingestion creates the collection.
        if (isNotFoundError(error)) {
          return [];
        }
        throw error;
      }

      return points.map((point) => {
        const payload = chunkPayloadSchema.parse(point.payload);
        return {
          id: payload.chunkId,
          text: payload.text,
          sourceTitle: payload.sourceTitle,
          similarity: point.score,
        };
      });
    });
  }

  private async deleteSourcePoints(sourceName: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: { must: [{ key: "sourceName", match: { value: sourceName } }] },
    });
  }

  /** The vector length of the existing collection. */
  private async vectorSize(): Promise<number | undefined> {
    const collection = await this.client.getCollection(this.collectionName);
    const vectors = collection.config.params.vectors;
    return vectors && "size" in vectors && typeof vectors.size === "number"
      ? vectors.size
      : undefined;
  }

  /**
   * Runs a call to Qdrant and turns a failed connection or a timeout into
   * `KnowledgeBaseUnavailableError`. Other errors, such as a rejected
   * request, pass through unchanged.
   */
  private async call<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (isConnectionError(error)) {
        throw new KnowledgeBaseUnavailableError();
      }
      throw error;
    }
  }
}

function toPointId(offset: unknown): string | number | undefined {
  return typeof offset === "string" || typeof offset === "number" ? offset : undefined;
}

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  // fetch throws a TypeError when nothing answers at the URL. The client
  // throws QdrantClientTimeoutError when a call takes too long, and fetch an
  // error named TimeoutError or AbortError.
  return (
    error instanceof TypeError ||
    error instanceof QdrantClientTimeoutError ||
    error.name === "TimeoutError" ||
    error.name === "AbortError"
  );
}

/** The client throws an error with the HTTP status for an answer that isn't OK. */
function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "status" in error &&
    error.status === 404
  );
}
