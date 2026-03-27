import { bucketLabel } from "../budgetHelpers";

describe("bucketLabel", () => {
  it('capitalizes "needs" to "Needs"', () => {
    expect(bucketLabel("needs")).toBe("Needs");
  });

  it('capitalizes "wants" to "Wants"', () => {
    expect(bucketLabel("wants")).toBe("Wants");
  });

  it('capitalizes "savings" to "Savings"', () => {
    expect(bucketLabel("savings")).toBe("Savings");
  });

  it("handles single char bucket", () => {
    expect(bucketLabel("n" as any)).toBe("N");
  });
});
