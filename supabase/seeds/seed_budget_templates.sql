-- Seed data: Budget templates for different life stages
-- Date: 2026-02-04
-- Run after budget_templates table migration

-- Clear existing templates (for re-running)
truncate table public.budget_templates cascade;

-- 1. Student Template
insert into public.budget_templates (
  name,
  description,
  target_audience,
  life_stage,
  needs_pct,
  wants_pct,
  savings_pct,
  recommended_categories,
  is_default,
  sort_order
) values (
  'Student Budget',
  'Optimized for students with limited income. Focuses on essentials while building emergency savings.',
  'university students, tertiary students, students on allowance',
  'student',
  0.65,
  0.25,
  0.10,
  '{
    "needs": ["Rent", "Transport", "Groceries", "School Fees", "Data Bundles"],
    "wants": ["Dining Out", "Entertainment", "Clothing"],
    "savings": ["Emergency Fund", "Susu/Project Savings"]
  }'::jsonb,
  false,
  1
);

-- 2. Young Professional Template
insert into public.budget_templates (
  name,
  description,
  target_audience,
  life_stage,
  needs_pct,
  wants_pct,
  savings_pct,
  recommended_categories,
  is_default,
  sort_order
) values (
  'Young Professional',
  'Balanced approach for early-career professionals. Standard 50/30/20 rule with room for lifestyle and savings goals.',
  'young professionals, early career, graduates, single professionals',
  'young_professional',
  0.50,
  0.30,
  0.20,
  '{
    "needs": ["Rent", "Transport", "Groceries", "Utilities", "Tithes/Church"],
    "wants": ["Dining Out", "Entertainment", "Clothing", "Subscriptions", "Gadgets", "Self-care"],
    "savings": ["Emergency Fund", "T-Bills", "Susu/Project Savings"]
  }'::jsonb,
  true,
  2
);

-- 3. Aggressive Saver Template
insert into public.budget_templates (
  name,
  description,
  target_audience,
  life_stage,
  needs_pct,
  wants_pct,
  savings_pct,
  recommended_categories,
  is_default,
  sort_order
) values (
  'Aggressive Saver',
  'For those with low fixed costs who want to maximize savings and investments. Ideal for goal-oriented savers.',
  'high earners, low expenses, investment focused, goal savers',
  'young_professional',
  0.40,
  0.20,
  0.40,
  '{
    "needs": ["Rent", "Transport", "Groceries", "Utilities"],
    "wants": ["Dining Out", "Entertainment", "Subscriptions"],
    "savings": ["Emergency Fund", "T-Bills", "Susu/Project Savings"]
  }'::jsonb,
  false,
  3
);

-- 4. Family Budget Template
insert into public.budget_templates (
  name,
  description,
  target_audience,
  life_stage,
  needs_pct,
  wants_pct,
  savings_pct,
  recommended_categories,
  is_default,
  sort_order
) values (
  'Family Budget',
  'Designed for families with dependents. Higher needs allocation for household expenses, childcare, and education.',
  'families, parents, households with children, married couples',
  'family',
  0.60,
  0.25,
  0.15,
  '{
    "needs": ["Rent", "School Fees", "Transport", "Groceries", "Utilities", "ECG", "Ghana Water", "Tithes/Church"],
    "wants": ["Dining Out", "Entertainment", "Clothing", "Family Outings"],
    "savings": ["Emergency Fund", "Susu/Project Savings", "Education Fund"]
  }'::jsonb,
  false,
  4
);

-- 5. Debt Payoff Template
insert into public.budget_templates (
  name,
  description,
  target_audience,
  life_stage,
  needs_pct,
  wants_pct,
  savings_pct,
  recommended_categories,
  is_default,
  sort_order
) values (
  'Debt Crusher',
  'Focused on debt elimination. Minimizes wants to accelerate debt payoff while maintaining emergency fund.',
  'debt payoff, loan repayment, credit card debt, financial recovery',
  null,
  0.70,
  0.15,
  0.15,
  '{
    "needs": ["Rent", "Transport", "Groceries", "Utilities", "Debt Payments"],
    "wants": ["Essential Entertainment"],
    "savings": ["Emergency Fund", "Debt Payoff Fund"]
  }'::jsonb,
  false,
  5
);

-- 6. Survival Mode Template
insert into public.budget_templates (
  name,
  description,
  target_audience,
  life_stage,
  needs_pct,
  wants_pct,
  savings_pct,
  recommended_categories,
  is_default,
  sort_order
) values (
  'Survival Mode',
  'For high fixed costs or low income situations. Focuses on covering essentials with minimal discretionary spending.',
  'high expenses, low income, financial hardship, tight budget',
  null,
  0.90,
  0.10,
  0.00,
  '{
    "needs": ["Rent", "Transport", "Groceries", "Utilities", "Essential Bills"],
    "wants": ["Minimal Discretionary"],
    "savings": []
  }'::jsonb,
  false,
  6
);

-- 7. Retiree Template
insert into public.budget_templates (
  name,
  description,
  target_audience,
  life_stage,
  needs_pct,
  wants_pct,
  savings_pct,
  recommended_categories,
  is_default,
  sort_order
) values (
  'Retiree Budget',
  'For retirees living on fixed income. Balanced approach with focus on healthcare and lifestyle quality.',
  'retirees, pensioners, senior citizens, fixed income',
  'retiree',
  0.55,
  0.30,
  0.15,
  '{
    "needs": ["Rent", "Healthcare", "Groceries", "Utilities", "Transport"],
    "wants": ["Dining Out", "Entertainment", "Travel", "Hobbies"],
    "savings": ["Emergency Fund", "Healthcare Reserve"]
  }'::jsonb,
  false,
  7
);
