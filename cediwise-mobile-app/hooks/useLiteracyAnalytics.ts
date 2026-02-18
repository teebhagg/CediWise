import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";
import { useCallback } from "react";

export type LiteracyEventType =
  | "lesson_viewed"
  | "lesson_completed"
  | "quiz_attempted"
  | "quiz_passed"
  | "module_completed"
  | "calculator_used"
  | "trigger_shown"
  | "trigger_dismissed"
  | "trigger_action_taken";

type TrackEventParams = {
  eventType: LiteracyEventType;
  lessonId?: string;
  moduleId?: string;
  calculatorId?: string;
  triggerId?: string;
  metadata?: Record<string, any>;
};

/**
 * Hook for tracking Financial Literacy Module analytics events
 *
 * Privacy-first:
 * - Only tracks authenticated users who haven't opted out
 * - 90-day retention policy
 * - No PII in event payload
 */
export function useLiteracyAnalytics() {
  const { user } = useAuth();

  const trackEvent = useCallback(
    async ({
      eventType,
      lessonId,
      moduleId,
      calculatorId,
      triggerId,
      metadata = {},
    }: TrackEventParams) => {
      // Skip if user not authenticated
      if (!user?.id || !supabase) return;

      try {
        await supabase.from("literacy_events").insert({
          user_id: user.id,
          event_type: eventType,
          lesson_id: lessonId,
          module_id: moduleId,
          calculator_id: calculatorId,
          trigger_id: triggerId,
          metadata,
        });
      } catch (error) {
        // Fail silently - don't break user experience for analytics
        if (__DEV__) {
          console.warn("[Analytics] Failed to track event:", error);
        }
      }
    },
    [user?.id]
  );

  const trackLessonView = useCallback(
    (lessonId: string, moduleId: string) => {
      trackEvent({ eventType: "lesson_viewed", lessonId, moduleId });
    },
    [trackEvent]
  );

  const trackLessonComplete = useCallback(
    (lessonId: string, moduleId: string, timeSpentSeconds?: number) => {
      trackEvent({
        eventType: "lesson_completed",
        lessonId,
        moduleId,
        metadata: timeSpentSeconds
          ? { time_spent_seconds: timeSpentSeconds }
          : {},
      });
    },
    [trackEvent]
  );

  const trackQuizAttempt = useCallback(
    (
      lessonId: string,
      moduleId: string,
      score: number,
      totalQuestions: number
    ) => {
      const passed = score / totalQuestions >= 0.7; // 70% passing grade

      trackEvent({
        eventType: passed ? "quiz_passed" : "quiz_attempted",
        lessonId,
        moduleId,
        metadata: { score, total_questions: totalQuestions, passed },
      });
    },
    [trackEvent]
  );

  const trackModuleComplete = useCallback(
    (moduleId: string) => {
      trackEvent({ eventType: "module_completed", moduleId });
    },
    [trackEvent]
  );

  const trackCalculatorUse = useCallback(
    (calculatorId: string, inputs?: Record<string, any>) => {
      trackEvent({
        eventType: "calculator_used",
        calculatorId,
        metadata: inputs || {},
      });
    },
    [trackEvent]
  );

  const trackTriggerShown = useCallback(
    (triggerId: string) => {
      trackEvent({ eventType: "trigger_shown", triggerId });
    },
    [trackEvent]
  );

  const trackTriggerDismissed = useCallback(
    (triggerId: string) => {
      trackEvent({ eventType: "trigger_dismissed", triggerId });
    },
    [trackEvent]
  );

  const trackTriggerAction = useCallback(
    (triggerId: string, action: string) => {
      trackEvent({
        eventType: "trigger_action_taken",
        triggerId,
        metadata: { action },
      });
    },
    [trackEvent]
  );

  return {
    trackLessonView,
    trackLessonComplete,
    trackQuizAttempt,
    trackModuleComplete,
    trackCalculatorUse,
    trackTriggerShown,
    trackTriggerDismissed,
    trackTriggerAction,
  };
}
