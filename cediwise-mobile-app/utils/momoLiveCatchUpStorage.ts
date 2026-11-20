import { SMS_LIVE_CATCHUP_STORAGE_KEY } from "@/constants/smsImport";
import AsyncStorage from "@react-native-async-storage/async-storage";

function storageKey(userId: string): string {
  return `${SMS_LIVE_CATCHUP_STORAGE_KEY}:${userId}`;
}

export async function readLiveCatchUpAtMs(userId: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const ms = Number(raw);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

export async function writeLiveCatchUpAtMs(
  userId: string,
  atMs: number,
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), String(atMs));
  } catch {
    // non-fatal
  }
}

export async function clearLiveCatchUpAtMs(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch {
    // non-fatal
  }
}
