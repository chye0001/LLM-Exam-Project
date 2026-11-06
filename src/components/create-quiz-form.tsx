"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/ui/text-field";
import type { ActionResult } from "@/shared/safe-action";

/**
 * The topic field and the "Create quiz" button, plus the "Skip retrieval"
 * checkbox in demo mode. While the model writes the
 * quiz, the form is locked. On success it opens the new quiz, and on failure
 * it shows the error under the field.
 */
export function CreateQuizForm({
  generateQuiz,
  demoMode,
}: {
  generateQuiz: (formData: FormData) => Promise<ActionResult<{ quizId: string }>>;
  demoMode: boolean;
}) {
  const router = useRouter();
  const [isWriting, startWriting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startWriting(async () => {
      const result = await generateQuiz(formData);
      if (result.ok) {
        // Inside the transition, so the form stays locked until the quiz has opened.
        router.push(`/quizzes/${result.data.quizId}`);
      } else {
        setError(result.error.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField
        label="Topic"
        name="topic"
        placeholder="For example: embeddings"
        autoComplete="off"
        disabled={isWriting}
        error={error}
      />
      {demoMode && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="skipRetrieval"
            disabled={isWriting}
            className="accent-accent"
          />
          Skip retrieval
        </label>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isWriting}>
          {isWriting ? (
            <>
              <Spinner />
              Writing your quiz...
            </>
          ) : (
            "Create quiz"
          )}
        </Button>
        {isWriting && (
          <p className="text-sm text-muted">
            This can take a minute or more on a laptop.
          </p>
        )}
      </div>
    </form>
  );
}
