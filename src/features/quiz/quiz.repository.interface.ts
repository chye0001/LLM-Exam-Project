import type { NewQuiz, Quiz, QuizSummary } from "@/features/quiz/quiz.model";

export interface QuizRepositoryInterface {
  /** Saves the quiz with its questions, options and excerpts, and returns it as stored. */
  create(quiz: NewQuiz): Promise<Quiz>;

  findById(id: string): Promise<Quiz | null>;

  /** Returns a summary of every saved quiz, in no particular order. */
  findAllSummaries(): Promise<QuizSummary[]>;
}
