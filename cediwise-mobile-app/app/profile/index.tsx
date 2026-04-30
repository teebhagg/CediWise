import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Bell,
  Database,
  DollarSign,
  Inbox,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
  Sparkles,
  Trash2,
  User as UserIcon,
  Crown,
  Zap,
  CreditCard,
  Clock,
  Calendar,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_STANDARD_HEIGHT,
  ExpandedHeader,
} from "@/components/CediWiseHeader";
import { AppDialog } from "@/components/AppDialog";
import { LogoutModal } from "@/components/LogoutModal";
import { useTourContext } from "@/contexts/TourContext";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalizationStatus } from "@/hooks/usePersonalizationStatus";
import { useTierContext } from "@/contexts/TierContext";
import {
  deactivateCurrentDeviceToken,
  disablePushNotifications,
  enablePushNotifications,
  getNotificationsEnabled,
  getReminderFrequency,
  type ReminderFrequency,
  scheduleDailyExpenseReminder,
  setReminderFrequency,
} from "@/services/notifications";
import { useAnnouncementInboxStore } from "@/stores/notificationsStore";
import { deleteAccountRemote, getDisplayContact } from "@/utils/auth";
import { resetNavigationToAuth } from "@/utils/authRouting";
import { clearBudgetLocal } from "@/utils/budgetStorage";
import { log } from "@/utils/logger";
import { clearOnboardingLocalCache } from "@/utils/onboardingState";
import {
  Avatar,
  ListGroup,
  PressableFeedback,
  Separator,
} from "heroui-native";

const SECTION_LABEL_CLASS = "text-slate-400 text-xs uppercase tracking-wider mb-2.5 ml-1";
/** Matches Card / app container: rgba(18,22,33,0.9) */
const LIST_GROUP_CONTAINER_CLASS = "rounded-xl overflow-hidden bg-[rgba(18,22,33,0.9)]";
const AUTH_STORAGE_KEYS = [
  "sb-access-token",
  "sb-refresh-token",
  "supabase.auth.token",
] as const;

function authStorageKeyMatches(key: string): boolean {
  return AUTH_STORAGE_KEYS.some((prefix) => key.includes(prefix));
}

function IconPrefix({
  icon: Icon,
  color,
}: {
  icon: React.ComponentType<{ color: string; size: number }>;
  color: string;
}) {
  return (
    <View className="w-10 h-10 rounded-xl justify-center items-center" style={{ backgroundColor: `${color}20` }}>
      <Icon color={color} size={20} />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { resetTourSeen, startHomeTour, startBudgetTour } = useTourContext();
  const { showError, showSuccess } = useAppToast();
  const personalization = usePersonalizationStatus(user?.id);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [reminderFrequency, setReminderFrequencyState] = useState<ReminderFrequency>("daily");
  const [reminderFrequencyLoading, setReminderFrequencyLoading] = useState(false);
  const { effectiveTier, isOnTrial, trialEndsAt, pendingTier, pendingTierStartDate } = useTierContext();
  const inboxUnread = useAnnouncementInboxStore((s) => s.unreadCount);

  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => {
    if (!user?.id) return;
    void getNotificationsEnabled().then(setNotificationsEnabled);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void useAnnouncementInboxStore.getState().refresh(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!notificationsEnabled) return;
    void getReminderFrequency().then(setReminderFrequencyState);
  }, [notificationsEnabled]);

  const handleBackPress = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    router.back();
  };

  const handleLogoutPress = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    setShowLogoutModal(true);
  };

  const handleResetTourSeen = useCallback(async () => {
    if (!user?.id) return;
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => { });
      await resetTourSeen();
      router.replace("/(tabs)");
      showSuccess(
        "Reset",
        "Onboarding state cleared locally and in your account. Home will reopen for fresh testing.",
      );
    } catch (e) {
      log.error("Reset tour seen failed:", e);
      showError("Error", "Could not reset tour");
    }
  }, [user?.id, resetTourSeen, router, showSuccess, showError]);

  const handleClearBudgetLocal = useCallback(async () => {
    if (!user?.id) return;
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => { });
      await clearBudgetLocal(user.id);
      showSuccess(
        "Cleared",
        "Budget local storage cleared. Go to Budget tab to reload from server.",
      );
    } catch (e) {
      log.error("Clear budget local failed:", e);
      showError("Error", "Could not clear local storage");
    }
  }, [user?.id, showSuccess, showError]);

  const handleClearAllLocalStorage = useCallback(async () => {
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter((key) => !authStorageKeyMatches(key));
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      if (user?.id) {
        await clearOnboardingLocalCache(user.id);
      }
      router.replace("/(tabs)");
      showSuccess(
        "Cleared",
        "App caches were cleared on this device while preserving auth state. Dev testing state is now clean.",
      );
    } catch (e) {
      log.error("Clear all local storage failed:", e);
      showError("Error", "Could not clear local storage");
    }
  }, [router, showError, showSuccess, user?.id]);

  const handleNotificationsToggle = useCallback(
    async (value: boolean) => {
      if (!user?.id) return;
      setNotificationsLoading(true);
      const previous = notificationsEnabled;
      setNotificationsEnabled(value);
      try {
        if (value) {
          const ok = await enablePushNotifications(user.id);
          if (!ok) {
            setNotificationsEnabled(false);
            showError(
              "Couldn’t enable",
              "Check your connection and try again, or enable in system settings.",
            );
          } else {
            showSuccess("Notifications on", "You’ll get expense reminders and updates.");
          }
        } else {
          await disablePushNotifications(user.id);
          showSuccess("Notifications off", "Reminders and push updates are disabled.");
        }
      } catch (e) {
        log.error("Notifications toggle failed:", e);
        setNotificationsEnabled(previous);
        showError(
          "Couldn’t update",
          value ? "Check your connection and try again." : "Something went wrong.",
        );
      } finally {
        setNotificationsLoading(false);
      }
    },
    [user?.id, notificationsEnabled, showSuccess, showError],
  );

  const handleReminderFrequencyChange = useCallback(
    async (freq: ReminderFrequency) => {
      if (reminderFrequencyLoading || reminderFrequency === freq) return;
      setReminderFrequencyLoading(true);
      try {
        await setReminderFrequency(freq);
        setReminderFrequencyState(freq);
        await scheduleDailyExpenseReminder();
        const label = freq === "daily" ? "Daily" : "Weekly";
        showSuccess("Reminder updated", `${label} at 6 PM`);
      } catch (e) {
        log.error("Reminder frequency change failed:", e);
        showError("Couldn't update", "Try again.");
      } finally {
        setReminderFrequencyLoading(false);
      }
    },
    [reminderFrequency, reminderFrequencyLoading, showSuccess, showError],
  );

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
      resetNavigationToAuth();
    } catch (e) {
      log.error("Logout error:", e);
      showError(
        "Logout failed",
        e instanceof Error ? e.message : "Could not sign out",
      );
    }
  };

  const executeDeleteAccount = useCallback(async () => {
    if (!user?.id) return;
    setDeleteLoading(true);
    try {
      await deactivateCurrentDeviceToken(user.id);
      const result = await deleteAccountRemote();
      if (!result.success) {
        setDeleteLoading(false);
        showError("Could not delete account", result.error ?? "Try again.");
        return;
      }
      setDeleteStep(0);
      setDeleteLoading(false);
      try {
        await logout();
      } catch {
        // Session may already be invalid after auth user deletion
      }
      resetNavigationToAuth();
      showSuccess(
        "Account deleted",
        "Your account and associated data have been removed.",
      );
    } catch (e) {
      setDeleteLoading(false);
      showError(
        "Error",
        e instanceof Error ? e.message : "Could not delete account",
      );
    }
  }, [user?.id, logout, showError, showSuccess]);

  const contact = getDisplayContact(user);
  
  const getTrialDaysLeft = (endsAt: string | null) => {
    if (!endsAt) return 0;
    const end = new Date(endsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  
  const trialDaysLeft = getTrialDaysLeft(trialEndsAt);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const onItemPress = useCallback(
    (fn: () => void) => async () => {
      try {
        await Haptics.selectionAsync();
      } catch {
        // ignore
      }
      fn();
    },
    [],
  );

  return (
    <View className="flex-1 bg-black">
      <ExpandedHeader
        scrollY={scrollY}
        title="Profile & Settings"
        subtitle="Account, notifications, and preferences"
        centered={true}
        leading={<BackButton onPress={handleBackPress} />}
      />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToOffsets={[0, DEFAULT_EXPANDED_HEIGHT - DEFAULT_STANDARD_HEIGHT]}
        snapToEnd={false}
        decelerationRate="fast"
        className="px-5 py-3"
        contentContainerStyle={{
          paddingTop: DEFAULT_EXPANDED_HEIGHT + insets.top + 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}>
        <View className="flex-1 gap-6">
          {/* User Info Card */}
          <Card className="">
            <View className="items-center py-4">
              <View className="mb-4 rounded-full border-2 border-emerald-500/40 overflow-hidden bg-emerald-600/10">
                <Avatar alt={user?.name ?? "User"} size="lg">
                  {user?.avatar ? (
                    <Avatar.Image source={{ uri: user.avatar }} />
                  ) : null}
                  <Avatar.Fallback>
                    <Text className="text-2xl font-bold text-emerald-400">
                      {getInitials(user?.name)}
                    </Text>
                  </Avatar.Fallback>
                </Avatar>
              </View>
              <Text className="text-white text-xl font-bold mb-1">
                {user?.name || "User"}
              </Text>
              <View className="flex-row items-center gap-1.5">
                {contact.isPhone ? (
                  <Phone color="#94A3B8" size={14} />
                ) : (
                  <Mail color="#94A3B8" size={14} />
                )}
                <Text className="text-sm text-slate-400">
                  {contact.value || (contact.isPhone ? "No phone" : "No email")}
                </Text>
              </View>
            </View>
          </Card>

          {/* Plan & billing */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Plan &amp; billing</Text>
            <PressableFeedback
              animation={false}
              onPress={onItemPress(() =>
                router.push(effectiveTier === "free" ? "/upgrade" : "/subscription"),
              )}
            >
            <PressableFeedback.Scale />
            <PressableFeedback.Ripple />
            <Card className="border-emerald-500/30 overflow-hidden">
               {/* Premium Glow effect for trial/pro users */}
               {(isOnTrial || effectiveTier !== "free") && (
                 <View className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
               )}
               
               <View className="flex-row items-center justify-between">
                 <View className="flex-row items-center gap-3">
                   <View className={`w-12 h-12 rounded-2xl items-center justify-center ${effectiveTier === "free" ? "bg-slate-800" : "bg-emerald-500/20"}`}>
                      {effectiveTier === "sme" ? (
                        <Crown color="#10B981" size={24} />
                      ) : effectiveTier === "budget" ? (
                        <Zap color="#10B981" size={24} />
                      ) : (
                        <CreditCard color="#94A3B8" size={24} />
                      )}
                   </View>
                   <View>
                     <Text className="text-white text-lg font-bold">
                       {effectiveTier === "sme" ? "SME Ledger" : effectiveTier === "budget" ? "Smart Budget" : "Free Plan"}
                     </Text>
                      <View className="flex-row items-center gap-1.5">
                       {isOnTrial ? (
                         <>
                           <Clock color="#F59E0B" size={12} />
                           <Text className="text-amber-500 text-xs font-semibold">
                             Trial: {trialDaysLeft} days left
                           </Text>
                         </>
                      ) : effectiveTier !== "free" ? (
                         <Text className="text-emerald-400 text-xs font-semibold">Premium Active</Text>
                      ) : (
                         <Text className="text-slate-500 text-xs font-medium">Limited features</Text>
                      )}
                      </View>
                      {pendingTier && pendingTierStartDate && (
                        <View className="flex-row items-center gap-1.5 mt-1">
                          <Calendar color="#F59E0B" size={12} />
                          <Text className="text-amber-400 text-xs font-medium">
                            {pendingTier === "free"
                              ? "Plan ends on"
                              : pendingTier === "sme"
                                ? "SME Ledger starts on"
                                : "Smart Budget starts on"}
                            {" "}{new Date(pendingTierStartDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </Text>
                        </View>
                      )}
                   </View>
                 </View>
                 
                 <View className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
                   <Text className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                     {effectiveTier === "free" ? "Upgrade" : "Manage"}
                   </Text>
                 </View>
               </View>
            </Card>
          </PressableFeedback>
          </View>

          {/* Your account */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Your account</Text>
            <ListGroup variant="tertiary" className={LIST_GROUP_CONTAINER_CLASS}>
              <PressableFeedback
                animation={false}
                onPress={onItemPress(() =>
                  router.push("/profile/edit" as never),
                )}
              >
                <PressableFeedback.Scale />
                <PressableFeedback.Ripple />
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={UserIcon} color="#60A5FA" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>Edit profile</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      Name and account type
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix />
                </ListGroup.Item>
              </PressableFeedback>
              <Separator className="mx-4" />
              <PressableFeedback
                animation={false}
                onPress={onItemPress(() => router.push("/vitals?mode=edit"))}
              >
                <PressableFeedback.Scale />
                <PressableFeedback.Ripple />
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={UserIcon} color="#10B981" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>Personalization</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {personalization.isLoading
                        ? "Checking…"
                        : personalization.setupCompleted
                          ? "Income, bills, and budget setup complete"
                          : "Set up your money profile for a tailored budget"}
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix />
                </ListGroup.Item>
              </PressableFeedback>
            </ListGroup>
          </View>

          {/* Notifications & announcements */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>
              Notifications &amp; announcements
            </Text>
            <ListGroup variant="tertiary" className={LIST_GROUP_CONTAINER_CLASS}>
              <ListGroup.Item disabled>
                <ListGroup.ItemPrefix>
                  <IconPrefix icon={Bell} color="#10B981" />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Push notifications</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    Expense reminders and updates
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  {notificationsLoading ? (
                    <Text className="text-slate-400 text-sm">
                      {notificationsEnabled ? "Turning off…" : "Turning on…"}
                    </Text>
                  ) : (
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={handleNotificationsToggle}
                      trackColor={{ false: "#334155", true: "#22C55E" }}
                      thumbColor="#fff"
                    />
                  )}
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
              {notificationsEnabled ? (
                <>
                  <Separator className="mx-4" />
                  <ListGroup.Item disabled>
                    <ListGroup.ItemPrefix />
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle>Reminder frequency</ListGroup.ItemTitle>
                      <ListGroup.ItemDescription>
                        {reminderFrequency === "daily"
                          ? "Every day at 6 PM"
                          : "Once a week at 6 PM"}
                      </ListGroup.ItemDescription>
                    </ListGroup.ItemContent>
                    <ListGroup.ItemSuffix>
                      {reminderFrequencyLoading ? (
                        <Text className="text-slate-400 text-sm">Updating…</Text>
                      ) : (
                        <View className="flex-row gap-2">
                          <PressableFeedback
                            animation={false}
                            onPress={onItemPress(() => handleReminderFrequencyChange("daily"))}
                          >
                            <PressableFeedback.Ripple />
                            <View
                              className={`rounded-lg px-3 py-2 ${
                                reminderFrequency === "daily" ? "bg-emerald-500/30" : "bg-slate-500/20"
                              }`}
                            >
                              <Text
                                className={
                                  reminderFrequency === "daily"
                                    ? "font-semibold text-emerald-400"
                                    : "text-slate-400"
                                }
                              >
                                Daily
                              </Text>
                            </View>
                          </PressableFeedback>
                          <PressableFeedback
                            animation={false}
                            onPress={onItemPress(() => handleReminderFrequencyChange("weekly"))}
                          >
                            <PressableFeedback.Ripple />
                            <View
                              className={`rounded-lg px-3 py-2 ${
                                reminderFrequency === "weekly" ? "bg-emerald-500/30" : "bg-slate-500/20"
                              }`}
                            >
                              <Text
                                className={
                                  reminderFrequency === "weekly"
                                    ? "font-semibold text-emerald-400"
                                    : "text-slate-400"
                                }
                              >
                                Weekly
                              </Text>
                            </View>
                          </PressableFeedback>
                        </View>
                      )}
                    </ListGroup.ItemSuffix>
                  </ListGroup.Item>
                </>
              ) : null}
              <Separator className="mx-4" />
              <PressableFeedback
                animation={false}
                onPress={onItemPress(() => router.push("/notifications/inbox" as never))}
              >
                <PressableFeedback.Scale />
                <PressableFeedback.Ripple />
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={Inbox} color="#34D399" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>Updates inbox</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      Announcements from CediWise
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix>
                    {inboxUnread > 0 ? (
                      <View className="min-w-[22px] h-[22px] rounded-full bg-emerald-500 items-center justify-center px-1.5">
                        <Text className="text-white text-xs font-bold">
                          {inboxUnread > 99 ? "99+" : inboxUnread}
                        </Text>
                      </View>
                    ) : null}
                  </ListGroup.ItemSuffix>
                </ListGroup.Item>
              </PressableFeedback>
            </ListGroup>
          </View>

          {/* Help */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Help</Text>
            <ListGroup variant="tertiary" className={LIST_GROUP_CONTAINER_CLASS}>
              <PressableFeedback
                animation={false}
                onPress={onItemPress(() => router.push("/feedback" as never))}
              >
                <PressableFeedback.Scale />
                <PressableFeedback.Ripple />
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={MessageCircle} color="#A78BFA" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>Send feedback</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      Report a bug or share an idea
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix />
                </ListGroup.Item>
              </PressableFeedback>
            </ListGroup>
          </View>

          {__DEV__ ? (
            <View>
              <Text className={SECTION_LABEL_CLASS}>Developer</Text>
              <ListGroup variant="tertiary" className={`${LIST_GROUP_CONTAINER_CLASS} border border-amber-500/30`}>
                <PressableFeedback animation={false} onPress={onItemPress(handleClearBudgetLocal)}>
                  <PressableFeedback.Scale />
                  <PressableFeedback.Ripple />
                  <ListGroup.Item disabled>
                    <ListGroup.ItemPrefix>
                      <IconPrefix icon={Database} color="#F59E0B" />
                    </ListGroup.ItemPrefix>
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle className="text-amber-300">
                        Clear budget local storage
                      </ListGroup.ItemTitle>
                      <ListGroup.ItemDescription className="text-slate-400">
                        Remove cached budget data. Reload from server on next Budget visit.
                      </ListGroup.ItemDescription>
                    </ListGroup.ItemContent>
                    <ListGroup.ItemSuffix />
                  </ListGroup.Item>
                </PressableFeedback>
                <Separator className="mx-4" />
                <PressableFeedback animation={false} onPress={onItemPress(handleClearAllLocalStorage)}>
                  <PressableFeedback.Scale />
                  <PressableFeedback.Ripple />
                  <ListGroup.Item disabled>
                    <ListGroup.ItemPrefix>
                      <IconPrefix icon={RotateCcw} color="#F97316" />
                    </ListGroup.ItemPrefix>
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle className="text-orange-300">
                        Clear all local storage
                      </ListGroup.ItemTitle>
                      <ListGroup.ItemDescription className="text-slate-400">
                        Wipe all device cache and local testing state. Dev only.
                      </ListGroup.ItemDescription>
                    </ListGroup.ItemContent>
                    <ListGroup.ItemSuffix />
                  </ListGroup.Item>
                </PressableFeedback>
                <Separator className="mx-4" />
                <PressableFeedback animation={false} onPress={onItemPress(handleResetTourSeen)}>
                  <PressableFeedback.Scale />
                  <PressableFeedback.Ripple />
                  <ListGroup.Item disabled>
                    <ListGroup.ItemPrefix>
                      <IconPrefix icon={Sparkles} color="#22C55E" />
                    </ListGroup.ItemPrefix>
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle className="text-amber-300">
                        Reset tour seen
                      </ListGroup.ItemTitle>
                      <ListGroup.ItemDescription className="text-slate-400">
                        Clear onboarding tour flags. Tours will show again on next visit.
                      </ListGroup.ItemDescription>
                    </ListGroup.ItemContent>
                    <ListGroup.ItemSuffix />
                  </ListGroup.Item>
                </PressableFeedback>
              </ListGroup>
            </View>
          ) : null}

          {/* Tours */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Tours</Text>
            <ListGroup variant="tertiary" className={LIST_GROUP_CONTAINER_CLASS}>
              <PressableFeedback
                animation={false}
                onPress={onItemPress(() => {
                  router.replace("/(tabs)");
                  setTimeout(startHomeTour, 600);
                })}>
                <PressableFeedback.Scale />
                <PressableFeedback.Ripple />
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={Sparkles} color="#22C55E" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>Replay home tour</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      Replay the guided walkthrough for the current Home state.
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix />
                </ListGroup.Item>
              </PressableFeedback>
              <Separator className="mx-4" />
              <PressableFeedback
                animation={false}
                onPress={onItemPress(() => {
                  router.replace("/(tabs)/budget");
                  setTimeout(startBudgetTour, 600);
                })}>
                <PressableFeedback.Scale />
                <PressableFeedback.Ripple />
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={DollarSign} color="#22C55E" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>Replay budget tour</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      Replay the guided walkthrough for the current Budget state.
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix />
                </ListGroup.Item>
              </PressableFeedback>
            </ListGroup>
          </View>

          {/* Account */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Account</Text>
            <PressableFeedback animation={false} onPress={onItemPress(handleLogoutPress)}>
              <PressableFeedback.Scale />
              <PressableFeedback.Ripple />
              <ListGroup variant="tertiary" className={`${LIST_GROUP_CONTAINER_CLASS} border border-rose-500/30`}>
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={LogOut} color="#EF4444" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle className="text-rose-400">Logout</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>Sign out of your account</ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix />
                </ListGroup.Item>
              </ListGroup>
            </PressableFeedback>
          </View>

          {/* Danger zone */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Danger zone</Text>
            <Pressable
              onPress={onItemPress(() => setDeleteStep(1))}
              className="bg-red-600 rounded-xl py-3.5 px-4 items-center active:opacity-90"
            >
              <Text className="text-white font-semibold text-base">Delete my account</Text>
            </Pressable>
            <Text className="text-xs text-slate-500 mt-2 px-1 text-center leading-5">
              Permanently deletes your account, budget, SME data, subscriptions, and preferences from our
              servers.
            </Text>
          </View>

          {/* App Info */}
          <View className="items-center pt-2 pb-4">
            <Text className="text-xs text-slate-500">
              CediWise v{Constants.expoConfig?.version ?? "0.0.1"}
            </Text>
            <Text className="text-[11px] text-slate-500 mt-1">
              Your Personal Finance Companion
            </Text>
          </View>
        </View>
      </Animated.ScrollView>

      <AppDialog
        visible={deleteStep === 1}
        onOpenChange={(open) => {
          if (!open) setDeleteStep(0);
        }}
        icon={<Trash2 size={22} color="#F87171" />}
        title="Delete your account?"
        description="This permanently deletes your CediWise account, budget data, SME ledger data, subscriptions, and preferences from our servers. This cannot be undone."
        primaryLabel="Continue"
        onPrimary={() => setDeleteStep(2)}
        secondaryLabel="Cancel"
        onSecondary={() => setDeleteStep(0)}
        primaryButtonClassName="bg-amber-600"
        primaryLabelClassName="text-white"
      />
      <AppDialog
        visible={deleteStep === 2}
        onOpenChange={(open) => {
          if (!open) setDeleteStep(0);
        }}
        loading={deleteLoading}
        icon={<Trash2 size={22} color="#EF4444" />}
        title="Delete permanently?"
        description="Your account and all associated data will be removed. You will need a new account to use CediWise again."
        primaryLabel="Delete my account"
        onPrimary={() => {
          void executeDeleteAccount();
        }}
        secondaryLabel="Go back"
        onSecondary={() => {
          if (!deleteLoading) setDeleteStep(1);
        }}
        primaryButtonClassName="bg-red-600"
        primaryLabelClassName="text-white"
      />

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </View>
  );
}
