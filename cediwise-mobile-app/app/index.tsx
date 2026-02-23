import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  extractUserData,
  refreshStoredSession,
  storeAuthData,
} from "../utils/auth";
import { log } from "../utils/logger";
import { getPostAuthRoute } from "../utils/profileVitals";
import { supabase } from "../utils/supabase";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Supabase env may be missing in production APK (e.g. EAS env not set).
        if (!supabase) {
          router.replace("/auth");
          setIsLoading(false);
          return;
        }
        // 1) Fast path: use local auth, refreshing if needed.
        const storedAuth = await refreshStoredSession();
        if (storedAuth) {
          log.debug("Using stored auth data for user:", storedAuth.user.email);
          const route = await getPostAuthRoute(storedAuth.user.id);
          router.replace(route);
          return;
        }

        // 2) Fallback: check Supabase persisted session and store locally.
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          log.error("Session check error:", error);
          router.replace("/onboarding");
          return;
        }

        if (data.session && data.session.user) {
          const userData = extractUserData(data.session.user);
          const expiresIn = data.session.expires_in || 3600;
          const expiresAt =
            typeof (data.session as any).expires_at === "number"
              ? (data.session as any).expires_at * 1000
              : Date.now() + expiresIn * 1000;

          await storeAuthData({
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token || "",
            expiresIn,
            expiresAt,
            user: userData,
          });

          const route = await getPostAuthRoute(userData.id);
          router.replace(route);
          return;
        }

        {
          // No session, redirect to onboarding
          log.debug("No session found, redirecting to onboarding");
          router.replace("/onboarding");
        }
      } catch (e) {
        log.error("Error checking session:", e);
        router.replace("/onboarding");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#020617",
        justifyContent: "center",
        alignItems: "center",
      }}>
      {isLoading && (
        <>
          <ActivityIndicator size="large" color="#E5E7EB" />
          <Text
            style={{
              color: "#9CA3AF",
              marginTop: 12,
              fontFamily: "Figtree-Regular",
            }}>
            Loading...
          </Text>
        </>
      )}
    </View>
  );
}
