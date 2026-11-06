import type { NewQuiz, Quiz } from "@/features/quiz/quiz.model";
import type { QuizRepositoryInterface } from "@/features/quiz/quiz.repository.interface";
import type { Prisma, PrismaClient } from "@/shared/db/generated/client";

// Loads a quiz in the shape of the Quiz type: items in stored order, without
// the foreign keys and positions that only the database needs.
const quizInclude = {
  questions: {
    orderBy: { position: "asc" },
    omit: { quizId: true, position: true },
    include: {
      options: {
        orderBy: { position: "asc" },
        omit: { questionId: true, position: true },
      },
    },
  },
  excerpts: {
    orderBy: { position: "asc" },
    omit: { quizId: true, position: true },
  },
} satisfies Prisma.QuizInclude;

export class QuizRepository implements QuizRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  async create({ questions, excerpts, ...quiz }: NewQuiz): Promise<Quiz> {
    return this.prisma.quiz.create({
      data: {
        ...quiz,
        questions: {
          create: questions.map(({ options, ...question }, questionPosition) => ({
            ...question,
            position: questionPosition,
            options: {
              create: options.map((option, optionPosition) => ({
                ...option,
                position: optionPosition,
              })),
            },
          })),
        },
        excerpts: {
          create: excerpts.map((excerpt, excerptPosition) => ({
            ...excerpt,
            position: excerptPosition,
          })),
        },
      },
      include: quizInclude,
    });
  }

  async findById(id: string): Promise<Quiz | null> {
    return this.prisma.quiz.findUnique({
      where: { id },
      include: quizInclude,
    });
  }
}
