-- Migration: Seed default SME categories
-- Date: 2026-03-27 00:05:00
-- Default income and expense categories for new SME users
-- Applied via app code (useSmeLedger hook) when sme_profile is first created

-- This file is a reference for the seed data.
-- The actual insertion happens in the useSmeLedger hook
-- to ensure user_id is correctly bound and categories
-- are only created once per user.

/*
Default INCOME categories:
  Sales          -- icon: ShoppingBag,   color: #10B981
  Services       -- icon: Briefcase,     color: #3B82F6
  Commissions    -- icon: Percent,       color: #8B5CF6
  Other Income   -- icon: Plus,          color: #6B7280

Default EXPENSE categories:
  Rent           -- icon: Building,      color: #EF4444
  Supplies       -- icon: Package,       color: #F59E0B
  Transport      -- icon: Truck,         color: #14B8A6
  Salaries       -- icon: Users,         color: #EC4899
  Utilities      -- icon: Zap,           color: #F97316
  Marketing      -- icon: Megaphone,     color: #8B5CF6
  Stock/Inventory-- icon: Boxes,         color: #06B6D4
  Insurance      -- icon: Shield,        color: #6366F1
  Bank Charges   -- icon: Landmark,      color: #78716C
  Other Expense  -- icon: Minus,         color: #6B7280
*/
