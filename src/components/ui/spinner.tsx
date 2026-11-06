/** A small turning ring in the current text color. Screen readers skip it, so pair it with text. */
export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}
