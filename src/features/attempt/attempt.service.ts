import {
  submitAttemptInputSchema,
  type Attempt,
  type SubmitAttemptInput,
} from "@/features/attempt/attempt.model";
import type { AttemptRepositoryInterface } from "@/features/attempt/attempt.repository.interface";
import type { AttemptServiceInterface } from "@/features/attempt/attempt.service.interface";
import type { QuizServiceInterface } from "@/features/quiz/quiz.service.interface";
import { ValidationError } from "@/shared/errors";

export class AttemptService implements AttemptServiceInterface {
  constructor(
    private readonly attemptRepository: AttemptRepositoryInterface,
    private readonly quizService: QuizServiceInterface,
  ) {}

  async submitAttempt(input: SubmitAttemptInput): Promise<Attempt> {
    // The input comes from the browser, so its shape is checked too.
    const inputCheck = submitAttemptInputSchema.safeParse(input);
    if (!inputCheck.success) {
      throw new ValidationError("The answers must be a list of question and option ids.");
    }
    const { quizId, answers } = inputCheck.data;

    const quiz = await this.quizService.getQuiz(quizId);

    const optionIdByQuestionId = new Map<string, string>();
    for (const answer of answers) {
      if (!quiz.questions.some((question) => question.id === answer.questionId)) {
        throw new ValidationError("Every answer must be to a question in this quiz.");
      }
      if (optionIdByQuestionId.has(answer.questionId)) {
        throw new ValidationError("Answer each question only once.");
      }
      optionIdByQuestionId.set(answer.questionId, answer.optionId);
    }

    let score = 0;
    for (const question of quiz.questions) {
      const optionId = optionIdByQuestionId.get(question.id);
      if (optionId === undefined) {
        throw new ValidationError("Answer every question before you finish.");
      }
      const option = question.options.find((candidate) => candidate.id === optionId);
      if (!option) {
        throw new ValidationError(
          "Every answer must be one of its question's options.",
        );
      }
      if (option.isCorrect) {
        score += 1;
      }
    }

    return this.attemptRepository.create({ quizId, score, answers });
  }

  async getBestScores(quizIds: string[]): Promise<Map<string, number>> {
    return this.attemptRepository.findBestScores(quizIds);
  }
}
