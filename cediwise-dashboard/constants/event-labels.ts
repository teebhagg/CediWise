const STANDARD_LABELS: Record<string, string> = {
  $pageview: "Page View",
  $screen: "Screen View",
  $identify: "User Identified",
  $session: "Session Started",
  $autocapture: "Click",
  $pageleave: "Page Leave",
};

export function readableEventName(raw: string): string {
  if (STANDARD_LABELS[raw]) return STANDARD_LABELS[raw];
  return raw
    .replace(/^[^a-zA-Z]+/, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
