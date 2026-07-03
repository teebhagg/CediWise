import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  namePromptDismissKey,
  recordNamePromptDismissed,
  shouldShowNamePrompt,
} from "../namePrompt";

describe("namePrompt", () => {
  const userId = "user-123";

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("shouldShowNamePrompt returns true when no dismissal record", async () => {
    expect(await shouldShowNamePrompt(userId)).toBe(true);
  });

  it("shouldShowNamePrompt returns false within 14-day cooldown", async () => {
    await recordNamePromptDismissed(userId);
    expect(await shouldShowNamePrompt(userId)).toBe(false);
  });

  it("shouldShowNamePrompt returns true after 14-day cooldown", async () => {
    const fifteenDaysAgo = new Date(
      Date.now() - 15 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await AsyncStorage.setItem(namePromptDismissKey(userId), fifteenDaysAgo);
    expect(await shouldShowNamePrompt(userId)).toBe(true);
  });

  it("shouldShowNamePrompt returns true for invalid stored timestamp", async () => {
    await AsyncStorage.setItem(namePromptDismissKey(userId), "not-a-date");
    expect(await shouldShowNamePrompt(userId)).toBe(true);
  });
});
