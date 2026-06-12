import {
  BookOpen,
  BriefcaseBusiness,
  Calculator,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";

export type DemoSlide = {
  source: number;
  icon: LucideIcon;
  title: string;
  caption: string;
};

export const ONBOARDING_DEMO_SLIDES: DemoSlide[] = [
  {
    source: require("../assets/videos/onboarding/smart-budget-snippet.mp4"),
    icon: Wallet,
    title: "Smart Budget",
    caption: "Set budgets that match your lifestyle",
  },
  {
    source: require("../assets/videos/onboarding/sme-snippet.mp4"),
    icon: BriefcaseBusiness,
    title: "SME Ledger",
    caption: "Track customers and manage business finances",
  },
  {
    source: require("../assets/videos/onboarding/tax-calculator-snippet.mp4"),
    icon: Calculator,
    title: "Tax & Salary",
    caption: "Calculate PAYE, SSNIT, and net pay instantly",
  },
  {
    source: require("../assets/videos/onboarding/learn-snippet.mp4"),
    icon: BookOpen,
    title: "Financial Literacy",
    caption: "Learn money management in bite-sized lessons",
  },
];
