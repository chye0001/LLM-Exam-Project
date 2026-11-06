"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { UngroundedLabel } from "@/components/ui/ungrounded-label";
import type { Question } from "@/features/quiz/quiz.model";

/**
 * One question with its four options. Picking an option locks the question
 * and shows whether it was right, the correct option and the explanation.
 * Keys 1 to 4 pick an option and Enter moves on.
 */
export function QuizQuestion({
  topic,
  ungrounded,
  question,
  questionNumber,
  questionCount,
  answerId,
  onChoose,
  onNext,
}: {
  topic: string;
  /** Whether the quiz was made without retrieval in demo mode. */
  ungrounded: boolean;
  question: Question;
  questionNumber: number;
  questionCount: number;
  answerId: string | null;
  onChoose: (optionId: string) => void;
  onNext: () => void;
}) {
  const isLocked = answerId !== null;
  const isLastQuestion = questionNumber === questionCount;
  const answer = question.options.find((option) => option.id === answerId);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // Leaves Enter on a link, such as the header's, to the browser.
      if (event.target instanceof Element && event.target.closest("a")) return;

      const option = question.options[Number(event.key) - 1];
      if (!isLocked && option) {
        event.preventDefault();
        onChoose(option.id);
      } else if (isLocked && event.key === "Enter") {
        // Stops a focused button from also handling the same Enter.
        event.preventDefault();
        onNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [question, isLocked, onChoose, onNext]);

  return (
    <article>
      <p className="text-sm text-muted">
        Question {questionNumber} of {questionCount}
      </p>
      <PageHeading>{topic}</PageHeading>
      {ungrounded && <UngroundedLabel />}

      <h2 className="mt-10 text-lg font-medium">{question.text}</h2>

      <ol className="mt-6 space-y-2">
        {question.options.map((option, optionIndex) => {
          const isChosen = option.id === answerId;
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onChoose(option.id)}
                className={`flex w-full items-baseline gap-3 rounded-md border px-4 py-3 text-left ${optionStyle(isLocked, isChosen, option.isCorrect)}`}
              >
                <span className="text-sm text-muted">{optionIndex + 1}</span>
                <span className="flex-1">{option.text}</span>
                {isLocked && option.isCorrect && (
                  <span className="text-sm font-medium text-accent">
                    Correct option
                  </span>
                )}
                {isLocked && isChosen && !option.isCorrect && (
                  <span className="text-sm font-medium">Your answer</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {answer && (
        <div className="mt-6 space-y-4">
          <p role="status" className="font-medium">
            {answer.isCorrect ? (
              <span className="text-accent">Right.</span>
            ) : (
              "Not quite."
            )}
          </p>
          <p className="text-muted">{question.explanation}</p>
          {/* Focus moves here, because the picked option is now disabled. */}
          <Button type="button" onClick={onNext} autoFocus>
            {isLastQuestion ? "See results" : "Next"}
          </Button>
          <p className="text-sm text-muted">Press Enter to continue.</p>
        </div>
      )}

      {!isLocked && (
        <p className="mt-6 text-sm text-muted">
          Pick an option, or press 1 to 4.
        </p>
      )}
    </article>
  );
}

function optionStyle(isLocked: boolean, isChosen: boolean, isCorrect: boolean) {
  if (!isLocked) return "hover:border-accent";
  if (isCorrect) return "border-accent bg-accent-soft";
  if (isChosen) return "border-foreground";
  return "text-muted";
}
