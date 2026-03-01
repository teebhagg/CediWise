import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  CreditCard,
  Database,
  DollarSign,
  FileText,
  LogOut,
  Mail,
  Phone,
  RotateCcw,
  Sparkles,
  User as UserIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
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
import { LogoutModal } from "@/components/LogoutModal";
import { useTourContext } from "@/contexts/TourContext";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/hooks/useAuth";
import { usePersonalizationStatus } from "@/hooks/usePersonalizationStatus";
import { getDisplayContact } from "@/utils/auth";
import { clearBudgetLocal } from "@/utils/budgetStorage";
import { log } from "@/utils/logger";
import { supabase } from "@/utils/supabase";
import {
  Avatar,
  ListGroup,
  PressableFeedback,
  Separator,
} from "heroui-native";

const SECTION_LABEL_CLASS = "text-slate-400 text-xs uppercase tracking-wider mb-2.5 ml-1";
/** Matches Card / app container: rgba(18,22,33,0.9) */
const LIST_GROUP_CONTAINER_CLASS = "rounded-xl overflow-hidden bg-[rgba(18,22,33,0.9)]";

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
  const { resetTourSeen } = useTourContext();
  const { showError, showSuccess } = useAppToast();
  const personalization = usePersonalizationStatus(user?.id);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [enableAutoReallocation, setEnableAutoReallocation] = useState(false);
  const [autoReallocationLoading, setAutoReallocationLoading] = useState(false);

  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => {
    if (!user?.id || !supabase) return;
    void (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("enable_auto_reallocation")
          .eq("id", user.id)
          .maybeSingle();
        if (
          data &&
          typeof (data as any).enable_auto_reallocation === "boolean"
        ) {
          setEnableAutoReallocation((data as any).enable_auto_reallocation);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [user?.id]);

  const handleAutoReallocationChange = useCallback(
    async (value: boolean) => {
      if (!user?.id || !supabase) return;
      setEnableAutoReallocation(value);
      setAutoReallocationLoading(true);
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            enable_auto_reallocation: value,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        if (error) throw error;
      } catch (e) {
        log.error("Failed to update auto-reallocation:", e);
        setEnableAutoReallocation(!value);
        showError("Error", "Could not update preference");
      } finally {
        setAutoReallocationLoading(false);
      }
    },
    [user?.id, showError],
  );

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
      showSuccess("Reset", "Tour seen flags cleared. Tours will show again.");
    } catch (e) {
      log.error("Reset tour seen failed:", e);
      showError("Error", "Could not reset tour");
    }
  }, [user?.id, resetTourSeen, showSuccess, showError]);

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

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
      router.replace("/auth");
    } catch (e) {
      log.error("Logout error:", e);
      showError(
        "Logout failed",
        e instanceof Error ? e.message : "Could not sign out",
      );
    }
  };

  const contact = getDisplayContact(user);

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
        subtitle="Manage your account and preferences"
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

          {/* Account Settings */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Account</Text>
            <ListGroup variant="tertiary" className={LIST_GROUP_CONTAINER_CLASS}>
              <ListGroup.Item disabled>
                <ListGroup.ItemPrefix>
                  <IconPrefix icon={UserIcon} color="#60A5FA" />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Edit Profile</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>Coming soon</ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix />
              </ListGroup.Item>
            </ListGroup>
          </View>

          {/* Budget preferences */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Budget preferences</Text>
            <ListGroup variant="tertiary" className={LIST_GROUP_CONTAINER_CLASS}>
              <ListGroup.Item disabled>
                <ListGroup.ItemPrefix>
                  <IconPrefix icon={RotateCcw} color="#F59E0B" />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Auto-reallocation suggestions</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    Show reallocation banner based on spending
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <Switch
                    value={enableAutoReallocation}
                    onValueChange={handleAutoReallocationChange}
                    disabled={autoReallocationLoading}
                    trackColor={{ false: "#334155", true: "#22C55E" }}
                    thumbColor="#fff"
                  />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </ListGroup>
          </View>

          {/* Personalization */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Personalization</Text>
            <PressableFeedback animation={false} onPress={onItemPress(() => router.push("/vitals?mode=edit"))}>
              <PressableFeedback.Scale />
              <PressableFeedback.Ripple />
              <ListGroup variant="tertiary" className={LIST_GROUP_CONTAINER_CLASS}>
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={UserIcon} color="#10B981" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>Personalization settings</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {personalization.isLoading
                        ? "Checking…"
                        : personalization.setupCompleted
                          ? "Completed"
                          : "Not set"}
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix />
                </ListGroup.Item>
              </ListGroup>
            </PressableFeedback>
          </View>

          {/* Budget tools */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Budget tools</Text>
            <ListGroup variant="tertiary" className={LIST_GROUP_CONTAINER_CLASS}>
              <PressableFeedback animation={false} onPress={onItemPress(() => router.push("/recurring-expenses"))}>
                <PressableFeedback.Scale />
                <PressableFeedback.Ripple />
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={CreditCard} color="#F59E0B" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>Recurring Expenses</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>Subscriptions & regular payments</ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix />
                </ListGroup.Item>
              </PressableFeedback>
              <Separator className="mx-4" />
              <PressableFeedback animation={false} onPress={onItemPress(() => router.push("/debt-dashboard"))}>
                <PressableFeedback.Scale />
                <PressableFeedback.Ripple />
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={DollarSign} color="#EF4444" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>Debt Dashboard</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>Loans & credit</ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix />
                </ListGroup.Item>
              </PressableFeedback>
              <Separator className="mx-4" />
              <PressableFeedback animation={false} onPress={onItemPress(() => router.push("/budget-templates"))}>
                <PressableFeedback.Scale />
                <PressableFeedback.Ripple />
                <ListGroup.Item disabled>
                  <ListGroup.ItemPrefix>
                    <IconPrefix icon={FileText} color="#10B981" />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>Budget Templates</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>Life-stage templates</ListGroup.ItemDescription>
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

          {/* Account Actions */}
          <View>
            <Text className={SECTION_LABEL_CLASS}>Account actions</Text>
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

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </View>
  );
}
