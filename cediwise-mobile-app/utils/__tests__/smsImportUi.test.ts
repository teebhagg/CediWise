import {
  ALL_MOMO_NETWORKS,
  getScanButtonState,
  PASTE_TOO_SHORT_MESSAGE,
} from "@/constants/smsImport";

describe("sms import UI helpers", () => {
  it("uses the three supported networks for native configure and scan", () => {
    expect([...ALL_MOMO_NETWORKS]).toEqual([
      "mtn_momo",
      "telecel_cash",
      "at_money",
    ]);
  });

  it("shows Scanning… and disables the scan button while the inbox is read", () => {
    expect(getScanButtonState(true, false)).toEqual({
      disabled: true,
      title: "Scanning…",
      accessibilityLabel: "Scanning messages",
      showSpinner: true,
    });
  });

  it("returns to Scan SMS after resolve and blocks scan while saving", () => {
    expect(getScanButtonState(false, false)).toEqual({
      disabled: false,
      title: "Scan SMS",
      accessibilityLabel: "Scan SMS",
      showSpinner: false,
    });
    expect(getScanButtonState(false, true).disabled).toBe(true);
    expect(getScanButtonState(false, true).title).toBe("Scan SMS");
  });

  it("does not mention provider in the short paste error", () => {
    expect(PASTE_TOO_SHORT_MESSAGE.toLowerCase()).not.toContain("provider");
    expect(PASTE_TOO_SHORT_MESSAGE).toBe("Paste the full SMS text");
  });
});
