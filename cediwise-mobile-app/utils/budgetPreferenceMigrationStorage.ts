import AsyncStorage from "@react-native-async-storage/async-storage";

function skipKey(userId: string, cycleId: string) {
  return `@cediwise_budget_pref_migration_skip:${userId}:${cycleId}`;
}

export async function isBudgetPreferenceMigrationSkipped(
  userId: string,
  cycleId: string
): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(skipKey(userId, cycleId));
    return v === "1";
  } catch {
    return false;
  }
}

export async function setBudgetPreferenceMigrationSkipped(
  userId: string,
  cycleId: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(skipKey(userId, cycleId), "1");
  } catch {
    // ignore
  }
}
