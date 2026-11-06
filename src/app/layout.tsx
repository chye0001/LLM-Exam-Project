import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "Quiz generator",
  description: "Quizzes written by a local model from your course material.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="border-b">
          <div className="mx-auto max-w-2xl px-6 py-5">
            <Link href="/" className="font-semibold tracking-tight">
              Quiz generator
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-12">{children}</main>
      </body>
    </html>
  );
}
