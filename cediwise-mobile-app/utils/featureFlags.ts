import AsyncStorage from "@react-native-async-storage/async-storage";

export type FeatureFlagName = "value_first_onboarding_v1";

const FLAG_KEY_PREFIX = "@cediwise_feature_flag:";

function readEnvDefault(flag: FeatureFlagName): boolean {
  if (flag === "value_first_onboarding_v1") {
    const raw = process.env.EXPO_PUBLIC_VALUE_FIRST_ONBOARDING_V1;
    return raw === "1" || raw === "true";
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
  const override = await readOverride(flag, userId);
  if (override !== null) return override;
  return readEnvDefault(flag);
}

export async function isValueFirstOnboardingEnabled(
  userId?: string | null
): Promise<boolean> {
  return isFeatureEnabled("value_first_onboarding_v1", userId);
}

