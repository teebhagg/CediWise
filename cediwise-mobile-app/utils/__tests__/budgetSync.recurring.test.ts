import { isPostgresUniqueViolation } from "../budgetSync";

describe("isPostgresUniqueViolation", () => {
  it("returns true for Postgres code 23505", () => {
    expect(isPostgresUniqueViolation({ code: "23505", message: "anything" })).toBe(
      true,
    );
  });

  it("returns true for recurring_expenses duplicate key message", () => {
    expect(
      isPostgresUniqueViolation({
        message:
          'duplicate key value violates unique constraint "recurring_expenses_pkey"',
      }),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(
      isPostgresUniqueViolation({ code: "42501", message: "permission denied" }),
    ).toBe(false);
    expect(isPostgresUniqueViolation(null)).toBe(false);
  });
});
