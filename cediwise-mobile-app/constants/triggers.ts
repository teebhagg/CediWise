export type TriggerId =
  | "CTX_HOME_INTRO"
  | "CTX_SALARY_FIRST"
  | "CTX_LOW_SAVINGS"
  | "CTX_TBILL_VIEW"
  | "CTX_VAT_ALERT";

export type TriggerConfig = {
  id: TriggerId;
  title: string;
  message: string;
  ctaLabel: string;
  ctaRoute?: string;
};

export const TRIGGER_CONFIGS: Record<TriggerId, TriggerConfig> = {
  CTX_HOME_INTRO: {
    id: "CTX_HOME_INTRO",
    title: "Welcome to CediWise!",
    message:
      "Your personal finance companion for smarter money management. Track expenses, build budgets, and learn financial literacy—all in one place.",
    ctaLabel: "Start Learning",
    ctaRoute: "/literacy/MOD-01",
  },
  CTX_SALARY_FIRST: {
    id: "CTX_SALARY_FIRST",
    title: "You logged your first income!",
    message:
      "Great start. Learn how to budget it with our Budgeting Basics module.",
    ctaLabel: "Learn budgeting",
    ctaRoute: "/literacy/MOD-01",
  },
  CTX_LOW_SAVINGS: {
    id: "CTX_LOW_SAVINGS",
    title: "Build your emergency fund",
    message:
      "Your savings are below 1 month of expenses. Learn how to build a safety net.",
    ctaLabel: "Learn about savings",
    ctaRoute: "/literacy/MOD-02",
  },
  CTX_TBILL_VIEW: {
    id: "CTX_TBILL_VIEW",
    title: "Explore T-Bills",
    message:
      "Ghana Treasury Bills offer low-risk returns. Learn how they work.",
    ctaLabel: "Learn about T-Bills",
    ctaRoute: "/literacy/MOD-06",
  },
  CTX_VAT_ALERT: {
    id: "CTX_VAT_ALERT",
    title: "Understanding VAT",
    message: "You logged a VAT-related expense. Learn how VAT works in Ghana.",
    ctaLabel: "Learn about taxes",
    ctaRoute: "/literacy/MOD-05",
  },
};
