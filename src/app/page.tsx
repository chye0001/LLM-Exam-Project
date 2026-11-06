import { generateQuiz } from "@/app/home.actions";
import { CreateQuizForm } from "@/components/create-quiz-form";
import { PageHeading } from "@/components/ui/page-heading";

export default function HomePage() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <PageHeading>Revise with a quiz</PageHeading>
        <p className="text-muted">
          A local model writes five-question quizzes from the knowledge base.
        </p>
      </div>
      <CreateQuizForm generateQuiz={generateQuiz} />
    </section>
  );
}
