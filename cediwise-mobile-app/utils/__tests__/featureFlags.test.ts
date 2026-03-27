import { isFeatureEnabled, isValueFirstOnboardingEnabled } from "../featureFlags";
import AsyncStorage from "@react-native-async-storage/async-storage";

describe("isFeatureEnabled", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // Reset env
    delete process.env.EXPO_PUBLIC_VALUE_FIRST_ONBOARDING_V1;
  });

  it('returns false when no override and no env for "value_first_onboarding_v1"', async () => {
    const result = await isFeatureEnabled("value_first_onboarding_v1");
    expect(result).toBe(false);
  });

  it('returns true when env is "1"', async () => {
    process.env.EXPO_PUBLIC_VALUE_FIRST_ONBOARDING_V1 = "1";
    const result = await isFeatureEnabled("value_first_onboarding_v1");
    expect(result).toBe(true);
  });

  it('returns true when env is "true"', async () => {
    process.env.EXPO_PUBLIC_VALUE_FIRST_ONBOARDING_V1 = "true";
    const result = await isFeatureEnabled("value_first_onboarding_v1");
    expect(result).toBe(true);
  });

  it("returns false when env is other string", async () => {
    process.env.EXPO_PUBLIC_VALUE_FIRST_ONBOARDING_V1 = "no";
    const result = await isFeatureEnabled("value_first_onboarding_v1");
    expect(result).toBe(false);
  });

  it("per-user override takes precedence over global override", async () => {
    await AsyncStorage.setItem(
      "@cediwise_feature_flag:value_first_onboarding_v1",
      "false"
    );
    await AsyncStorage.setItem(
      "@cediwise_feature_flag:value_first_onboarding_v1:user1",
      "true"
    );
    const result = await isFeatureEnabled("value_first_onboarding_v1", "user1");
    expect(result).toBe(true);
  });

  it("global override takes precedence over env default", async () => {
    process.env.EXPO_PUBLIC_VALUE_FIRST_ONBOARDING_V1 = "false";
    await AsyncStorage.setItem(
      "@cediwise_feature_flag:value_first_onboarding_v1",
      "true"
    );
    const result = await isFeatureEnabled("value_first_onboarding_v1");
    expect(result).toBe(true);
  });

  it("falls back to env default when override is missing", async () => {
    process.env.EXPO_PUBLIC_VALUE_FIRST_ONBOARDING_V1 = "1";
    const result = await isFeatureEnabled("value_first_onboarding_v1", "user1");
    expect(result).toBe(true);
  });
});

describe("isValueFirstOnboardingEnabled", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    delete process.env.EXPO_PUBLIC_VALUE_FIRST_ONBOARDING_V1;
  });

  it("delegates to isFeatureEnabled with correct flag name", async () => {
    process.env.EXPO_PUBLIC_VALUE_FIRST_ONBOARDING_V1 = "true";
    expect(await isValueFirstOnboardingEnabled()).toBe(true);
  });

  it("supports userId parameter", async () => {
    await AsyncStorage.setItem(
      "@cediwise_feature_flag:value_first_onboarding_v1:user1",
      "true"
    );
    expect(await isValueFirstOnboardingEnabled("user1")).toBe(true);
    expect(await isValueFirstOnboardingEnabled("user2")).toBe(false);
  });
});
