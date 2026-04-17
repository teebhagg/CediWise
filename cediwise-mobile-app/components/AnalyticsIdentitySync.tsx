import { setPostHogClientForModules } from "@/utils/analytics/posthogClientRef";
import * as Sentry from "@sentry/react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { usePostHog } from "posthog-react-native";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Platform } from "react-native";

import { useAuth } from "@/hooks/useAuth";

const SUPER_PROPS_REGISTERED = { current: false };

/**
 * Registers PostHog client for non-React modules, wires Sentry user + PostHog identify on auth changes,
 * and registers super-properties once per app process.
 */
type LastSentUser = { id: string; email: string | null; name: string | null };

export function AnalyticsIdentitySync() {
  const { user, isLoading } = useAuth();
  const posthog = usePostHog();
  const lastSentUserRef = useRef<LastSentUser | null>(null);
  useLayoutEffect(() => {
    setPostHogClientForModules(posthog);
    return () => setPostHogClientForModules(null);
  }, [posthog]);

  useEffect(() => {
    if (!posthog || SUPER_PROPS_REGISTERED.current) return;
    SUPER_PROPS_REGISTERED.current = true;
    const appVersion =
      Application.nativeApplicationVersion ??
      Constants.expoConfig?.version ??
      "unknown";
    const buildNumber =
      Application.nativeBuildVersion ??
      Constants.expoConfig?.ios?.buildNumber ??
      Constants.expoConfig?.android?.versionCode?.toString() ??
      "unknown";
    posthog.register({
      app_version: appVersion,
      build_number: String(buildNumber),
      platform: Platform.OS,
    });
  }, [posthog]);

  useEffect(() => {
    if (isLoading) return;

    if (user?.id) {
      const email = user.email ?? null;
      const name = user.name ?? null;
      const prev = lastSentUserRef.current;
      const profileChanged =
        !prev ||
        prev.id !== user.id ||
        prev.email !== email ||
        prev.name !== name;

      if (profileChanged) {
        lastSentUserRef.current = { id: user.id, email, name };
        Sentry.setUser({
          id: user.id,
          ...(user.email ? { email: user.email } : {}),
          ...(user.name ? { username: user.name } : {}),
        });
        posthog?.identify(user.id, {
          ...(user.email ? { email: user.email } : {}),
          ...(user.name ? { name: user.name } : {}),
        });
      }
    } else {
      lastSentUserRef.current = null;
      Sentry.setUser(null);
      posthog?.reset();
    }
  }, [user, isLoading, posthog]);

  return null;
}
