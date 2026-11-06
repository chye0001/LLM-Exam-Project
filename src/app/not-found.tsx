import Link from "next/link";

import { PageHeading } from "@/components/ui/page-heading";

export default function NotFound() {
  return (
    <section className="space-y-3">
      <PageHeading>Page not found</PageHeading>
      <p className="text-muted">{"That page doesn't exist."}</p>
      <Link href="/" className="inline-block text-accent underline underline-offset-4">
        Back to the home page
      </Link>
    </section>
  );
}
