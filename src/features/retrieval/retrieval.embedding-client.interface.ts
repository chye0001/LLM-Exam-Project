/** Turns texts into vectors with the embedding model. */
export interface EmbeddingClientInterface {
  /**
   * Returns one vector per text, in the same order. Every vector from the
   * same model has the same length.
   *
   * Throws `ModelUnavailableError` when Ollama can't be reached or the model
   * isn't installed, and `ModelTimeoutError` when a call takes too long. A
   * text longer than the model can read throws instead of being cut.
   */
  embed(texts: string[]): Promise<number[][]>;
}
