import type { LessonModule, ModuleInfo } from "@/types/literacy";

/** All 7 modules, 34 lessons — Phase 8 full curriculum per FRD §30 */
export const MODULES: ModuleInfo[] = [
  {
    id: "MOD-01",
    title: "Understanding Your Money",
    description:
      "Master budgeting, payslips, savings, and emergency funds — the foundation of financial literacy in Ghana.",
    icon: "wallet",
    color: "#1B6B3A",
    level: "foundational",
    estimated_minutes: 57,
    lessonIds: [
      "mod01-budgeting-01",
      "mod01-budgeting-02",
      "mod01-budgeting-03",
      "mod01-savings-01",
      "mod01-savings-02",
    ],
    learning_objectives: [
      "Build and stick to a monthly household budget",
      "Apply the 50/30/20 rule to your own income",
      "Track your daily spending and spot leaks",
      "Understand susu and formal savings options",
      "Build a 3–6 month emergency fund",
    ],
    next_module_id: "MOD-02",
  },
  {
    id: "MOD-02",
    title: "Tax & Pension",
    description:
      "Navigate GRA, PAYE, SSNIT, tax reliefs, and VAT — essential for every working Ghanaian.",
    icon: "file-text",
    color: "#2D9B5A",
    level: "intermediate",
    estimated_minutes: 75,
    lessonIds: [
      "mod02-tax-01",
      "mod02-tax-02",
      "mod02-tax-03",
      "mod02-tax-04",
      "mod02-tax-05",
    ],
    learning_objectives: [
      "Register with GRA and obtain a TIN",
      "Understand PAYE tax bands and deductions",
      "Know your SSNIT contributions and benefits",
      "Claim eligible tax reliefs",
      "Understand VAT for SME owners",
    ],
    next_module_id: "MOD-03",
  },
  {
    id: "MOD-03",
    title: "Investing",
    description:
      "T-Bills, bonds, mutual funds, GSE, and insurance — grow your wealth safely.",
    icon: "trending-up",
    color: "#C9A84C",
    level: "intermediate",
    estimated_minutes: 85,
    lessonIds: [
      "mod03-invest-01",
      "mod03-invest-02",
      "mod03-invest-03",
      "mod03-invest-04",
      "mod03-invest-05",
      "mod03-invest-06",
    ],
    learning_objectives: [
      "Understand the risk-return spectrum",
      "Invest in T-Bills and government bonds",
      "Evaluate mutual funds and CIS",
      "Navigate the Ghana Stock Exchange",
      "Choose appropriate insurance products",
    ],
    next_module_id: "MOD-04",
  },
  {
    id: "MOD-04",
    title: "Mobile Money & Digital Finance",
    description:
      "Use Ghana's digital payment ecosystem safely — MoMo, savings, and digital credit.",
    icon: "smartphone",
    color: "#3B82F6",
    level: "foundational",
    estimated_minutes: 45,
    lessonIds: [
      "mod04-mobile-01",
      "mod04-mobile-02",
      "mod04-mobile-03",
      "mod04-mobile-04",
    ],
    learning_objectives: [
      "Understand how mobile money works and who regulates it",
      "Identify and avoid mobile money fraud",
      "Compare MoMo savings vs. bank savings",
      "Borrow digitally with awareness of costs",
    ],
    next_module_id: "MOD-05",
  },
  {
    id: "MOD-05",
    title: "SME Finance",
    description:
      "Separate personal and business finances, manage cash flow, price for profit, and access credit.",
    icon: "briefcase",
    color: "#8B5CF6",
    level: "intermediate",
    estimated_minutes: 105,
    lessonIds: [
      "mod05-sme-01",
      "mod05-sme-02",
      "mod05-sme-03",
      "mod05-sme-04",
      "mod05-sme-05",
      "mod05-sme-06",
    ],
    learning_objectives: [
      "Separate personal and business finances",
      "Manage SME cash flow effectively",
      "Price products and services for profit",
      "Access business credit and financing",
      "Meet tax compliance requirements",
      "Protect your business with insurance",
    ],
    next_module_id: "MOD-06",
  },
  {
    id: "MOD-06",
    title: "Retirement Planning",
    description:
      "Maximise SSNIT Tier 1 & 2, add Tier 3, and plan for non-pension assets and succession.",
    icon: "piggy-bank",
    color: "#E8A020",
    level: "intermediate",
    estimated_minutes: 70,
    lessonIds: [
      "mod06-retirement-01",
      "mod06-retirement-02",
      "mod06-retirement-03",
      "mod06-retirement-04",
      "mod06-retirement-05",
    ],
    learning_objectives: [
      "Start retirement planning early",
      "Maximise SSNIT Tier 1 and Tier 2 benefits",
      "Use Tier 3 voluntary pension and tax relief",
      "Build non-pension retirement assets",
      "Plan succession and wills",
    ],
    next_module_id: "MOD-07",
  },
  {
    id: "MOD-07",
    title: "Protecting Your Money",
    description:
      "Spot scams, know your consumer rights, and safeguard your financial data.",
    icon: "shield",
    color: "#8B2635",
    level: "foundational",
    estimated_minutes: 35,
    lessonIds: ["mod07-fraud-01", "mod07-fraud-02", "mod07-fraud-03"],
    learning_objectives: [
      "Recognise the five universal red flags of financial fraud",
      "Identify common scams targeting Ghanaians",
      "Know your rights as a financial consumer",
      "Protect your financial data and privacy",
    ],
    next_module_id: undefined,
  },
];

export const MODULE_IDS: LessonModule[] = [
  "MOD-01",
  "MOD-02",
  "MOD-03",
  "MOD-04",
  "MOD-05",
  "MOD-06",
  "MOD-07",
];

/** Difficulty badge colours per FRD §24.2 */
export const LEVEL_COLORS: Record<string, string> = {
  foundational: "#2D9B5A",
  intermediate: "#E8A020",
  advanced: "#8B2635",
};

export const LEVEL_LABELS: Record<string, string> = {
  foundational: "Foundational",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
