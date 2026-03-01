import { authTokens } from "@/constants/authTokens";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  extractUserData,
  persistAuthAndVerify,
  refreshStoredSession,
} from "../utils/auth";
import { onLoginSuccess } from "../utils/authRouting";
import { log } from "../utils/logger";
import { supabase } from "../utils/supabase";

const MAX_RETRIES = 2;

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const { refreshAuth } = useAuth();

  const checkSession = useCallback(async () => {
    try {
      if (!supabase) {
        router.replace("/auth");
        return;
      }
      // 1) Fast path: use local auth, refreshing if needed.
      const storedAuth = await refreshStoredSession();
      if (storedAuth?.user?.id) {
        log.debug("Using stored auth data for user:", storedAuth.user.email);
        await refreshAuth();
        await onLoginSuccess(storedAuth.user.id);
        return;
      }

      // 2) Fallback: check Supabase persisted session and store locally.
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        log.error("Session check error:", error);
        router.replace("/onboarding");
        return;
      }

      if (data.session?.user) {
        const userData = extractUserData(data.session.user);
        const expiresIn = data.session.expires_in ?? 3600;
        const expiresAt =
          typeof (data.session as { expires_at?: number }).expires_at === "number"
            ? (data.session as { expires_at: number }).expires_at * 1000
            : Date.now() + expiresIn * 1000;

        const stored = await persistAuthAndVerify({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token ?? "",
          expiresIn,
          expiresAt,
          user: userData,
        });
        if (!stored?.user?.id) {
          log.error("Auth data not persisted; not navigating");
          router.replace("/onboarding");
          return;
        }
        await refreshAuth();
        await onLoginSuccess(stored.user.id);
        return;
      }

      log.debug("No session found, redirecting to onboarding");
      router.replace("/onboarding");
    } catch (e) {
      log.error("Error checking session:", e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAuth]);

  useEffect(() => {
    let retries = 0;

    const run = async () => {
      while (retries <= MAX_RETRIES) {
        setIsLoading(true);
        try {
          await checkSession();
          return;
        } catch (e) {
          retries++;
          if (retries > MAX_RETRIES) {
            log.error("Session check failed after retries:", e);
            router.replace("/onboarding");
            return;
          }
          await new Promise((r) => setTimeout(r, 500 * retries));
        }
      }
    };

    run();
  }, [checkSession]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: authTokens.background,
        justifyContent: "center",
        alignItems: "center",
      }}>
      {isLoading && (
        <>
          <ActivityIndicator size="large" color={authTokens.spinner} />
          <Text
            style={{
              color: authTokens.textMuted,
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
