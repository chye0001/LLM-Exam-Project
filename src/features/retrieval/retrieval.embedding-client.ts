import { z } from "zod";

import type { RetrievalConfig } from "@/features/retrieval/retrieval.config";
import type { EmbeddingClientInterface } from "@/features/retrieval/retrieval.embedding-client.interface";
import { ModelTimeoutError, ModelUnavailableError } from "@/shared/errors";

const embedResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())),
});

/** Calls Ollama's embed endpoint, a batch of texts at a time. */
export class EmbeddingClient implements EmbeddingClientInterface {
  constructor(
    private readonly config: Pick<
      RetrievalConfig,
      "embeddingModel" | "ollamaBaseUrl" | "embeddingBatchSize" | "embeddingTimeoutMs"
    >,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let start = 0; start < texts.length; start += this.config.embeddingBatchSize) {
      const batch = texts.slice(start, start + this.config.embeddingBatchSize);
      vectors.push(...(await this.embedBatch(batch)));
    }
    return vectors;
  }

  private async embedBatch(batch: string[]): Promise<number[][]> {
    let response: Response;
    try {
      response = await fetch(this.embedUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.embeddingModel,
          input: batch,
          // Fail on a text longer than the model reads, instead of cutting it.
          truncate: false,
        }),
        signal: AbortSignal.timeout(this.config.embeddingTimeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new ModelTimeoutError();
      }
      // fetch throws a TypeError when nothing answers at the Ollama URL.
      if (error instanceof TypeError) {
        throw new ModelUnavailableError();
      }
      throw error;
    }

    // Ollama answers 404 when the model isn't installed.
    if (response.status === 404) {
      throw new ModelUnavailableError();
    }
    if (!response.ok) {
      throw new Error(
        `Ollama couldn't embed the text with ${this.config.embeddingModel}. It answered ${response.status}: ${await response.text()}`,
      );
    }

    const { embeddings } = embedResponseSchema.parse(await response.json());
    if (embeddings.length !== batch.length) {
      throw new Error(
        `Ollama returned ${embeddings.length} embeddings for ${batch.length} texts.`,
      );
    }
    return embeddings;
  }

  private embedUrl(): string {
    return `${this.config.ollamaBaseUrl.replace(/\/+$/, "")}/api/embed`;
  }
}
