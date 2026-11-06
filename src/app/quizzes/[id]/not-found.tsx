import Link from "next/link";

import { PageHeading } from "@/components/ui/page-heading";

export default function QuizNotFound() {
  return (
    <section className="space-y-3">
      <PageHeading>Quiz not found</PageHeading>
      <p className="text-muted">{"That quiz doesn't exist."}</p>
      <Link href="/" className="inline-block text-accent underline underline-offset-4">
        Back to the home page
      </Link>
    </section>
  );
}
