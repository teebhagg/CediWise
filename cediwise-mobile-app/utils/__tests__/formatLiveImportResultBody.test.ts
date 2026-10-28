import { formatLiveImportResultBody } from "../formatLiveImportResultBody";

describe("formatLiveImportResultBody", () => {
  it("summarizes parsed and duplicate", () => {
    expect(
      formatLiveImportResultBody({
        parsed: 2,
        duplicate: 1,
        skipped: 0,
        failed: 0,
      }),
    ).toBe("2 expenses added to your budget · 1 already recorded");
  });

  it("summarizes parsed only", () => {
    expect(
      formatLiveImportResultBody({
        parsed: 1,
        duplicate: 0,
        skipped: 0,
        failed: 0,
      }),
    ).toBe("1 expense added to your budget");
  });

  it("includes review, retry, reversal, and failure counts", () => {
    expect(formatLiveImportResultBody({
      parsed: 1,
      duplicate: 0,
      skipped: 4,
      failed: 1,
      needs_review: 2,
      retryable: 3,
      reversed: 1,
    })).toBe("1 expense added to your budget · 1 reversed · 2 need review · 3 waiting to retry · 1 could not be added · 4 skipped");
  });
});
