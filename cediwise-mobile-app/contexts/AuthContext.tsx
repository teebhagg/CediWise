import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { deactivateCurrentDeviceToken } from "../services/notifications";
import { clearAuthData, getStoredAuthData } from "../utils/auth";
import { resetStoresOnLogout } from "../utils/resetStoresOnLogout";
import { log } from "../utils/logger";
import { supabase } from "../utils/supabase";

export type StoredUserData = {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  avatar?: string;
  lastLogin: string;
};

type AuthContextValue = {
  user: StoredUserData | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  /** Call after storing auth (e.g. OAuth callback, OTP success) */
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authEventDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  /** Bumps on auth transitions so stale async work cannot commit React state. */
  const authEventIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadUser = useCallback(async (expectedToken: number) => {
    try {
      const authData = await getStoredAuthData();
      if (
        expectedToken !== authEventIdRef.current ||
        !isMountedRef.current
      ) {
        return;
      }
      setUser(authData?.user ?? null);
    } catch (e) {
      log.error("Error loading user:", e);
      if (
        expectedToken !== authEventIdRef.current ||
        !isMountedRef.current
      ) {
        return;
      }
      setUser(null);
    } finally {
      // Spinner: always clear when mounted so superseded loads / refreshAuth never strand `isLoading`.
      // `setUser` above remains gated by `expectedToken`.
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void loadUser(0);
  }, [loadUser]);

  useEffect(() => {
    if (!supabase) return;

    const clearDebounce = () => {
      if (authEventDebounceRef.current) {
        clearTimeout(authEventDebounceRef.current);
        authEventDebounceRef.current = null;
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;

      if (event === "SIGNED_OUT") {
        clearDebounce();
        setUser(null);
        setIsLoading(false);
        authEventIdRef.current += 1;
        const capturedToken = authEventIdRef.current;
        void (async () => {
          try {
            await clearAuthData();
            await resetStoresOnLogout();
          } catch (e) {
            log.warn("Auth state SIGNED_OUT cleanup:", e);
          }
          if (
            capturedToken !== authEventIdRef.current ||
            !isMountedRef.current
          ) {
            return;
          }
        })();
        return;
      }

      clearDebounce();
      authEventDebounceRef.current = setTimeout(() => {
        authEventDebounceRef.current = null;
        authEventIdRef.current += 1;
        const tokenAtFire = authEventIdRef.current;
        void loadUser(tokenAtFire);
      }, 350);
    });

    return () => {
      clearDebounce();
      subscription.unsubscribe();
    };
  }, [loadUser]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          void loadUser(authEventIdRef.current);
        }
      },
    );
    return () => subscription.remove();
  }, [loadUser]);

  const logout = useCallback(async () => {
    authEventIdRef.current += 1;
    const capturedToken = authEventIdRef.current;
    try {
      const userId = user?.id;
      if (userId) {
        await deactivateCurrentDeviceToken(userId);
      }
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          log.warn("Supabase signOut failed (continuing):", e);
        }
      }
      await clearAuthData();
      try {
        await resetStoresOnLogout();
      } catch (storeErr) {
        log.warn("resetStoresOnLogout failed (continuing logout):", storeErr);
      }
      if (
        capturedToken !== authEventIdRef.current ||
        !isMountedRef.current
      ) {
        return;
      }
      setUser(null);
    } catch (e) {
      log.error("Error during logout:", e);
      throw e;
    }
  }, [user?.id]);

  const refreshAuth = useCallback(async () => {
    authEventIdRef.current += 1;
    const token = authEventIdRef.current;
    if (!isMountedRef.current) return;
    setIsLoading(true);
    await loadUser(token);
  }, [loadUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
