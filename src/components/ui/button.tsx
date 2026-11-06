import type { ComponentProps } from "react";

/** The one filled button style: the accent color with light text. */
export function Button({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      {...props}
    />
  );
}
