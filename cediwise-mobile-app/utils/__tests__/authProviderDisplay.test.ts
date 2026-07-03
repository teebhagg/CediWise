import {
  formatAuthProviderDisplayValue,
  isApplePrivateRelayEmail,
} from "../authProviderDisplay";

describe("auth provider display", () => {
  it("detects Apple private relay emails", () => {
    expect(isApplePrivateRelayEmail("tjckvzhnty@privaterelay.appleid.com")).toBe(
      true,
    );
    expect(isApplePrivateRelayEmail("user@gmail.com")).toBe(false);
  });

  it("formats relay emails for profile display", () => {
    expect(
      formatAuthProviderDisplayValue("tjckvzhnty@privaterelay.appleid.com"),
    ).toBe("Private email (via Apple)");
    expect(formatAuthProviderDisplayValue("user@gmail.com")).toBe(
      "user@gmail.com",
    );
    expect(formatAuthProviderDisplayValue("")).toBe("—");
  });
});
