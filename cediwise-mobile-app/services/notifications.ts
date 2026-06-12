import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

import { useAnnouncementInboxStore } from "@/stores/notificationsStore";
import { supabase } from "@/utils/supabase";
import { log } from "@/utils/logger";
import { pickUnseenMessage } from "./notificationMessages";
import {
  evaluateShouldRescheduleReminders,
  pickAiReminderForDay,
  REMINDER_SCHEDULE_VERSION,
  REMINDER_SLOTS,
  shouldMigrateLegacyFrequency,
  type ReminderFrequency,
  type ReminderSlotDay,
} from "./reminderScheduleLogic";
import { getISOWeekLabel } from "@/utils/weekLabel";

const REMINDER_ID_KEY = "@cediwise_notification_weekly_reminder_id";
const REMINDER_VERSION_KEY = "@cediwise_notification_daily_reminder_version";
const REMINDER_SCHEDULED_WEEK_KEY = "@cediwise_notification_reminder_scheduled_week";
const REMINDER_USED_AI_KEY = "@cediwise_notification_reminder_used_ai";
/** Thursday slot (Expo weekday 5). Monday uses REMINDER_ID_KEY (Expo weekday 2). */
const REMINDER_ID_THURSDAY_KEY = "@cediwise_notification_daily_reminder_id_2";
const LAST_SYNC_KEY = "@cediwise_notification_last_sync";
const TOKEN_KEY = "@cediwise_notification_expo_token";
const GATE_COMPLETED_KEY = "@cediwise_notification_gate_completed";
const NEXT_ROUTE_KEY = "@cediwise_notification_gate_next_route";
const DISABLED_BY_USER_KEY = "@cediwise_notification_disabled_by_user";
const REMINDER_FREQUENCY_KEY = "@cediwise_notification_reminder_frequency";
const DEFAULT_CHANNEL_ID = "cediwise-default";
const TOKEN_REFRESH_THROTTLE_MS = 24 * 60 * 60 * 1000;

let responseListener: Notifications.EventSubscription | null = null;
let receiveListener: Notifications.EventSubscription | null = null;

let notificationUserId: string | null = null;

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
  const target =
    deepLink && deepLink.startsWith("/") ? deepLink : "/notifications/inbox";
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

export async function shouldShowNotificationPermissionGate(): Promise<boolean> {
  if (!isPushEnabled()) {
    return false;
  }
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (granted) {
      await completeNotificationGate();
      return false;
    }
  } catch {
    return !(await hasNotificationGateCompleted());
  }
  if (await hasNotificationGateCompleted()) {
    return false;
  }
  return true;
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

/** Fixed twice-weekly reminders (Monday + Thursday). Users cannot pick days. */
export async function getReminderFrequency(): Promise<ReminderFrequency> {
  const stored = await AsyncStorage.getItem(REMINDER_FREQUENCY_KEY);
  if (shouldMigrateLegacyFrequency(stored)) {
    await cancelAllReminders();
    await AsyncStorage.setItem(REMINDER_FREQUENCY_KEY, "twice_weekly");
  }
  return "twice_weekly";
}

export async function setReminderFrequency(_freq: ReminderFrequency): Promise<void> {
  await AsyncStorage.setItem(REMINDER_FREQUENCY_KEY, "twice_weekly");
  await AsyncStorage.removeItem(REMINDER_VERSION_KEY);
}

/**
 * Cancel all scheduled local reminders.
 */
async function cancelAllReminders(): Promise<void> {
  const ids = [
    await AsyncStorage.getItem(REMINDER_ID_KEY),
    await AsyncStorage.getItem(REMINDER_ID_THURSDAY_KEY),
  ];
  for (const id of ids) {
    if (id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // ignore stale IDs
      }
    }
  }
  await AsyncStorage.multiRemove([
    REMINDER_ID_KEY,
    REMINDER_ID_THURSDAY_KEY,
    REMINDER_VERSION_KEY,
    REMINDER_SCHEDULED_WEEK_KEY,
    REMINDER_USED_AI_KEY,
  ]);
}

type AIReminderRow = {
  id: string;
  day: string;
  title: string;
  body: string;
};

async function isRemindersOptedIn(userId: string): Promise<boolean> {
  if (!supabase) return true;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return true;
    const prefs = data.notification_preferences as Record<string, unknown> | null;
    return prefs?.["N-REMINDER"] !== false;
  } catch {
    return true;
  }
}

async function hasPendingAIReminders(userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { count, error } = await supabase
      .from("scheduled_reminders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("week_label", getISOWeekLabel())
      .eq("is_shown", false);

    return !error && (count ?? 0) > 0;
  } catch {
    return false;
  }
}

async function markReminderShown(reminderId: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("scheduled_reminders")
      .update({ is_shown: true, shown_at: new Date().toISOString() })
      .eq("id", reminderId)
      .eq("is_shown", false);

    if (error) {
      log.warn("Failed to mark scheduled reminder shown", error.message);
    }
  } catch (err) {
    log.warn("Failed to mark scheduled reminder shown", err);
  }
}

function handleExpenseReminderReceived(data: Record<string, unknown> | undefined): void {
  const reminderId = typeof data?.scheduled_reminder_id === "string" ? data.scheduled_reminder_id : null;
  if (reminderId) {
    void markReminderShown(reminderId);
  }
}

async function shouldRescheduleReminders(userId: string, force: boolean): Promise<boolean> {
  const [[, storedVersion], [, storedWeek], [, reminderId], [, reminderIdThursday], [, usedAi]] =
    await AsyncStorage.multiGet([
      REMINDER_VERSION_KEY,
      REMINDER_SCHEDULED_WEEK_KEY,
      REMINDER_ID_KEY,
      REMINDER_ID_THURSDAY_KEY,
      REMINDER_USED_AI_KEY,
    ]);

  return evaluateShouldRescheduleReminders({
    force,
    storedVersion,
    currentVersion: REMINDER_SCHEDULE_VERSION,
    storedWeek,
    currentWeek: getISOWeekLabel(),
    reminderId,
    reminderIdSecond: reminderIdThursday,
    usedAi,
    hasPendingAi: await hasPendingAIReminders(userId),
  });
}

/**
 * Fetch pending AI-generated reminder messages for the current week.
 * Rows are marked shown only when the local notification is delivered.
 */
async function fetchAIReminders(userId: string): Promise<AIReminderRow[]> {
  if (!supabase) return [];
  try {
    const weekLabel = getISOWeekLabel();
    const { data, error } = await supabase
      .from("scheduled_reminders")
      .select("id, scheduled_day, title, body")
      .eq("user_id", userId)
      .eq("week_label", weekLabel)
      .eq("is_shown", false);

    if (error || !data || data.length === 0) return [];

    return data.map((r: { id: string; scheduled_day: string; title: string; body: string }) => ({
      id: r.id,
      day: r.scheduled_day,
      title: r.title,
      body: r.body,
    }));
  } catch {
    return [];
  }
}

/**
 * Schedule fixed twice-weekly expense reminders (Monday + Thursday, 20:00).
 *
 * Uses AI-generated copy from the server when available, otherwise the static pool.
 */
export async function scheduleExpenseReminders(userId: string, force = false): Promise<void> {
  await getReminderFrequency();

  if (!(await isRemindersOptedIn(userId))) {
    await cancelAllReminders();
    return;
  }

  if (!(await shouldRescheduleReminders(userId, force))) {
    return;
  }

  await cancelAllReminders();

  const aiMessages = await fetchAIReminders(userId);
  let aiSlotsUsed = 0;
  const pairs: [string, string][] = [
    [REMINDER_VERSION_KEY, REMINDER_SCHEDULE_VERSION],
    [REMINDER_SCHEDULED_WEEK_KEY, getISOWeekLabel()],
  ];

  for (const slot of REMINDER_SLOTS) {
    const slotAi = pickAiReminderForDay(aiMessages, slot.day);
    let title: string;
    let body: string;
    let scheduledReminderId: string | undefined;

    if (slotAi) {
      aiSlotsUsed += 1;
      title = slotAi.title;
      body = slotAi.body;
      scheduledReminderId = slotAi.id;
    } else {
      const msg = await pickUnseenMessage(slot.day);
      title = msg.title;
      body = msg.body;
    }

    const reminderId = await scheduleWeeklyNotification(
      slot.expoWeekday,
      title,
      body,
      scheduledReminderId,
    );

    if (reminderId) {
      const storageKey = slotStorageKey(slot.day);
      pairs.push([storageKey, reminderId]);
    }
  }

  pairs.push([
    REMINDER_USED_AI_KEY,
    aiSlotsUsed === REMINDER_SLOTS.length ? "true" : "false",
  ]);
  await AsyncStorage.multiSet(pairs);
}

function slotStorageKey(day: ReminderSlotDay): string {
  return day === "monday" ? REMINDER_ID_KEY : REMINDER_ID_THURSDAY_KEY;
}

function buildReminderNotificationData(scheduledReminderId?: string): Record<string, string> {
  const data: Record<string, string> = {
    type: "expense_reminder",
    deep_link: "/expenses",
  };
  if (scheduledReminderId) {
    data.scheduled_reminder_id = scheduledReminderId;
  }
  return data;
}

async function scheduleWeeklyNotification(
  weekday: number,
  title: string,
  body: string,
  scheduledReminderId?: string,
): Promise<string | null> {
  try {
    const trigger: { type: "weekly"; weekday: number; hour: number; minute: number; channelId?: string } = {
      type: "weekly",
      weekday,
      hour: 20,
      minute: 0,
    };
    if (Platform.OS === "android") trigger.channelId = DEFAULT_CHANNEL_ID;

    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: buildReminderNotificationData(scheduledReminderId),
      },
      trigger,
    });
  } catch (err) {
    log.warn("Failed to schedule weekly notification", err);
    return null;
  }
}

/** Backward-compatible alias — prefer {@link scheduleExpenseReminders} with an explicit userId. */
export async function scheduleDailyExpenseReminder(userId?: string): Promise<void> {
  const uid = userId ?? notificationUserId;
  if (!uid) return;
  await scheduleExpenseReminders(uid);
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

export async function disablePushNotifications(userId: string): Promise<void> {
  await cancelAllReminders();
  await deactivateCurrentDeviceToken(userId);
  await AsyncStorage.setItem(DISABLED_BY_USER_KEY, "true");
}

export async function initNotificationSystem(userId: string | null): Promise<void> {
  notificationUserId = userId;

  if (!isPushEnabled()) {
    if (userId) {
      void useAnnouncementInboxStore.getState().refresh(userId);
    }
    return;
  }

  await ensureAndroidChannel();

  if (!responseListener) {
    responseListener = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      if (data?.type === "expense_reminder") {
        handleExpenseReminderReceived(data);
      }
      handleNotificationNavigation(data);
    });
  }

  if (!receiveListener) {
    receiveListener = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      if (data?.type === "expense_reminder") {
        handleExpenseReminderReceived(data);
      }
      if (notificationUserId) {
        void useAnnouncementInboxStore.getState().refresh(notificationUserId);
      }
    });
  }

  if (!userId) return;

  try {
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastResponse) {
      const data = lastResponse.notification.request.content.data as Record<string, unknown> | undefined;
      if (data?.type === "expense_reminder") {
        handleExpenseReminderReceived(data);
      }
      handleNotificationNavigation(data);
    }
  } catch (error) {
    log.warn("Notification init failed", error);
  }

  void (async () => {
    try {
      const { granted } = await Notifications.getPermissionsAsync();
      if (!granted) return;
      const enabled = await getNotificationsEnabled();
      if (!enabled) return;
      await scheduleExpenseReminders(userId);
      await refreshPushTokenIfNeeded(userId);
    } catch {
      // ignore
    }
  })();

  void useAnnouncementInboxStore.getState().refresh(userId);
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
    await scheduleExpenseReminders(userId, true);
    await syncExpoPushToken(userId);
    await AsyncStorage.removeItem(DISABLED_BY_USER_KEY);
    return true;
  } catch (error) {
    log.warn("Push enable flow failed", error);
    return false;
  }
}

export type { ReminderFrequency } from "./reminderScheduleLogic";
