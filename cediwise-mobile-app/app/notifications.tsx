import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { authTokens } from "@/constants/authTokens";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/hooks/useAuth";
import {
  completeNotificationGate,
  consumePendingNotificationRoute,
  enablePushNotifications,
} from "@/services/notifications";
import { log } from "@/utils/logger";
import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const defaultNextRoute = "/(tabs)";

export default function NotificationsScreen() {
  const { user, isLoading } = useAuth();
  const { showError, showSuccess } = useAppToast();
  const [submitting, setSubmitting] = useState(false);
  const [nextRoute, setNextRoute] = useState(defaultNextRoute);
  const [routeReady, setRouteReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRoute() {
      const storedRoute = await consumePendingNotificationRoute();
      if (!isMounted) return;
      if (storedRoute) {
        setNextRoute(storedRoute);
      }
      setRouteReady(true);
    }

    void loadRoute();

    return () => {
      isMounted = false;
    };
  }, []);

  const continueToNextRoute = useCallback(() => {
    router.replace(nextRoute as never);
  }, [nextRoute]);

  const onSkip = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    await completeNotificationGate();
    continueToNextRoute();
  }, [continueToNextRoute, submitting]);

  const onEnable = useCallback(async () => {
    if (submitting || !user?.id) return;
    setSubmitting(true);
    try {
      const ok = await enablePushNotifications(user.id);
      if (ok) {
        showSuccess("Notifications on", "You’ll get reminders and updates.");
        continueToNextRoute();
      } else {
        showError(
          "Couldn’t enable",
          "Check your connection and try again, or enable in Profile later.",
        );
        setSubmitting(false);
      }
    } catch {
      showError(
        "Couldn’t enable",
        "Check your connection and try again, or enable in Profile later.",
      );
      setSubmitting(false);
    }
  }, [continueToNextRoute, submitting, user?.id, showError, showSuccess]);

  useEffect(() => {
    if (!isLoading && !user?.id) {
      log.warn("Notifications gate reached without authenticated user");
      router.replace("/auth" as never);
    }
  }, [isLoading, user?.id]);

  if (isLoading || !routeReady) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: authTokens.background }}
        className="items-center justify-center"
      >
        <ActivityIndicator size="large" color={authTokens.spinner} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#000000" }}
      className="flex-1 bg-black"
    >
      <StatusBar
        backgroundColor="#000000"
        barStyle="light-content"
        translucent={true}
        animated={true}
      />
      <View className="flex-1 px-7 pt-6 pb-8 justify-between">
        <View className="flex-1 items-center justify-center">
          <View className="items-center">
            <View
              className="mb-16 h-28 w-28 items-center justify-center"
              accessibilityLabel="Notifications"
              accessibilityRole="image"
            >
              <View className="absolute inset-0 items-center justify-center">
                <Bell size={80} color="#10b981" strokeWidth={2.4} />
              </View>
            </View>

            <Text
              style={{ fontFamily: "Figtree-Bold",}}
              className="max-w-[320px] text-center text-4xl text-emerald-500"
            >
              Stay on top of your money
            </Text>
            <Text
              style={{ fontFamily: "Figtree-Regular", lineHeight: 31 }}
              className="mt-7 max-w-[360px] text-center text-xl text-white/85"
            >
              Push notifications help you remember to log your expenses and get
              important updates that bring you back to the right place in
              CediWise.
            </Text>
          </View>
        </View>

        <View className="gap-4">
          <PrimaryButton
            loading={submitting}
            onPress={onEnable}
            accessibilityLabel="Enable push notifications"
            accessibilityRole="button"
          >
            Enable push notifications
          </PrimaryButton>
          <SecondaryButton
            disabled={submitting}
            onPress={onSkip}
            className="border-0 bg-white/18"
            accessibilityLabel="Not now"
            accessibilityRole="button"
          >
            Not now
          </SecondaryButton>
        </View>
      </View>
    </SafeAreaView>
  );
}
