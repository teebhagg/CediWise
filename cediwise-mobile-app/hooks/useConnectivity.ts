import { isOnline } from "@/utils/connectivity";
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 5000;

/**
 * Subscribe to network state. Uses NetInfo when available; falls back to
 * isOnline() polling when native module is missing (e.g. Expo Go).
 */
export function useConnectivity(): { isConnected: boolean | null } {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let sub: { remove: () => void } | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const online = await isOnline();
        if (mountedRef.current) setIsConnected(online);
      } catch {
        if (mountedRef.current) setIsConnected(null);
      }
    };

    try {
      const NetInfo = require("@react-native-community/netinfo").default;
      sub = NetInfo.addEventListener((s: { isConnected?: boolean }) => {
        if (mountedRef.current) setIsConnected(s?.isConnected ?? false);
      });
      NetInfo.fetch()
        .then((s: { isConnected?: boolean }) => {
          if (mountedRef.current) setIsConnected(s?.isConnected ?? false);
        })
        .catch(() => {
          poll();
          pollTimer = setInterval(poll, POLL_INTERVAL_MS);
        });
    } catch {
      poll();
      pollTimer = setInterval(poll, POLL_INTERVAL_MS);
    }

    return () => {
      mountedRef.current = false;
      sub?.remove?.();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  return { isConnected };
}
