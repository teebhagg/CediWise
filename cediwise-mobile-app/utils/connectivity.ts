/**
 * Dependency-free, best-effort connectivity check for guarding writes.
 *
 * NOTE: Without NetInfo, we approximate "online" by attempting a short HEAD request.
 */
export async function isOnline(): Promise<boolean> {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return true;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    // Any response (even 404) means we have DNS + network.
    await fetch(baseUrl, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

