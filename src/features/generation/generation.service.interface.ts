import type { GenerateQuizInput } from "@/features/generation/generation.model";
import type { Quiz } from "@/features/quiz/quiz.model";

export interface GenerationServiceInterface {
  /**
   * Retrieves the chunks that match the topic, asks the model for a quiz draft
   * written only from them and saves the quiz with one excerpt per chunk.
   *
   * Throws `ValidationError` unless the trimmed topic is 2 to 100 characters
   * long, `NoRelevantSourcesError` when retrieval finds nothing,
   * `ModelUnavailableError` at once when the model can't be reached, and
   * `QuizGenerationError` when the model doesn't write a valid quiz draft in
   * the configured number of tries. A timeout counts as a failed try.
   */
  generateQuiz(input: GenerateQuizInput): Promise<Quiz>;
}
