import { PageHeading } from "@/components/ui/page-heading";

export default function HomePage() {
  return (
    <section className="space-y-3">
      <PageHeading>Revise with a quiz</PageHeading>
      <p className="text-muted">
        A local model writes five-question quizzes from the knowledge base.
      </p>
    </section>
  );
}
