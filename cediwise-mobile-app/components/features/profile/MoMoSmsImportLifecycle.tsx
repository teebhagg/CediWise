import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { useSmsImport } from "@/hooks/useSmsImport";
import { isMoMoSmsLiveImportEnabled } from "@/utils/featureFlags";
import { pauseNativeMoMoCapture, stopAndClearNativeMoMoCapture } from "@/services/androidMoMoQueue";

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
    void hydrateUserTracking().then(() => {
      if (active) setTrackingReadyForUser(userId);
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

    const ensure = async () => {
      const liveFlag = await isMoMoSmsLiveImportEnabled(user.id);
      if (!liveFlag) {
        stopLiveListener();
        await pauseNativeMoMoCapture(user.id);
        return;
      }
      if (!sms.optedIn) {
        stopLiveListener();
        await stopAndClearNativeMoMoCapture();
        return;
      }
      if (!sms.liveListenerEnabled) {
        // Tracking is still on: pause capture but keep queued reviews.
        stopLiveListener();
        await pauseNativeMoMoCapture(user.id);
        return;
      }
      await ensureLiveListener();
      await catchUpLiveImports();
    };

    void ensure();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void ensure();
      }
    });

    return () => {
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
