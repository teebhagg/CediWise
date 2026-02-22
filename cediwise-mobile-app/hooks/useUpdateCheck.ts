import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { log } from "@/utils/logger";

const GITHUB_REPO = "teebhagg/CediWise";
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export type UpdateInfo = {
  version: string;
  downloadUrl: string;
};

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/, "")
    .split(".")
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

async function fetchLatestRelease(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(API_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      tag_name?: string;
      assets?: { name: string; browser_download_url: string }[];
    };
    const tag = data.tag_name;
    if (!tag) return null;
    const apk = data.assets?.find((a) => a.name.endsWith(".apk"));
    if (!apk?.browser_download_url) return null;
    return {
      version: tag.replace(/^v/, ""),
      downloadUrl: apk.browser_download_url,
    };
  } catch (e) {
    log.error("Update check failed:", e);
    return null;
  }
}

export function useUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const check = useCallback(async () => {
    if (Platform.OS !== "android") return;

    const current = Constants.expoConfig?.version ?? "0.0.1";
    const latest = await fetchLatestRelease();
    if (!latest) return;

    if (isNewerVersion(latest.version, current)) {
      setUpdateInfo(latest);
    }
  }, []);

  const dismiss = useCallback(() => {
    setUpdateInfo(null);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void check();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [check]);

  return {
    updateInfo,
    dismiss,
    check,
  };
}
