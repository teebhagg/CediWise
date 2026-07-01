import { getTierInfo } from "../tierGate";

describe("getTierInfo", () => {
  it("allows AI chat on the free tier", () => {
    const info = getTierInfo("free", null);
    expect(info.canAccessBudget).toBe(false);
    expect(info.canAccessAIChat).toBe(true);
  });

  it("allows AI chat on paid tiers", () => {
    expect(getTierInfo("budget", null).canAccessAIChat).toBe(true);
    expect(getTierInfo("sme", null).canAccessAIChat).toBe(true);
  });

  it("allows AI chat during SME trial", () => {
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const info = getTierInfo("free", trialEndsAt);
    expect(info.effectiveTier).toBe("sme");
    expect(info.canAccessAIChat).toBe(true);
  });
});
