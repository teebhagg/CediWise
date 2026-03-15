/**
 * Tour structure: steps order and boundaries for onboarding tours.
 */

export type TourId = "home" | "budget" | "learn";

export type TourDefinition = {
  id: TourId;
  firstStep: string;
  /** Steps that end the tour (e.g. home-nav ends home tour). */
  endsAt: string[];
};
