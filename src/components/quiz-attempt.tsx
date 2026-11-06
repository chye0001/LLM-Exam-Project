"use client";

import { useState } from "react";

import { QuizQuestion } from "@/components/quiz-question";
import { QuizResults } from "@/components/quiz-results";
import type { Quiz } from "@/features/quiz/quiz.model";

/**
 * Runs a quiz in the browser: one question per screen, then the results.
 * The quiz arrives with its correct options, so no step makes a server call.
 */
export function QuizAttempt({ quiz }: { quiz: Quiz }) {
  // The answer to each question, by its index.
  const [answerIds, setAnswerIds] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);

  const isFinished = questionIndex >= quiz.questions.length;

  function choose(optionId: string) {
    // The first answer to a question locks it.
    setAnswerIds((ids) => {
      if (ids[questionIndex]) return ids;
      const answered = [...ids];
      answered[questionIndex] = optionId;
      return answered;
    });
  }

  function next() {
    setQuestionIndex((index) => index + 1);
    window.scrollTo(0, 0);
  }

  function retake() {
    setAnswerIds([]);
    setQuestionIndex(0);
    window.scrollTo(0, 0);
  }

  if (isFinished) {
    return (
      <QuizResults quiz={quiz} answerIds={answerIds} onRetake={retake} />
    );
  }

  return (
    <QuizQuestion
      topic={quiz.topic}
      question={quiz.questions[questionIndex]}
      questionNumber={questionIndex + 1}
      questionCount={quiz.questions.length}
      answerId={answerIds[questionIndex] ?? null}
      onChoose={choose}
      onNext={next}
    />
  );
}
