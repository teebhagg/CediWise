import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
// import { StatusBar } from 'expo-status-bar';
import { TriggerProvider } from "@/contexts/TriggerContext";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as WebBrowser from "expo-web-browser";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect, useState } from "react";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import {
  SafeAreaListener,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { Uniwind } from "uniwind";
import { RootErrorBoundary } from "../components/RootErrorBoundary";
import { useAuthRefresh } from "../hooks/useAuthRefresh";
import "./globals.css";

// Apply dark theme before first paint (same as NativeWind dark app)
Uniwind.setTheme("dark");

SplashScreen.preventAutoHideAsync();

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
              <TriggerProvider>
                <View style={{ flex: 1, backgroundColor: "black" }}>
                  <StatusBar backgroundColor="black" translucent={true} />
                  <SafeAreaListener
                    onChange={({ insets }) => {
                      Uniwind.updateInsets(insets);
                    }}>
                    {/* <StatusBar backgroundColor="#0f172a" translucent={true} /> */}
                    <Stack>
                      <Stack.Screen
                        name="index"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="profile"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="queue"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="vitals"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="budget"
                        options={{ headerShown: false }}
                      />
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
                      <Stack.Screen
                        name="expenses"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="auth/index"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="auth/otp"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="auth/name"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="auth/callback"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="onboarding"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="literacy"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="salary-calculator"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="terms"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="privacy"
                        options={{ headerShown: false }}
                      />
                    </Stack>
                  </SafeAreaListener>
                </View>
              </TriggerProvider>
            </SafeAreaProvider>
          </HeroUINativeProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}
