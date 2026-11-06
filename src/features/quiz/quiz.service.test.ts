import { beforeEach, describe, expect, it } from "vitest";

import type {
  CreateQuizInput,
  NewExcerpt,
  QuizDraft,
} from "@/features/quiz/quiz.model";
import { QuizRepositoryFake } from "@/features/quiz/quiz.repository.fake";
import { QuizService } from "@/features/quiz/quiz.service";
import type { QuizServiceInterface } from "@/features/quiz/quiz.service.interface";
import { NotFoundError, ValidationError } from "@/shared/errors";

describe("QuizService", () => {
  let quizRepository: QuizRepositoryFake;
  let quizService: QuizServiceInterface;

  beforeEach(() => {
    quizRepository = new QuizRepositoryFake();
    quizService = new QuizService(quizRepository);
  });

  async function expectRejected(
    changes: Partial<CreateQuizInput>,
    message: string,
  ) {
    const result = quizService.createQuiz(aQuizInput(changes));

    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow(message);
    await expect(result).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(quizRepository.savedQuizzes).toEqual([]);
  }

  describe("creating a quiz", () => {
    it("saves it under its topic with its questions, explanations and excerpts in order", async () => {
      const quiz = await quizService.createQuiz(aQuizInput());

      expect(quiz.topic).toBe("Similarity search");
      expect(quiz.ungrounded).toBe(false);
      expect(quiz.questions.map((question) => question.text)).toEqual([
        "What does cosine similarity measure?",
        "Which of these is NOT true of the dot product?",
        "Why do many systems normalize embeddings?",
        "What does a similarity threshold do?",
        "What can happen when the right chunk isn't retrieved?",
      ]);
      expect(quiz.questions.map((question) => question.explanation)).toEqual([
        "Cosine similarity measures the angle and ignores the length.",
        "The dot product depends on both the angle and the lengths.",
        "For vectors of length 1, both measures give the same ranking.",
        "Chunks below the threshold are dropped.",
        "Without the right chunk, the model falls back on its training.",
      ]);
      expect(quiz.excerpts).toMatchObject([
        {
          chunkId: "embeddings-explained-3",
          sourceTitle: "Embeddings explained",
          text: "To compare two embeddings, retrieval systems use a similarity measure.",
          similarity: 1,
        },
        {
          chunkId: "building-a-rag-pipeline-2",
          sourceTitle: "Building a RAG pipeline",
          text: "Some systems also apply a similarity threshold.",
          similarity: 0.5,
        },
      ]);
    });

    it("gives each question four options: its correct option once and all three distractors", async () => {
      const draft = aDraft();

      const quiz = await quizService.createQuiz(aQuizInput({ draft }));

      quiz.questions.forEach((question, index) => {
        const { correctOption, distractors } = draft.questions[index];
        const correctTexts = question.options
          .filter((option) => option.isCorrect)
          .map((option) => option.text);
        const distractorTexts = question.options
          .filter((option) => !option.isCorrect)
          .map((option) => option.text);

        expect(question.options).toHaveLength(4);
        expect(correctTexts).toEqual([correctOption]);
        expect(distractorTexts.sort()).toEqual([...distractors].sort());
      });
    });

    it("rejects a draft without exactly five questions", async () => {
      const draft = aDraft();
      draft.questions.pop();

      await expectRejected({ draft }, "A quiz needs exactly 5 questions.");
    });

    it("rejects a question without exactly three distractors", async () => {
      const draft = aDraft();
      draft.questions[1].distractors.pop();

      await expectRejected(
        { draft },
        "Every question needs exactly 3 distractors.",
      );
    });

    it.each([
      {
        field: "question",
        blankOut: (draft: QuizDraft) => (draft.questions[2].text = "  "),
      },
      {
        field: "correct option",
        blankOut: (draft: QuizDraft) => (draft.questions[2].correctOption = "  "),
      },
      {
        field: "distractor",
        blankOut: (draft: QuizDraft) => (draft.questions[2].distractors[0] = "  "),
      },
      {
        field: "explanation",
        blankOut: (draft: QuizDraft) => (draft.questions[2].explanation = "  "),
      },
    ])("rejects a draft with an empty $field", async ({ blankOut }) => {
      const draft = aDraft();
      blankOut(draft);

      await expectRejected(
        { draft },
        "Questions, options and explanations can't be empty.",
      );
    });

    it("rejects a question with two options that only differ in case, spaces or trailing punctuation", async () => {
      const draft = aDraft();
      // The correct option of question 2 is "It ignores the lengths of the vectors".
      draft.questions[1].distractors[2] = "  it ignores the lengths of the vectors. ";

      await expectRejected(
        { draft },
        "Question 2 has two options that are the same.",
      );
    });

    it.each([
      "A) The angle between two vectors",
      "(b) The angle between two vectors",
      "1. The angle between two vectors",
      "C: The angle between two vectors",
      "1.The angle between two vectors",
    ])("rejects the labeled option %j", async (labeledOption) => {
      const draft = aDraft();
      draft.questions[0].correctOption = labeledOption;

      await expectRejected(
        { draft },
        'Question 1 has an option that starts with a label such as "A)" or "1.".',
      );
    });

    it("accepts options that merely start with a letter or a number", async () => {
      const draft = aDraft();
      draft.questions[0].distractors = [
        "A vector of 768 numbers",
        "1.5 times the length of a vector",
        "A.I. models compare them",
      ];

      const quiz = await quizService.createQuiz(aQuizInput({ draft }));

      expect(quiz.questions[0].options.map((option) => option.text)).toEqual(
        expect.arrayContaining([
          "A vector of 768 numbers",
          "1.5 times the length of a vector",
          "A.I. models compare them",
        ]),
      );
    });

    it("rejects a draft with two questions that are the same", async () => {
      const draft = aDraft();
      // Question 1 is "What does cosine similarity measure?".
      draft.questions[3].text = "what does cosine similarity measure";

      await expectRejected({ draft }, "Questions 1 and 4 are the same.");
    });

    it("rejects an ungrounded quiz that has excerpts", async () => {
      await expectRejected(
        { ungrounded: true, excerpts: someExcerpts() },
        "An ungrounded quiz can't have excerpts.",
      );
    });

    it("rejects a quiz without excerpts unless it is ungrounded", async () => {
      await expectRejected(
        { ungrounded: false, excerpts: [] },
        "A quiz needs at least one excerpt unless it is ungrounded.",
      );
    });

    it("saves an ungrounded quiz without excerpts", async () => {
      const quiz = await quizService.createQuiz(
        aQuizInput({ ungrounded: true, excerpts: [] }),
      );

      expect(quiz.ungrounded).toBe(true);
      expect(quiz.excerpts).toEqual([]);
    });
  });

  describe("getting a quiz", () => {
    it("returns the saved quiz with its options in the order they were stored", async () => {
      const created = await quizService.createQuiz(aQuizInput());

      const quiz = await quizService.getQuiz(created.id);

      expect(quiz).toEqual(created);
    });

    it("throws NotFoundError for an unknown id", async () => {
      await quizService.createQuiz(aQuizInput());

      const result = quizService.getQuiz("no-such-quiz");

      await expect(result).rejects.toThrow(NotFoundError);
      await expect(result).rejects.toThrow("That quiz doesn't exist.");
      await expect(result).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("listing quizzes", () => {
    it("lists the saved quizzes newest first with their topic, number of questions and creation date", async () => {
      const older = await quizService.createQuiz(
        aQuizInput({ topic: "Embeddings" }),
      );
      const newer = await quizService.createQuiz(
        aQuizInput({ topic: "Similarity search" }),
      );

      const quizzes = await quizService.listQuizzes();

      expect(quizzes).toEqual([
        {
          id: newer.id,
          topic: "Similarity search",
          questionCount: 5,
          createdAt: newer.createdAt,
        },
        {
          id: older.id,
          topic: "Embeddings",
          questionCount: 5,
          createdAt: older.createdAt,
        },
      ]);
    });
  });
});

function aQuizInput(changes: Partial<CreateQuizInput> = {}): CreateQuizInput {
  return {
    topic: "Similarity search",
    draft: aDraft(),
    excerpts: someExcerpts(),
    ungrounded: false,
    ...changes,
  };
}

function aDraft(): QuizDraft {
  return {
    questions: [
      {
        text: "What does cosine similarity measure?",
        correctOption: "The angle between two vectors",
        distractors: [
          "The distance between two points",
          "The length of a vector",
          "The number of shared words",
        ],
        explanation: "Cosine similarity measures the angle and ignores the length.",
      },
      {
        text: "Which of these is NOT true of the dot product?",
        correctOption: "It ignores the lengths of the vectors",
        distractors: [
          "It multiplies matching dimensions",
          "It depends on the angle",
          "It adds up the products",
        ],
        explanation: "The dot product depends on both the angle and the lengths.",
      },
      {
        text: "Why do many systems normalize embeddings?",
        correctOption: "So the cheaper dot product ranks like cosine",
        distractors: [
          "So embeddings get more dimensions",
          "So texts share more words",
          "So no threshold is needed",
        ],
        explanation: "For vectors of length 1, both measures give the same ranking.",
      },
      {
        text: "What does a similarity threshold do?",
        correctOption: "It drops chunks that match too weakly",
        distractors: [
          "It keeps exactly the top k chunks",
          "It splits sources into chunks",
          "It shortens long chunks",
        ],
        explanation: "Chunks below the threshold are dropped.",
      },
      {
        text: "What can happen when the right chunk isn't retrieved?",
        correctOption: "The model falls back on its training data",
        distractors: [
          "The model always answers correctly",
          "The embeddings are recomputed",
          "The prompt gets shorter",
        ],
        explanation: "Without the right chunk, the model falls back on its training.",
      },
    ],
  };
}

function someExcerpts(): NewExcerpt[] {
  return [
    {
      chunkId: "embeddings-explained-3",
      sourceTitle: "Embeddings explained",
      text: "To compare two embeddings, retrieval systems use a similarity measure.",
      similarity: 1,
    },
    {
      chunkId: "building-a-rag-pipeline-2",
      sourceTitle: "Building a RAG pipeline",
      text: "Some systems also apply a similarity threshold.",
      similarity: 0.5,
    },
  ];
}
