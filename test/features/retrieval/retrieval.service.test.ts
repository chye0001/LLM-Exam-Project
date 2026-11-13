import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_RETRIEVAL_CONFIG } from "@/features/retrieval/retrieval.config";
import type { ChunkRecord } from "@/features/retrieval/retrieval.model";
import { RetrievalService } from "@/features/retrieval/retrieval.service";
import type { RetrievalServiceInterface } from "@/features/retrieval/retrieval.service.interface";
import { ModelUnavailableError } from "@/shared/errors";
import { EmbeddingClientFake } from "@test/features/retrieval/retrieval.embedding-client.fake";
import { RetrievalRepositoryFake } from "@test/features/retrieval/retrieval.repository.fake";

/** A stored chunk with a chosen vector. */
function aRecord(chunkId: string, vector: number[]): ChunkRecord {
  return {
    chunkId,
    sourceName: "notes.md",
    sourceTitle: "Notes",
    position: 1,
    headingPath: "Notes",
    text: `The text of ${chunkId}.`,
    contentHash: "hash",
    embeddingModel: "all-minilm",
    vector,
  };
}

describe("RetrievalService", () => {
  let embeddingClient: EmbeddingClientFake;
  let retrievalRepository: RetrievalRepositoryFake;

  beforeEach(() => {
    embeddingClient = new EmbeddingClientFake(2);
    retrievalRepository = new RetrievalRepositoryFake();
    // The topic points along the first axis, so a chunk's similarity is the
    // cosine of its angle to that axis.
    embeddingClient.setVector("cosine similarity", [1, 0]);
    retrievalRepository.seed([
      aRecord("same-direction", [1, 0]),
      aRecord("close", [0.8, 0.6]),
      aRecord("farther", [0.6, 0.8]),
      aRecord("unrelated", [0, 1]),
    ]);
  });

  function aRetrievalService(similarityThreshold = 0.5): RetrievalServiceInterface {
    return new RetrievalService(embeddingClient, retrievalRepository, { similarityThreshold });
  }

  it("embeds the topic with the embedding model", async () => {
    await aRetrievalService().retrieve("cosine similarity", 5);

    expect(embeddingClient.embeddedTexts).toEqual(["cosine similarity"]);
  });

  it("returns the chunks at or above the threshold, best match first", async () => {
    const chunks = await aRetrievalService(0.5).retrieve("cosine similarity", 5);

    expect(chunks.map(({ id, similarity }) => ({ id, similarity }))).toEqual([
      { id: "same-direction", similarity: 1 },
      { id: "close", similarity: expect.closeTo(0.8, 5) },
      { id: "farther", similarity: expect.closeTo(0.6, 5) },
    ]);
  });

  it("returns each chunk's text and source title", async () => {
    const [best] = await aRetrievalService().retrieve("cosine similarity", 1);

    expect(best).toEqual({
      id: "same-direction",
      text: "The text of same-direction.",
      sourceTitle: "Notes",
      similarity: 1,
    });
  });

  it("returns at most the limit", async () => {
    const chunks = await aRetrievalService(0.5).retrieve("cosine similarity", 2);

    expect(chunks.map((chunk) => chunk.id)).toEqual(["same-direction", "close"]);
  });

  it("uses the configured threshold", async () => {
    const chunks = await aRetrievalService(0.7).retrieve("cosine similarity", 5);

    expect(chunks.map((chunk) => chunk.id)).toEqual(["same-direction", "close"]);
  });

  it("returns an empty list when no chunk passes the threshold", async () => {
    embeddingClient.setVector("the French Revolution", [-1, 0]);

    const chunks = await aRetrievalService().retrieve("the French Revolution", 5);

    expect(chunks).toEqual([]);
  });

  it("returns an empty list when the knowledge base is empty", async () => {
    retrievalRepository = new RetrievalRepositoryFake();

    const chunks = await aRetrievalService().retrieve("cosine similarity", 5);

    expect(chunks).toEqual([]);
  });

  it("passes ModelUnavailableError on when the embedding model can't be reached", async () => {
    embeddingClient.makeUnavailable();

    await expect(aRetrievalService().retrieve("cosine similarity", 5)).rejects.toThrow(
      ModelUnavailableError,
    );
  });

  it("uses a threshold of 0.25 by default", () => {
    expect(DEFAULT_RETRIEVAL_CONFIG.similarityThreshold).toBe(0.25);
  });
});
