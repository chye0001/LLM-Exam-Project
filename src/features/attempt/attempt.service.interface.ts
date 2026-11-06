import type {
  Attempt,
  SubmitAttemptInput,
} from "@/features/attempt/attempt.model";

export interface AttemptServiceInterface {
  /**
   * Checks that every question of the quiz is answered exactly once with one
   * of that question's own options, computes the score from the stored correct
   * options and saves the attempt. Throws `NotFoundError` for an unknown quiz
   * and `ValidationError` for answers that break those rules.
   */
  submitAttempt(input: SubmitAttemptInput): Promise<Attempt>;

  /**
   * Returns the highest attempt score for each of the given quizzes, keyed by
   * quiz id. A quiz without attempts has no entry.
   */
  getBestScores(quizIds: string[]): Promise<Map<string, number>>;
}
