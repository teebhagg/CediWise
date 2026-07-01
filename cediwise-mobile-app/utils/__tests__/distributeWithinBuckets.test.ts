import { distributeWithinBuckets } from "../distributeWithinBuckets";

describe("distributeWithinBuckets", () => {
  const bucketEnvelopes = {
    needs: 1500,
    wants: 900,
    savings: 600,
  };

  it("locks fixed amounts and distributes remainder to flexible lines", () => {
    const { limitsByKey, overflows } = distributeWithinBuckets({
      bucketEnvelopes,
      categories: [
        { name: "Rent", bucket: "needs", fixedAmount: 800, manualOverride: true },
        { name: "General", bucket: "needs" },
        { name: "Others", bucket: "wants", explicitLimit: 0 },
        { name: "Entertainment", bucket: "wants" },
      ],
    });

    expect(overflows).toHaveLength(0);
    expect(limitsByKey.get("needs:Rent")).toBe(800);
    expect(limitsByKey.get("needs:General")).toBeGreaterThanOrEqual(0);
    const needsTotal =
      (limitsByKey.get("needs:Rent") ?? 0) + (limitsByKey.get("needs:General") ?? 0);
    expect(needsTotal).toBeLessThanOrEqual(1500 + 0.01);
    expect(limitsByKey.get("wants:Others")).toBe(0);
  });

  it("reports overflow when fixed amounts exceed bucket envelope", () => {
    const { overflows } = distributeWithinBuckets({
      bucketEnvelopes,
      categories: [
        { name: "Rent", bucket: "needs", fixedAmount: 1200, manualOverride: true },
        { name: "Utilities", bucket: "needs", fixedAmount: 500, manualOverride: true },
      ],
    });

    expect(overflows).toHaveLength(1);
    expect(overflows[0].bucket).toBe("needs");
    expect(overflows[0].overflow).toBe(200);
  });
});
