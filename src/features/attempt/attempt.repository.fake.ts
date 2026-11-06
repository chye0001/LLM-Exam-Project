import type { Attempt, NewAttempt } from "@/features/attempt/attempt.model";
import type { AttemptRepositoryInterface } from "@/features/attempt/attempt.repository.interface";

/** Keeps attempts in memory and assigns ids and dates the way the database does. */
export class AttemptRepositoryFake implements AttemptRepositoryInterface {
  private readonly attempts: Attempt[] = [];

  /** Copies of every attempt saved so far, so tests can check what was left behind. */
  get savedAttempts(): Attempt[] {
    return structuredClone(this.attempts);
  }

  async create(attempt: NewAttempt): Promise<Attempt> {
    const saved: Attempt = {
      ...structuredClone(attempt),
      id: `attempt-${this.attempts.length + 1}`,
      createdAt: new Date(),
    };
    this.attempts.push(saved);
    return structuredClone(saved);
  }

  async findBestScores(quizIds: string[]): Promise<Map<string, number>> {
    const bestScores = new Map<string, number>();
    for (const attempt of this.attempts) {
      if (!quizIds.includes(attempt.quizId)) {
        continue;
      }
      const best = bestScores.get(attempt.quizId);
      if (best === undefined || attempt.score > best) {
        bestScores.set(attempt.quizId, attempt.score);
      }
    }
    return bestScores;
  }
}
