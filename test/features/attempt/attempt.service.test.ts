import { beforeEach, describe, expect, it } from "vitest";

import type { Answer } from "@/features/attempt/attempt.model";
import { AttemptRepositoryFake } from "@test/features/attempt/attempt.repository.fake";
import { AttemptService } from "@/features/attempt/attempt.service";
import type { AttemptServiceInterface } from "@/features/attempt/attempt.service.interface";
import type { Quiz, QuizDraft } from "@/features/quiz/quiz.model";
import { QuizRepositoryFake } from "@test/features/quiz/quiz.repository.fake";
import { QuizService } from "@/features/quiz/quiz.service";
import type { QuizServiceInterface } from "@/features/quiz/quiz.service.interface";
import { NotFoundError, ValidationError } from "@/shared/errors";

describe("AttemptService", () => {
  let attemptRepository: AttemptRepositoryFake;
  let attemptService: AttemptServiceInterface;
  let quizService: QuizServiceInterface;
  let quiz: Quiz;

  beforeEach(async () => {
    quizService = new QuizService(new QuizRepositoryFake());
    attemptRepository = new AttemptRepositoryFake();
    attemptService = new AttemptService(attemptRepository, quizService);
    quiz = await quizService.createQuiz({
      topic: "Embeddings",
      draft: aDraft(),
      excerpts: [],
      ungrounded: true,
    });
  });

  describe("submitting an attempt", () => {
    it("counts the answers that match the stored correct options and saves the attempt", async () => {
      // Right, wrong, right, right, wrong.
      const answers = [
        correctAnswer(quiz, 0),
        wrongAnswer(quiz, 1),
        correctAnswer(quiz, 2),
        correctAnswer(quiz, 3),
        wrongAnswer(quiz, 4),
      ];

      const attempt = await attemptService.submitAttempt({
        quizId: quiz.id,
        answers,
      });

      expect(attempt.score).toBe(3);
      expect(attemptRepository.savedAttempts).toEqual([
        {
          id: attempt.id,
          quizId: quiz.id,
          createdAt: attempt.createdAt,
          score: 3,
          answers,
        },
      ]);
    });

    async function expectRejected(answers: Answer[], message: string) {
      const result = attemptService.submitAttempt({ quizId: quiz.id, answers });

      await expect(result).rejects.toThrow(ValidationError);
      await expect(result).rejects.toThrow(message);
      expect(attemptRepository.savedAttempts).toEqual([]);
    }

    it("rejects answers that miss a question", async () => {
      const answers = allCorrectAnswers(quiz);
      answers.splice(2, 1);

      await expectRejected(answers, "Answer every question before you finish.");
    });

    it("rejects an answer that uses another question's option", async () => {
      const answers = allCorrectAnswers(quiz);
      answers[0] = {
        questionId: quiz.questions[0].id,
        optionId: correctAnswer(quiz, 1).optionId,
      };

      await expectRejected(
        answers,
        "Every answer must be one of its question's options.",
      );
    });

    it("rejects a question that is answered twice", async () => {
      const answers = [...allCorrectAnswers(quiz), wrongAnswer(quiz, 0)];

      await expectRejected(answers, "Answer each question only once.");
    });

    it("rejects an answer to a question from another quiz", async () => {
      const answers = allCorrectAnswers(quiz);
      answers.push({ questionId: "question-from-another-quiz", optionId: "x" });

      await expectRejected(
        answers,
        "Every answer must be to a question in this quiz.",
      );
    });

    it("rejects answers that aren't a list of question and option ids", async () => {
      const result = attemptService.submitAttempt({
        quizId: quiz.id,
        answers: "all of them",
      } as never);

      await expect(result).rejects.toThrow(ValidationError);
      expect(attemptRepository.savedAttempts).toEqual([]);
    });

    it("throws NotFoundError for an unknown quiz and saves nothing", async () => {
      const result = attemptService.submitAttempt({
        quizId: "no-such-quiz",
        answers: allCorrectAnswers(quiz),
      });

      await expect(result).rejects.toThrow(NotFoundError);
      expect(attemptRepository.savedAttempts).toEqual([]);
    });
  });

  describe("getting best scores", () => {
    /** Submits an attempt that answers the first `score` questions right and the rest wrong. */
    async function submitWithScore(quizToTake: Quiz, score: number) {
      await attemptService.submitAttempt({
        quizId: quizToTake.id,
        answers: quizToTake.questions.map((_, index) =>
          index < score ? correctAnswer(quizToTake, index) : wrongAnswer(quizToTake, index),
        ),
      });
    }

    it("returns a quiz's highest attempt score", async () => {
      await submitWithScore(quiz, 2);
      await submitWithScore(quiz, 4);
      await submitWithScore(quiz, 3);

      const bestScoreByQuizId = await attemptService.getBestScores([quiz.id]);

      expect(bestScoreByQuizId).toEqual(new Map([[quiz.id, 4]]));
    });

    it("leaves out a quiz without attempts, even one next to a quiz scored zero", async () => {
      const untakenQuiz = await quizService.createQuiz({
        topic: "Vector stores",
        draft: aDraft(),
        excerpts: [],
        ungrounded: true,
      });
      await submitWithScore(quiz, 0);

      const bestScoreByQuizId = await attemptService.getBestScores([quiz.id, untakenQuiz.id]);

      expect(bestScoreByQuizId).toEqual(new Map([[quiz.id, 0]]));
      expect(bestScoreByQuizId.has(untakenQuiz.id)).toBe(false);
    });
  });
});

function allCorrectAnswers(quiz: Quiz): Answer[] {
  return quiz.questions.map((_, index) => correctAnswer(quiz, index));
}

function correctAnswer(quiz: Quiz, questionIndex: number): Answer {
  return pickAnswer(quiz, questionIndex, true);
}

function wrongAnswer(quiz: Quiz, questionIndex: number): Answer {
  return pickAnswer(quiz, questionIndex, false);
}

function pickAnswer(quiz: Quiz, questionIndex: number, isCorrect: boolean): Answer {
  const question = quiz.questions[questionIndex];
  const option = question.options.find((candidate) => candidate.isCorrect === isCorrect)!;
  return { questionId: question.id, optionId: option.id };
}

/** Five questions, each with a correct option and three distractors. */
function aDraft(): QuizDraft {
  return {
    questions: [1, 2, 3, 4, 5].map((number) => ({
      question: `What is fact ${number}?`,
      correctOption: `Fact ${number} is true`,
      distractors: [
        `Fact ${number} is false`,
        `Fact ${number} is unknown`,
        `Fact ${number} is made up`,
      ],
      explanation: `The sources state fact ${number}.`,
    })),
  };
}
