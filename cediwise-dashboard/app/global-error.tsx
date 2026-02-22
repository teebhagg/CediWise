"use client";

/**
 * Catches errors in the root layout. Must define its own html/body
 * because the root layout may have failed to render.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 dark:bg-gray-950">
        <h1 className="text-xl font-semibold">Application error</h1>
        <p className="max-w-md text-center text-sm text-gray-600 dark:text-gray-400">
          A critical error occurred. Please refresh the page or try again later.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
