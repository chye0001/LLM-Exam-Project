import type {
  ChatRequest,
  LlmClientInterface,
} from "@/features/generation/generation.llm-client.interface";
import { ModelTimeoutError, ModelUnavailableError } from "@/shared/errors";

/** What the fake does on one call: return a reply text or throw. */
type QueuedReply =
  | { kind: "reply"; text: string }
  | { kind: "timeout" }
  | { kind: "unavailable" };

/**
 * Returns the replies a test queues, in order. It fails loudly when it is
 * called with nothing queued, so a test that expects no model call needs no
 * extra check.
 */
export class LlmClientFake implements LlmClientInterface {
  private readonly replies: QueuedReply[] = [];
  /** Every request the fake received, in order. */
  readonly requests: ChatRequest[] = [];

  queueReply(text: string): void {
    this.replies.push({ kind: "reply", text });
  }

  /** The next call times out. */
  queueTimeout(): void {
    this.replies.push({ kind: "timeout" });
  }

  /** The next call finds no running Ollama or no installed model. */
  queueUnavailable(): void {
    this.replies.push({ kind: "unavailable" });
  }

  async chat(request: ChatRequest): Promise<string> {
    this.requests.push(request);
    const reply = this.replies.shift();
    if (reply === undefined) {
      throw new Error("LlmClientFake was called with no reply queued.");
    }
    if (reply.kind === "timeout") {
      throw new ModelTimeoutError();
    }
    if (reply.kind === "unavailable") {
      throw new ModelUnavailableError();
    }
    return reply.text;
  }
}
