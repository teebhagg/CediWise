import { useEffect, useState } from "react";
import { clearAuthData, getStoredAuthData } from "../utils/auth";
import { log } from "../utils/logger";
import { supabase } from "../utils/supabase";

type StoredUserData = {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  avatar?: string;
  lastLogin: string;
};

type UseAuthReturn = {
  user: StoredUserData | null;
  isLoading: boolean;
  logout: () => Promise<void>;
};

/**
 * Hook to access the currently logged-in user data from local storage
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<StoredUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const authData = await getStoredAuthData();
        if (authData) {
          setUser(authData.user);
        }
      } catch (e) {
        log.error("Error loading user:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = async () => {
    try {
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
  };

  return { user, isLoading, logout };
}
