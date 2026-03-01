import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { log } from "./logger";
import { supabase } from "./supabase";

/** Firebase Phone Auth: confirmation result stored after signInWithPhoneNumber for use on OTP screen. */
let firebasePhoneConfirmation: {
  confirm: (
    code: string
  ) => Promise<{ user: { getIdToken: (force?: boolean) => Promise<string> } }>;
} | null = null;

/** Message shown when Firebase native module is missing (e.g. in Expo Go). */
export const FIREBASE_PHONE_UNAVAILABLE_MESSAGE =
  "Phone sign-in requires a development build. Use “Continue with Google” here, or run: npx expo run:ios (or run:android).";

function getFirebaseAuth(): unknown {
  if (Platform.OS === "web") return null;
  // Firebase native modules are not available in Expo Go
  const appOwnership = Constants.appOwnership ?? "";
  if (appOwnership === "expo") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-firebase/auth").default;
  } catch {
    return null;
  }
}

/** Normalize phone to E.164 for Firebase (e.g. +233xxxxxxxxx). */
function normalizePhoneForFirebase(phone: string): string {
  let s = (phone || "").trim().replace(/\s/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("0")) s = "233" + s.slice(1);
  if (s.length > 0 && !s.startsWith("233")) s = "233" + s;
  return s.startsWith("233") ? "+" + s : "+233" + s;
}

export type AuthResult = {
  success: boolean;
  error?: string;
  /** Set on success when caller should use persisted auth (e.g. OTP flow). */
  stored?: StoredAuthData | null;
};

export type StoredUserData = {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  avatar?: string;
  lastLogin: string;
};

/**
 * Returns the contact to display (phone or email) for profile/settings.
 * When email contains cediwise.phone (phone auth), prefers phone.
 */
export function getDisplayContact(user: StoredUserData | null | undefined): {
  value: string;
  isPhone: boolean;
} {
  if (!user) return { value: "", isPhone: false };
  if (user.email?.includes("cediwise.phone") && user.phone) {
    return { value: user.phone, isPhone: true };
  }
  return { value: user.email || "", isPhone: false };
}

export type StoredAuthData = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  /**
   * Access token expiry, milliseconds since epoch (Date.now()).
   */
  expiresAt: number;
  user: StoredUserData;
};

export const REFRESH_BUFFER_MS = 2 * 60 * 1000; // 2 minutes before expiry

const CEDIWISE_AUTH_KEY = "@cediwise_auth";
/** SecureStore allows only alphanumeric, ".", "-", "_" — no "@" */
const CEDIWISE_AUTH_SECURE_KEY = "cediwise_auth";
const CEDIWISE_STORAGE_PREFIX = "@cediwise_";

const isWeb = Platform.OS === "web";

async function setAuthStorage(value: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(CEDIWISE_AUTH_KEY, value);
  } else {
    await SecureStore.setItemAsync(CEDIWISE_AUTH_SECURE_KEY, value);
  }
}

async function getAuthStorage(): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(CEDIWISE_AUTH_KEY);
  }
  return SecureStore.getItemAsync(CEDIWISE_AUTH_SECURE_KEY);
}

async function removeAuthStorage(): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(CEDIWISE_AUTH_KEY);
  } else {
    await SecureStore.deleteItemAsync(CEDIWISE_AUTH_SECURE_KEY);
  }
}

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

const isAccessTokenExpired = (authData: StoredAuthData): boolean => {
  if (!authData.expiresAt) return false;
  return Date.now() >= authData.expiresAt;
};

const shouldRefreshAccessToken = (authData: StoredAuthData): boolean => {
  if (!authData.expiresAt) return true;
  return authData.expiresAt - Date.now() <= REFRESH_BUFFER_MS;
};

const classifyRefreshError = (
  error: unknown
): "invalid_refresh_token" | "network" | "unknown" => {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as any).message ?? "")
      : String(error ?? "");
  const status =
    error && typeof error === "object" && "status" in error
      ? Number((error as any).status)
      : undefined;

  // Supabase typically returns `invalid_grant` for invalid refresh tokens.
  if (
    status &&
    status >= 400 &&
    status < 500 &&
    /(invalid_grant|invalid refresh token|refresh token)/i.test(message)
  ) {
    return "invalid_refresh_token";
  }

  // React Native fetch/network failures often surface as these strings.
  if (
    /network request failed|failed to fetch|networkerror|econnreset|timeout/i.test(
      message
    )
  ) {
    return "network";
  }

  return "unknown";
};

const getQueryParams = (url: string) => {
  const queryParams: Record<string, string> = {};
  // Supabase OAuth returns tokens in hash fragment: ...#access_token=...&refresh_token=...
  const [, fragment] = url.split("#");
  const queryString = fragment || url.split("?")[1] || "";
  if (queryString) {
    const pairs = queryString.split("&");
    pairs.forEach((pair) => {
      const [key, value] = pair.split("=");
      if (key && value) {
        try {
          queryParams[key] = decodeURIComponent(value);
        } catch {
          queryParams[key] = value;
        }
      }
    });
  }
  return queryParams;
};

/**
 * Handle OAuth callback when app is opened via deep link (common on Android).
 * Parses tokens from URL hash and establishes session.
 */
export async function handleOAuthCallbackFromUrl(
  url: string
): Promise<AuthResult> {
  if (!supabase) return { success: false, error: "App not configured" };
  try {
    const params = getQueryParams(url);
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;
    const expiresAtSeconds = toNumber(params.expires_at);
    const expiresInSeconds = toNumber(params.expires_in);

    if (!accessToken || !refreshToken) {
      return {
        success: false,
        error: "No tokens in OAuth callback URL",
      };
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData?.session?.user) {
      return {
        success: false,
        error: sessionError?.message ?? "Failed to establish session",
      };
    }

    const userData = extractUserData(sessionData.session.user);
    const expiresIn =
      sessionData.session.expires_in ||
      (expiresInSeconds ? Math.floor(expiresInSeconds) : undefined) ||
      3600;
    const expiresAt =
      typeof (sessionData.session as any).expires_at === "number"
        ? (sessionData.session as any).expires_at * 1000
        : expiresAtSeconds
        ? Math.floor(expiresAtSeconds) * 1000
        : Date.now() + expiresIn * 1000;

    const authData: StoredAuthData = {
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token || "",
      expiresIn,
      expiresAt,
      user: userData,
    };

    const stored = await persistAuthAndVerify(authData);
    return { success: true, stored };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to complete sign-in";
    log.error("OAuth callback from URL error:", message);
    return { success: false, error: message };
  }
}

export async function requestOtp(phone: string): Promise<AuthResult> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    return {
      success: false,
      error: FIREBASE_PHONE_UNAVAILABLE_MESSAGE,
    };
  }
  try {
    const normalized = normalizePhoneForFirebase(phone);
    if (normalized.length < 10) {
      return { success: false, error: "Enter a valid phone number" };
    }
    firebasePhoneConfirmation = null;
    const authInstance =
      typeof firebaseAuth === "function" ? firebaseAuth() : null;
    if (!authInstance?.signInWithPhoneNumber) {
      return { success: false, error: FIREBASE_PHONE_UNAVAILABLE_MESSAGE };
    }
    const confirmation = await authInstance.signInWithPhoneNumber(normalized);
    firebasePhoneConfirmation = confirmation as {
      confirm: (code: string) => Promise<{
        user: { getIdToken: (force?: boolean) => Promise<string> };
      }>;
    };
    log.debug("Firebase phone auth: code sent to", normalized);
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unable to send code";
    log.debug("Firebase signInWithPhoneNumber error:", message);
    if (
      typeof message === "string" &&
      /RNFB|Native module.*not found/i.test(message)
    ) {
      return { success: false, error: FIREBASE_PHONE_UNAVAILABLE_MESSAGE };
    }
    if (
      typeof message === "string" &&
      /invalid.*phone|invalid.*number/i.test(message)
    ) {
      return { success: false, error: "Invalid phone number" };
    }
    if (
      typeof message === "string" &&
      /too many requests|quota/i.test(message)
    ) {
      return { success: false, error: "Too many attempts. Try again later." };
    }
    return { success: false, error: message };
  }
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<AuthResult> {
  return verifyOtpAndStore(phone, code);
}

/**
 * Update the user's display name in Supabase auth and local storage.
 * Used after phone OTP sign-in when the user has no name set.
 */
export async function updateUserProfileName(name: string): Promise<AuthResult> {
  if (!supabase) return { success: false, error: "App not configured" };
  const trimmed = (name || "").trim();
  if (!trimmed) return { success: false, error: "Please enter your name" };
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });
    if (error) return { success: false, error: error.message };
    if (!data?.user)
      return { success: false, error: "Could not update profile" };
    const authData = await getStoredAuthData({ allowExpired: true });
    if (authData) {
      const userData = extractUserData(data.user);
      const updated = {
        ...authData,
        user: { ...authData.user, name: userData.name ?? trimmed },
      };
      const stored = await persistAuthAndVerify(updated);
      return { success: true, stored };
    }
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save name";
    return { success: false, error: message };
  }
}

/**
 * Store authentication data locally for offline access
 */
export async function storeAuthData(authData: StoredAuthData): Promise<void> {
  try {
    await setAuthStorage(JSON.stringify(authData));
  } catch (e) {
    throw e;
  }
}

/**
 * Store auth data and verify by reading back. Use after building authData from session/OTP.
 * Returns stored data on success, null if read-back failed.
 */
export async function persistAuthAndVerify(
  authData: StoredAuthData
): Promise<StoredAuthData | null> {
  try {
    await storeAuthData(authData);
    return await getStoredAuthData();
  } catch {
    return null;
  }
}

/**
 * Retrieve stored authentication data
 */
export async function getStoredAuthData(options?: {
  /**
   * If true, returns stored auth even if access token is expired.
   * This enables “offline still logged in” UX and lets refresh logic decide.
   *
   * Default: true
   */
  allowExpired?: boolean;
}): Promise<StoredAuthData | null> {
  try {
    const allowExpired = options?.allowExpired ?? true;

    const data = await getAuthStorage();
    if (!data) return null;

    const authData = JSON.parse(data) as StoredAuthData;
    if (!allowExpired && isAccessTokenExpired(authData)) {
      return null;
    }

    return authData;
  } catch {
    return null;
  }
}

/**
 * Attempt to refresh the stored Supabase session from the refresh token
 */
let refreshInFlight: Promise<StoredAuthData | null> | null = null;

export async function refreshStoredSession(
  overrideRefreshToken?: string
): Promise<StoredAuthData | null> {
  if (!supabase) return null;
  if (refreshInFlight) return refreshInFlight;

  try {
    const authData = await getStoredAuthData({ allowExpired: true });
    if (!authData) {
      return null;
    }

    // If token is still comfortably valid, no need to refresh.
    if (!shouldRefreshAccessToken(authData)) {
      // Ensure the Supabase client has an in-memory session for authenticated requests.
      // (We run Supabase with persistSession/autoRefreshToken disabled.)
      try {
        await supabase.auth.setSession({
          access_token: authData.accessToken,
          refresh_token: authData.refreshToken,
        });
      } catch (e) {
        // Non-fatal: keep local auth; user may be offline.
        log.warn("setSession from stored auth failed (non-fatal):", e);
      }
      return authData;
    }

    const refreshToken = overrideRefreshToken || authData.refreshToken;
    if (!refreshToken) {
      await clearAuthData();
      await supabase.auth.signOut();
      return null;
    }

    refreshInFlight = (async () => {
      const response = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (response.error || !response.data?.session) {
        const reason = classifyRefreshError(response.error);

        if (reason === "invalid_refresh_token") {
          log.warn("Session refresh failed (invalid refresh token)");
          await clearAuthData();
          await supabase.auth.signOut();
          return null;
        }

        // Network/unknown: keep local auth so user stays “logged in” offline.
        log.warn("Session refresh failed (non-fatal):", response.error);
        return authData;
      }

      const session = response.data.session;
      const userData = extractUserData(session.user);
      const expiresIn = session.expires_in || authData.expiresIn || 3600;
      const expiresAt =
        typeof (session as any).expires_at === "number"
          ? (session as any).expires_at * 1000
          : Date.now() + expiresIn * 1000;

      const refreshed: StoredAuthData = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token || authData.refreshToken,
        expiresIn,
        expiresAt,
        user: userData,
      };

      await storeAuthData(refreshed);
      await supabase.auth.setSession({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
      });
      return refreshed;
    })();

    return await refreshInFlight;
  } catch (error) {
    const authData = await getStoredAuthData({ allowExpired: true });
    const reason = classifyRefreshError(error);

    if (reason === "invalid_refresh_token") {
      log.warn("Refresh threw (invalid refresh token)");
      await clearAuthData();
      await supabase.auth.signOut();
      return null;
    }

    if (reason === "network") {
      log.warn("Refresh threw (network); keeping local auth");
      return authData;
    }

    log.error("Error refreshing session:", error);
    return authData;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * Clear all app-local storage and cache (auth, budget, vitals, drafts).
 * Use on logout so the next user or re-login gets a clean slate.
 */
export async function clearAllAppStorage(): Promise<void> {
  try {
    await removeAuthStorage();
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter((k) => k.startsWith(CEDIWISE_STORAGE_PREFIX));
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
    }
  } catch {
    // Best-effort clear
  }
}

/**
 * Clear stored authentication data and all app cache (budget, vitals, etc.).
 */
export async function clearAuthData(): Promise<void> {
  try {
    await clearAllAppStorage();
  } catch {
    // Best-effort clear
  }
}

/**
 * Extract user data from Supabase session
 */
export function extractUserData(user: any): StoredUserData {
  return {
    id: user.id,
    email: user.email || "",
    phone: user.phone,
    name: user.user_metadata?.full_name,
    avatar: user.user_metadata?.avatar_url,
    lastLogin: new Date().toISOString(),
  };
}

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return { success: false, error: "App not configured" };

  // Web: keep existing Supabase OAuth + browser flow.
  if (isWeb) {
    try {
      const redirectUrl = Linking.createURL("auth/callback");

      log.debug("Redirect URL:", redirectUrl);

      const { data, error: urlError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (urlError || !data?.url) {
        return {
          success: false,
          error: urlError?.message ?? "Failed to initiate Google sign-in",
        };
      }

      log.debug("OAuth URL:", data.url);
      log.debug("Opening OAuth URL for Google Sign-In");

      const result: any = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      log.debug("OAuth browser result type (web):", result.type);

      if (result.type === "success") {
        const params: any = getQueryParams(result.url);
        log.debug("Query params:", params);
        const accessToken = params.access_token;
        const refreshToken = params.refresh_token;
        const expiresAtSeconds = toNumber(params.expires_at);
        const expiresInSeconds = toNumber(params.expires_in);
        log.debug("Access token:", !!accessToken);
        log.debug("Refresh token:", !!refreshToken);

        const user = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (user.error) {
          log.error("Session set error:", user.error);
          return { success: false, error: user.error.message };
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { data: sessionData, error } = await supabase.auth.getSession();

        if (error) {
          log.error("Session retrieval error:", error);
          return { success: false, error: error.message };
        }

        if (sessionData.session && sessionData.session.user) {
          const userData = extractUserData(sessionData.session.user);
          const expiresIn =
            sessionData.session.expires_in ||
            (expiresInSeconds ? Math.floor(expiresInSeconds) : undefined) ||
            3600;
          const expiresAt =
            typeof (sessionData.session as any).expires_at === "number"
              ? (sessionData.session as any).expires_at * 1000
              : expiresAtSeconds
              ? Math.floor(expiresAtSeconds) * 1000
              : Date.now() + expiresIn * 1000;

          const authData: StoredAuthData = {
            accessToken: sessionData.session.access_token,
            refreshToken: sessionData.session.refresh_token || "",
            expiresIn,
            expiresAt,
            user: userData,
          };

          await storeAuthData(authData);
          log.debug("✓ User data stored locally (web)");
          return { success: true };
        }

        log.error("✗ No session found after OAuth success (web)");
        return {
          success: false,
          error: "Authentication succeeded but session not established",
        };
      } else if (result.type === "dismiss") {
        log.debug("User dismissed OAuth browser (web)");
        return { success: false, error: "Sign-in cancelled" };
      } else {
        log.error("OAuth result type (web):", result.type);
        return { success: false, error: "Sign-in failed" };
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Unable to sign in with Google";
      log.error("Google sign-in error (web):", message);
      return { success: false, error: message };
    }
  }

  // Native (iOS / Android): use Google Sign-In SDK + Supabase signInWithIdToken.
  try {
    // Ensure Google Play services / native SDK is available (Android).
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }

    const userInfo = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens.idToken || (userInfo as any)?.idToken;

    if (!idToken) {
      log.error("Google Sign-In returned no idToken");
      return {
        success: false,
        error: "Unable to get Google ID token. Please try again.",
      };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error || !data?.session || !data.session.user) {
      log.error("Supabase signInWithIdToken error:", error);
      return {
        success: false,
        error: error?.message ?? "Could not complete Google sign-in",
      };
    }

    const session = data.session;
    const userData = extractUserData(session.user);
    const expiresIn = session.expires_in || 3600;
    const expiresAt =
      typeof (session as any).expires_at === "number"
        ? (session as any).expires_at * 1000
        : Date.now() + expiresIn * 1000;

    const authData: StoredAuthData = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token || "",
      expiresIn,
      expiresAt,
      user: userData,
    };

    await storeAuthData(authData);
    log.debug("✓ User data stored locally (native Google)");
    return { success: true };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e) {
      const code = (e as any).code;
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        log.debug("Google Sign-In cancelled by user");
        return { success: false, error: "Sign-in cancelled" };
      }
      if (code === statusCodes.IN_PROGRESS) {
        log.debug("Google Sign-In already in progress");
        return {
          success: false,
          error: "Sign-in already in progress. Please wait.",
        };
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        log.error("Google Play services not available");
        return {
          success: false,
          error:
            "Google Play services are not available on this device. Try again later.",
        };
      }
    }

    const message =
      e instanceof Error ? e.message : "Unable to sign in with Google";
    log.error("Google native sign-in error:", message);
    return { success: false, error: message };
  }
}

/**
 * Phone-only login: verify OTP with Firebase, then exchange Firebase ID token
 * for Supabase session via auth-phone-firebase and store auth data.
 */
export async function verifyOtpAndStore(
  phone: string,
  code: string
): Promise<AuthResult> {
  if (!supabase) return { success: false, error: "App not configured" };
  const confirmation = firebasePhoneConfirmation;
  if (!confirmation) {
    return { success: false, error: "Session expired. Request a new code." };
  }
  try {
    const credential = await confirmation.confirm(code.trim());
    firebasePhoneConfirmation = null;
    const idToken = await credential.user.getIdToken();
    if (!idToken) {
      return { success: false, error: "Could not get sign-in token" };
    }

    const { data: sessionData, error: sessionError } =
      await supabase.functions.invoke("auth-phone-firebase", {
        body: { id_token: idToken },
      });

    if (sessionError) {
      return { success: false, error: sessionError.message };
    }

    const errMsg = sessionData?.error ?? sessionData?.userMessage;
    if (errMsg) {
      return {
        success: false,
        error:
          typeof errMsg === "string" ? errMsg : "Could not complete sign-in",
      };
    }

    if (!sessionData?.token_hash || sessionData?.type !== "magiclink") {
      return { success: false, error: "Could not complete sign-in" };
    }

    const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
      token_hash: sessionData.token_hash,
      type: "magiclink",
    });

    if (otpErr || !otpData.session) {
      return {
        success: false,
        error: otpErr?.message ?? "Invalid or expired session",
      };
    }

    const userData = extractUserData(otpData.session.user);
    const expiresIn = otpData.session.expires_in || 3600;
    const expiresAt =
      typeof (otpData.session as any).expires_at === "number"
        ? (otpData.session as any).expires_at * 1000
        : Date.now() + expiresIn * 1000;
    const authData: StoredAuthData = {
      accessToken: otpData.session.access_token,
      refreshToken: otpData.session.refresh_token || "",
      expiresIn,
      expiresAt,
      user: userData,
    };
    const stored = await persistAuthAndVerify(authData);
    return { success: true, stored };
  } catch (e) {
    firebasePhoneConfirmation = null;
    const message = e instanceof Error ? e.message : "Unable to verify code";
    if (typeof message === "string" && /invalid|expired|wrong/i.test(message)) {
      return { success: false, error: "Invalid or expired code" };
    }
    return { success: false, error: message };
  }
}
