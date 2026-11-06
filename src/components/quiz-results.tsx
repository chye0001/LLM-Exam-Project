import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { Spinner } from "@/components/ui/spinner";
import { UngroundedLabel } from "@/components/ui/ungrounded-label";
import type { SubmittedAttempt } from "@/features/attempt/attempt.model";
import type { Quiz } from "@/features/quiz/quiz.model";
import type { ActionResult } from "@/shared/safe-action";

export type SubmitAttemptResult = ActionResult<SubmittedAttempt>;

/**
 * The end of a quiz: the score the server computed for the saved attempt, every question with the student's answer and
 * the correct option, and the excerpts the quiz was built from. An ungrounded quiz shows "Made without sources" on its
 * header and in place of the excerpts.
 */
export function QuizResults({
  quiz,
  answerIds,
  submitResult,
  onRetake,
}: {
  quiz: Quiz;
  answerIds: Record<string, string>;
  /** Null while the attempt is being saved. */
  submitResult: SubmitAttemptResult | null;
  onRetake: () => void;
}) {
  const review = quiz.questions.map((question) => {
    const correctOption = question.options.find((option) => option.isCorrect);
    const answer = question.options.find(
      (option) => option.id === answerIds[question.id],
    );
    return { question, correctOption, answer };
  });

  return (
    <article>
      <p className="text-sm text-muted">Results</p>
      <PageHeading>{quiz.topic}</PageHeading>
      {quiz.ungrounded && <UngroundedLabel />}

      <div className="mt-6 flex flex-wrap items-center gap-6">
        {submitResult === null ? (
          <p role="status" className="flex items-center gap-2 text-muted">
            <Spinner />
            Saving your attempt...
          </p>
        ) : submitResult.ok ? (
          <p className="text-3xl font-semibold tracking-tight">
            {submitResult.data.score} of {quiz.questions.length}
          </p>
        ) : (
          <p role="alert">{submitResult.error.message}</p>
        )}
        {/* Waits for the save, so a late reply can't land on the next attempt. */}
        <Button type="button" onClick={onRetake} disabled={submitResult === null}>
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
        {quiz.ungrounded ? (
          <>
            <UngroundedLabel />
            <p className="mt-2 text-sm text-muted">
              Retrieval was skipped in demo mode, so the model wrote this quiz
              from its own knowledge.
            </p>
          </>
        ) : (
          <>
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
          </>
        )}
      </section>
    </article>
  );
}
