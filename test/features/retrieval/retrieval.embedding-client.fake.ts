import type { EmbeddingClientInterface } from "@/features/retrieval/retrieval.embedding-client.interface";
import { ModelUnavailableError } from "@/shared/errors";

/**
 * Gives every text a made-up vector of a fixed length, the same vector for
 * the same text. It records every text it embeds, so a test can check what
 * was embedded and what was skipped.
 */
export class EmbeddingClientFake implements EmbeddingClientInterface {
  /** Every text the fake embedded, in order, across all calls. */
  readonly embeddedTexts: string[] = [];
  private unavailable = false;

  constructor(private readonly dimensions = 3) {}

  /** Every later call fails as if Ollama weren't running. */
  makeUnavailable(): void {
    this.unavailable = true;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (this.unavailable) {
      throw new ModelUnavailableError();
    }
    this.embeddedTexts.push(...texts);
    return texts.map((text) => this.vectorFor(text));
  }

  /** The vector the fake gives a text. */
  vectorFor(text: string): number[] {
    return Array.from({ length: this.dimensions }, (_, index) => text.length + index);
  }
}
