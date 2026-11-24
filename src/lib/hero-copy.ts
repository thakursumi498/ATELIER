/** Removes an already-highlighted trailing phrase from the plain hero line. */
export function getHeroHeadingBeforeHighlight(
  heading?: string | null,
  highlightedText?: string | null,
): string {
  const fullHeading = heading?.trim() || "";
  const highlight = highlightedText?.trim() || "";
  if (!fullHeading || !highlight) return fullHeading;

  const start = fullHeading.toLocaleLowerCase().lastIndexOf(
    highlight.toLocaleLowerCase(),
  );
  if (start < 0) return fullHeading;

  const afterHighlight = fullHeading.slice(start + highlight.length);
  if (/[\p{L}\p{N}]/u.test(afterHighlight)) return fullHeading;

  return fullHeading.slice(0, start).trimEnd();
}
