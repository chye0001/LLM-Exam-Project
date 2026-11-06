import Link from "next/link";

export default function QuizNotFound() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Quiz not found</h1>
      <p className="text-muted">{"That quiz doesn't exist."}</p>
      <Link href="/" className="inline-block text-accent underline underline-offset-4">
        Back to the home page
      </Link>
    </section>
  );
}
