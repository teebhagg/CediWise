import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readTourSeen(
  userId: string,
  tourId: "home" | "budget"
): Promise<boolean> {
  try {
    const key = `@cediwise_tour_${tourId}_seen:${userId}`;
    const value = await AsyncStorage.getItem(key);
    return value === "true";
  } catch (e) {
    return false;
  }
}

export async function writeTourSeen(
  userId: string,
  tourId: "home" | "budget"
): Promise<void> {
  try {
    const key = `@cediwise_tour_${tourId}_seen:${userId}`;
    await AsyncStorage.setItem(key, "true");
  } catch {
    // Swallow storage errors
  }
}

/** Clear tour seen flags for a user. For development testing only. */
export async function clearTourSeen(userId: string): Promise<void> {
  try {
    const homeKey = `@cediwise_tour_home_seen:${userId}`;
    const budgetKey = `@cediwise_tour_budget_seen:${userId}`;
    await AsyncStorage.multiRemove([homeKey, budgetKey]);
  } catch {
    // Swallow storage errors
  }
}
