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
  aiAnalysisRequested: (payload?: EventPayload) =>
    emit("ai_analysis_requested", payload),
  aiAnalysisReceived: (payload?: EventPayload) =>
    emit("ai_analysis_received", payload),
  aiAnalysisError: (payload?: EventPayload) =>
    emit("ai_analysis_error", payload),
  aiSummaryTapped: (payload?: EventPayload) =>
    emit("ai_summary_tapped", payload),
  aiChatSessionOpened: (payload?: EventPayload) =>
    emit("ai_chat_session_opened", payload),
  aiChatMessageSent: (payload?: EventPayload) =>
    emit("ai_chat_message_sent", payload),
  aiChatMessageReceived: (payload?: EventPayload) =>
    emit("ai_chat_message_received", payload),
  aiChatLimitReached: (payload?: EventPayload) =>
    emit("ai_chat_limit_reached", payload),
  aiQuickPromptTapped: (payload?: EventPayload) =>
    emit("ai_quick_prompt_tapped", payload),
  aiSuggestionChipTapped: (payload?: EventPayload) =>
    emit("ai_suggestion_chip_tapped", payload),
  aiActionConfirmed: (payload?: EventPayload) =>
    emit("ai_action_confirmed", payload),
  aiActionCancelled: (payload?: EventPayload) =>
    emit("ai_action_cancelled", payload),
  track: (eventName: string, payload?: EventPayload) =>
    emit(eventName, payload),
} as const;
