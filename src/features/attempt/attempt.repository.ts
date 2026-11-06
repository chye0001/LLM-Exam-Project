import type { Attempt, NewAttempt } from "@/features/attempt/attempt.model";
import type { AttemptRepositoryInterface } from "@/features/attempt/attempt.repository.interface";
import type { PrismaClient } from "@/shared/db/generated/client";

export class AttemptRepository implements AttemptRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  async create({ answers, ...attempt }: NewAttempt): Promise<Attempt> {
    return this.prisma.attempt.create({
      data: {
        ...attempt,
        answers: { create: answers },
      },
      include: {
        answers: { select: { questionId: true, optionId: true } },
      },
    });
  }

  async findBestScores(quizIds: string[]): Promise<Map<string, number>> {
    const groups = await this.prisma.attempt.groupBy({
      by: ["quizId"],
      where: { quizId: { in: quizIds } },
      _max: { score: true },
    });
    const bestScores = new Map<string, number>();
    for (const group of groups) {
      if (group._max.score !== null) {
        bestScores.set(group.quizId, group._max.score);
      }
    }
    return bestScores;
  }
}
