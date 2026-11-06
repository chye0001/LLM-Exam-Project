import type { NewQuiz, Quiz } from "@/features/quiz/quiz.model";

export interface QuizRepositoryInterface {
  /** Saves the quiz with its questions, options and excerpts, and returns it as stored. */
  create(quiz: NewQuiz): Promise<Quiz>;

  findById(id: string): Promise<Quiz | null>;
}
