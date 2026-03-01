import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

import { supabase } from "@/utils/supabase";
import { log } from "@/utils/logger";

const REMINDER_ID_KEY = "@cediwise_notification_daily_reminder_id";
const REMINDER_VERSION_KEY = "@cediwise_notification_daily_reminder_version";
const LAST_SYNC_KEY = "@cediwise_notification_last_sync";
const TOKEN_KEY = "@cediwise_notification_expo_token";
const REMINDER_VERSION = "v1";
const DEFAULT_CHANNEL_ID = "cediwise-default";

let responseListener: Notifications.EventSubscription | null = null;
let receiveListener: Notifications.EventSubscription | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function isPushEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_PUSH_REGISTRATION !== "false";
}

function resolveProjectId(): string | undefined {
  const fromEas = (Constants.easConfig as { projectId?: string } | null)?.projectId;
  const fromExpo = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromEas || fromExpo;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: "CediWise Alerts",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

function handleNotificationNavigation(data: Record<string, unknown> | undefined) {
  const deepLink = typeof data?.deep_link === "string" ? data.deep_link : null;
  if (deepLink && deepLink.startsWith("/")) {
    router.push(deepLink as never);
    return;
  }
  router.push("/" as never);
}

async function ensurePermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function upsertPushDevice(userId: string, expoPushToken: string) {
  if (!supabase) return;

  const appVersion = Constants.expoConfig?.version ?? "unknown";
  const deviceLabel = Constants.deviceName ?? `${Platform.OS}-${Platform.Version}`;

  const { error } = await supabase
    .from("push_devices")
    .upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        platform: Platform.OS,
        app_version: appVersion,
        device_label: deviceLabel,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "expo_push_token" }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function scheduleDailyExpenseReminder(): Promise<void> {
  const storedVersion = await AsyncStorage.getItem(REMINDER_VERSION_KEY);
  const existingReminderId = await AsyncStorage.getItem(REMINDER_ID_KEY);

  if (storedVersion === REMINDER_VERSION && existingReminderId) {
    return;
  }

  if (existingReminderId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingReminderId);
    } catch {
      // ignore stale IDs
    }
  }

  const reminderId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Log today’s expenses",
      body: "Spend 30 seconds to keep your budget accurate.",
      data: {
        type: "daily_expense_reminder",
        deep_link: "/expenses",
      },
    },
    trigger: {
      hour: 18,
      minute: 0,
      repeats: true,
      channelId: Platform.OS === "android" ? DEFAULT_CHANNEL_ID : undefined,
    },
  });

  await AsyncStorage.multiSet([
    [REMINDER_ID_KEY, reminderId],
    [REMINDER_VERSION_KEY, REMINDER_VERSION],
  ]);
}

export async function syncExpoPushToken(userId: string): Promise<void> {
  if (!isPushEnabled() || !userId || !supabase) return;

  await ensureAndroidChannel();

  const granted = await ensurePermissions();
  if (!granted) {
    log.info("Push permission denied; skipping token sync");
    return;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    log.warn("EAS project ID missing, unable to fetch Expo push token");
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = token.data;

  if (!expoPushToken) {
    return;
  }

  await upsertPushDevice(userId, expoPushToken);

  await AsyncStorage.multiSet([
    [TOKEN_KEY, expoPushToken],
    [LAST_SYNC_KEY, new Date().toISOString()],
  ]);
}

export async function deactivateCurrentDeviceToken(userId: string): Promise<void> {
  if (!userId || !supabase) return;

  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;

  const { error } = await supabase
    .from("push_devices")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("expo_push_token", token);

  if (error) {
    log.warn("Failed to deactivate push token", error.message);
  }
}

export async function initNotificationSystem(userId: string | null): Promise<void> {
  if (!isPushEnabled()) return;

  await ensureAndroidChannel();

  if (!responseListener) {
    responseListener = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      handleNotificationNavigation(data);
    });
  }

  if (!receiveListener) {
    receiveListener = Notifications.addNotificationReceivedListener(() => {
      // Keep default foreground behavior from setNotificationHandler.
    });
  }

  if (!userId) return;

  try {
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse) {
      const data = lastResponse.notification.request.content.data as Record<string, unknown> | undefined;
      handleNotificationNavigation(data);
    }

    const granted = await ensurePermissions();
    if (!granted) return;

    await scheduleDailyExpenseReminder();
    await syncExpoPushToken(userId);
  } catch (error) {
    log.warn("Notification init failed", error);
  }
}
