/**
 * Category icon mapping for budget categories.
 * Predefined categories use name-based lookup; custom categories use AsyncStorage.
 */
import type { BudgetBucket } from '@/types/budget';

/** Lucide icon names used for categories - import only these to keep bundle small */
export const CATEGORY_ICON_NAMES = [
  'Home',
  'GraduationCap',
  'Bus',
  'ShoppingCart',
  'Church',
  'Zap',
  'Droplets',
  'Trash2',
  'UtensilsCrossed',
  'Shirt',
  'Laptop',
  'Gamepad2',
  'Music',
  'Dumbbell',
  'Plane',
  'Heart',
  'Briefcase',
  'Wallet',
  'PiggyBank',
  'Landmark',
  'Receipt',
  'ArrowLeftRight',
  'Shield',
  'TrendingUp',
  'RotateCcw',
  'Coins',
  'Baby',
  'Smartphone',
  'Tv',
  'BookOpen',
  'Palette',
  'Cake',
  'Beer',
  'Gift',
  'Sparkles',
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number];

/** Default icon for unknown categories */
export const DEFAULT_CATEGORY_ICON: CategoryIconName = 'Wallet';

/** Colors for category icon backgrounds (emerald accent, app dark theme) */
export const CATEGORY_ICON_COLORS = [
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#f97316', // orange-500
  '#8b5cf6', // violet-500
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#eab308', // yellow-500
  '#a16207', // amber-700
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
] as const;

export type CategoryIconColor = (typeof CATEGORY_ICON_COLORS)[number];

/** Map category name -> Lucide icon name for predefined categories */
export const CATEGORY_NAME_TO_ICON: Record<string, CategoryIconName> = {
  // Needs
  Rent: 'Home',
  'School Fees': 'GraduationCap',
  Transport: 'Bus',
  Groceries: 'ShoppingCart',
  'Tithes/Church': 'Church',
  ECG: 'Zap',
  'Ghana Water': 'Droplets',
  Trash: 'Trash2',
  Emergency: 'Shield',
  Healthcare: 'Heart',
  'Essential Bills': 'Receipt',
  'Debt Payments': 'Receipt',
  Utilities: 'Zap',

  // Wants
  'Data Bundles': 'Smartphone',
  Subscriptions: 'Tv',
  'Dining Out': 'UtensilsCrossed',
  Clothing: 'Shirt',
  Entertainment: 'Gamepad2',
  Gadgets: 'Laptop',
  Gym: 'Dumbbell',
  'Self-care': 'Sparkles',
  Travel: 'Plane',
  Games: 'Gamepad2',
  Hobbies: 'Palette',
  'Shoes & Accessories': 'Shirt',
  'Skills & Courses': 'BookOpen',
  'Family Outings': 'Cake',
  'Drinks & dining': 'UtensilsCrossed',
  Restaurants: 'UtensilsCrossed',
  Shopping: 'ShoppingCart',
  General: 'Wallet',
  Cash: 'Wallet',
  Transfers: 'ArrowLeftRight',
  Insurance: 'Shield',
  Wealth: 'TrendingUp',
  Refund: 'RotateCcw',
  Cashback: 'Coins',
  'Child allowance': 'Baby',
  'Child Allowance': 'Baby',

  // Savings
  Savings: 'PiggyBank',
  'Education Fund': 'GraduationCap',
  'Healthcare Reserve': 'Heart',
  'Debt Payoff Fund': 'TrendingUp',
};

/** Predefined categories for the selection grid: name, bucket, icon */
export const PREDEFINED_CATEGORIES: { name: string; bucket: BudgetBucket; icon: CategoryIconName }[] = [
  { name: 'Groceries', bucket: 'needs', icon: 'ShoppingCart' },
  { name: 'Transport', bucket: 'needs', icon: 'Bus' },
  { name: 'Rent', bucket: 'needs', icon: 'Home' },
  { name: 'ECG', bucket: 'needs', icon: 'Zap' },
  { name: 'Ghana Water', bucket: 'needs', icon: 'Droplets' },
  { name: 'School Fees', bucket: 'needs', icon: 'GraduationCap' },
  { name: 'Tithes/Church', bucket: 'needs', icon: 'Church' },
  { name: 'Emergency', bucket: 'needs', icon: 'Shield' },
  { name: 'Healthcare', bucket: 'needs', icon: 'Heart' },
  { name: 'Utilities', bucket: 'needs', icon: 'Zap' },
  { name: 'Data Bundles', bucket: 'wants', icon: 'Smartphone' },
  { name: 'Dining Out', bucket: 'wants', icon: 'UtensilsCrossed' },
  { name: 'Subscriptions', bucket: 'wants', icon: 'Tv' },
  { name: 'Clothing', bucket: 'wants', icon: 'Shirt' },
  { name: 'Entertainment', bucket: 'wants', icon: 'Gamepad2' },
  { name: 'Travel', bucket: 'wants', icon: 'Plane' },
  { name: 'Hobbies', bucket: 'wants', icon: 'Palette' },
  { name: 'Self-care', bucket: 'wants', icon: 'Sparkles' },
  { name: 'Shopping', bucket: 'wants', icon: 'ShoppingCart' },
  { name: 'General', bucket: 'wants', icon: 'Wallet' },
  { name: 'Savings', bucket: 'savings', icon: 'PiggyBank' },
];

/**
 * Get icon name for a category. Prefer custom mapping, then name-based.
 */
export function getCategoryIcon(
  categoryName: string,
  customIconMap?: Record<string, CategoryIconName> | null
): CategoryIconName {
  if (customIconMap?.[categoryName]) return customIconMap[categoryName];
  return CATEGORY_NAME_TO_ICON[categoryName] ?? DEFAULT_CATEGORY_ICON;
}
