import type { Attempt, NewAttempt } from "@/features/attempt/attempt.model";

export interface AttemptRepositoryInterface {
  /** Saves the attempt with its answers, and returns it as stored. */
  create(attempt: NewAttempt): Promise<Attempt>;
}
