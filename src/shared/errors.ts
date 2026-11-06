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

/** What the student asked for doesn't exist. The message says what is missing. */
export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
}
