import { connection } from "next/server";
import { Suspense } from "react";

import { generateQuiz } from "@/app/home.actions";
import { CreateQuizForm } from "@/components/create-quiz-form";
import { QuizList } from "@/components/quiz-list";
import { PageHeading } from "@/components/ui/page-heading";
import { Spinner } from "@/components/ui/spinner";
import {
  attemptService,
  demoMode,
  quizService,
} from "@/shared/dependency-container";

export default function HomePage() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <PageHeading>Revise with a quiz</PageHeading>
        <p className="text-muted">
          A local model writes five-question quizzes from the knowledge base.
        </p>
      </div>
      {/* Shows the form without the checkbox until demo mode has been read. */}
      <Suspense
        fallback={<CreateQuizForm generateQuiz={generateQuiz} demoMode={false} />}
      >
        <CreateQuizSection />
      </Suspense>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Saved quizzes</h2>
        <Suspense
          fallback={
            <p className="flex items-center gap-2 text-muted">
              <Spinner />
              Loading quizzes...
            </p>
          }
        >
          <SavedQuizzes />
        </Suspense>
      </section>
    </section>
  );
}

/** The form, with the "Skip retrieval" checkbox in demo mode. */
async function CreateQuizSection() {
  // Reads DEMO_MODE when the app runs instead of when it's built.
  await connection();
  return <CreateQuizForm generateQuiz={generateQuiz} demoMode={demoMode} />;
}

/**
 * Combines the quiz list with the best scores here, so the quiz and attempt
 * services don't depend on each other in both directions.
 */
async function SavedQuizzes() {
  // Reads the database on every request instead of at build time.
  await connection();
  const quizzes = await quizService.listQuizzes();
  const bestScoreByQuizId = await attemptService.getBestScores(
    quizzes.map((quiz) => quiz.id),
  );

  return (
    <QuizList
      quizzes={quizzes.map((quiz) => ({
        ...quiz,
        bestScore: bestScoreByQuizId.get(quiz.id) ?? null,
      }))}
    />
  );
}
