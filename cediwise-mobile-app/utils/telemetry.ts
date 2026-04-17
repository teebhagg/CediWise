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
  const seen = new WeakSet<object>();
  const TOKEN_RE =
    /(bearer\s+[a-z0-9._-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+|sk_(live|test)_[a-z0-9]+)/gi;

  const walk = (val: unknown): unknown => {
    if (val == null) return val;
    if (typeof val === "string") return val.replace(TOKEN_RE, "[redacted]");
    if (typeof val !== "object") return val;
    if (seen.has(val as object)) return "[circular]";
    seen.add(val as object);
    if (Array.isArray(val)) return val.map(walk);
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      obj[k] =
        SENSITIVE_EXTRA_KEYS.has(lower) ||
        lower.includes("token") ||
        lower.includes("secret")
          ? "[redacted]"
          : walk(v);
    }
    return obj;
  };

  return walk(extra) as Record<string, unknown>;
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
