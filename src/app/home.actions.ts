"use server";

import { generationService } from "@/shared/dependency-container";
import { safeAction, type ActionResult } from "@/shared/safe-action";

/**
 * Generates a quiz from the form's topic and returns the new quiz's id. The
 * "Skip retrieval" checkbox only exists in demo mode, and the generation
 * service rejects it outside demo mode.
 */
export async function generateQuiz(
  formData: FormData,
): Promise<ActionResult<{ quizId: string }>> {
  return safeAction(async () => {
    const topic = formData.get("topic");
    const quiz = await generationService.generateQuiz({
      topic: typeof topic === "string" ? topic : "",
      skipRetrieval: formData.get("skipRetrieval") === "on",
    });
    return { quizId: quiz.id };
  });
}
