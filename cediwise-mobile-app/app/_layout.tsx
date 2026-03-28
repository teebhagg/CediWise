import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
// import { StatusBar } from 'expo-status-bar';
import { TriggerProvider } from "@/contexts/TriggerContext";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as WebBrowser from "expo-web-browser";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect, useState } from "react";
import { AppState, Platform, StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import {
  SafeAreaListener,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { Uniwind } from "uniwind";
import { RootErrorBoundary } from "../components/RootErrorBoundary";
import { TourErrorBoundary } from "../components/tour/TourErrorBoundary";
import { AuthProvider } from "../contexts/AuthContext";
import { TierProvider } from "../contexts/TierContext";
import { useAuth } from "../hooks/useAuth";
import {
  TourProvider,
  TourProviderFallback,
} from "../contexts/TourContext";
import { useAuthRefresh } from "../hooks/useAuthRefresh";
import { useBudget } from "../hooks/useBudget";
import { usePersonalizationStore } from "../stores/personalizationStore";
import { useProfileVitalsStore } from "../stores/profileVitalsStore";
import { useSMELedgerStore } from "../stores/smeLedgerStore";
import { initNotificationSystem } from "../services/notifications";
import { syncTaxConfig } from "../utils/taxSync";
import { PaystackProvider } from "react-native-paystack-webview";
import {
  hasHydratedThisSession,
  setHydratedThisSession,
} from "../utils/budgetHydrateSession";
import "./globals.css";

// Apply dark theme before first paint (same as NativeWind dark app)
Uniwind.setTheme("dark");

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { user } = useAuth();
  const { hydrateFromRemote } = useBudget(user?.id);

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

    // 2. Budget Hydration (Once per session)
    if (!hasHydratedThisSession()) {
      setHydratedThisSession();
      void (async () => {
        await hydrateFromRemote();
        await useSMELedgerStore.getState().initForUser(user.id); // Ensure SME is ready
        await import("../utils/smeSync").then((m) => m.flushSMEQueue(user.id!));
      })();
    }
  }, [user?.id, hydrateFromRemote]);

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
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
        </Stack>
      </SafeAreaListener>
    </View>
  );
}

export default function RootLayout() {
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
    void syncTaxConfig(); // Sync tax rates for offline usage and global calculations


    // Only configure native Google Sign-In when not in Expo Go (dynamic require avoids loading native module in Expo Go).
    const isExpoGo = (Constants.appOwnership ?? "") === "expo";
    if (
      (Platform.OS === "ios" || Platform.OS === "android") &&
      !isExpoGo
    ) {
      try {
        const { GoogleSignin } = require("@react-native-google-signin/google-signin");
        GoogleSignin.configure({
          // Web client ID from google-services.json (client_type: 3)
          webClientId:
            "758685762731-vh9reoikjerbsu8pbcigndi29tdb7fp9.apps.googleusercontent.com",
        });
      } catch (e) {
        console.warn("GoogleSignin.configure failed", e);
      }
    }
  }, [fontsLoaded]);

  if (!appIsReady) {
    return null;
  }

  return (
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
  );
}
