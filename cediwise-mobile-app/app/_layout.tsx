import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as Sentry from "@sentry/react-native";
import * as SplashScreen from "expo-splash-screen";
import { Asset } from "expo-asset";
// import { StatusBar } from 'expo-status-bar';
import { TriggerProvider } from "@/contexts/TriggerContext";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as WebBrowser from "expo-web-browser";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  InteractionManager,
  Platform,
  StatusBar,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import {
  KeyboardProvider,
} from "react-native-keyboard-controller";
import {
  SafeAreaListener,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { PaystackProvider } from "react-native-paystack-webview";
import { AnalyticsIdentitySync } from "../components/AnalyticsIdentitySync";
import { AnalyticsRouteObserver } from "../components/AnalyticsRouteObserver";
import { RootErrorBoundary } from "../components/RootErrorBoundary";
import { TourErrorBoundary } from "../components/tour/TourErrorBoundary";
import { AuthProvider } from "../contexts/AuthContext";
import { PendingAISelectionsProvider } from "@/utils/aiSelections";
import {
  IS_PRODUCTION_PUSH_BUILD,
  initProductionPushServices,
} from "@/utils/productionPush";
import { TierProvider } from "../contexts/TierContext";
import {
  TourProvider,
  TourProviderFallback,
} from "../contexts/TourContext";
import { useAuth } from "../hooks/useAuth";
import { useAuthRefresh } from "../hooks/useAuthRefresh";
import { useBudget } from "../hooks/useBudget";
import { useBudgetPreferenceBootstrap } from "../hooks/useBudgetPreferenceBootstrap";
import { initNotificationSystem } from "../services/notifications";
import { useCashFlowStore } from "../stores/cashFlowStore";
import { useDebtStore } from "../stores/debtStore";
import { usePersonalizationStore } from "../stores/personalizationStore";
import { useProfileVitalsStore } from "../stores/profileVitalsStore";
import { useRecurringExpensesStore } from "../stores/recurringExpensesStore";
import { useBudgetStore } from "../stores/budgetStore";
import { useSMELedgerStore } from "../stores/smeLedgerStore";
import {
  hasHydratedThisSession,
  setHydratedThisSession,
} from "../utils/budgetHydrateSession";
import { syncTaxConfig } from "../utils/taxSync";
import "./globals.css";
import { PostHogProvider } from "posthog-react-native";

initProductionPushServices();

// M7: Single-theme product — `Uniwind.setTheme("dark")` matches `app.json` `userInterfaceStyle: "dark"`.
Uniwind.setTheme("dark");

SplashScreen.preventAutoHideAsync();

/**
 * Budget wiring: `useBudget` runs here for `hydrateFromRemote` / sync; `useBudgetPreferenceBootstrap`
 * needs its own `useBudget` for bootstrap actions. `TriggerProvider` (outer layout) also calls
 * `useBudget` for literacy trigger signals. `budgetStore.initForUser` is idempotent per user after
 * the first successful load so these mounts do not thrash disk/loading.
 */
function AppShell() {
  const { user } = useAuth();
  const { hydrateFromRemote, syncNow } = useBudget(user?.id);
  useBudgetPreferenceBootstrap(user?.id);
  const sessionBootstrapRef = useRef(false);
  const lastForegroundSyncRef = useRef(0);
  const FOREGROUND_SYNC_MIN_MS = 45_000;

  useEffect(() => {
    void initNotificationSystem(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !userId) return;
      void initNotificationSystem(userId);
      const queuePending = useBudgetStore.getState().queue?.items.length ?? 0;
      if (queuePending === 0) return;
      const now = Date.now();
      if (now - lastForegroundSyncRef.current < FOREGROUND_SYNC_MIN_MS) return;
      lastForegroundSyncRef.current = now;
      void (async () => {
        await syncNow();
        await hydrateFromRemote({ force: true });
      })();
    });
    return () => sub.remove();
  }, [user?.id, syncNow, hydrateFromRemote]);

  // Central Bootstrap: Initialize all critical data stores as soon as user is ready.
  useEffect(() => {
    if (!user?.id) {
      sessionBootstrapRef.current = false;
      return;
    }

    // 1. Personalization & Profile Vitals & SME Data (Parallel)
    void usePersonalizationStore.getState().initForUser(user.id);
    void useProfileVitalsStore.getState().initForUser(user.id);
    void useSMELedgerStore.getState().initForUser(user.id);
    void useCashFlowStore.getState().initForUser(user.id);
    void useRecurringExpensesStore.getState().initForUser(user.id);
    void useDebtStore.getState().initForUser(user.id);

    // 2. Session sync: push queue, pull remote, then mark hydrated (once per session)
    if (hasHydratedThisSession() || sessionBootstrapRef.current) return;
    sessionBootstrapRef.current = true;

    void (async () => {
      try {
        await syncNow();
        await hydrateFromRemote();
        const smeSync = await import("../utils/smeSync");
        await smeSync.hydrateSMEFromRemote(user.id);
        await useSMELedgerStore.getState().initForUser(user.id);
        await smeSync.flushSMEQueue(user.id);
        await import("../stores/vaultStore").then((m) =>
          m.useVaultStore.getState().initForUser(user.id),
        );
        setHydratedThisSession();
      } catch {
        sessionBootstrapRef.current = false;
      }
    })();
  }, [user?.id, hydrateFromRemote, syncNow]);

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <AnalyticsRouteObserver />
      <StatusBar backgroundColor="black" translucent={true} />
      <SafeAreaListener
        onChange={({ insets }) => {
          Uniwind.updateInsets(insets);
        }}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="queue" options={{ headerShown: false }} />
          <Stack.Screen name="vitals" options={{ headerShown: false }} />
          <Stack.Screen name="budget" options={{ headerShown: false }} />
          <Stack.Screen
            name="budget-templates"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="debt-dashboard"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="debt" options={{ headerShown: false }} />
          <Stack.Screen
            name="recurring-expenses"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="expenses" options={{ headerShown: false }} />
          <Stack.Screen name="auth/index" options={{ headerShown: false }} />
          <Stack.Screen name="auth/otp" options={{ headerShown: false }} />
          <Stack.Screen name="auth/name" options={{ headerShown: false }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen
            name="onboarding"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="onboarding-demos"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="notifications"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="feedback" options={{ headerShown: false }} />
          <Stack.Screen name="ai-chat" options={{ headerShown: false }} />
          <Stack.Screen name="literacy" options={{ headerShown: false }} />
          <Stack.Screen
            name="salary-calculator"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="terms" options={{ headerShown: false }} />
          <Stack.Screen name="privacy" options={{ headerShown: false }} />
          <Stack.Screen name="(sme)" options={{ headerShown: false }} />
          <Stack.Screen name="upgrade" options={{ headerShown: false }} />
          <Stack.Screen name="subscription" options={{ headerShown: false }} />
          <Stack.Screen name="vault" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaListener>
    </View>
  );
}

function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Keeps tokens fresh while app is in foreground/resumed.
  useAuthRefresh();

  const [videosLoaded, setVideosLoaded] = useState(false);

  const [fontsLoaded] = useFonts({
    "Figtree-Light": require("../assets/fonts/Figtree-Light.ttf"),
    "Figtree-Regular": require("../assets/fonts/Figtree-Regular.ttf"),
    "Figtree-Medium": require("../assets/fonts/Figtree-Medium.ttf"),
    "Figtree-Bold": require("../assets/fonts/Figtree-Bold.ttf"),
  });

  useEffect(() => {
    async function preloadVideos() {
      try {
        await Promise.all([
          Asset.fromModule(require("../assets/videos/onboarding/smart-budget-snippet.mp4")).downloadAsync(),
          Asset.fromModule(require("../assets/videos/onboarding/sme-snippet.mp4")).downloadAsync(),
          Asset.fromModule(require("../assets/videos/onboarding/tax-calculator-snippet.mp4")).downloadAsync(),
          Asset.fromModule(require("../assets/videos/onboarding/learn-snippet.mp4")).downloadAsync(),
        ]);
      } catch (e) {
        console.warn("Failed to preload onboarding videos", e);
      } finally {
        setVideosLoaded(true);
      }
    }
    preloadVideos();
  }, []);

  useEffect(() => {
    if (fontsLoaded && videosLoaded) {
      setAppIsReady(true);
      SplashScreen.hideAsync();
    }

    WebBrowser.maybeCompleteAuthSession();

    const taxTask = InteractionManager.runAfterInteractions(() => {
      void syncTaxConfig();
    });

    return () => {
      const cancel = (taxTask as { cancel?: () => void }).cancel;
      if (typeof cancel === "function") cancel();
    };
  }, [fontsLoaded, videosLoaded]);

  useEffect(() => {
    const isExpoGo = (Constants.appOwnership ?? "") === "expo";
    if (
      (Platform.OS === "ios" || Platform.OS === "android") &&
      !isExpoGo
    ) {
      void import("@react-native-google-signin/google-signin")
        .then(({ GoogleSignin }) => {
          GoogleSignin.configure({
            webClientId:
              process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
              "758685762731-vh9reoikjerbsu8pbcigndi29tdb7fp9.apps.googleusercontent.com",
          });
        })
        .catch((e) => {
          console.warn("GoogleSignin.configure failed", e);
        });
    }
  }, []);

  if (!appIsReady) {
    return null;
  }

  const appTree = (
    <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider statusBarTranslucent>
          <BottomSheetModalProvider>
            <HeroUINativeProvider
            config={{
              devInfo: { stylingPrinciples: false },
              toast: {
                defaultProps: {
                  variant: "accent",
                  placement: "top",
                  animation: true,
                },
              },
            }}>
            <SafeAreaProvider>
              <PaystackProvider publicKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || ""}>
                <AuthProvider>
                  <PendingAISelectionsProvider>
                    <AnalyticsIdentitySync />
                    <TierProvider>
                      <TourErrorBoundary
                        fallback={
                          <TourProviderFallback>
                            <TriggerProvider>
                              <AppShell />
                            </TriggerProvider>
                          </TourProviderFallback>
                        }>
                        <TourProvider>
                          <TriggerProvider>
                            <AppShell />
                          </TriggerProvider>
                        </TourProvider>
                      </TourErrorBoundary>
                    </TierProvider>
                  </PendingAISelectionsProvider>
                </AuthProvider>
              </PaystackProvider>
            </SafeAreaProvider>
          </HeroUINativeProvider>
        </BottomSheetModalProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );

  if (IS_PRODUCTION_PUSH_BUILD) {
    const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY!;
    const posthogHost =
      process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
    return (
      <PostHogProvider
        apiKey={posthogKey}
        options={{
          host: posthogHost,
          captureAppLifecycleEvents: true,
        }}
        autocapture={false}>
        {appTree}
      </PostHogProvider>
    );
  }

  return appTree;
}

export default Sentry.wrap(RootLayout);
