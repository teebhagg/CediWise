import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { useSmsImport } from "@/hooks/useSmsImport";
import { isMoMoSmsLiveImportEnabled } from "@/utils/featureFlags";
import { pauseNativeMoMoCapture, stopAndClearNativeMoMoCapture } from "@/services/androidMoMoQueue";
import { getActiveTrackingUserId, useSmsTrackingStore } from "@/stores/smsTrackingStore";

/**
 * Keeps MoMo Auto-add aligned with auth / opt-in / foreground:
 * - JS SMS listener while CediWise is open (native lib unregisters on pause)
 * - Inbox catch-up on resume so payments made in MoMo/USSD still import
 */
export function MoMoSmsImportLifecycle() {
  const { user, isLoading: authLoading } = useAuth();
  const sms = useSmsImport({ userId: user?.id });
  const {
    catchUpLiveImports,
    ensureLiveListener,
    hydrateUserTracking,
    stopLiveListener,
  } = sms;
  const [trackingReadyForUser, setTrackingReadyForUser] = useState<string | null>(null);

  useEffect(() => {
    // A null user during the cold-start session read is not a sign-out.
    if (authLoading) return;
    if (!user?.id) {
      setTrackingReadyForUser(null);
      stopLiveListener();
      void stopAndClearNativeMoMoCapture();
      return;
    }

    let active = true;
    const userId = user.id;
    setTrackingReadyForUser(null);
    void hydrateUserTracking().then((accepted) => {
      // Only a hydration the store accepted proves persisted consent is loaded; a discarded
      // result must not signal readiness while the store still holds default (opted-out) state.
      if (active && accepted) setTrackingReadyForUser(userId);
    }).catch(() => {
      // Leave capture disabled until persisted consent can be read successfully.
    });
    return () => {
      active = false;
    };
  }, [authLoading, hydrateUserTracking, stopLiveListener, user?.id]);

  useEffect(() => {
    if (
      Platform.OS !== "android" ||
      !user?.id ||
      trackingReadyForUser !== user.id
    ) return;

    // Cleanup flips this, so a continuation from a superseded effect run takes no action.
    let cancelled = false;
    const userId = user.id;
    // Consent is read live: the render that started this run may already be out of date.
    const live = () => {
      const state = useSmsTrackingStore.getState();
      return getActiveTrackingUserId() === userId
        ? { optedIn: state.optedIn, liveListenerEnabled: state.liveListenerEnabled }
        : null;
    };

    const ensure = async () => {
      const liveFlag = await isMoMoSmsLiveImportEnabled(userId);
      if (cancelled) return;
      const consent = live();
      if (!consent) return;
      if (!liveFlag) {
        stopLiveListener();
        await pauseNativeMoMoCapture(userId);
        return;
      }
      if (!consent.optedIn) {
        stopLiveListener();
        await stopAndClearNativeMoMoCapture();
        return;
      }
      if (!consent.liveListenerEnabled) {
        // Tracking is still on: pause capture but keep queued reviews.
        stopLiveListener();
        await pauseNativeMoMoCapture(userId);
        return;
      }
      await ensureLiveListener();
      if (cancelled) return;
      await catchUpLiveImports();
    };

    void ensure();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void ensure();
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [
    catchUpLiveImports,
    ensureLiveListener,
    sms.liveListenerEnabled,
    sms.optedIn,
    stopLiveListener,
    trackingReadyForUser,
    user?.id,
  ]);

  return null;
}
