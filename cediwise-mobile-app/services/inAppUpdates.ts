// services/inAppUpdates.ts
import Constants from "expo-constants";
import { Platform } from "react-native";
import SpInAppUpdates, { IAUUpdateKind } from "sp-react-native-in-app-updates";
import { log } from "../utils/logger";

// Initialize the library; enable debug in development builds
const inAppUpdates = new SpInAppUpdates(__DEV__);

/**
 * Checks for an update and, if one is available, starts the native update flow.
 * @param opts.curVersion Optional current version string (defaults to expo config version).
 * @param opts.immediate If true, uses IMMEDIATE update type (blocking UI). Otherwise FLEXIBLE.
 */
export async function checkAndPromptUpdate(opts?: {
  curVersion?: string;
  immediate?: boolean;
}) {
  try {
    const version =
      opts?.curVersion ?? Constants.expoConfig?.version ?? "0.0.0";
    const result = await inAppUpdates.checkNeedsUpdate({ curVersion: version });

    if (result?.shouldUpdate && Platform.OS === "android") {
      await inAppUpdates.startUpdate({
        updateType: opts?.immediate
          ? IAUUpdateKind.IMMEDIATE
          : IAUUpdateKind.FLEXIBLE,
      });
    }
  } catch (e) {
    log.error("In‑app update failed", e);
    // Swallow errors – we don’t want the app to crash because of update checks.
  }
}
