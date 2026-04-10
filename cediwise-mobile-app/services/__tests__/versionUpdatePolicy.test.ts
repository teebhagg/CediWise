/** @jest-environment node */

import { log } from "@/utils/logger";

import {
  compareVersions,
  getActiveAppVersionPolicy,
  isCurrentBuildOutdated,
} from "@/services/versionUpdatePolicy";

let mockSupabase: { from: jest.Mock } | null = null;

jest.mock("@/utils/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { version: "1.0.0" },
  },
}));

function rnPlatform() {
  const g = globalThis as { __TEST_RN_PLATFORM__?: { OS: string } };
  return g.__TEST_RN_PLATFORM__;
}

function createSupabaseChain(
  maybeSingleResults: { data: unknown; error: { message?: string } | null }[],
) {
  let idx = 0;
  const firstEq = jest.fn();
  const secondEq = jest.fn();
  const maybeSingle = jest.fn(() => {
    const next = maybeSingleResults[idx] ?? { data: null, error: { message: "no mock" } };
    idx += 1;
    return Promise.resolve(next);
  });
  const limit = jest.fn(() => ({ maybeSingle }));
  const order = jest.fn(() => ({ limit }));
  secondEq.mockImplementation(() => ({ order }));
  firstEq.mockImplementation(() => ({ eq: secondEq }));

  const select = jest.fn(() => ({ eq: firstEq }));
  const from = jest.fn(() => ({ select }));

  return {
    client: { from },
    firstEq,
    secondEq,
    maybeSingle,
  };
}

describe("versionUpdatePolicy", () => {
  beforeEach(() => {
    mockSupabase = null;
    const p = rnPlatform();
    if (p) p.OS = "ios";
    jest.clearAllMocks();
  });

  describe("compareVersions", () => {
    it("returns -1 when a < b", () => {
      expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
      expect(compareVersions("0.9.9", "1.0.0")).toBe(-1);
    });

    it("returns 0 when equal", () => {
      expect(compareVersions("2.3.4", "2.3.4")).toBe(0);
    });

    it("returns 1 when a > b", () => {
      expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    });

    it("treats non-numeric segments as 0", () => {
      expect(compareVersions("1.x.0", "1.0.0")).toBe(0);
    });
  });

  describe("isCurrentBuildOutdated", () => {
    it("returns true when expo version is lower than latest", () => {
      expect(isCurrentBuildOutdated("1.0.1")).toBe(true);
    });

    it("returns false when expo version equals latest", () => {
      expect(isCurrentBuildOutdated("1.0.0")).toBe(false);
    });

    it("returns false when expo version is higher than latest", () => {
      expect(isCurrentBuildOutdated("0.9.0")).toBe(false);
    });
  });

  describe("getActiveAppVersionPolicy", () => {
    it("returns null when supabase is not configured", async () => {
      mockSupabase = null;
      await expect(getActiveAppVersionPolicy()).resolves.toBeNull();
    });

    it("returns mapped policy when full row loads", async () => {
      const chain = createSupabaseChain([
        {
          data: {
            version: "2.0.0",
            release_notes: "  Fixes  ",
            requires_update: true,
          },
          error: null,
        },
      ]);
      mockSupabase = chain.client;
      await expect(getActiveAppVersionPolicy()).resolves.toEqual({
        version: "2.0.0",
        requiresUpdate: true,
        releaseNotes: "Fixes",
      });
      expect(chain.firstEq).toHaveBeenCalledWith("platform", "ios");
      expect(chain.secondEq).toHaveBeenCalledWith("is_active", true);
    });

    it("uses android platform when OS is android", async () => {
      const p = rnPlatform();
      if (p) p.OS = "android";
      const chain = createSupabaseChain([
        {
          data: { version: "1.2.3", release_notes: null, requires_update: false },
          error: null,
        },
      ]);
      mockSupabase = chain.client;
      await getActiveAppVersionPolicy();
      expect(chain.firstEq).toHaveBeenCalledWith("platform", "android");
    });

    it("falls back to version-only row when columns are missing", async () => {
      const chain = createSupabaseChain([
        {
          data: null,
          error: { message: 'column "release_notes" does not exist' },
        },
        {
          data: { version: "3.1.0" },
          error: null,
        },
      ]);
      mockSupabase = chain.client;
      await expect(getActiveAppVersionPolicy()).resolves.toEqual({
        version: "3.1.0",
        requiresUpdate: false,
        releaseNotes: null,
      });
      expect(chain.maybeSingle).toHaveBeenCalledTimes(2);
    });

    it("returns null and logs on non-column errors", async () => {
      const chain = createSupabaseChain([
        { data: null, error: { message: "network error" } },
      ]);
      mockSupabase = chain.client;
      await expect(getActiveAppVersionPolicy()).resolves.toBeNull();
      expect(log.warn).toHaveBeenCalled();
    });

    it("returns null when version is missing on success row", async () => {
      const chain = createSupabaseChain([{ data: { version: null }, error: null }]);
      mockSupabase = chain.client;
      await expect(getActiveAppVersionPolicy()).resolves.toBeNull();
    });
  });
});
