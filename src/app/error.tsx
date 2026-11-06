"use client";

import { PageHeading } from "@/components/ui/page-heading";

export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <section className="space-y-3">
      <PageHeading>Something went wrong</PageHeading>
      <p className="text-muted">{"The page couldn't load. Try again."}</p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-md border px-4 py-2 hover:border-accent hover:text-accent"
      >
        Try again
      </button>
    </section>
  );
}
