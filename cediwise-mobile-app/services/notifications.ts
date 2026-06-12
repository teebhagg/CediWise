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
  DEFAULT_WEEKLY_WEEKDAY,
  evaluateShouldRescheduleReminders,
  pickWeeklyAiReminder,
  REMINDER_SCHEDULE_VERSION,
  shouldMigrateLegacyFrequency,
  type ReminderFrequency,
} from "./reminderScheduleLogic";
import { getISOWeekLabel } from "@/utils/weekLabel";

const REMINDER_ID_KEY = "@cediwise_notification_weekly_reminder_id";
const REMINDER_VERSION_KEY = "@cediwise_notification_daily_reminder_version";
const REMINDER_SCHEDULED_WEEK_KEY = "@cediwise_notification_reminder_scheduled_week";
const REMINDER_USED_AI_KEY = "@cediwise_notification_reminder_used_ai";
/** @deprecated Legacy second slot from twice-weekly reminders. Cleared on migrate. */
const LEGACY_REMINDER_ID_SECOND_KEY = "@cediwise_notification_daily_reminder_id_2";
const LAST_SYNC_KEY = "@cediwise_notification_last_sync";
const TOKEN_KEY = "@cediwise_notification_expo_token";
const GATE_COMPLETED_KEY = "@cediwise_notification_gate_completed";
const NEXT_ROUTE_KEY = "@cediwise_notification_gate_next_route";
const DISABLED_BY_USER_KEY = "@cediwise_notification_disabled_by_user";
const REMINDER_FREQUENCY_KEY = "@cediwise_notification_reminder_frequency";
const REMINDER_WEEKDAY_KEY = "@cediwise_notification_reminder_weekday";
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

/** Weekly expense reminders only (`daily` / `twice_weekly` are migrated away). */
export async function getReminderFrequency(): Promise<ReminderFrequency> {
  const stored = await AsyncStorage.getItem(REMINDER_FREQUENCY_KEY);
  if (shouldMigrateLegacyFrequency(stored)) {
    await AsyncStorage.setItem(REMINDER_FREQUENCY_KEY, "weekly");
    const weekdayStr = await AsyncStorage.getItem(REMINDER_WEEKDAY_KEY);
    if (!weekdayStr) {
      await AsyncStorage.setItem(
        REMINDER_WEEKDAY_KEY,
        String(DEFAULT_WEEKLY_WEEKDAY),
      );
    }
    await AsyncStorage.removeItem(REMINDER_VERSION_KEY);
  }
  return "weekly";
}

/** JS getDay(): 0=Sun, 1=Mon, ... 6=Sat. Expo weekday: 1=Mon, ..., 7=Sun. */
function jsDayToExpoWeekday(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

export async function setReminderFrequency(_freq: ReminderFrequency): Promise<void> {
  await AsyncStorage.setItem(REMINDER_FREQUENCY_KEY, "weekly");
  const weekdayStr = await AsyncStorage.getItem(REMINDER_WEEKDAY_KEY);
  if (!weekdayStr) {
    await AsyncStorage.setItem(
      REMINDER_WEEKDAY_KEY,
      String(DEFAULT_WEEKLY_WEEKDAY),
    );
  }
  await AsyncStorage.removeItem(REMINDER_VERSION_KEY);
}

/**
 * Cancel all scheduled local reminders.
 */
async function cancelAllReminders(): Promise<void> {
  const ids = [
    await AsyncStorage.getItem(REMINDER_ID_KEY),
    await AsyncStorage.getItem(LEGACY_REMINDER_ID_SECOND_KEY),
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
    LEGACY_REMINDER_ID_SECOND_KEY,
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
    await supabase
      .from("scheduled_reminders")
      .update({ is_shown: true, shown_at: new Date().toISOString() })
      .eq("id", reminderId)
      .eq("is_shown", false);
  } catch {
    // ignore
  }
}

function handleExpenseReminderReceived(data: Record<string, unknown> | undefined): void {
  const reminderId = typeof data?.scheduled_reminder_id === "string" ? data.scheduled_reminder_id : null;
  if (reminderId) {
    void markReminderShown(reminderId);
  }
}

async function shouldRescheduleReminders(userId: string, force: boolean): Promise<boolean> {
  const [[, storedVersion], [, storedWeek], [, reminderId], [, usedAi]] = await AsyncStorage.multiGet([
    REMINDER_VERSION_KEY,
    REMINDER_SCHEDULED_WEEK_KEY,
    REMINDER_ID_KEY,
    REMINDER_USED_AI_KEY,
  ]);

  return evaluateShouldRescheduleReminders({
    force,
    storedVersion,
    currentVersion: REMINDER_SCHEDULE_VERSION,
    storedWeek,
    currentWeek: getISOWeekLabel(),
    reminderId,
    usedAi,
    hasPendingAi: await hasPendingAIReminders(userId),
  });
}

/**
 * Check if the user already logged expenses today.
 */
async function hasLoggedExpensesToday(userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { count, error } = await supabase
      .from("budget_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("occurred_at", today)
      .lt("occurred_at", new Date(Date.now() + 86400000).toISOString().slice(0, 10))
      .limit(1);

    if (error) return false;
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
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
 * Get the next date that matches the given weekday.
 * Expo weekday: 1=Mon, ..., 7=Sun.
 */
function getNextWeekdayDate(weekday: number, hour: number, minute: number): Date {
  const now = new Date();
  const currentDay = jsDayToExpoWeekday(now.getDay());

  let daysUntil = weekday - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && (now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute)))) {
    daysUntil += 7;
  }

  const target = new Date(now);
  target.setDate(target.getDate() + daysUntil);
  target.setHours(hour, minute, 0, 0);
  return target;
}

/**
 * Schedule a single weekly expense reminder (Monday 20:00 by default).
 *
 * Uses AI-generated copy from the server when available, otherwise the static pool.
 * Smart skip: if the next fire is today and the user already logged expenses, skip to next week.
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

  const weekdayStr = await AsyncStorage.getItem(REMINDER_WEEKDAY_KEY);
  const weekday = weekdayStr
    ? parseInt(weekdayStr, 10)
    : DEFAULT_WEEKLY_WEEKDAY;

  const aiMessages = await fetchAIReminders(userId);
  const weeklyAi = pickWeeklyAiReminder(aiMessages);
  let usedAi = false;
  let title: string;
  let body: string;
  let scheduledReminderId: string | undefined;

  if (weeklyAi) {
    usedAi = true;
    title = weeklyAi.title;
    body = weeklyAi.body;
    scheduledReminderId = weeklyAi.id;
  } else {
    const msg = await pickUnseenMessage();
    title = msg.title;
    body = msg.body;
  }

  const todayExpoWeekday = jsDayToExpoWeekday(new Date().getDay());
  const hasLoggedToday = await hasLoggedExpensesToday(userId);
  const todayMatches = weekday === todayExpoWeekday;
  const skipThisWeek = todayMatches && hasLoggedToday;

  let reminderId: string | null = null;

  if (skipThisWeek) {
    const nextDate = getNextWeekdayDate(weekday, 20, 0);
    if (isToday(nextDate) && hasLoggedToday) {
      nextDate.setDate(nextDate.getDate() + 7);
    }
    reminderId = await scheduleOneTimeNotification(
      nextDate,
      title,
      body,
      scheduledReminderId,
    );
  } else {
    reminderId = await scheduleWeeklyNotification(
      weekday,
      title,
      body,
      scheduledReminderId,
    );
  }

  const pairs: [string, string][] = [
    [REMINDER_VERSION_KEY, REMINDER_SCHEDULE_VERSION],
    [REMINDER_SCHEDULED_WEEK_KEY, getISOWeekLabel()],
    [REMINDER_USED_AI_KEY, usedAi ? "true" : "false"],
  ];
  if (reminderId) {
    pairs.push([REMINDER_ID_KEY, reminderId]);
  }
  await AsyncStorage.multiSet(pairs);
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
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

async function scheduleOneTimeNotification(
  date: Date,
  title: string,
  body: string,
  scheduledReminderId?: string,
): Promise<string | null> {
  try {
    const trigger: { type: "date"; date: Date; channelId?: string } = {
      type: "date",
      date,
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
    log.warn("Failed to schedule one-time notification", err);
    return null;
  }
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
