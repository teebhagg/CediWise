/**
 * Tour step order and definitions.
 * Single source of truth for home and budget tour flow.
 */
import type { TourDefinition } from "@/types/tour";

export const STEPS_ORDER = [
  "home-profile",
  "home-setup",
  "home-learn-tab",
  "literacy-glossary",
  "literacy-lessons",
  "home-nav",
  "budget-overview",
  "budget-actions",
  "budget-tab",
] as const;

export const HOME_TOUR: TourDefinition = {
  id: "home",
  firstStep: "home-profile",
  endsAt: ["home-nav"],
};

export const BUDGET_TOUR: TourDefinition = {
  id: "budget",
  firstStep: "budget-overview",
  endsAt: ["budget-tab"],
};
