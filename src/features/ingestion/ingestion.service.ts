import { chunkSource, readSource } from "@/features/ingestion/ingestion.markdown";
import type {
  IngestionReport,
  Source,
  SourceChunk,
} from "@/features/ingestion/ingestion.model";
import type { SourceRepositoryInterface } from "@/features/ingestion/ingestion.repository.interface";
import type { IngestionServiceInterface } from "@/features/ingestion/ingestion.service.interface";
import type { RetrievalConfig } from "@/features/retrieval/retrieval.config";
import type { EmbeddingClientInterface } from "@/features/retrieval/retrieval.embedding-client.interface";
import type { ChunkRecord } from "@/features/retrieval/retrieval.model";
import type { RetrievalRepositoryInterface } from "@/features/retrieval/retrieval.repository.interface";
import { AppError } from "@/shared/errors";

/** A short text whose vector tells the service how long the model's vectors are. */
const PROBE_TEXT = "How long are this model's vectors?";

export class IngestionService implements IngestionServiceInterface {
  constructor(
    private readonly sourceRepository: SourceRepositoryInterface,
    private readonly embeddingClient: EmbeddingClientInterface,
    private readonly retrievalRepository: RetrievalRepositoryInterface,
    private readonly config: Pick<
      RetrievalConfig,
      "embeddingModel" | "maxChunkCharacters" | "overlapCharacters"
    >,
  ) {}

  async ingest(): Promise<IngestionReport> {
    const [probeVector] = await this.embeddingClient.embed([PROBE_TEXT]);
    await this.retrievalRepository.ensureCollection(probeVector.length);

    const sources = (await this.sourceRepository.listSourceFiles()).map(readSource);
    const storedNames = new Set(await this.retrievalRepository.listSourceNames());
    const report: IngestionReport = {
      added: [],
      updated: [],
      unchanged: [],
      removed: [],
      empty: [],
      chunksStored: 0,
    };

    for (const source of sources) {
      const isStored = storedNames.has(source.name);
      const isCurrent =
        isStored &&
        (await this.retrievalRepository.isSourceCurrent({
          sourceName: source.name,
          contentHash: source.contentHash,
          embeddingModel: this.config.embeddingModel,
        }));
      if (isCurrent) {
        report.unchanged.push(source.name);
        continue;
      }

      const chunks = chunkSource(source, this.config);
      if (chunks.length === 0) {
        if (isStored) {
          await this.retrievalRepository.deleteSource(source.name);
        }
        report.empty.push(source.name);
        continue;
      }

      const records = await this.embedChunks(source, chunks);
      await this.retrievalRepository.replaceSource(source.name, records);
      (isStored ? report.updated : report.added).push(source.name);
      report.chunksStored += records.length;
    }

    const sourceNames = new Set(sources.map((source) => source.name));
    for (const storedName of storedNames) {
      if (!sourceNames.has(storedName)) {
        await this.retrievalRepository.deleteSource(storedName);
        report.removed.push(storedName);
      }
    }

    return report;
  }

  private async embedChunks(source: Source, chunks: SourceChunk[]): Promise<ChunkRecord[]> {
    let vectors: number[][];
    try {
      vectors = await this.embeddingClient.embed(
        chunks.map((chunk) => chunk.embeddingText),
      );
    } catch (error) {
      // A rejected text is a bug in the chunk size, so name the source it came from.
      if (error instanceof AppError) {
        throw error;
      }
      throw new Error(`Couldn't embed the chunks of ${source.name}.`, { cause: error });
    }

    return chunks.map((chunk, index) => ({
      chunkId: chunk.id,
      sourceName: source.name,
      sourceTitle: source.title,
      position: chunk.position,
      headingPath: chunk.headingPath,
      text: chunk.text,
      contentHash: source.contentHash,
      embeddingModel: this.config.embeddingModel,
      vector: vectors[index],
    }));
  }
}

/** One line on what an ingestion run did, for logs and the ingest script. */
export function summarizeIngestion(report: IngestionReport): string {
  const parts = [
    `${report.added.length} added`,
    `${report.updated.length} updated`,
    `${report.unchanged.length} unchanged`,
    `${report.removed.length} removed`,
  ];
  if (report.empty.length > 0) {
    parts.push(`${report.empty.length} empty`);
  }
  return `Ingested the knowledge base: ${parts.join(", ")}. Stored ${report.chunksStored} chunks.`;
}
