import { PageHeading } from "@/components/ui/page-heading";
import type { Quiz } from "@/features/quiz/quiz.model";

/** The whole quiz on one page, with each correct option marked and every explanation shown. */
export function QuizOverview({ quiz }: { quiz: Quiz }) {
  return (
    <article>
      <PageHeading>{quiz.topic}</PageHeading>

      <ol className="mt-10 space-y-12">
        {quiz.questions.map((question, questionIndex) => (
          <li key={question.id}>
            <h2 className="font-medium">
              <span className="text-muted">{questionIndex + 1}.</span>{" "}
              {question.text}
            </h2>

            <ol className="mt-4 space-y-2">
              {question.options.map((option, optionIndex) => (
                <li
                  key={option.id}
                  className={`flex items-baseline gap-3 rounded-md border px-4 py-3 ${
                    option.isCorrect ? "border-accent bg-accent-soft" : ""
                  }`}
                >
                  <span className="text-sm text-muted">{optionIndex + 1}</span>
                  <span className="flex-1">{option.text}</span>
                  {option.isCorrect && (
                    <span className="text-sm font-medium text-accent">
                      Correct
                    </span>
                  )}
                </li>
              ))}
            </ol>

            <p className="mt-3 text-sm text-muted">{question.explanation}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
