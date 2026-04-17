import * as Sentry from "@sentry/react-native";

const SENSITIVE_EXTRA_KEYS = new Set([
  "password",
  "access_token",
  "refresh_token",
  "authorization",
  "cookie",
  "secret",
  "sk_live",
  "sk_test",
  "service_role",
]);

export type ReportErrorContext = {
  feature: string;
  operation: string;
  screen?: string;
  extra?: Record<string, unknown>;
};

function sanitizeExtras(
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extra)) {
    const lower = k.toLowerCase();
    if (
      SENSITIVE_EXTRA_KEYS.has(lower) ||
      lower.includes("token") ||
      lower.includes("secret")
    ) {
      out[k] = "[redacted]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Report a handled or boundary error to Sentry with structured tags for dashboards.
 */
export function reportError(error: unknown, ctx: ReportErrorContext): void {
  const err =
    error instanceof Error ? error : new Error(String(error ?? "Unknown error"));

  Sentry.withScope((scope) => {
    scope.setTag("feature", ctx.feature);
    scope.setTag("operation", ctx.operation);
    if (ctx.screen) {
      scope.setTag("screen", ctx.screen);
    }
    if (ctx.extra && Object.keys(ctx.extra).length > 0) {
      scope.setExtras(sanitizeExtras(ctx.extra));
    }
    Sentry.captureException(err);
  });

  if (__DEV__) {
    console.warn("[reportError]", ctx.feature, ctx.operation, err.message);
  }
}

/**
 * Bridge from react-native-logs: forward log.error payloads that include an Error.
 */
export function captureErrorFromLogger(
  levelText: string,
  msg: string,
  rawMsg: unknown,
): void {
  if (levelText !== "error") return;
  const parts = Array.isArray(rawMsg) ? rawMsg : [rawMsg];
  const err = parts.find((p): p is Error => p instanceof Error);
  if (!err) return;

  reportError(err, {
    feature: "app",
    operation: "logger",
    extra: { logMessage: msg.slice(0, 500) },
  });
}
