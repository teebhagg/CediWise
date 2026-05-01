/**
 * Decides when to show the home-tab quick feedback modal and handles submit / dismiss.
 */

import {
  loadFeedbackPromptState,
  saveFeedbackPromptState,
  type FeedbackPromptPersisted,
} from "@/utils/feedbackPromptStorage";
import { FEEDBACK_SOURCE_MOBILE_APP } from "@/constants/feedback";
import { supabase } from "@/utils/supabase";
import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

const MIN_HOME_FOCUS_COUNT = 4;
const MIN_DAYS_AFTER_FIRST_FOCUS = 5;
const SHOW_DELAY_MS = 2800;

/** In dev builds, show on every home focus (for QA); skips cooldowns and dismiss persistence. */
const FORCE_PROMPT_EACH_FOCUS_DEV = typeof __DEV__ !== "undefined" && __DEV__;
const SHOW_DELAY_MS_DEV = 500;

const DISMISS_COOLDOWN_MS = 21 * 24 * 60 * 60 * 1000;
const AFTER_SUBMIT_COOLDOWN_MS = 75 * 24 * 60 * 60 * 1000;

function msSince(iso: string | null): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Date.now() - t;
}

type Args = {
  userId: string | undefined;
  userEmail: string | undefined;
  authLoading: boolean;
  isHomeLoading: boolean;
  setupCompleted: boolean;
  onboardingLoaded: boolean;
  /** When true, first-run tour is about to start — don't compete with it. */
  tourEligibleFirstRun: boolean;
};

export function usePeriodicFeedbackPrompt({
  userId,
  userEmail,
  authLoading,
  isHomeLoading,
  setupCompleted,
  onboardingLoaded,
  tourEligibleFirstRun,
}: Args) {
  const [modalVisible, setModalVisible] = useState(false);
  const [working, setWorking] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedThisFocusRef = useRef(false);
  const modalVisibleRef = useRef(false);
  /** Incremented on each evaluate entry and on focus cleanup — aborts stale awaits / timers. */
  const evaluationGenerationRef = useRef(0);
  /** True while the home screen focus effect is mounted (cleanup ≈ real blur; deps kept stable). */
  const focusActiveRef = useRef(false);
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    modalVisibleRef.current = modalVisible;
  }, [modalVisible]);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const persistDismiss = useCallback(async () => {
    if (FORCE_PROMPT_EACH_FOCUS_DEV) return;
    if (!userId) return;
    try {
      const prev = await loadFeedbackPromptState(userId);
      await saveFeedbackPromptState(userId, {
        ...prev,
        lastDismissedAt: new Date().toISOString(),
      });
    } catch (e) {
      // Silently ignore storage errors in dismiss flow
      console.warn("Failed to persist dismiss state:", e);
    }
  }, [userId]);

  const dismissUiOnly = useCallback(() => {
    setModalVisible(false);
    clearShowTimer();
  }, [clearShowTimer]);

  const evaluateAndMaybeSchedule = useCallback(async () => {
    const myGeneration = ++evaluationGenerationRef.current;
    const stale = () => evaluationGenerationRef.current !== myGeneration;

    clearShowTimer();
    openedThisFocusRef.current = false;

    if (FORCE_PROMPT_EACH_FOCUS_DEV) {
      if (!userId || !userEmail?.trim() || authLoading || isHomeLoading) {
        return;
      }
      showTimerRef.current = setTimeout(() => {
        showTimerRef.current = null;
        if (stale()) return;
        if (openedThisFocusRef.current) return;
        openedThisFocusRef.current = true;
        setModalVisible(true);
      }, SHOW_DELAY_MS_DEV);
      return;
    }

    if (
      !userId ||
      !userEmail?.trim() ||
      authLoading ||
      isHomeLoading ||
      !setupCompleted ||
      !onboardingLoaded ||
      tourEligibleFirstRun
    ) {
      return;
    }

    let state: FeedbackPromptPersisted;
    try {
      state = await loadFeedbackPromptState(userId);
    } catch (e) {
      console.warn("Failed to load feedback prompt state:", e);
      return;
    }
    if (stale()) return;
    if (state.neverAskAgain) return;

    const nowIso = new Date().toISOString();

    const bumped: FeedbackPromptPersisted = {
      ...state,
      homeFocusCount: state.homeFocusCount + 1,
      firstFocusAt: state.firstFocusAt ?? nowIso,
    };
    try {
      await saveFeedbackPromptState(userId, bumped);
    } catch (e) {
      console.warn("Failed to save feedback prompt state:", e);
      return;
    }
    if (stale()) return;
    if (bumped.homeFocusCount < MIN_HOME_FOCUS_COUNT) return;

    if (
      bumped.firstFocusAt &&
      msSince(bumped.firstFocusAt) <
        MIN_DAYS_AFTER_FIRST_FOCUS * 24 * 60 * 60 * 1000
    ) {
      return;
    }

    if (
      bumped.lastSubmittedAt &&
      msSince(bumped.lastSubmittedAt) < AFTER_SUBMIT_COOLDOWN_MS
    ) {
      return;
    }
    if (
      bumped.lastQuickSubmitAt &&
      msSince(bumped.lastQuickSubmitAt) < AFTER_SUBMIT_COOLDOWN_MS
    ) {
      return;
    }

    if (
      bumped.lastDismissedAt &&
      msSince(bumped.lastDismissedAt) < DISMISS_COOLDOWN_MS
    ) {
      return;
    }

    if (stale()) return;

    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null;
      if (stale()) return;
      if (openedThisFocusRef.current) return;
      openedThisFocusRef.current = true;
      setModalVisible(true);
    }, SHOW_DELAY_MS);
  }, [
    userId,
    userEmail,
    authLoading,
    isHomeLoading,
    setupCompleted,
    onboardingLoaded,
    tourEligibleFirstRun,
    clearShowTimer,
  ]);

  const evaluateAndMaybeScheduleRef = useRef(evaluateAndMaybeSchedule);
  evaluateAndMaybeScheduleRef.current = evaluateAndMaybeSchedule;

  useFocusEffect(
    useCallback(() => {
      focusActiveRef.current = true;
      void evaluateAndMaybeScheduleRef.current();
      return () => {
        focusActiveRef.current = false;
        evaluationGenerationRef.current += 1;
        clearShowTimer();
        openedThisFocusRef.current = false;
        setModalVisible(false);
      };
    }, [clearShowTimer]),
  );

  useEffect(() => {
    return () => clearShowTimer();
  }, [clearShowTimer]);

  const onLater = useCallback(async () => {
    dismissUiOnly();
    if (!userId) return;
    await persistDismiss();
  }, [dismissUiOnly, persistDismiss, userId]);

  const onNeverAsk = useCallback(async () => {
    dismissUiOnly();
    if (FORCE_PROMPT_EACH_FOCUS_DEV || !userId) return;
    await persistDismiss();
    try {
      const prev = await loadFeedbackPromptState(userId);
      await saveFeedbackPromptState(userId, {
        ...prev,
        neverAskAgain: true,
      });
    } catch (e) {
      console.warn("Failed to persist 'never ask' preference:", e);
    }
  }, [userId, dismissUiOnly, persistDismiss]);
  const submitQuickRating = useCallback(
    async (
      rating: number,
      details?: string | null,
    ): Promise<{ ok: boolean; message?: string }> => {
      if (!userId || !userEmail?.trim() || !supabase) {
        return { ok: false, message: "Sign in required to send feedback." };
      }
      if (rating < 1 || rating > 5) {
        return { ok: false, message: "Pick a star rating first." };
      }

      const trimmed = (details ?? "").trim();
      if (trimmed.length > 0 && trimmed.length < 10) {
        return {
          ok: false,
          message:
            "Feedback must be at least 10 characters, or leave the note empty.",
        };
      }

      const feedbackText =
        trimmed.length >= 10
          ? trimmed
          : "[Home check-in] Quick rating from the home screen prompt (no extra message).";

      if (submitInFlightRef.current) {
        return { ok: false, message: "Already sending — hang tight." };
      }
      submitInFlightRef.current = true;
      setWorking(true);
      try {
        const appVersion = `${Constants.expoConfig?.version ?? "unknown"} (${Platform.OS})`;
        const { error } = await supabase.from("feedback").insert({
          category: "general_comment",
          rating,
          feedback_text: feedbackText,
          email: userEmail.trim().toLowerCase(),
          is_beta: false,
          version: appVersion,
          source: FEEDBACK_SOURCE_MOBILE_APP,
        });

        if (error) {
          return { ok: false, message: error.message };
        }

        dismissUiOnly();

        if (!FORCE_PROMPT_EACH_FOCUS_DEV) {
          try {
            const prev = await loadFeedbackPromptState(userId);
            const submittedAt = new Date().toISOString();
            await saveFeedbackPromptState(userId, {
              ...prev,
              lastQuickSubmitAt: submittedAt,
              lastSubmittedAt: submittedAt,
            });
          } catch (e) {
            console.warn("Failed to persist feedback prompt submit state:", e);
          }
        }

        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        return { ok: false, message: msg };
      } finally {
        submitInFlightRef.current = false;
        setWorking(false);
      }
    },
    [userId, userEmail, dismissUiOnly],
  );

  return {
    modalVisible,
    modalWorking: working,
    onLater,
    onNeverAsk,
    submitQuickRating,
  };
}
