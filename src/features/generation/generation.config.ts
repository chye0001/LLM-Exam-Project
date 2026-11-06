import type { SamplingOptions } from "@/features/generation/generation.model";
import { QUESTIONS_PER_QUIZ } from "@/features/quiz/quiz.model";

export type GenerationConfig = {
  /** The Ollama model that writes quizzes. It runs with thinking off. */
  model: string;
  ollamaBaseUrl: string;
  questionsPerQuiz: number;
  /** The most chunks one retrieval returns and the prompt holds. */
  chunksPerRetrieval: number;
  sampling: SamplingOptions;
  /** How long one model call may take before the app gives up on it. */
  timeoutMs: number;
  /** How many times the model may try to write a valid quiz draft. */
  tries: number;
};

/** Every generation default, in one place. */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  model: "qwen3:1.7b",
  ollamaBaseUrl: "http://localhost:11434",
  questionsPerQuiz: QUESTIONS_PER_QUIZ,
  chunksPerRetrieval: 5,
  // Qwen's recommended sampling settings with thinking off.
  sampling: {
    contextWindow: 4096,
    temperature: 0.7,
    topP: 0.8,
    topK: 20,
  },
  timeoutMs: 3 * 60 * 1000,
  tries: 3,
};

/** The defaults, with the model and the Ollama URL taken from `OLLAMA_MODEL` and `OLLAMA_BASE_URL` when they are set. */
export function loadGenerationConfig(
  env: NodeJS.ProcessEnv = process.env,
): GenerationConfig {
  return {
    ...DEFAULT_GENERATION_CONFIG,
    model: env.OLLAMA_MODEL || DEFAULT_GENERATION_CONFIG.model,
    ollamaBaseUrl: env.OLLAMA_BASE_URL || DEFAULT_GENERATION_CONFIG.ollamaBaseUrl,
  };
}
