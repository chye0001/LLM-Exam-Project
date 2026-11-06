import type {
  CreateQuizInput,
  Quiz,
  QuizSummary,
} from "@/features/quiz/quiz.model";

export interface QuizServiceInterface {
  /**
   * Re-checks the draft, shuffles each question's four options and saves the
   * quiz under its topic. Throws `ValidationError` for an invalid draft.
   */
  createQuiz(input: CreateQuizInput): Promise<Quiz>;

  /** Returns the quiz, or throws `NotFoundError` if it doesn't exist. */
  getQuiz(id: string): Promise<Quiz>;

  /** Lists the saved quizzes, newest first. */
  listQuizzes(): Promise<QuizSummary[]>;
}
