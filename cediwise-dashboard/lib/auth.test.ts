import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAdminAllowlist } from "./auth";

describe("isAdminAllowlist", () => {
  const originalEmails = process.env.ADMIN_EMAILS;
  const originalIds = process.env.ADMIN_USER_IDS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "";
    process.env.ADMIN_USER_IDS = "";
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEmails;
    process.env.ADMIN_USER_IDS = originalIds;
  });

  it("returns false when userId and email are undefined", () => {
    expect(isAdminAllowlist(undefined, undefined)).toBe(false);
  });

  it("returns false when env vars are empty", () => {
    expect(isAdminAllowlist("user-123", "admin@test.com")).toBe(false);
  });

  it("returns true when email matches ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "admin@test.com,other@test.com";
    expect(isAdminAllowlist("user-123", "admin@test.com")).toBe(true);
  });

  it("returns true when email matches ADMIN_EMAILS (case insensitive)", () => {
    process.env.ADMIN_EMAILS = "Admin@Test.com";
    expect(isAdminAllowlist("user-123", "admin@test.com")).toBe(true);
  });

  it("returns false when email does not match ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "other@test.com";
    expect(isAdminAllowlist("user-123", "admin@test.com")).toBe(false);
  });

  it("returns true when userId matches ADMIN_USER_IDS", () => {
    process.env.ADMIN_USER_IDS = "user-123,user-456";
    expect(isAdminAllowlist("user-123", "any@test.com")).toBe(true);
  });

  it("returns false when userId does not match ADMIN_USER_IDS", () => {
    process.env.ADMIN_USER_IDS = "user-456";
    expect(isAdminAllowlist("user-123", "any@test.com")).toBe(false);
  });

  it("handles whitespace in comma-separated values", () => {
    process.env.ADMIN_EMAILS = "  admin@test.com , other@test.com  ";
    expect(isAdminAllowlist("user-123", "admin@test.com")).toBe(true);
  });
});
