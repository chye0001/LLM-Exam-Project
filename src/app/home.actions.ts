"use server";

import { generationService } from "@/shared/dependency-container";
import { safeAction, type ActionResult } from "@/shared/safe-action";

/** Generates a quiz from the form's topic and returns the new quiz's id. */
export async function generateQuiz(
  formData: FormData,
): Promise<ActionResult<{ quizId: string }>> {
  return safeAction(async () => {
    const topic = formData.get("topic");
    const quiz = await generationService.generateQuiz({
      topic: typeof topic === "string" ? topic : "",
    });
    return { quizId: quiz.id };
  });
}
