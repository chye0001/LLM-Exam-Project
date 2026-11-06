import Link from "next/link";

export default function NotFound() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted">{"That page doesn't exist."}</p>
      <Link href="/" className="inline-block text-accent underline underline-offset-4">
        Back to the home page
      </Link>
    </section>
  );
}
