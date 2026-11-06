"use client";

import { useState } from "react";

import { QuizQuestion } from "@/components/quiz-question";
import { QuizResults } from "@/components/quiz-results";
import type { Quiz } from "@/features/quiz/quiz.model";

/**
 * Runs a quiz in the browser: one question per screen, then the results.
 * The quiz arrives with its correct options, so no step makes a server call.
 */
export function QuizPlayer({ quiz }: { quiz: Quiz }) {
  const [chosenOptionIds, setChosenOptionIds] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);

  const isFinished = questionIndex >= quiz.questions.length;

  function choose(optionId: string) {
    setChosenOptionIds((ids) => [...ids, optionId]);
  }

  function next() {
    setQuestionIndex((index) => index + 1);
  }

  function retake() {
    setChosenOptionIds([]);
    setQuestionIndex(0);
    window.scrollTo(0, 0);
  }

  if (isFinished) {
    return (
      <QuizResults
        quiz={quiz}
        chosenOptionIds={chosenOptionIds}
        onRetake={retake}
      />
    );
  }

  return (
    <QuizQuestion
      topic={quiz.topic}
      question={quiz.questions[questionIndex]}
      questionNumber={questionIndex + 1}
      questionCount={quiz.questions.length}
      chosenOptionId={chosenOptionIds[questionIndex] ?? null}
      onChoose={choose}
      onNext={next}
    />
  );
}
