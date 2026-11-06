/** Marks a quiz the model wrote without retrieval, so nobody mistakes it for a grounded quiz. */
export function UngroundedLabel() {
  return (
    <p className="mt-2 inline-block rounded-sm border px-2 py-0.5 text-sm font-medium">
      Made without sources
    </p>
  );
}
