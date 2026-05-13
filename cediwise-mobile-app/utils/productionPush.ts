import * as Sentry from "@sentry/react-native";

/**
 * Store / “production” EAS builds inject PostHog (see eas.json `build.production.env`).
 * Dev client and preview profiles omit it — analytics stay off without relying on __DEV__ alone.
 */
export const IS_PRODUCTION_PUSH_BUILD =
  typeof __DEV__ !== "undefined" &&
  !__DEV__ &&
  Boolean(process.env.EXPO_PUBLIC_POSTHOG_API_KEY);

let productionServicesInitialized = false;

/** One-shot: Sentry + sanity-check env used by AI (Supabase → ai-chat Edge Function). */
export function initProductionPushServices(): void {
  if (!IS_PRODUCTION_PUSH_BUILD || productionServicesInitialized) return;
  productionServicesInitialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.15,
      enableAutoSessionTracking: true,
    });
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_KEY;
  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    console.warn(
      "[CediWise] Production push build missing Supabase URL or anon key; AI chat and related features may fail.",
    );
  }
}
