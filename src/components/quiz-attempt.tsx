"use client";

import { useState } from "react";

import { QuizQuestion } from "@/components/quiz-question";
import { QuizResults, type SubmitAttemptResult } from "@/components/quiz-results";
import type { SubmitAttemptInput } from "@/features/attempt/attempt.model";
import type { Quiz } from "@/features/quiz/quiz.model";

const UNREACHABLE_SERVER: SubmitAttemptResult = {
  ok: false,
  error: {
    code: "UNREACHABLE_SERVER",
    message: "Your attempt couldn't be saved. Check that the app is running.",
  },
};

/**
 * Runs a quiz in the browser: one question per screen, then the results.
 * The quiz arrives with its correct options, so answering makes no server
 * call. Answering the last question submits the attempt, so leaving midway
 * saves nothing.
 */
export function QuizAttempt({
  quiz,
  submitAttempt,
}: {
  quiz: Quiz;
  submitAttempt: (input: SubmitAttemptInput) => Promise<SubmitAttemptResult>;
}) {
  // The chosen option for each question, by question id.
  const [answerIds, setAnswerIds] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  // What the server said about the submitted attempt, or null while it's being saved.
  const [submitResult, setSubmitResult] = useState<SubmitAttemptResult | null>(null);

  const isFinished = questionIndex >= quiz.questions.length;
  const question = quiz.questions[questionIndex];

  function choose(optionId: string) {
    // The first answer to a question locks it.
    if (answerIds[question.id]) return;

    const nextAnswerIds = { ...answerIds, [question.id]: optionId };
    setAnswerIds(nextAnswerIds);

    if (questionIndex === quiz.questions.length - 1) {
      const answers = Object.entries(nextAnswerIds).map(
        ([questionId, chosenOptionId]) => ({ questionId, optionId: chosenOptionId }),
      );
      submitAttempt({ quizId: quiz.id, answers })
        .catch(() => UNREACHABLE_SERVER)
        .then(setSubmitResult);
    }
  }

  function next() {
    setQuestionIndex((index) => index + 1);
    window.scrollTo(0, 0);
  }

  function retake() {
    setAnswerIds({});
    setQuestionIndex(0);
    setSubmitResult(null);
    window.scrollTo(0, 0);
  }

  if (isFinished) {
    return (
      <QuizResults
        quiz={quiz}
        answerIds={answerIds}
        submitResult={submitResult}
        onRetake={retake}
      />
    );
  }

  return (
    <QuizQuestion
      topic={quiz.topic}
      question={question}
      questionNumber={questionIndex + 1}
      questionCount={quiz.questions.length}
      answerId={answerIds[question.id] ?? null}
      onChoose={choose}
      onNext={next}
    />
  );
}
