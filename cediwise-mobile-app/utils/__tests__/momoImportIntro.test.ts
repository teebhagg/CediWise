import { shouldShowMoMoImportIntro } from "@/utils/momoImportIntro";
import type { OnboardingStatus } from "@/utils/onboardingState";

const open = {
  userId: "user-1",
  seen: false,
  onboardingLoaded: true,
  isTourActive: false,
  onboardingStatus: "completed" as OnboardingStatus,
  feedbackPromptVisible: false,
};

describe("shouldShowMoMoImportIntro", () => {
  it.each(["in_progress", "dismissed", "completed", "invalidated"] as OnboardingStatus[])(
    "opens for %s when every other gate passes",
    (onboardingStatus) => {
      expect(shouldShowMoMoImportIntro({ ...open, onboardingStatus })).toBe(true);
    },
  );

  it("stays closed when a gate fails", () => {
    expect(shouldShowMoMoImportIntro({ ...open, seen: true })).toBe(false);
    expect(shouldShowMoMoImportIntro({ ...open, isTourActive: true })).toBe(false);
    expect(shouldShowMoMoImportIntro({ ...open, onboardingLoaded: false })).toBe(false);
    expect(shouldShowMoMoImportIntro({ ...open, onboardingStatus: "never_seen" })).toBe(false);
    expect(shouldShowMoMoImportIntro({ ...open, onboardingStatus: null })).toBe(false);
    expect(shouldShowMoMoImportIntro({ ...open, feedbackPromptVisible: true })).toBe(false);
    expect(shouldShowMoMoImportIntro({ ...open, userId: "" })).toBe(false);
    expect(shouldShowMoMoImportIntro({ ...open, userId: null })).toBe(false);
  });
});
