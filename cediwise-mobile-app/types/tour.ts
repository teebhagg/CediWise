/**
 * Tour structure: steps order and boundaries for home vs budget tours.
 */

export type TourId = "home" | "budget";

export type TourDefinition = {
  id: TourId;
  firstStep: string;
  /** Steps that end the tour (e.g. home-nav ends home tour). */
  endsAt: string[];
};
