export type WaitWhileOptions = {
  /** Polling interval in ms. */
  intervalMs?: number;
  /** Stop waiting after this many ms even if predicate is still true. */
  timeoutMs?: number;
};

/**
 * Resolves when `predicate()` is false, or after `timeoutMs`.
 * Use after pull-to-refresh work so the spinner stays until stores finish loading.
 */
export async function waitWhile(
  predicate: () => boolean,
  options?: WaitWhileOptions,
): Promise<void> {
  const intervalMs = options?.intervalMs ?? 48;
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;
  while (predicate()) {
    if (Date.now() > deadline) break;
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }
}
