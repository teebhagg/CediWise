// =====================================================
// SME Ledger Domain Types
// =====================================================

import {
  ShoppingCart,
  UtensilsCrossed,
  Shirt,
  Laptop,
  Sparkles,
  Heart,
  Wheat,
  Truck,
  GraduationCap,
  HardHat,
  Wallet,
  Factory,
  Hotel,
  MoreHorizontal,
} from "lucide-react-native";

export type BusinessType = "goods" | "services" | "mixed";
export type TransactionType = "income" | "expense";
export type PaymentMethod = "cash" | "momo" | "bank" | "card" | "cheque" | "other";

export interface SMEProfile {
  id: string;
  userId: string;
  businessName: string;
  businessType: BusinessType;
  businessCategory: string | null;
  currency: string;
  vatRegistered: boolean;
  tin: string | null;
  fiscalYearStartMonth: number;
  createdAt: string;
  updatedAt: string;
}

export interface SMETransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  transactionDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod | null;
  vatApplicable: boolean;
  vatAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SMECategory {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ThresholdStatus =
  | "ok"
  | "warning_60"
  | "approaching_80"
  | "over_threshold"
  | "services_no_threshold";

export interface ThresholdInfo {
  status: ThresholdStatus;
  annualTurnover: number;
  threshold: number;
  percentage: number;
  message: string;
}

export interface SMETotals {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  vatCollected: number;
  vatPaid: number;
  vatPayable: number;
}

// Local state shape (cached in AsyncStorage)
export interface SMEState {
  version: 1;
  userId: string;
  profile: SMEProfile | null;
  transactions: SMETransaction[];
  categories: SMECategory[];
  updatedAt: string;
}

// DB row shapes (snake_case, from Supabase)
export interface SMESubscriptionRow {
  id: string;
  user_id: string;
  plan: "free" | "budget" | "sme";
  status: "active" | "cancelled" | "expired" | "trial";
  paystack_customer_id: string | null;
  paystack_subscription_code: string | null;
  paystack_plan_code: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

// Default category definitions
export const DEFAULT_INCOME_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
}[] = [
  { name: "Sales", icon: "ShoppingBag", color: "#10B981" },
  { name: "Services", icon: "Briefcase", color: "#3B82F6" },
  { name: "Commissions", icon: "Percent", color: "#8B5CF6" },
  { name: "Other Income", icon: "Plus", color: "#6B7280" },
];

export const DEFAULT_EXPENSE_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
}[] = [
  { name: "Rent", icon: "Building", color: "#EF4444" },
  { name: "Supplies", icon: "Package", color: "#F59E0B" },
  { name: "Transport", icon: "Truck", color: "#14B8A6" },
  { name: "Salaries", icon: "Users", color: "#EC4899" },
  { name: "Utilities", icon: "Zap", color: "#F97316" },
  { name: "Marketing", icon: "Megaphone", color: "#8B5CF6" },
  { name: "Stock/Inventory", icon: "Boxes", color: "#06B6D4" },
  { name: "Insurance", icon: "Shield", color: "#6366F1" },
  { name: "Bank Charges", icon: "Landmark", color: "#78716C" },
  { name: "Other Expense", icon: "Minus", color: "#6B7280" },
];

// Payment method display labels
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  momo: "Mobile Money",
  bank: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

// Predefined business categories for SME Ledger
export const BUSINESS_CATEGORIES_DATA = [
  { name: "Retail", icon: ShoppingCart, color: "#10B981" },
  { name: "Food & Beverage", icon: UtensilsCrossed, color: "#F59E0B" },
  { name: "Fashion & Clothing", icon: Shirt, color: "#EC4899" },
  { name: "Technology", icon: Laptop, color: "#3B82F6" },
  { name: "Beauty & Personal Care", icon: Sparkles, color: "#A855F7" },
  { name: "Health & Pharmacy", icon: Heart, color: "#EF4444" },
  { name: "Agriculture", icon: Wheat, color: "#84CC16" },
  { name: "Transport & Logistics", icon: Truck, color: "#14B8A6" },
  { name: "Education", icon: GraduationCap, color: "#6366F1" },
  { name: "Construction", icon: HardHat, color: "#F97316" },
  { name: "Financial Services", icon: Wallet, color: "#06B6D4" },
  { name: "Manufacturing", icon: Factory, color: "#78716C" },
  { name: "Hospitality & Tourism", icon: Hotel, color: "#D946EF" },
  { name: "Other", icon: MoreHorizontal, color: "#6B7280" },
] as const;

export const BUSINESS_CATEGORIES = BUSINESS_CATEGORIES_DATA.map(
  (c) => c.name
) as readonly string[];

export type BusinessCategoryValue =
  (typeof BUSINESS_CATEGORIES_DATA)[number]["name"];
