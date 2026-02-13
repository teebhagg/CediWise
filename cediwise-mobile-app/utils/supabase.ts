import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
          lock: processLock,
        },
        global: {
          fetch: fetch.bind(globalThis),
          headers: {},
        },
      })
    : null;
