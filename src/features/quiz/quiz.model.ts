import { z } from "zod";

const QUESTIONS_PER_QUIZ = 5;
const DISTRACTORS_PER_QUESTION = 3;

/**
 * Labels such as "A)", "(b)", "1." or "C:" at the start of an option.
 * "." and ":" only count when a space follows, so "1.5 times" is not a label.
 */
const OPTION_LABEL = /^(?:\(?[a-d1-4]\)|[a-d1-4][.:](?=\s))/i;

const draftText = z
  .string()
  .trim()
  .min(1, "Questions, options and explanations can't be empty.");

const questionDraftSchema = z.object({
  question: draftText,
  correctOption: draftText,
  distractors: z
    .array(draftText)
    .length(
      DISTRACTORS_PER_QUESTION,
      `Every question needs exactly ${DISTRACTORS_PER_QUESTION} distractors.`,
    ),
  explanation: draftText,
});

/** A quiz as the model writes it. The schema checks its shape, then the extra rules. */
export const quizDraftSchema = z
  .object({
    questions: z
      .array(questionDraftSchema)
      .length(
        QUESTIONS_PER_QUIZ,
        `A quiz needs exactly ${QUESTIONS_PER_QUIZ} questions.`,
      ),
  })
  .superRefine((draft, context) => {
    const firstNumberByQuestion = new Map<string, number>();

    draft.questions.forEach((question, index) => {
      const questionKey = normalizeForComparison(question.question);
      const firstNumber = firstNumberByQuestion.get(questionKey);
      if (firstNumber === undefined) {
        firstNumberByQuestion.set(questionKey, index + 1);
      } else {
        context.addIssue({
          code: "custom",
          path: ["questions", index, "question"],
          message: `Questions ${firstNumber} and ${index + 1} are the same.`,
        });
      }

      const options = [question.correctOption, ...question.distractors];

      if (new Set(options.map(normalizeForComparison)).size < options.length) {
        context.addIssue({
          code: "custom",
          path: ["questions", index],
          message: `Question ${index + 1} has two options that are the same.`,
        });
      }

      if (options.some((option) => OPTION_LABEL.test(option))) {
        context.addIssue({
          code: "custom",
          path: ["questions", index],
          message: `Question ${index + 1} has an option that starts with a label such as "A)" or "1.".`,
        });
      }
    });
  });

export type QuizDraft = z.infer<typeof quizDraftSchema>;

/** Ignores case, surrounding spaces and trailing punctuation. */
function normalizeForComparison(text: string): string {
  return text.trim().replace(/[\s\p{P}]+$/u, "").toLowerCase();
}

/** A saved quiz. Its questions, options and excerpts are in their stored order. */
export type Quiz = {
  id: string;
  topic: string;
  ungrounded: boolean;
  createdAt: Date;
  questions: Question[];
  excerpts: Excerpt[];
};

export type Question = {
  id: string;
  text: string;
  explanation: string;
  options: Option[];
};

export type Option = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type Excerpt = {
  id: string;
  chunkId: string;
  sourceTitle: string;
  text: string;
  similarity: number;
};

/**
 * A quiz to save: a Quiz without the ids and the date the repository assigns.
 * The repository stores each item's position from its place in the array.
 */
export type NewQuiz = Omit<Quiz, "id" | "createdAt" | "questions" | "excerpts"> & {
  questions: NewQuestion[];
  excerpts: NewExcerpt[];
};

export type NewQuestion = Omit<Question, "id" | "options"> & {
  options: NewOption[];
};

export type NewOption = Omit<Option, "id">;

export type NewExcerpt = Omit<Excerpt, "id">;

export const QUIZ_NOT_FOUND_MESSAGE = "That quiz doesn't exist.";

export type CreateQuizInput = {
  topic: string;
  draft: QuizDraft;
  excerpts: NewExcerpt[];
  ungrounded: boolean;
};
