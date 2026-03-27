import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const TAX_CONFIG_CACHE_KEY = "cediwise_global_tax_config";

export type PAYEBracket = {
  band_width: number | null;
  rate: number;
};

export type TaxConfig = {
  employee_ssnit_rate: number;
  ssnit_monthly_cap: number;
  nhis_rate: number;
  paye_brackets: PAYEBracket[];
};

// Real 2026 Ghana Tax Fallback (Static Default)
export const GHANA_TAX_FALLBACK_2026: TaxConfig = {
  employee_ssnit_rate: 0.055,
  ssnit_monthly_cap: 69000,
  nhis_rate: 0.025,
  paye_brackets: [
    { band_width: 490, rate: 0 },
    { band_width: 110, rate: 0.05 },
    { band_width: 130, rate: 0.10 },
    { band_width: 3166.67, rate: 0.175 },
    { band_width: 16000, rate: 0.25 },
    { band_width: 30520, rate: 0.30 },
    { band_width: null, rate: 0.35 },
  ],
};

let activeTaxConfig: TaxConfig | null = null;

/**
 * Gets the current active tax config.
 * Returns the cached memory version, or falls back to storage/static.
 */
export async function getActiveTaxConfig(): Promise<TaxConfig> {
  if (activeTaxConfig) return activeTaxConfig;

  try {
    const cached = await AsyncStorage.getItem(TAX_CONFIG_CACHE_KEY);
    if (cached) {
      activeTaxConfig = JSON.parse(cached);
      return activeTaxConfig!;
    }
  } catch (e) {
    console.error("Error reading tax cache:", e);
  }

  return GHANA_TAX_FALLBACK_2026;
}

/**
 * Syncs the tax config from Supabase and updates the local cache.
 */
export async function syncTaxConfig(): Promise<void> {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from("tax_config")
      .select("employee_ssnit_rate, ssnit_monthly_cap, paye_brackets")
      .eq("country", "ghana")
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const config: TaxConfig = {
        employee_ssnit_rate: data.employee_ssnit_rate,
        ssnit_monthly_cap: data.ssnit_monthly_cap,
        nhis_rate: GHANA_TAX_FALLBACK_2026.nhis_rate,
        paye_brackets: data.paye_brackets as PAYEBracket[],
      };

      activeTaxConfig = config;
      await AsyncStorage.setItem(TAX_CONFIG_CACHE_KEY, JSON.stringify(config));
      console.log("Tax config synced successfully.");
    }
  } catch (e) {
    console.error("Failed to sync tax config:", e);
  }
}
