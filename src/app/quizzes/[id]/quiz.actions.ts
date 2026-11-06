"use server";

import type {
  SubmitAttemptInput,
  SubmittedAttempt,
} from "@/features/attempt/attempt.model";
import { attemptService } from "@/shared/dependency-container";
import { safeAction, type ActionResult } from "@/shared/safe-action";

/** Saves a finished attempt and returns the score the server computed. The client never sends a score. */
export async function submitAttempt(
  input: SubmitAttemptInput,
): Promise<ActionResult<SubmittedAttempt>> {
  return safeAction(async () => {
    const attempt = await attemptService.submitAttempt(input);
    return { score: attempt.score };
  });
}
