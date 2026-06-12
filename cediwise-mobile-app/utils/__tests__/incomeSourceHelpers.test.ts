import type { IncomeSource } from "@/types/budget";
import {
  dedupePrimaryIncomeSources,
  findPrimaryIncomeSource,
  isCanonicalPrimaryIncomeName,
  isPrimaryIncomeCandidate,
  isPrimaryIncomeSource,
} from "@/utils/incomeSourceHelpers";

function makeSource(
  overrides: Partial<IncomeSource> & Pick<IncomeSource, "id">,
): IncomeSource {
  return {
    userId: "u1",
    name: "Income",
    type: "side",
    amount: 1000,
    applyDeductions: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("incomeSourceHelpers", () => {
  describe("isCanonicalPrimaryIncomeName", () => {
    it("matches primary income and primary salary case-insensitively", () => {
      expect(isCanonicalPrimaryIncomeName("Primary income")).toBe(true);
      expect(isCanonicalPrimaryIncomeName("PRIMARY SALARY")).toBe(true);
      expect(isCanonicalPrimaryIncomeName("  primary income  ")).toBe(true);
    });

    it("does not match unrelated names", () => {
      expect(isCanonicalPrimaryIncomeName("Side hustle")).toBe(false);
      expect(isCanonicalPrimaryIncomeName("Salary")).toBe(false);
    });
  });

  describe("isPrimaryIncomeSource", () => {
    it("matches type primary", () => {
      expect(
        isPrimaryIncomeSource(makeSource({ id: "1", type: "primary" })),
      ).toBe(true);
    });

    it("matches canonical names even when typed as side", () => {
      expect(
        isPrimaryIncomeSource(
          makeSource({ id: "1", type: "side", name: "Primary Salary" }),
        ),
      ).toBe(true);
    });
  });

  describe("findPrimaryIncomeSource", () => {
    it("returns first primary-like source", () => {
      const sources = [
        makeSource({ id: "side", type: "side", name: "Freelance" }),
        makeSource({ id: "p1", type: "primary", name: "Job" }),
      ];
      expect(findPrimaryIncomeSource(sources)?.id).toBe("p1");
    });
  });

  describe("isPrimaryIncomeCandidate", () => {
    it("is true for primary type or canonical names", () => {
      expect(isPrimaryIncomeCandidate("Any label", "primary")).toBe(true);
      expect(isPrimaryIncomeCandidate("Primary income", "side")).toBe(true);
      expect(isPrimaryIncomeCandidate("Freelance", "side")).toBe(false);
    });
  });

  describe("dedupePrimaryIncomeSources", () => {
    it("keeps newest primary-like row and drops duplicates", () => {
      const sources = [
        makeSource({
          id: "old",
          type: "primary",
          name: "Primary income",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
        makeSource({
          id: "new",
          type: "primary",
          name: "Primary Salary",
          updatedAt: "2026-06-01T00:00:00.000Z",
        }),
        makeSource({ id: "side", type: "side", name: "Side gig" }),
      ];
      const deduped = dedupePrimaryIncomeSources(sources);
      expect(deduped.map((s) => s.id)).toEqual(["new", "side"]);
    });

    it("no-op when at most one primary-like source", () => {
      const sources = [
        makeSource({ id: "p1", type: "primary" }),
        makeSource({ id: "s1", type: "side", name: "Side" }),
      ];
      expect(dedupePrimaryIncomeSources(sources)).toEqual(sources);
    });
  });
});
