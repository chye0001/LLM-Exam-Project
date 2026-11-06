import { NotFoundMessage } from "@/components/not-found-message";
import { QUIZ_NOT_FOUND_MESSAGE } from "@/features/quiz/quiz.model";

export default function QuizNotFound() {
  return <NotFoundMessage title="Quiz not found" message={QUIZ_NOT_FOUND_MESSAGE} />;
}
