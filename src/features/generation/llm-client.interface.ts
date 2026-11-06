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
  /** Sends the chat to the model and returns its raw reply text, which may still be invalid. */
  chat(request: ChatRequest): Promise<string>;
}
