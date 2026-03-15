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
const GATE_COMPLETED_KEY = "@cediwise_notification_gate_completed";
const NEXT_ROUTE_KEY = "@cediwise_notification_gate_next_route";
const DISABLED_BY_USER_KEY = "@cediwise_notification_disabled_by_user";
const REMINDER_FREQUENCY_KEY = "@cediwise_notification_reminder_frequency";
const REMINDER_WEEKDAY_KEY = "@cediwise_notification_reminder_weekday";
const REMINDER_VERSION = "v3";
const DEFAULT_CHANNEL_ID = "cediwise-default";
const TOKEN_REFRESH_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24h

let responseListener: Notifications.EventSubscription | null = null;
let receiveListener: Notifications.EventSubscription | null = null;

const NAV_DEBOUNCE_MS = 2000;
let lastNavTime = 0;
let lastNavLink: string | null = null;

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
  const target = deepLink && deepLink.startsWith("/") ? deepLink : "/";
  const now = Date.now();
  if (target === lastNavLink && now - lastNavTime < NAV_DEBOUNCE_MS) {
    return;
  }
  lastNavLink = target;
  lastNavTime = now;
  router.push(target as never);
}

async function ensurePermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function hasNotificationGateCompleted(): Promise<boolean> {
  return (await AsyncStorage.getItem(GATE_COMPLETED_KEY)) === "true";
}

export async function completeNotificationGate(): Promise<void> {
  await AsyncStorage.setItem(GATE_COMPLETED_KEY, "true");
}

export async function setPendingNotificationRoute(route: string): Promise<void> {
  await AsyncStorage.setItem(NEXT_ROUTE_KEY, route);
}

export async function consumePendingNotificationRoute(): Promise<string | null> {
  const route = await AsyncStorage.getItem(NEXT_ROUTE_KEY);
  if (route) {
    await AsyncStorage.removeItem(NEXT_ROUTE_KEY);
  }
  return route;
}

/** Reminder frequency: daily or weekly. Weekly uses weekday from when user selected it. */
export type ReminderFrequency = "daily" | "weekly";

export async function getReminderFrequency(): Promise<ReminderFrequency> {
  const stored = await AsyncStorage.getItem(REMINDER_FREQUENCY_KEY);
  return stored === "weekly" ? "weekly" : "daily";
}

/** JS getDay(): 0=Sun, 1=Mon, ... 6=Sat. Expo weekday: 1=Mon, ..., 7=Sun. */
function jsDayToExpoWeekday(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

export async function setReminderFrequency(freq: ReminderFrequency): Promise<void> {
  await AsyncStorage.setItem(REMINDER_FREQUENCY_KEY, freq);
  if (freq === "weekly") {
    await AsyncStorage.setItem(REMINDER_WEEKDAY_KEY, String(jsDayToExpoWeekday(new Date().getDay())));
  } else {
    await AsyncStorage.removeItem(REMINDER_WEEKDAY_KEY);
  }
  // Force reschedule (clearing version makes scheduleDailyExpenseReminder run and cancel + reschedule)
  await AsyncStorage.removeItem(REMINDER_VERSION_KEY);
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
  const frequency = (await AsyncStorage.getItem(REMINDER_FREQUENCY_KEY)) === "weekly" ? "weekly" : "daily";

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
    trigger: (await (async () => {
      if (frequency === "weekly") {
        const weekdayStr = await AsyncStorage.getItem(REMINDER_WEEKDAY_KEY);
        const weekday = weekdayStr ? parseInt(weekdayStr, 10) : jsDayToExpoWeekday(new Date().getDay());
        const t: { type: "weekly"; weekday: number; hour: number; minute: number; channelId?: string } = {
          type: "weekly",
          weekday,
          hour: 18,
          minute: 0,
        };
        if (Platform.OS === "android") t.channelId = DEFAULT_CHANNEL_ID;
        return t;
      }
      const t: { type: "daily"; hour: number; minute: number; channelId?: string } = {
        type: "daily",
        hour: 18,
        minute: 0,
      };
      if (Platform.OS === "android") t.channelId = DEFAULT_CHANNEL_ID;
      return t;
    })()),
  });

  await AsyncStorage.multiSet([
    [REMINDER_ID_KEY, reminderId],
    [REMINDER_VERSION_KEY, REMINDER_VERSION],
  ]);
}

export async function syncExpoPushToken(userId: string): Promise<void> {
  if (!isPushEnabled() || !userId || !supabase) return;

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

/** Syncs push token if permission granted and last sync was longer than throttle ago (or never). */
export async function refreshPushTokenIfNeeded(userId: string): Promise<void> {
  if (!isPushEnabled() || !userId) return;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const lastSync = lastSyncStr ? new Date(lastSyncStr).getTime() : 0;
    if (Date.now() - lastSync < TOKEN_REFRESH_THROTTLE_MS) return;
    await syncExpoPushToken(userId);
  } catch {
    // ignore
  }
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

/** True if permission granted and user has not turned notifications off in app. */
export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return false;
    const disabled = await AsyncStorage.getItem(DISABLED_BY_USER_KEY);
    return disabled !== "true";
  } catch {
    return false;
  }
}

/** Turn off push: cancel local reminder and deactivate token. Does not revoke system permission. */
export async function disablePushNotifications(userId: string): Promise<void> {
  const existingReminderId = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (existingReminderId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingReminderId);
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(REMINDER_ID_KEY);
    await AsyncStorage.removeItem(REMINDER_VERSION_KEY);
  }
  await deactivateCurrentDeviceToken(userId);
  await AsyncStorage.setItem(DISABLED_BY_USER_KEY, "true");
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
  } catch (error) {
    log.warn("Notification init failed", error);
  }

  // If user has already enabled notifications (OS permission + not disabled in app): ensure reminder and token.
  void (async () => {
    try {
      const { granted } = await Notifications.getPermissionsAsync();
      if (!granted) return;
      const enabled = await getNotificationsEnabled();
      if (!enabled) return;
      await scheduleDailyExpenseReminder();
      await refreshPushTokenIfNeeded(userId);
    } catch {
      // ignore
    }
  })();
}

export async function enablePushNotifications(userId: string): Promise<boolean> {
  if (!isPushEnabled() || !userId) {
    await completeNotificationGate();
    return false;
  }

  await ensureAndroidChannel();

  const granted = await ensurePermissions();
  await completeNotificationGate();

  if (!granted) {
    log.info("Push permission denied; skipping token sync");
    return false;
  }

  try {
    await scheduleDailyExpenseReminder();
    await syncExpoPushToken(userId);
    await AsyncStorage.removeItem(DISABLED_BY_USER_KEY);
    return true;
  } catch (error) {
    log.warn("Push enable flow failed", error);
    return false;
  }
}
