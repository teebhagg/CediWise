import type { OnboardingStateKey } from "@/utils/onboardingState";

export type OnboardingSegment = "home" | "budget";

export type OnboardingStepGroup = {
  state: OnboardingStateKey;
  segment: OnboardingSegment;
  firstStep: string;
  endsAt: string[];
};

export const STEPS_ORDER = [
  "state1-home-setup",
  "state1-home-budget-tab",
  "state1-budget-personalization",
  "state1-budget-payday",
  "state2-home-vitals",
  "state2-home-activities",
  "state2-budget-overview",
  "state2-budget-tools",
  "state2-budget-expenses",
] as const;

export const ONBOARDING_STEP_GROUPS: Record<string, OnboardingStepGroup> = {
  state1Home: {
    state: "state_1_unpersonalized",
    segment: "home",
    firstStep: "state1-home-setup",
    endsAt: ["state1-home-budget-tab"],
  },
  state1BudgetPersonalization: {
    state: "state_1_unpersonalized",
    segment: "budget",
    firstStep: "state1-budget-personalization",
    endsAt: ["state1-budget-personalization"],
  },
  state1BudgetPayday: {
    state: "state_1_unpersonalized",
    segment: "budget",
    firstStep: "state1-budget-payday",
    endsAt: ["state1-budget-payday"],
  },
  state2Home: {
    state: "state_2_personalized",
    segment: "home",
    firstStep: "state2-home-vitals",
    endsAt: ["state2-home-activities"],
  },
  state2Budget: {
    state: "state_2_personalized",
    segment: "budget",
    firstStep: "state2-budget-overview",
    endsAt: ["state2-budget-expenses"],
  },
};

export const ONBOARDING_END_STEP_KEYS = new Set(
  Object.values(ONBOARDING_STEP_GROUPS).flatMap((group) => group.endsAt)
);
