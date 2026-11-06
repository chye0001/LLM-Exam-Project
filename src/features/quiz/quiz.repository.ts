import type { NewQuiz, Quiz } from "@/features/quiz/quiz.model";
import type { QuizRepositoryInterface } from "@/features/quiz/quiz.repository.interface";
import type { Prisma, PrismaClient } from "@/shared/db/generated/client";

const quizInclude = {
  questions: {
    orderBy: { position: "asc" },
    include: { options: { orderBy: { position: "asc" } } },
  },
  excerpts: { orderBy: { position: "asc" } },
} satisfies Prisma.QuizInclude;

type QuizRecord = Prisma.QuizGetPayload<{ include: typeof quizInclude }>;

export class QuizRepository implements QuizRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  async create(quiz: NewQuiz): Promise<Quiz> {
    const record = await this.prisma.quiz.create({
      data: {
        topic: quiz.topic,
        ungrounded: quiz.ungrounded,
        questions: {
          create: quiz.questions.map((question, questionPosition) => ({
            position: questionPosition,
            text: question.text,
            explanation: question.explanation,
            options: {
              create: question.options.map((option, optionPosition) => ({
                position: optionPosition,
                text: option.text,
                isCorrect: option.isCorrect,
              })),
            },
          })),
        },
        excerpts: {
          create: quiz.excerpts.map((excerpt, excerptPosition) => ({
            position: excerptPosition,
            chunkId: excerpt.chunkId,
            sourceTitle: excerpt.sourceTitle,
            text: excerpt.text,
            similarity: excerpt.similarity,
          })),
        },
      },
      include: quizInclude,
    });
    return toQuiz(record);
  }

  async findById(id: string): Promise<Quiz | null> {
    const record = await this.prisma.quiz.findUnique({
      where: { id },
      include: quizInclude,
    });
    return record ? toQuiz(record) : null;
  }
}

function toQuiz(record: QuizRecord): Quiz {
  return {
    id: record.id,
    topic: record.topic,
    ungrounded: record.ungrounded,
    createdAt: record.createdAt,
    questions: record.questions.map((question) => ({
      id: question.id,
      text: question.text,
      explanation: question.explanation,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    })),
    excerpts: record.excerpts.map((excerpt) => ({
      id: excerpt.id,
      chunkId: excerpt.chunkId,
      sourceTitle: excerpt.sourceTitle,
      text: excerpt.text,
      similarity: excerpt.similarity,
    })),
  };
}
