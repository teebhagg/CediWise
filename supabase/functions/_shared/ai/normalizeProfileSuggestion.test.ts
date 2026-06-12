import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { dedupeProfileSuggestion } from "./dedupeProfileSuggestion.ts";
import { normalizeProfileSuggestion } from "./normalizeProfileSuggestion.ts";
import {
  classifySuggestionLine,
  getLineCapAmount,
  utilitiesAbsoluteCap,
} from "./suggestionConstraints.ts";
import type { ProfileSuggestionParsed } from "./aiResponseValidation.ts";

Deno.test("classifySuggestionLine splits subscriptions from entertainment", () => {
  assertEquals(classifySuggestionLine("Netflix", "wants"), "subscriptions");
  assertEquals(classifySuggestionLine("Entertainment", "wants"), "entertainment");
  assertEquals(classifySuggestionLine("Dining Out", "wants"), "other_wants");
});

Deno.test("utilities cap respects life stage absolute ceiling", () => {
  assertEquals(utilitiesAbsoluteCap("young_professional"), 800);
  assertEquals(utilitiesAbsoluteCap("family"), 1200);
  const income = 10000;
  const cap = getLineCapAmount("ECG", "needs", income, "young_professional");
  assertEquals(cap, 800);
});

Deno.test("normalizeProfileSuggestion enforces rent and entertainment caps", () => {
  const income = 5000;
  const raw: ProfileSuggestionParsed = {
    templateKey: "balanced",
    budgetSplit: { needsPct: 0.5, wantsPct: 0.3, savingsPct: 0.2 },
    categories: [
      {
        id: "rent",
        name: "Rent",
        bucket: "needs",
        suggestedLimit: 2500,
      },
      {
        id: "food",
        name: "Groceries",
        bucket: "needs",
        suggestedLimit: 500,
      },
      {
        id: "ent",
        name: "Entertainment",
        bucket: "wants",
        suggestedLimit: 800,
      },
      {
        id: "sub",
        name: "Subscriptions",
        bucket: "wants",
        suggestedLimit: 700,
      },
    ],
    recurringExpenses: [],
    goals: [],
  };

  const result = normalizeProfileSuggestion(raw, income, "young_professional");
  const rent = result.categories?.find((c) => c.id === "rent");
  const ent = result.categories?.find((c) => c.id === "ent");
  const sub = result.categories?.find((c) => c.id === "sub");

  assertEquals(rent?.suggestedLimit, 1500);
  assertEquals(ent?.suggestedLimit, 500);
  assertEquals(sub?.suggestedLimit, 500);

  const total = (result.categories ?? []).reduce((s, c) => s + c.suggestedLimit, 0);
  assertEquals(total <= income, true);
});

Deno.test("applySuggestionBucketRules coerces transport and adds Others", () => {
  const raw: ProfileSuggestionParsed = {
    templateKey: "balanced",
    budgetSplit: { needsPct: 0.5, wantsPct: 0.3, savingsPct: 0.2 },
    categories: [
      { id: "t1", name: "Transport", bucket: "wants", suggestedLimit: 300 },
    ],
    recurringExpenses: [],
    goals: [],
  };

  const result = normalizeProfileSuggestion(raw, 5000, "young_professional");
  const transport = result.categories?.find((c) => c.id === "t1");
  const others = result.categories?.find((c) => c.name === "Others");

  assertEquals(transport?.bucket, "needs");
  assertEquals(others?.bucket, "wants");
  assertEquals(others?.suggestedLimit, 0);
});

Deno.test("dedupeProfileSuggestion removes cross-list rent duplicates", () => {
  const raw: ProfileSuggestionParsed = {
    templateKey: "balanced",
    budgetSplit: { needsPct: 0.5, wantsPct: 0.3, savingsPct: 0.2 },
    categories: [
      { id: "c1", name: "Rent", bucket: "needs", suggestedLimit: 1000 },
      { id: "c2", name: "Groceries", bucket: "needs", suggestedLimit: 500 },
    ],
    recurringExpenses: [
      { id: "r1", name: "Housing", bucket: "needs", amount: 1000 },
    ],
    goals: [],
  };

  const result = dedupeProfileSuggestion(raw);
  assertEquals(result.categories?.length, 1);
  assertEquals(result.categories?.[0].name, "Groceries");
  assertEquals(result.recurringExpenses?.length, 1);
});

Deno.test("normalizeProfileSuggestion keeps total at or below net income", () => {
  const income = 3000;
  const raw: ProfileSuggestionParsed = {
    templateKey: "survival",
    budgetSplit: { needsPct: 0.6, wantsPct: 0.2, savingsPct: 0.2 },
    categories: [
      { id: "1", name: "Rent", bucket: "needs", suggestedLimit: 1200 },
      { id: "2", name: "Food", bucket: "needs", suggestedLimit: 900 },
      { id: "3", name: "Transport", bucket: "needs", suggestedLimit: 400 },
      { id: "4", name: "Entertainment", bucket: "wants", suggestedLimit: 400 },
      { id: "5", name: "Savings", bucket: "savings", suggestedLimit: 600 },
    ],
    recurringExpenses: [],
    goals: [],
  };

  const result = normalizeProfileSuggestion(raw, income, "student");
  const total = (result.categories ?? []).reduce((s, c) => s + c.suggestedLimit, 0);
  assertEquals(total <= income, true);
});
