import * as Sentry from "@sentry/react-native";
import { usePathname } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";

/**
 * Keeps Sentry `screen` tag + breadcrumbs and PostHog screen events aligned with the current route.
 */
export function AnalyticsRouteObserver() {
  const pathname = usePathname();
  const posthog = usePostHog();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;

    Sentry.addBreadcrumb({
      category: "navigation",
      message: pathname,
      level: "info",
    });
    Sentry.setTag("screen", pathname);

    posthog?.capture("$screen", { $screen_name: pathname });
  }, [pathname, posthog]);

  return null;
}
