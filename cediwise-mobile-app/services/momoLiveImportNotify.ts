import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { log } from "@/utils/logger";

const MOMO_CHANNEL_ID = "cediwise-momo-live";

async function ensureMoMoChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(MOMO_CHANNEL_ID, {
    name: "MoMo expense import",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    vibrationPattern: [0],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

/**
 * Fire an immediate local notification for MoMo live import progress.
 * Skips silently if notification permission is not granted (does not block import).
 */
export async function notifyMoMoLiveImport(options: {
  title: string;
  body: string;
}): Promise<void> {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;

    await ensureMoMoChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body,
        ...(Platform.OS === "android" ? { channelId: MOMO_CHANNEL_ID } : {}),
        data: {
          type: "momo_live_import",
          deep_link: "/profile/import-sms",
        },
      },
      trigger: null,
    });
  } catch (error) {
    log.warn("notifyMoMoLiveImport failed", error);
  }
}
