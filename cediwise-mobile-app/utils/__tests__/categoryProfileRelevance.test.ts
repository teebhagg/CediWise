import {
  formatProfileRelevanceNote,
  isCategoryRelevantForProfile,
  isSchoolFeesExcludedForLifeStage,
} from "@/utils/categoryProfileRelevance";

describe("isCategoryRelevantForProfile", () => {
  it("excludes School Fees for young_professional without spend or lock", () => {
    expect(
      isCategoryRelevantForProfile("School Fees", "needs", {
        lifeStage: "young_professional",
      }),
    ).toBe(false);
  });

  it("excludes School Fees for family life stage", () => {
    expect(
      isCategoryRelevantForProfile("School Fees", "needs", {
        lifeStage: "family",
      }),
    ).toBe(false);
  });

  it("excludes School Fees for retiree life stage", () => {
    expect(
      isCategoryRelevantForProfile("School Fees", "needs", {
        lifeStage: "retiree",
      }),
    ).toBe(false);
  });

  it("includes School Fees for student life stage", () => {
    expect(
      isCategoryRelevantForProfile("School Fees", "needs", {
        lifeStage: "student",
      }),
    ).toBe(true);
  });

  it("keeps School Fees when recurring is locked even for family", () => {
    expect(
      isCategoryRelevantForProfile(
        "School Fees",
        "needs",
        {
          lifeStage: "family",
          lockedCategoryIds: new Set(["school"]),
        },
        { id: "school", manualOverride: false, limitAmount: 0 },
      ),
    ).toBe(true);
  });

  it("does not keep School Fees for family on manual limit alone", () => {
    expect(
      isCategoryRelevantForProfile(
        "School Fees",
        "needs",
        { lifeStage: "family" },
        { id: "school", manualOverride: true, limitAmount: 400 },
      ),
    ).toBe(false);
  });
});

describe("isSchoolFeesExcludedForLifeStage", () => {
  it("only students keep school fees", () => {
    expect(isSchoolFeesExcludedForLifeStage("student")).toBe(false);
    expect(isSchoolFeesExcludedForLifeStage("young_professional")).toBe(true);
    expect(isSchoolFeesExcludedForLifeStage("family")).toBe(true);
    expect(isSchoolFeesExcludedForLifeStage("retiree")).toBe(true);
    expect(isSchoolFeesExcludedForLifeStage(null)).toBe(true);
  });
});

describe("formatProfileRelevanceNote", () => {
  it("summarizes life stage and priority briefly", () => {
    const note = formatProfileRelevanceNote({
      lifeStage: "family",
    });
    expect(note).toContain("family");
    expect(note).toContain("profile");
  });
});
