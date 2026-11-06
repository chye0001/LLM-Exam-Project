import type { GenerateQuizInput } from "@/features/generation/generation.model";
import type { Quiz } from "@/features/quiz/quiz.model";

export interface GenerationServiceInterface {
  /**
   * Retrieves the chunks that match the topic, asks the model for a quiz draft
   * written only from them and saves the quiz with one excerpt per chunk.
   *
   * Throws `ValidationError` unless the trimmed topic is 2 to 100 characters
   * long, `NoRelevantSourcesError` when retrieval finds nothing, and
   * `QuizGenerationError` when the model's reply isn't a valid quiz draft.
   */
  generateQuiz(input: GenerateQuizInput): Promise<Quiz>;
}
