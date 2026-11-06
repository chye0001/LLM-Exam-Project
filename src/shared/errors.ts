/** An expected error. Its code is stable, and its message is written for the student. */
export abstract class AppError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The input breaks a rule. The message says what to fix. */
export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
}

export const QUIZ_NOT_FOUND_MESSAGE = "That quiz doesn't exist.";

/** The quiz the student asked for doesn't exist. */
export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";

  constructor() {
    super(QUIZ_NOT_FOUND_MESSAGE);
  }
}

/** Retrieval found no chunk that matches the topic, so the model isn't asked to write a quiz. */
export class NoRelevantSourcesError extends AppError {
  readonly code = "NO_RELEVANT_SOURCES";

  constructor() {
    super("Nothing in the knowledge base matches this topic.");
  }
}

/** Ollama can't be reached, or the configured model isn't installed. */
export class ModelUnavailableError extends AppError {
  readonly code = "MODEL_UNAVAILABLE";

  constructor() {
    super("The local model isn't reachable. Check that Ollama is running.");
  }
}

/** One model call took longer than the configured limit. Generation counts it as a failed try. */
export class ModelTimeoutError extends AppError {
  readonly code = "MODEL_TIMEOUT";

  constructor() {
    super("The model took too long to answer.");
  }
}

/** The model couldn't write a valid quiz draft in the tries it had. */
export class QuizGenerationError extends AppError {
  readonly code = "QUIZ_GENERATION_FAILED";

  constructor() {
    super("The model couldn't write a valid quiz. Try again or rephrase the topic.");
  }
}
