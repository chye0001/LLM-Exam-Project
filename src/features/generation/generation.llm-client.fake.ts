import type { LlmClientInterface } from "@/features/generation/generation.llm-client.interface";

/**
 * Returns the replies a test queues, in order. It fails loudly when it is
 * called with nothing queued, so a test that expects no model call needs no
 * extra check.
 */
export class LlmClientFake implements LlmClientInterface {
  private readonly replies: string[] = [];

  queueReply(reply: string): void {
    this.replies.push(reply);
  }

  async chat(): Promise<string> {
    const reply = this.replies.shift();
    if (reply === undefined) {
      throw new Error("LlmClientFake was called with no reply queued.");
    }
    return reply;
  }
}
