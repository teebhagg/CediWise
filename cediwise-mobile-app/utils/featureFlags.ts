import AsyncStorage from "@react-native-async-storage/async-storage";

import { isMoMoSmsLiveImportEnvEnabled } from "@/constants/smsImport";

export type FeatureFlagName =
  | "value_first_onboarding_v1"
  | "momo_sms_live_import";

const FLAG_KEY_PREFIX = "@cediwise_feature_flag:";

function readEnvDefault(flag: FeatureFlagName): boolean {
  if (flag === "value_first_onboarding_v1") {
    const raw = process.env.EXPO_PUBLIC_VALUE_FIRST_ONBOARDING_V1;
    return raw === "1" || raw === "true";
  }
  if (flag === "momo_sms_live_import") {
    return isMoMoSmsLiveImportEnvEnabled();
  }
  return false;
}

function flagKey(flag: FeatureFlagName, userId?: string | null): string {
  return userId
    ? `${FLAG_KEY_PREFIX}${flag}:${userId}`
    : `${FLAG_KEY_PREFIX}${flag}`;
}

function parseBoolean(raw: string | null): boolean | null {
  if (raw == null) return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

async function readOverride(
  flag: FeatureFlagName,
  userId?: string | null
): Promise<boolean | null> {
  try {
    const perUser = parseBoolean(await AsyncStorage.getItem(flagKey(flag, userId)));
    if (perUser !== null) return perUser;
    return parseBoolean(await AsyncStorage.getItem(flagKey(flag)));
  } catch {
    return null;
  }
}

export async function isFeatureEnabled(
  flag: FeatureFlagName,
  userId?: string | null
): Promise<boolean> {
  // This release-time gate is a hard kill switch. A stale local override must not
  // re-enable background SMS capture in a build whose env default is disabled.
  if (flag === "momo_sms_live_import" && !isMoMoSmsLiveImportEnvEnabled()) {
    return false;
  }
  const override = await readOverride(flag, userId);
  if (override !== null) return override;
  return readEnvDefault(flag);
}

export async function isValueFirstOnboardingEnabled(
  userId?: string | null
): Promise<boolean> {
  return isFeatureEnabled("value_first_onboarding_v1", userId);
}

export async function isMoMoSmsLiveImportEnabled(
  userId?: string | null,
): Promise<boolean> {
  return isFeatureEnabled("momo_sms_live_import", userId);
}

