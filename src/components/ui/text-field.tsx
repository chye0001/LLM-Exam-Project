import { useId, type ComponentProps } from "react";

/** A labeled text input, with an error message under it when there is one. */
export function TextField({
  label,
  error,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; error?: string | null }) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="text"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-md border bg-transparent px-3 py-2 outline-none focus:border-accent disabled:text-muted ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
