import { z } from "zod";

/** The quiz id and the answers a student sends when they finish a quiz. Never a score. */
export const submitAttemptInputSchema = z.object({
  quizId: z.string(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      optionId: z.string(),
    }),
  ),
});

export type SubmitAttemptInput = z.infer<typeof submitAttemptInputSchema>;

/** The option a student picked for a question during an attempt. */
export type Answer = SubmitAttemptInput["answers"][number];

/** One finished run through a quiz, saved with the score the server computed. */
export type Attempt = {
  id: string;
  quizId: string;
  createdAt: Date;
  score: number;
  answers: Answer[];
};

/** What the student learns about a saved attempt: the score the server computed. */
export type SubmittedAttempt = Pick<Attempt, "score">;

/** An attempt to save: an Attempt without the id and the date the repository assigns. */
export type NewAttempt = Omit<Attempt, "id" | "createdAt">;
