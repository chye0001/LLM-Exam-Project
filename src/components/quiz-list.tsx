import Link from "next/link";

import type { QuizSummary } from "@/features/quiz/quiz.model";

/** A row in the quiz list: a saved quiz and the student's best score, or null if nobody has taken it. */
export type QuizListItem = QuizSummary & { bestScore: number | null };

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** The saved quizzes in the order given. Each row opens its quiz. */
export function QuizList({ quizzes }: { quizzes: QuizListItem[] }) {
  if (quizzes.length === 0) {
    return <p className="text-muted">No saved quizzes yet.</p>;
  }

  return (
    <ul className="divide-y border-y">
      {quizzes.map((quiz) => (
        <li key={quiz.id}>
          <Link
            href={`/quizzes/${quiz.id}`}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-2 py-3 hover:bg-accent-soft"
          >
            <span className="font-medium">{quiz.topic}</span>
            <span className="flex gap-6 text-sm text-muted">
              <span>{quiz.questionCount} questions</span>
              <time dateTime={quiz.createdAt.toISOString()}>
                {dateFormat.format(quiz.createdAt)}
              </time>
              {quiz.bestScore !== null && (
                <span className="text-accent">
                  Best {quiz.bestScore} of {quiz.questionCount}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
