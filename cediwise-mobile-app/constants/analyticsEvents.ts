/**
 * PostHog event names — keep in sync with product analytics taxonomy.
 * Payloads must stay non-sensitive (no tokens, no full payment amounts).
 */
export const ANALYTICS_EVENTS = {
  authLoginCompleted: "auth_login_completed",
  budgetSyncFailed: "budget_sync_failed",
  literacyLessonCompleted: "literacy_lesson_completed",
  paystackCheckoutCancelled: "paystack_checkout_cancelled",
  subscriptionFetchFailed: "subscription_fetch_failed",
} as const;
