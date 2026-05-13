-- Create economic_context table
CREATE TABLE IF NOT EXISTS public.economic_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country TEXT NOT NULL, -- ISO 3166-1 alpha-2 (e.g., 'GH')
    snapshot_date DATE NOT NULL,
    currency_code TEXT NOT NULL, -- e.g., 'GHS'
    currency_symbol TEXT NOT NULL, -- e.g., '₵'
    inflation_rate NUMERIC(5,2),
    avg_monthly_rent_major_city NUMERIC(12,2),
    avg_monthly_rent_other NUMERIC(12,2),
    electricity_tariff_kwh NUMERIC(10,4),
    water_tariff_1000l NUMERIC(10,4),
    avg_utility_monthly NUMERIC(12,2),
    min_wage_daily NUMERIC(12,2),
    avg_transport_monthly NUMERIC(12,2),
    avg_food_monthly_single NUMERIC(12,2),
    avg_food_monthly_family NUMERIC(12,2),
    popular_subscriptions JSONB DEFAULT '[]'::jsonb,
    common_categories JSONB DEFAULT '{}'::jsonb,
    data_sources TEXT[] DEFAULT '{}'::text[],
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure only one snapshot per country per date
    CONSTRAINT unique_country_snapshot UNIQUE (country, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.economic_context ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on economic_context" 
ON public.economic_context 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow authenticated users read-only access (optional, but edge functions usually use service role)
CREATE POLICY "Authenticated users read access on economic_context" 
ON public.economic_context 
FOR SELECT 
TO authenticated 
USING (true);

-- Seed initial Ghana economic context (Snapshot May 2026)
INSERT INTO public.economic_context (
    country, 
    snapshot_date, 
    currency_code, 
    currency_symbol, 
    inflation_rate, 
    avg_monthly_rent_major_city, 
    avg_monthly_rent_other,
    electricity_tariff_kwh,
    water_tariff_1000l,
    avg_utility_monthly,
    min_wage_daily,
    avg_transport_monthly,
    avg_food_monthly_single,
    avg_food_monthly_family,
    popular_subscriptions,
    common_categories,
    data_sources,
    notes
) VALUES (
    'GH', 
    '2026-05-01', 
    'GHS', 
    '₵', 
    3.4, 
    2500.00, -- Accra/Kumasi avg for 1-2 bed
    800.00,  -- Other regions
    1.97,    -- GHS per kWh (PURC Q2 2026)
    10.50,   -- GHS per 1000L (PURC Q2 2026)
    250.00,
    21.77,   -- National Daily Minimum Wage 2026
    400.00,
    1500.00, -- Monthly food for single
    3500.00, -- Monthly food for family
    '[
        {"name": "MTN Data (Monthly)", "amount": 100},
        {"name": "Netflix (Basic)", "amount": 65},
        {"name": "Spotify", "amount": 35},
        {"name": "DSTV Compact", "amount": 250}
    ]'::jsonb,
    '{
        "needs": ["Rent", "Food & Groceries", "Transport", "Utilities (ECG/Water)", "Healthcare", "Education", "Tithe/Offerings"],
        "wants": ["Entertainment", "Dining Out", "Clothing", "Personal Care", "Subscriptions", "Data/Internet"],
        "savings": ["Emergency Fund", "Investment", "Project Savings", "Retirement (SSNIT Top-up)"]
    }'::jsonb,
    '{"GSS StatsBank", "PURC Q2 2026", "National Tripartite Committee", "World Bank", "Bank of Ghana"}',
    'Initial seed for Ghana May 2026 - Updated with real-time research'
) ON CONFLICT (country, snapshot_date) DO NOTHING;
