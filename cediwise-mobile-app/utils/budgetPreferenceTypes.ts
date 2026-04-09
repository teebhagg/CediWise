/** Bucket split as fractions 0..1 (matches BudgetCycle.needsPct etc.). */
export type BudgetPreferencePercents = {
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
};

export type BudgetPreferenceMigrationPromptPayload = {
  cycleId: string;
  current: BudgetPreferencePercents;
  suggested: BudgetPreferencePercents;
  lifeStagePhrase: string;
  financialPriorityPhrase: string;
};
