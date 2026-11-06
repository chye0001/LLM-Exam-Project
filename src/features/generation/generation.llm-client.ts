import type { GenerationConfig } from "@/features/generation/generation.config";
import type {
  ChatRequest,
  LlmClientInterface,
} from "@/features/generation/generation.llm-client.interface";
import { ModelTimeoutError, ModelUnavailableError } from "@/shared/errors";

type OllamaChatResponse = {
  message?: { content?: string };
};

/** Calls Ollama's chat endpoint and waits for the whole reply. */
export class LlmClient implements LlmClientInterface {
  constructor(
    private readonly config: Pick<
      GenerationConfig,
      "model" | "ollamaBaseUrl" | "timeoutMs"
    >,
  ) {}

  async chat({ messages, jsonSchema, sampling }: ChatRequest): Promise<string> {
    let response: Response;
    let body: OllamaChatResponse;
    try {
      response = await fetch(this.chatUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: false,
          think: false,
          format: jsonSchema,
          options: {
            num_ctx: sampling.contextWindow,
            temperature: sampling.temperature,
            top_p: sampling.topP,
            top_k: sampling.topK,
          },
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
      if (!response.ok) {
        throw await this.errorFor(response);
      }
      body = (await response.json()) as OllamaChatResponse;
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
    return body.message?.content ?? "";
  }

  /** Ollama answers 404 when the model isn't installed. */
  private async errorFor(response: Response): Promise<Error> {
    if (response.status === 404) {
      return new ModelUnavailableError();
    }
    return new Error(`Ollama answered ${response.status}: ${await response.text()}`);
  }

  private chatUrl(): string {
    return `${this.config.ollamaBaseUrl.replace(/\/+$/, "")}/api/chat`;
  }
}
