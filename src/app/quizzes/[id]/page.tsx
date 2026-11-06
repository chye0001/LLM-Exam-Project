import { notFound } from "next/navigation";

import { submitAttempt } from "@/app/quizzes/[id]/quiz.actions";
import { QuizAttempt } from "@/components/quiz-attempt";
import { quizService } from "@/shared/dependency-container";
import { NotFoundError } from "@/shared/errors";

export default async function QuizPage({
  params,
}: PageProps<"/quizzes/[id]">) {
  const { id } = await params;
  const quiz = await getQuizOrShowNotFound(id);

  return <QuizAttempt quiz={quiz} submitAttempt={submitAttempt} />;
}

async function getQuizOrShowNotFound(id: string) {
  try {
    return await quizService.getQuiz(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
}
