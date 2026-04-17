import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, InteractionManager, Linking, Platform } from "react-native";

import { getActiveAppVersionPolicy, isCurrentBuildOutdated } from "@/services/versionUpdatePolicy";
import { log } from "@/utils/logger";

import { checkAndPromptUpdate } from "../services/inAppUpdates";
import { iosAppStoreUrl } from "@/constants/update";

/**
 * Hook that checks for Android in‑app updates using the native Play Store UI.
 * It runs on mount and whenever the app returns to the foreground.
 * The update flow is IMMEDIATE (blocking) as requested.
 */
export function useUpdateCheck() {
  const [mandatoryVisible, setMandatoryVisible] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const check = useCallback(() => {
    if (!mountedRef.current) return;
    if (Platform.OS === "android") {
      // Immediate update flow via Play native UI.
      void checkAndPromptUpdate({ immediate: true });
      return;
    }

    if (Platform.OS !== "ios") return;

    log.info("Checking for iOS update policy");

    // iOS: use app_versions policy (fail-open on network/check errors).
    void (async () => {
      try {
        const policy = await getActiveAppVersionPolicy();
        if (!mountedRef.current) return;
        log.info("iOS update policy", policy);
        if (!policy) return;

        const outdated = isCurrentBuildOutdated(policy.version);
        if (outdated && policy.requiresUpdate) {
          setReleaseNotes(policy.releaseNotes);
          setMandatoryVisible(true);
        } else {
          setMandatoryVisible(false);
          setReleaseNotes(null);
        }
      } catch (e) {
        log.warn("iOS update policy check failed", e);
      }
    })();
  }, []);

  const openStoreForUpdate = useCallback(async () => {
    // Allow env override. Fallback bundle-id URL works for most listings.
    const appStoreUrl =
      process.env.EXPO_PUBLIC_IOS_APP_STORE_URL ||
      iosAppStoreUrl;
    try {
      await Linking.openURL(appStoreUrl);
    } catch (e) {
      log.error("Could not open App Store URL", e);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial check after interactions to avoid blocking first paint
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      if (mountedRef.current) check();
    });
    return () => {
      const cancel = (task as { cancel?: () => void }).cancel;
      if (typeof cancel === "function") cancel();
    };
  }, [check]);

  // Re‑check when app becomes active again
  useEffect(() => {
    const handler = (nextState: any) => {
      if (nextState === "active") {
        check();
      }
    };
    const sub = AppState.addEventListener("change", handler);
    return () => sub.remove();
  }, [check]);

  // In Expo Go / dev flow, avoid blocking iOS developers.
  useEffect(() => {
    // const isExpoGo = (Constants.appOwnership ?? "") === "expo";
    // if (__DEV__ || isExpoGo) {
    //   setMandatoryVisible(false);
    // }
  }, []);

  return {
    check,
    mandatoryVisible,
    releaseNotes,
    openStoreForUpdate,
  };
}
