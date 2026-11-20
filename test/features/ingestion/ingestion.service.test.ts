import { beforeEach, describe, expect, it } from "vitest";

import { readSource } from "@/features/ingestion/ingestion.markdown";
import {
  IngestionService,
  summarizeIngestion,
} from "@/features/ingestion/ingestion.service";
import type { IngestionServiceInterface } from "@/features/ingestion/ingestion.service.interface";
import {
  DEFAULT_RETRIEVAL_CONFIG,
  type RetrievalConfig,
} from "@/features/retrieval/retrieval.config";
import { ModelUnavailableError } from "@/shared/errors";
import { SourceRepositoryFake } from "@test/features/ingestion/ingestion.repository.fake";
import { EmbeddingClientFake } from "@test/features/retrieval/retrieval.embedding-client.fake";
import { RetrievalRepositoryFake } from "@test/features/retrieval/retrieval.repository.fake";

const EMBEDDINGS = "# Embeddings\n\nAn embedding is a vector.\n\n## Similarity\n\nCosine similarity compares two vectors.";
const CHUNKING = "# Chunking\n\nChunks are pieces of a source.";

describe("IngestionService", () => {
  let sourceRepository: SourceRepositoryFake;
  let embeddingClient: EmbeddingClientFake;
  let retrievalRepository: RetrievalRepositoryFake;

  beforeEach(() => {
    sourceRepository = new SourceRepositoryFake();
    embeddingClient = new EmbeddingClientFake(3);
    retrievalRepository = new RetrievalRepositoryFake();
  });

  function anIngestionService(
    config: RetrievalConfig = DEFAULT_RETRIEVAL_CONFIG,
  ): IngestionServiceInterface {
    return new IngestionService(sourceRepository, embeddingClient, retrievalRepository, config);
  }

  /** The texts the embedding model read, without the probe that sizes the collection. */
  function embeddedChunkTexts(): string[] {
    return embeddingClient.embeddedTexts.filter((text) => text.includes("\n\n"));
  }

  it("creates the collection with the length of the model's vectors", async () => {
    embeddingClient = new EmbeddingClientFake(384);

    await anIngestionService().ingest();

    expect(retrievalRepository.dimensions).toBe(384);
  });

  it("chunks, embeds and stores a new source", async () => {
    sourceRepository.writeFile("embeddings.md", EMBEDDINGS);

    const report = await anIngestionService().ingest();

    expect(report).toEqual({
      added: ["embeddings.md"],
      updated: [],
      unchanged: [],
      removed: [],
      empty: [],
      chunksStored: 2,
    });
    // toMatchObject ignores the vectors, which the next test checks.
    expect(retrievalRepository.storedChunks()).toMatchObject([
      {
        chunkId: "embeddings-1",
        sourceName: "embeddings.md",
        sourceTitle: "Embeddings",
        position: 1,
        headingPath: "Embeddings",
        text: "An embedding is a vector.",
        contentHash: readSource({ name: "embeddings.md", content: EMBEDDINGS }).contentHash,
        embeddingModel: "all-minilm",
      },
      {
        chunkId: "embeddings-2",
        sourceName: "embeddings.md",
        sourceTitle: "Embeddings",
        position: 2,
        headingPath: "Embeddings > Similarity",
        text: "Cosine similarity compares two vectors.",
        contentHash: readSource({ name: "embeddings.md", content: EMBEDDINGS }).contentHash,
        embeddingModel: "all-minilm",
      },
    ]);
  });

  it("embeds the heading path with the text and stores the vector of that", async () => {
    sourceRepository.writeFile("embeddings.md", EMBEDDINGS);

    await anIngestionService().ingest();

    const similarityText = "Embeddings > Similarity\n\nCosine similarity compares two vectors.";
    expect(embeddedChunkTexts()).toContain(similarityText);
    expect(retrievalRepository.storedChunks()[1].vector).toEqual(
      embeddingClient.vectorFor(similarityText),
    );
  });

  it("skips a source that hasn't changed since the last run", async () => {
    sourceRepository.writeFile("embeddings.md", EMBEDDINGS);
    const ingestionService = anIngestionService();
    await ingestionService.ingest();
    const embeddedBefore = embeddedChunkTexts().length;

    const report = await ingestionService.ingest();

    expect(report.unchanged).toEqual(["embeddings.md"]);
    expect(report.added).toEqual([]);
    expect(report.chunksStored).toBe(0);
    expect(embeddedChunkTexts()).toHaveLength(embeddedBefore);
    expect(retrievalRepository.storedChunks()).toHaveLength(2);
  });

  it("replaces the chunks of an edited source and leaves the others alone", async () => {
    sourceRepository.writeFile("embeddings.md", EMBEDDINGS);
    sourceRepository.writeFile("chunking.md", CHUNKING);
    const ingestionService = anIngestionService();
    await ingestionService.ingest();

    sourceRepository.writeFile("chunking.md", "# Chunking\n\nChunks overlap a little.");
    const report = await ingestionService.ingest();

    expect(report.updated).toEqual(["chunking.md"]);
    expect(report.unchanged).toEqual(["embeddings.md"]);
    expect(report.chunksStored).toBe(1);
    expect(retrievalRepository.storedChunks().map((chunk) => chunk.text)).toEqual([
      "An embedding is a vector.",
      "Cosine similarity compares two vectors.",
      "Chunks overlap a little.",
    ]);
  });

  it("removes the chunks of a source whose file is gone", async () => {
    sourceRepository.writeFile("embeddings.md", EMBEDDINGS);
    sourceRepository.writeFile("chunking.md", CHUNKING);
    const ingestionService = anIngestionService();
    await ingestionService.ingest();

    sourceRepository.deleteFile("embeddings.md");
    const report = await ingestionService.ingest();

    expect(report.removed).toEqual(["embeddings.md"]);
    expect(await retrievalRepository.listSourceNames()).toEqual(["chunking.md"]);
  });

  it("embeds every source again when the embedding model changes", async () => {
    sourceRepository.writeFile("embeddings.md", EMBEDDINGS);
    await anIngestionService().ingest();

    const report = await anIngestionService({
      ...DEFAULT_RETRIEVAL_CONFIG,
      embeddingModel: "nomic-embed-text",
    }).ingest();

    expect(report.updated).toEqual(["embeddings.md"]);
    expect(
      retrievalRepository.storedChunks().map((chunk) => chunk.embeddingModel),
    ).toEqual(["nomic-embed-text", "nomic-embed-text"]);
  });

  it("starts over when the model's vectors have another length", async () => {
    sourceRepository.writeFile("embeddings.md", EMBEDDINGS);
    await anIngestionService().ingest();

    embeddingClient = new EmbeddingClientFake(768);
    const report = await anIngestionService().ingest();

    expect(retrievalRepository.dimensions).toBe(768);
    expect(report.added).toEqual(["embeddings.md"]);
    expect(retrievalRepository.storedChunks()[0].vector).toHaveLength(768);
  });

  it("reports a source with no text as empty and stores nothing for it", async () => {
    sourceRepository.writeFile("blank.md", "# Only a title\n");

    const report = await anIngestionService().ingest();

    expect(report.empty).toEqual(["blank.md"]);
    expect(report.added).toEqual([]);
    expect(retrievalRepository.storedChunks()).toEqual([]);
  });

  it("deletes the old chunks of a source that became empty", async () => {
    sourceRepository.writeFile("chunking.md", CHUNKING);
    const ingestionService = anIngestionService();
    await ingestionService.ingest();

    sourceRepository.writeFile("chunking.md", "# Chunking\n");
    const report = await ingestionService.ingest();

    expect(report.empty).toEqual(["chunking.md"]);
    expect(retrievalRepository.storedChunks()).toEqual([]);
  });

  it("stops with ModelUnavailableError when the embedding model can't be reached", async () => {
    sourceRepository.writeFile("embeddings.md", EMBEDDINGS);
    embeddingClient.makeUnavailable();

    await expect(anIngestionService().ingest()).rejects.toThrow(ModelUnavailableError);
    expect(retrievalRepository.storedChunks()).toEqual([]);
  });
});

describe("summarizeIngestion", () => {
  it("counts each kind of source and the stored chunks in one line", () => {
    expect(
      summarizeIngestion({
        added: ["a.md", "b.md"],
        updated: ["c.md"],
        unchanged: [],
        removed: ["d.md"],
        empty: [],
        chunksStored: 7,
      }),
    ).toBe(
      "Ingested the knowledge base: 2 added, 1 updated, 0 unchanged, 1 removed. Stored 7 chunks.",
    );
  });

  it("mentions empty sources only when there are some", () => {
    expect(
      summarizeIngestion({
        added: [],
        updated: [],
        unchanged: ["a.md"],
        removed: [],
        empty: ["blank.md"],
        chunksStored: 0,
      }),
    ).toBe(
      "Ingested the knowledge base: 0 added, 0 updated, 1 unchanged, 0 removed, 1 empty. Stored 0 chunks.",
    );
  });
});
