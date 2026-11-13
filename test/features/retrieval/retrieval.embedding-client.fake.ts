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
  private readonly chosenVectors = new Map<string, number[]>();

  constructor(private readonly dimensions = 3) {}

  /** Makes the fake return this vector for this text. */
  setVector(text: string, vector: number[]): void {
    this.chosenVectors.set(text, vector);
  }

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

  /** The vector the fake gives a text: the one a test chose, or one made from its length. */
  vectorFor(text: string): number[] {
    return (
      this.chosenVectors.get(text) ??
      Array.from({ length: this.dimensions }, (_, index) => text.length + index)
    );
  }
}
