import type {
  ChatMessage,
  SamplingOptions,
} from "@/features/generation/generation.model";

export type ChatRequest = {
  messages: ChatMessage[];
  /** The JSON Schema the reply must follow. */
  jsonSchema: Record<string, unknown>;
  sampling: SamplingOptions;
};

export interface LlmClientInterface {
  /**
   * Sends the chat to the model and returns its raw reply text, which may still be invalid.
   *
   * Throws `ModelUnavailableError` when Ollama can't be reached or the model
   * isn't installed, and `ModelTimeoutError` when the call takes too long.
   */
  chat(request: ChatRequest): Promise<string>;
}
