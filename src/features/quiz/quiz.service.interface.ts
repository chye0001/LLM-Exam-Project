import type { CreateQuizInput, Quiz } from "@/features/quiz/quiz.model";

export interface QuizServiceInterface {
  /**
   * Re-checks the draft, shuffles each question's four options and saves the
   * quiz with its topic as its title. Throws `ValidationError` for an invalid draft.
   */
  createQuiz(input: CreateQuizInput): Promise<Quiz>;

  /** Returns the quiz, or throws `NotFoundError` if it doesn't exist. */
  getQuiz(id: string): Promise<Quiz>;
}
