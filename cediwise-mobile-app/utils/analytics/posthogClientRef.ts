import type { PostHog } from "posthog-react-native";

/**
 * Lets non-React modules (e.g. authRouting, budgetSync) capture events after
 * {@link AnalyticsIdentitySync} registers the client from PostHogProvider.
 */
let clientRef: PostHog | null = null;

export function setPostHogClientForModules(client: PostHog | null): void {
  clientRef = client;
}

export function getPostHogOptional(): PostHog | null {
  return clientRef;
}
