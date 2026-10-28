export function formatLiveImportResultBody(summary: {
  parsed: number;
  duplicate: number;
  skipped: number;
  failed: number;
  needs_review?: number;
  retryable?: number;
  reversed?: number;
}): string {
  const parts: string[] = [];
  if (summary.parsed > 0) {
    parts.push(`${summary.parsed} expense${summary.parsed === 1 ? "" : "s"} added to your budget`);
  }
  if (summary.duplicate > 0) parts.push(`${summary.duplicate} already recorded`);
  if ((summary.reversed ?? 0) > 0) parts.push(`${summary.reversed} reversed`);
  if ((summary.needs_review ?? 0) > 0) {
    parts.push(`${summary.needs_review} need review`);
  }
  if ((summary.retryable ?? 0) > 0) parts.push(`${summary.retryable} waiting to retry`);
  if (summary.failed > 0) parts.push(`${summary.failed} could not be added`);
  if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);
  return parts.join(" · ") || "Nothing new to add";
}
