import { AppError } from "@/shared/errors";

/** What a server action returns. It never throws to the client. */
export type ActionResult<Data> =
  | { ok: true; data: Data }
  | { ok: false; error: { code: string; message: string } };

const UNEXPECTED_ERROR = {
  code: "UNEXPECTED_ERROR",
  message: "Something went wrong.",
};

/**
 * Runs a server action's work and returns its result. Next.js hides the
 * messages of errors thrown from server actions in production, so an
 * `AppError` comes back with its code and message instead. Any other error is
 * logged and reaches the student as a generic message.
 */
export async function safeAction<Data>(
  work: () => Promise<Data>,
): Promise<ActionResult<Data>> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    console.error(error);
    return { ok: false, error: UNEXPECTED_ERROR };
  }
}
