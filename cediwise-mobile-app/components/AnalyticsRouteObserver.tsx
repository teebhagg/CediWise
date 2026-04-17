import * as Sentry from "@sentry/react-native";
import { usePathname } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";

/** Matches UUID-shaped path segments (8-4-4-4-12 hex). */
const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Collapses high-cardinality path pieces into stable route templates for analytics.
 * UUID and numeric-only segments become `[id]`; other segments are left as-is.
 */
function normalizeRoutePath(pathname: string): string {
  if (!pathname) return pathname;
  return pathname
    .split("/")
    .map((segment) => {
      if (!segment) return "";
      if (UUID_SEGMENT.test(segment)) return "[id]";
      if (/^\d+$/.test(segment)) return "[id]";
      return segment;
    })
    .join("/");
}

/**
 * Keeps Sentry `screen` tag + breadcrumbs and PostHog `screen` aligned with the current route.
 * Emits normalized templates (UUID and numeric-only segments → `[id]`) to limit cardinality;
 * `lastPathRef` still uses the raw pathname so distinct URLs do not dedupe incorrectly.
 */
export function AnalyticsRouteObserver() {
  const pathname = usePathname();
  const posthog = usePostHog();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;

    const normalizedPath = normalizeRoutePath(pathname);

    Sentry.addBreadcrumb({
      category: "navigation",
      message: normalizedPath,
      level: "info",
    });
    Sentry.setTag("screen", normalizedPath);

    posthog?.screen(normalizedPath);
  }, [pathname, posthog]);

  return null;
}
