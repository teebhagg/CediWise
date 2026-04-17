import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
// import { StatusBar } from 'expo-status-bar';
import { TriggerProvider } from "@/contexts/TriggerContext";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as WebBrowser from "expo-web-browser";
import { HeroUINativeProvider } from "heroui-native";
import { PostHogProvider } from 'posthog-react-native';
import { useEffect, useState } from "react";
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
  SafeAreaListener,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import * as Sentry from "@sentry/react-native";
import { PaystackProvider } from "react-native-paystack-webview";
import { AnalyticsIdentitySync } from "../components/AnalyticsIdentitySync";
import { AnalyticsRouteObserver } from "../components/AnalyticsRouteObserver";
import { RootErrorBoundary } from "../components/RootErrorBoundary";
import { TourErrorBoundary } from "../components/tour/TourErrorBoundary";
import { AuthProvider } from "../contexts/AuthContext";
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
import { usePersonalizationStore } from "../stores/personalizationStore";
import { useProfileVitalsStore } from "../stores/profileVitalsStore";
import { useSMELedgerStore } from "../stores/smeLedgerStore";
import {
  hasHydratedThisSession,
  setHydratedThisSession,
} from "../utils/budgetHydrateSession";
import { syncTaxConfig } from "../utils/taxSync";
import "./globals.css";

Sentry.init({
  dsn: "https://e80f09f6a8433bd0fe6d1f0643d1eee4@o4511124714094592.ingest.de.sentry.io/4511124717043792",

  /**
   * L3 / privacy: `sendDefaultPii` adds IP and similar defaults per Sentry docs.
   * Revisit with legal/compliance before strict jurisdictions; pair with `beforeSend` scrubbing.
   */
  sendDefaultPii: true,

  enableLogs: true,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  /** Performance monitoring sample rate (tunable if volume is high). */
  tracesSampleRate: 0.1,

  beforeSend(event) {
    const extra = event.extra;
    if (extra && typeof extra === "object") {
      for (const key of Object.keys(extra)) {
        const lower = key.toLowerCase();
        if (
          lower.includes("token") ||
          lower.includes("password") ||
          lower.includes("secret") ||
          lower.includes("authorization")
        ) {
          (extra as Record<string, unknown>)[key] = "[redacted]";
        }
      }
    }
    return event;
  },
});

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
  const { hydrateFromRemote } = useBudget(user?.id);
  useBudgetPreferenceBootstrap(user?.id);

  useEffect(() => {
    void initNotificationSystem(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void initNotificationSystem(user?.id ?? null);
      }
    });
    return () => sub.remove();
  }, [user?.id]);

  // Central Bootstrap: Initialize all critical data stores as soon as user is ready.
  useEffect(() => {
    if (!user?.id) return;

    // 1. Personalization & Profile Vitals & SME Data (Parallel)
    void usePersonalizationStore.getState().initForUser(user.id);
    void useProfileVitalsStore.getState().initForUser(user.id);
    void useSMELedgerStore.getState().initForUser(user.id);
    void useCashFlowStore.getState().initForUser(user.id);

    // 2. Budget Hydration (Once per session)
    if (!hasHydratedThisSession()) {
      setHydratedThisSession();
      void (async () => {
        await hydrateFromRemote();
        await useSMELedgerStore.getState().initForUser(user.id); // Ensure SME is ready
        await import("../utils/smeSync").then((m) => m.flushSMEQueue(user.id!));
        await import("../stores/vaultStore").then((m) =>
          m.useVaultStore.getState().initForUser(user.id),
        );
      })();
    }
  }, [user?.id, hydrateFromRemote]);

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
            name="notifications"
            options={{ headerShown: false }}
          />
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

export default Sentry.wrap(function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Keeps tokens fresh while app is in foreground/resumed.
  useAuthRefresh();

  const [fontsLoaded] = useFonts({
    "Figtree-Light": require("../assets/fonts/Figtree-Light.ttf"),
    "Figtree-Regular": require("../assets/fonts/Figtree-Regular.ttf"),
    "Figtree-Medium": require("../assets/fonts/Figtree-Medium.ttf"),
    "Figtree-Bold": require("../assets/fonts/Figtree-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      setAppIsReady(true);
      SplashScreen.hideAsync();
    }

    WebBrowser.maybeCompleteAuthSession();

    const taxTask = InteractionManager.runAfterInteractions(() => {
      void syncTaxConfig();
    });

    // Only configure native Google Sign-In when not in Expo Go (dynamic require avoids loading native module in Expo Go).
    const isExpoGo = (Constants.appOwnership ?? "") === "expo";
    if (
      (Platform.OS === "ios" || Platform.OS === "android") &&
      !isExpoGo
    ) {
      try {
        const { GoogleSignin } = require("@react-native-google-signin/google-signin");
        GoogleSignin.configure({
          webClientId:
            process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
            "758685762731-vh9reoikjerbsu8pbcigndi29tdb7fp9.apps.googleusercontent.com",
        });
      } catch (e) {
        console.warn("GoogleSignin.configure failed", e);
      }
    }

    return () => {
      const cancel = (taxTask as { cancel?: () => void }).cancel;
      if (typeof cancel === "function") cancel();
    };
  }, [fontsLoaded]);

  if (!appIsReady) {
    return null;
  }

  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY || ""}
      autocapture={{ captureScreens: false }}
      options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "",
      }}>
      <RootErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
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
                  </AuthProvider>
                </PaystackProvider>
              </SafeAreaProvider>
            </HeroUINativeProvider>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </RootErrorBoundary>
    </PostHogProvider>
  );
});
