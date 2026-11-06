import Link from "next/link";

import { PageHeading } from "@/components/ui/page-heading";

export function NotFoundMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="space-y-3">
      <PageHeading>{title}</PageHeading>
      <p className="text-muted">{message}</p>
      <Link href="/" className="inline-block text-accent underline underline-offset-4">
        Back to the home page
      </Link>
    </section>
  );
}
