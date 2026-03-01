import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { deactivateCurrentDeviceToken } from "../services/notifications";
import { clearAuthData, getStoredAuthData } from "../utils/auth";
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

  const loadUser = useCallback(async () => {
    try {
      const authData = await getStoredAuthData();
      setUser(authData?.user ?? null);
    } catch (e) {
      log.error("Error loading user:", e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          loadUser();
        }
      },
    );
    return () => subscription.remove();
  }, [loadUser]);

  const logout = useCallback(async () => {
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
      setUser(null);
    } catch (e) {
      log.error("Error during logout:", e);
      throw e;
    }
  }, [user?.id]);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    await loadUser();
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
