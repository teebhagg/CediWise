# CediWise Mobile — Product backlog

Items removed from the app temporarily but intended for a future rebuild (often with AI in the loop).

---

## Budget preference migration prompt (“Update your budget?”)

**Status:** Removed (2026-06) — pending AI-native reconstruction  
**Priority:** Medium (after AI budget suggestions / recompute UX is defined)

### What it was

A bottom-sheet modal on the Budget tab when the **active cycle’s Needs/Wants/Savings split** differed by more than **5 percentage points** from what the **Vitals profile** would suggest via `computeIntelligentStrategy` (same engine as the vitals wizard).

- **Title:** “Update your budget?”
- **Actions:** “Keep current” (per-cycle dismiss in AsyncStorage) or “Update budget” (`updateCycleAllocation` → `recalculateBudget` → sync).

### Why it existed

Bridge between **profile preferences** (life stage, financial priority, salary, fixed costs) and an **existing budget cycle** created manually, from a template, or before vitals completed—without silently overwriting allocations.

### Why it was removed

AI-assisted budgeting (suggestions, chat, recompute) is the preferred path for aligning cycles with profile and spending. The static rules-based modal duplicated that intent and added noise right after onboarding.

### What to keep when rebuilding

| Area | Notes |
|------|--------|
| **Detection** | `preferencesDifferSignificantlyFromCycle` in `utils/budgetFromPreferences.ts` (>5pp threshold) |
| **Suggestion source** | `computeIntelligentAllocationFromProfile` or future AI output |
| **Apply path** | `updateCycleAllocation` + `recalculateBudget` + `syncNow` |
| **First cycle** | `useBudgetPreferenceBootstrap` / `runBudgetPreferenceBootstrapCore` still auto-creates cycle from vitals when none exists—unchanged |

### Former implementation (reference)

Removed files (git history):

- `components/features/budget/MigrationPrompt.tsx`
- `utils/budgetPreferenceMigrationPromptCore.ts` — `resolveBudgetPreferenceMigrationPrompt`
- `utils/budgetPreferenceMigrationStorage.ts` — skip flag `@cediwise_budget_pref_migration_skip:{userId}:{cycleId}`
- `utils/budgetPreferenceTypes.ts`
- Tests: `budgetPreferenceMigrationPromptCore.test.ts`, `budgetPreferenceMigrationStorage.test.ts`

Wiring lived in `useBudgetScreenState` (effect + confirm/dismiss handlers) and `app/(tabs)/budget.tsx`.

### Rebuild ideas (AI-era)

1. Surface mismatch via **AI chat** or **insights card** instead of a blocking modal.
2. Let AI explain *why* the split differs and propose a one-tap apply (with undo).
3. Tie into **recompute engine** / `BudgetReallocationBanner` rather than a separate preference pipeline.
4. Revisit 5pp threshold and per-cycle skip semantics for multi-device sync.
