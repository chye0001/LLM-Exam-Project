"use server";

import type {
  Answer,
  SubmittedAttempt,
} from "@/features/attempt/attempt.model";
import { attemptService } from "@/shared/dependency-container";
import { safeAction, type ActionResult } from "@/shared/safe-action";

/** Saves a finished attempt and returns the score the server computed. The client never sends a score. */
export async function submitAttempt(
  quizId: string,
  answers: Answer[],
): Promise<ActionResult<SubmittedAttempt>> {
  return safeAction(async () => {
    const attempt = await attemptService.submitAttempt({ quizId, answers });
    return { score: attempt.score };
  });
}
