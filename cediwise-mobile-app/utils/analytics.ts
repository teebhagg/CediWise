/**
 * Analytics event stubs for Phase 1 instrumentation.
 * Wire to your analytics provider (Amplitude, Mixpanel, etc.) as needed.
 * No PII; events are safe to send.
 */

import { log } from "./logger";

type EventPayload = Record<string, string | number | boolean | null | undefined>;

function emit(eventName: string, payload?: EventPayload) {
  if (__DEV__) {
    log.debug(`[Analytics] ${eventName}`, payload ?? {});
  }
  // TODO: Send to analytics provider
  // e.g. analytics.track(eventName, payload);
}

export const analytics = {
  onboardingValueFirstStart: (payload?: EventPayload) => {
    emit("onboarding_value_first_start", payload);
  },
  onboardingEssentialCompleted: (payload?: EventPayload) => {
    emit("OnboardingEssentialCompleted", payload);
  },
  vitalsCompleteAfterTour: (payload?: EventPayload) => {
    emit("vitals_complete_after_tour", payload);
  },
  personalizationBannerView: (payload?: EventPayload) => {
    emit("personalization_banner_view", payload);
  },
  personalizationBannerClick: (payload?: EventPayload) => {
    emit("personalization_banner_click", payload);
  },
  vitalsStartFromBanner: (payload?: EventPayload) => {
    emit("vitals_start_from_banner", payload);
  },
  tourHandoffHomeToBudget: (payload?: EventPayload) => {
    emit("tour_handoff_home_to_budget", payload);
  },
  tourHandoffBudgetToLearn: (payload?: EventPayload) => {
    emit("tour_handoff_budget_to_learn", payload);
  },
  tourHandoffAccept: (payload?: EventPayload) => {
    emit("tour_handoff_accept", payload);
  },
  tourHandoffSkip: (payload?: EventPayload) => {
    emit("tour_handoff_skip", payload);
  },
  budgetCreated: (payload?: EventPayload) => {
    emit("BudgetCreated", payload);
  },
  budgetTemplateApplied: (payload?: EventPayload) => {
    emit("BudgetTemplateApplied", payload);
  },
  budgetFirstViewShown: (payload?: EventPayload) => {
    emit("BudgetFirstViewShown", payload);
  },
  tourStartedCoreBudget: (payload?: EventPayload) => {
    emit("TourStarted_CoreBudget", payload);
  },
  tourCompletedCoreBudget: (payload?: EventPayload) => {
    emit("TourCompleted_CoreBudget", payload);
  },
  tourSkippedCoreBudget: (payload?: EventPayload) => {
    emit("TourSkipped_CoreBudget", payload);
  },
} as const;
