import type { Attempt, NewAttempt } from "@/features/attempt/attempt.model";

export interface AttemptRepositoryInterface {
  /** Saves the attempt with its answers, and returns it as stored. */
  create(attempt: NewAttempt): Promise<Attempt>;

  /** Returns the highest attempt score per quiz id. Quizzes without attempts are left out. */
  findBestScores(quizIds: string[]): Promise<Map<string, number>>;
}
