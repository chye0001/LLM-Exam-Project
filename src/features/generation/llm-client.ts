import type { GenerationConfig } from "@/features/generation/generation.config";
import type {
  ChatRequest,
  LlmClientInterface,
} from "@/features/generation/llm-client.interface";

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
    const response = await fetch(this.chatUrl(), {
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
      throw new Error(
        `Ollama answered ${response.status}: ${await response.text()}`,
      );
    }

    const body = (await response.json()) as OllamaChatResponse;
    return body.message?.content ?? "";
  }

  private chatUrl(): string {
    return `${this.config.ollamaBaseUrl.replace(/\/+$/, "")}/api/chat`;
  }
}
