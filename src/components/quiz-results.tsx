import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import type { Quiz } from "@/features/quiz/quiz.model";

/**
 * The end of a quiz: the score, every question with the student's answer and
 * the correct option, and the excerpts the quiz was built from.
 */
export function QuizResults({
  quiz,
  answerIds,
  onRetake,
}: {
  quiz: Quiz;
  answerIds: string[];
  onRetake: () => void;
}) {
  const review = quiz.questions.map((question, index) => {
    const correctOption = question.options.find((option) => option.isCorrect);
    const answer = question.options.find(
      (option) => option.id === answerIds[index],
    );
    return { question, correctOption, answer };
  });
  const score = review.filter(({ answer }) => answer?.isCorrect).length;

  return (
    <article>
      <p className="text-sm text-muted">Results</p>
      <PageHeading>{quiz.topic}</PageHeading>

      <div className="mt-6 flex flex-wrap items-center gap-6">
        <p className="text-3xl font-semibold tracking-tight">
          {score} of {quiz.questions.length}
        </p>
        <Button type="button" onClick={onRetake}>
          Retake
        </Button>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Review</h2>
        <ol className="mt-4 space-y-6">
          {review.map(({ question, correctOption, answer }, index) => (
            <li key={question.id} className="border-t pt-6">
              <p className="font-medium">
                <span className="text-muted">{index + 1}.</span> {question.text}
              </p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted">Your answer:</dt>
                  <dd className={answer?.isCorrect ? "text-accent" : ""}>
                    {answer?.text}
                    {answer?.isCorrect ? " (right)" : " (wrong)"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">Correct option:</dt>
                  <dd>{correctOption?.text}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Excerpts</h2>
        <p className="mt-1 text-sm text-muted">
          The excerpts this quiz was written from, closest match first.
        </p>
        <ul className="mt-4 space-y-4">
          {quiz.excerpts.map((excerpt) => (
            <li key={excerpt.id} className="rounded-md border p-4">
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-medium">{excerpt.sourceTitle}</p>
                <p className="text-sm text-muted">
                  Similarity {excerpt.similarity.toFixed(2)}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-muted">
                {excerpt.text}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
