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
}
