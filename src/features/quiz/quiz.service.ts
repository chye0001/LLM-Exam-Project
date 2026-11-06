import {
  QUIZ_NOT_FOUND_MESSAGE,
  quizDraftSchema,
  type CreateQuizInput,
  type Quiz,
} from "@/features/quiz/quiz.model";
import type { QuizRepositoryInterface } from "@/features/quiz/quiz.repository.interface";
import type { QuizServiceInterface } from "@/features/quiz/quiz.service.interface";
import { NotFoundError, ValidationError } from "@/shared/errors";

export class QuizService implements QuizServiceInterface {
  constructor(private readonly quizRepository: QuizRepositoryInterface) {}

  async createQuiz({
    topic,
    draft,
    excerpts,
    ungrounded,
  }: CreateQuizInput): Promise<Quiz> {
    const draftCheck = quizDraftSchema.safeParse(draft);
    if (!draftCheck.success) {
      throw new ValidationError(draftCheck.error.issues[0].message);
    }

    return this.quizRepository.create({
      topic,
      ungrounded,
      questions: draftCheck.data.questions.map((draftQuestion) => ({
        text: draftQuestion.question,
        explanation: draftQuestion.explanation,
        options: shuffle([
          { text: draftQuestion.correctOption, isCorrect: true },
          ...draftQuestion.distractors.map((text) => ({ text, isCorrect: false })),
        ]),
      })),
      excerpts,
    });
  }

  async getQuiz(id: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findById(id);
    if (!quiz) {
      throw new NotFoundError(QUIZ_NOT_FOUND_MESSAGE);
    }
    return quiz;
  }
}

/** Returns a copy in random order (Fisher-Yates), so the model never decides where the correct option goes. */
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
