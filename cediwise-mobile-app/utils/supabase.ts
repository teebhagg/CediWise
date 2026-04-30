import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Web: keep processLock (multi-tab coordination).
 * iOS/Android: promise-chain mutex — same signature as processLock, serializes GoTrue auth work
 * in one JS runtime. We avoid the stock processLock here because it led to long acquire stalls
 * when Paystack WebView, Realtime, and getSession contended (see gotrue-js lock warnings).
 * `acquireTimeout` is part of the lock API for compatibility; the queue itself does not time out
 * (matches the common “always eventually serializes” mutex pattern).
 */
let nativeAuthMutex: Promise<void> = Promise.resolve();
const nativeAuthLock = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => {
  void _name;
  void _acquireTimeout;
  const pending = nativeAuthMutex.then(() => fn());
  nativeAuthMutex = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
};

const authLock =
  Platform.OS === "web" ? processLock : nativeAuthLock;

/**
 * Supabase client. Null if env vars are missing (e.g. APK built without EAS env),
 * which would otherwise throw at createClient() and crash the app.
 */
export const supabase: SupabaseClient | null =
  url && key && supabaseAnonKey
    ? createClient(url, supabaseAnonKey, {
        auth: {
          detectSessionInUrl: false,
          autoRefreshToken: false,
          persistSession: false,
          storage: AsyncStorage,
          lock: authLock,
          /** Softer than default 10s when multiple callers queue (web tabs + mutex depth). */
          lockAcquireTimeout: 60_000,
        },
        global: {
          fetch: fetch.bind(globalThis),
          headers: {},
        },
      })
    : null;
