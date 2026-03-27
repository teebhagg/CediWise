import { uuidv4, isUuid } from "../uuid";

describe("uuidv4", () => {
  it("returns a string matching UUID v4 format", () => {
    const id = uuidv4();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("generates unique IDs on consecutive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuidv4()));
    expect(ids.size).toBe(100);
  });

  it("always has version 4 marker", () => {
    for (let i = 0; i < 20; i++) {
      const id = uuidv4();
      expect(id[14]).toBe("4");
    }
  });

  it("always has correct variant bits (8, 9, a, b)", () => {
    for (let i = 0; i < 20; i++) {
      const id = uuidv4();
      expect("89ab").toContain(id[19].toLowerCase());
    }
  });
});

describe("isUuid", () => {
  it("returns true for valid UUID v4", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("returns true for generated UUID", () => {
    expect(isUuid(uuidv4())).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isUuid("")).toBe(false);
  });

  it("returns false for random string", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("returns false for UUID missing sections", () => {
    expect(isUuid("550e8400-e29b-41d4-a716")).toBe(false);
  });

  it("returns false for number", () => {
    expect(isUuid(12345)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isUuid(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isUuid(undefined)).toBe(false);
  });

  it("returns false for object", () => {
    expect(isUuid({})).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });
});
