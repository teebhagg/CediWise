/**
 * Seed Budget Data for 3 Test Personas
 *
 * Creates realistic 6-month budget history for:
 * 1. Tech Enthusiast (ea09544b-0d92-4897-a7fb-b07906594985)
 * 2. Travel Influencer (1389a0bd-2fd3-45ee-959e-482d28f651f9)
 * 3. Fashion Enthusiast/Model (1a79866a-1bbd-47fd-b507-88c2f94269ce)
 *
 * Run: npx tsx scripts/seed-budget-personas.ts
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ─── Load Environment ──────────────────────────────────────────────────────────

function loadEnv(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

const appRoot = path.resolve(__dirname, "..");
const envPaths = [
  path.join(__dirname, ".env"),
  path.join(appRoot, ".env"),
  path.join(appRoot, ".env.local"),
];
const envVars = envPaths.reduce(
  (acc, p) => ({ ...acc, ...loadEnv(p) }),
  {} as Record<string, string>
);

const SUPABASE_URL =
  envVars.SUPABASE_URL ??
  envVars.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "";
const SUPABASE_SERVICE_ROLE_KEY =
  envVars.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "\n❌  Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "    Add to cediwise-mobile-app/.env.local:\n" +
      "      EXPO_PUBLIC_SUPABASE_URL=...\n" +
      "      SUPABASE_SERVICE_ROLE_KEY=... (Supabase → Settings → API)\n"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Helper Functions ───────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomIntBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function toISODate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function computePaydayCycle(baseDate: Date, paydayDay: number) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const day = Math.min(
    Math.max(1, paydayDay),
    new Date(year, month + 1, 0).getDate()
  );
  const thisMonthPayday = new Date(year, month, day, 12, 0, 0, 0);

  const start =
    baseDate.getTime() >= thisMonthPayday.getTime()
      ? thisMonthPayday
      : addMonths(thisMonthPayday, -1);

  const nextPayday = addMonths(thisMonthPayday, 1);
  const end = new Date(nextPayday);
  end.setDate(end.getDate() - 1);

  return { start, end };
}

// ─── Persona Definitions ────────────────────────────────────────────────────────

type Persona = {
  userId: string;
  name: string;
  paydayDay: number;
  interests: string[];
  lifeStage: "student" | "young_professional" | "family" | "retiree";
  income: {
    primary: number;
    side?: number;
  };
  categories: {
    needs: { name: string; baseLimit: number; variance: number }[];
    wants: {
      name: string;
      baseLimit: number;
      variance: number;
      trend?: "increasing" | "stable" | "decreasing";
    }[];
    savings: { name: string; baseLimit: number }[];
  };
  allocation: {
    needsPct: number;
    wantsPct: number;
    savingsPct: number;
  };
};

const PERSONAS: Persona[] = [
  {
    userId: "ea09544b-0d92-4897-a7fb-b07906594985",
    name: "Tech Enthusiast",
    paydayDay: 25,
    interests: ["Tech", "Gaming"],
    lifeStage: "young_professional",
    income: {
      primary: 8000,
      side: 2000, // Freelance dev work
    },
    categories: {
      needs: [
        { name: "Rent", baseLimit: 2500, variance: 0 },
        { name: "Groceries", baseLimit: 800, variance: 0.15 },
        { name: "Transport", baseLimit: 400, variance: 0.1 },
        { name: "ECG", baseLimit: 150, variance: 0.2 },
        { name: "Ghana Water", baseLimit: 80, variance: 0.15 },
        { name: "Trash", baseLimit: 50, variance: 0 },
      ],
      wants: [
        {
          name: "Data Bundles",
          baseLimit: 300,
          variance: 0.1,
          trend: "stable",
        },
        {
          name: "Subscriptions",
          baseLimit: 200,
          variance: 0.05,
          trend: "increasing",
        }, // Netflix, Spotify, etc.
        { name: "Gadgets", baseLimit: 500, variance: 0.4, trend: "stable" }, // High variance - occasional big purchases
        { name: "Games", baseLimit: 150, variance: 0.3, trend: "stable" },
        { name: "Dining Out", baseLimit: 400, variance: 0.2, trend: "stable" },
      ],
      savings: [
        { name: "Emergency Fund", baseLimit: 2000 },
        { name: "T-Bills", baseLimit: 1000 },
      ],
    },
    allocation: {
      needsPct: 0.5,
      wantsPct: 0.3,
      savingsPct: 0.2,
    },
  },
  {
    userId: "1389a0bd-2fd3-45ee-959e-482d28f651f9",
    name: "Travel Influencer",
    paydayDay: 15,
    interests: ["Travel", "Food"],
    lifeStage: "young_professional",
    income: {
      primary: 12000, // Variable influencer income
      side: 3000, // Brand partnerships
    },
    categories: {
      needs: [
        { name: "Rent", baseLimit: 3000, variance: 0 },
        { name: "Groceries", baseLimit: 600, variance: 0.2 },
        { name: "Transport", baseLimit: 500, variance: 0.3 }, // High variance - lots of travel
        { name: "ECG", baseLimit: 200, variance: 0.15 },
        { name: "Ghana Water", baseLimit: 100, variance: 0.1 },
        { name: "Trash", baseLimit: 50, variance: 0 },
      ],
      wants: [
        { name: "Travel", baseLimit: 2000, variance: 0.5, trend: "increasing" }, // Very high variance - some months huge, some none
        {
          name: "Dining Out",
          baseLimit: 800,
          variance: 0.25,
          trend: "increasing",
        },
        { name: "Clothing", baseLimit: 600, variance: 0.3, trend: "stable" },
        {
          name: "Data Bundles",
          baseLimit: 400,
          variance: 0.2,
          trend: "stable",
        },
        {
          name: "Entertainment",
          baseLimit: 300,
          variance: 0.25,
          trend: "stable",
        },
      ],
      savings: [
        { name: "Emergency Fund", baseLimit: 2000 },
        { name: "Susu/Project Savings", baseLimit: 1500 },
      ],
    },
    allocation: {
      needsPct: 0.45,
      wantsPct: 0.35,
      savingsPct: 0.2,
    },
  },
  {
    userId: "1a79866a-1bbd-47fd-b507-88c2f94269ce",
    name: "Fashion Enthusiast/Model",
    paydayDay: 1,
    interests: ["Fashion", "Beauty"],
    lifeStage: "young_professional",
    income: {
      primary: 15000, // Modeling + brand deals
      side: 5000, // Social media partnerships
    },
    categories: {
      needs: [
        { name: "Rent", baseLimit: 4000, variance: 0 },
        { name: "Groceries", baseLimit: 700, variance: 0.15 },
        { name: "Transport", baseLimit: 600, variance: 0.2 },
        { name: "ECG", baseLimit: 250, variance: 0.15 },
        { name: "Ghana Water", baseLimit: 120, variance: 0.1 },
        { name: "Trash", baseLimit: 50, variance: 0 },
      ],
      wants: [
        {
          name: "Clothing",
          baseLimit: 2500,
          variance: 0.3,
          trend: "increasing",
        }, // Very high - fashion is the focus
        {
          name: "Shoes & Accessories",
          baseLimit: 800,
          variance: 0.35,
          trend: "stable",
        },
        { name: "Self-care", baseLimit: 600, variance: 0.2, trend: "stable" }, // Beauty treatments, spa
        {
          name: "Data Bundles",
          baseLimit: 300,
          variance: 0.1,
          trend: "stable",
        },
        {
          name: "Dining Out",
          baseLimit: 1000,
          variance: 0.25,
          trend: "stable",
        },
        {
          name: "Entertainment",
          baseLimit: 500,
          variance: 0.2,
          trend: "stable",
        },
      ],
      savings: [
        { name: "Emergency Fund", baseLimit: 3000 },
        { name: "Susu/Project Savings", baseLimit: 2000 },
      ],
    },
    allocation: {
      needsPct: 0.4,
      wantsPct: 0.4,
      savingsPct: 0.2,
    },
  },
];

// ─── Seed Function ───────────────────────────────────────────────────────────────

async function seedPersona(persona: Persona): Promise<void> {
  console.log(
    `\n📊 Seeding ${persona.name} (${persona.userId.substring(0, 8)}...)`
  );

  const now = new Date();
  const cycles: {
    id: string;
    startDate: string;
    endDate: string;
    paydayDay: number;
    needsPct: number;
    wantsPct: number;
    savingsPct: number;
  }[] = [];

  // Create 6 months of cycles (going back from now)
  for (let i = 5; i >= 0; i--) {
    const cycleDate = addMonths(now, -i);
    const { start, end } = computePaydayCycle(cycleDate, persona.paydayDay);
    cycles.push({
      id: generateUUID(),
      startDate: toISODate(start),
      endDate: toISODate(end),
      paydayDay: persona.paydayDay,
      needsPct: persona.allocation.needsPct,
      wantsPct: persona.allocation.wantsPct,
      savingsPct: persona.allocation.savingsPct,
    });
  }

  // 1. Upsert Profile
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: persona.userId,
    payday_day: persona.paydayDay,
    interests: persona.interests,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error(`  ✗ Profile: ${profileError.message}`);
    return;
  }
  console.log(`  ✓ Profile`);

  // 2. Upsert Income Sources
  const incomeSourceId = generateUUID();
  const { error: incomeError } = await supabase.from("income_sources").upsert({
    id: incomeSourceId,
    user_id: persona.userId,
    name: "Primary Salary",
    type: "primary",
    amount: persona.income.primary,
    apply_deductions: true,
    updated_at: new Date().toISOString(),
  });

  if (incomeError) {
    console.error(`  ✗ Income Source: ${incomeError.message}`);
  } else {
    console.log(
      `  ✓ Income Source: ₵${persona.income.primary.toLocaleString()}/month`
    );
  }

  if (persona.income.side) {
    const sideIncomeId = generateUUID();
    const { error: sideIncomeError } = await supabase
      .from("income_sources")
      .upsert({
        id: sideIncomeId,
        user_id: persona.userId,
        name: "Side Income",
        type: "side",
        amount: persona.income.side,
        apply_deductions: false,
        updated_at: new Date().toISOString(),
      });

    if (sideIncomeError) {
      console.error(`  ✗ Side Income: ${sideIncomeError.message}`);
    } else {
      console.log(
        `  ✓ Side Income: ₵${persona.income.side.toLocaleString()}/month`
      );
    }
  }

  // 3. Create Cycles
  for (const cycle of cycles) {
    const { error: cycleError } = await supabase.from("budget_cycles").upsert({
      id: cycle.id,
      user_id: persona.userId,
      start_date: cycle.startDate,
      end_date: cycle.endDate,
      payday_day: cycle.paydayDay,
      needs_pct: cycle.needsPct,
      wants_pct: cycle.wantsPct,
      savings_pct: cycle.savingsPct,
      updated_at: new Date().toISOString(),
    });

    if (cycleError) {
      console.error(`  ✗ Cycle ${cycle.startDate}: ${cycleError.message}`);
      continue;
    }
  }
  console.log(`  ✓ ${cycles.length} Cycles`);

  // 4. Create Categories for each cycle
  const categoryMap = new Map<string, string>(); // name -> id
  let categorySortOrder = 0;

  for (const cycle of cycles) {
    // Needs categories
    for (const cat of persona.categories.needs) {
      const catId = generateUUID();
      categoryMap.set(`${cycle.id}:${cat.name}`, catId);

      const { error: catError } = await supabase
        .from("budget_categories")
        .upsert({
          id: catId,
          user_id: persona.userId,
          cycle_id: cycle.id,
          bucket: "needs",
          name: cat.name,
          limit_amount: cat.baseLimit,
          is_custom: false,
          sort_order: categorySortOrder++,
          updated_at: new Date().toISOString(),
        });

      if (catError) {
        console.error(`  ✗ Category ${cat.name}: ${catError.message}`);
      }
    }

    // Wants categories
    for (const cat of persona.categories.wants) {
      const catId = generateUUID();
      categoryMap.set(`${cycle.id}:${cat.name}`, catId);

      const { error: catError } = await supabase
        .from("budget_categories")
        .upsert({
          id: catId,
          user_id: persona.userId,
          cycle_id: cycle.id,
          bucket: "wants",
          name: cat.name,
          limit_amount: cat.baseLimit,
          is_custom: false,
          sort_order: categorySortOrder++,
          updated_at: new Date().toISOString(),
        });

      if (catError) {
        console.error(`  ✗ Category ${cat.name}: ${catError.message}`);
      }
    }

    // Savings categories
    for (const cat of persona.categories.savings) {
      const catId = generateUUID();
      categoryMap.set(`${cycle.id}:${cat.name}`, catId);

      const { error: catError } = await supabase
        .from("budget_categories")
        .upsert({
          id: catId,
          user_id: persona.userId,
          cycle_id: cycle.id,
          bucket: "savings",
          name: cat.name,
          limit_amount: cat.baseLimit,
          is_custom: false,
          sort_order: categorySortOrder++,
          updated_at: new Date().toISOString(),
        });

      if (catError) {
        console.error(`  ✗ Category ${cat.name}: ${catError.message}`);
      }
    }
  }
  console.log(`  ✓ Categories`);

  // 5. Generate Transactions for each cycle
  const transactions: {
    id: string;
    user_id: string;
    cycle_id: string;
    bucket: string;
    category_id: string | null;
    amount: number;
    note: string | null;
    occurred_at: string;
    source: string;
  }[] = [];

  for (let cycleIdx = 0; cycleIdx < cycles.length; cycleIdx++) {
    const cycle = cycles[cycleIdx];
    const cycleStart = new Date(cycle.startDate);
    const cycleEnd = new Date(cycle.endDate);

    // Generate transactions for each category
    for (const cat of [
      ...persona.categories.needs,
      ...persona.categories.wants,
      ...persona.categories.savings,
    ]) {
      const catId = categoryMap.get(`${cycle.id}:${cat.name}`);
      if (!catId) continue;

      // Calculate spending amount with variance and trend
      let baseSpent = cat.baseLimit;

      // Apply variance (needs/wants have variance; savings do not)
      const variance: number = "variance" in cat ? (cat.variance as number) : 0;
      const varianceMultiplier = randomBetween(1 - variance, 1 + variance);
      baseSpent *= varianceMultiplier;

      // Apply trend over time (for wants categories)
      if ("trend" in cat && cat.trend) {
        const trendMultiplier =
          cycleIdx === 0
            ? 1
            : cat.trend === "increasing"
            ? 1 + cycleIdx * 0.05
            : cat.trend === "decreasing"
            ? 1 - cycleIdx * 0.03
            : 1;
        baseSpent *= trendMultiplier;
      }

      // For savings, sometimes they don't hit the full amount
      if (cat.name.includes("Emergency Fund") || cat.name.includes("Savings")) {
        baseSpent *= randomBetween(0.7, 1.0); // 70-100% of limit
      }

      const numTransactions = randomIntBetween(2, 8); // 2-8 transactions per category per cycle
      const amountPerTransaction = baseSpent / numTransactions;

      for (let i = 0; i < numTransactions; i++) {
        const transactionDate = new Date(
          cycleStart.getTime() +
            (cycleEnd.getTime() - cycleStart.getTime()) *
              (i / numTransactions) +
            randomBetween(-5, 5) * 24 * 60 * 60 * 1000 // ±5 days variance
        );

        // Clamp to cycle dates
        if (transactionDate < cycleStart)
          transactionDate.setTime(cycleStart.getTime());
        if (transactionDate > cycleEnd)
          transactionDate.setTime(cycleEnd.getTime());

        const amount =
          Math.round(amountPerTransaction * randomBetween(0.8, 1.2) * 100) /
          100;

        transactions.push({
          id: generateUUID(),
          user_id: persona.userId,
          cycle_id: cycle.id,
          bucket: persona.categories.needs.includes(cat as any)
            ? "needs"
            : persona.categories.wants.includes(cat as any)
            ? "wants"
            : "savings",
          category_id: catId,
          amount,
          note: i === 0 ? `${cat.name} expense` : null,
          occurred_at: transactionDate.toISOString(),
          source: "manual",
        });
      }
    }
  }

  // Insert transactions in batches
  const batchSize = 100;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const { error: txError } = await supabase
      .from("budget_transactions")
      .insert(batch);

    if (txError) {
      console.error(
        `  ✗ Transactions batch ${i / batchSize + 1}: ${txError.message}`
      );
    }
  }
  console.log(`  ✓ ${transactions.length} Transactions`);

  // 6. Calculate and insert Spending Patterns
  const spendingPatterns: {
    user_id: string;
    category_id: string;
    cycle_id: string;
    avg_spent: number;
    trend: string;
    variance: number;
    last_calculated_at: string;
  }[] = [];

  // Group transactions by category across cycles
  const categorySpending = new Map<string, number[]>(); // categoryId -> amounts[]

  for (const tx of transactions) {
    if (!tx.category_id) continue;
    if (!categorySpending.has(tx.category_id)) {
      categorySpending.set(tx.category_id, []);
    }
    categorySpending.get(tx.category_id)!.push(tx.amount);
  }

  // Calculate patterns for each category in the most recent cycle
  const mostRecentCycle = cycles[cycles.length - 1];

  for (const [categoryId, amounts] of categorySpending.entries()) {
    // Find which category this is
    let categoryName = "";
    let categoryDef: any = null;

    for (const [key, id] of categoryMap.entries()) {
      if (id === categoryId) {
        categoryName = key.split(":")[1];
        break;
      }
    }

    // Find category definition
    for (const cat of [
      ...persona.categories.needs,
      ...persona.categories.wants,
      ...persona.categories.savings,
    ]) {
      if (cat.name === categoryName) {
        categoryDef = cat;
        break;
      }
    }

    if (!categoryDef) continue;

    // Only create pattern for most recent cycle's categories
    const mostRecentCatId = categoryMap.get(
      `${mostRecentCycle.id}:${categoryName}`
    );
    if (categoryId !== mostRecentCatId) continue;

    // Calculate avg spent across all cycles for this category
    const allAmounts: number[] = [];
    for (const cycle of cycles) {
      const cycleCatId = categoryMap.get(`${cycle.id}:${categoryName}`);
      if (!cycleCatId) continue;

      const cycleAmounts = transactions
        .filter((t) => t.category_id === cycleCatId)
        .map((t) => t.amount);
      allAmounts.push(...cycleAmounts);
    }

    if (allAmounts.length === 0) continue;

    const avgSpent =
      allAmounts.reduce((sum, a) => sum + a, 0) / allAmounts.length;

    // Calculate variance (standard deviation)
    const variance =
      allAmounts.length > 1
        ? Math.sqrt(
            allAmounts.reduce((sum, a) => sum + Math.pow(a - avgSpent, 2), 0) /
              allAmounts.length
          )
        : 0;

    // Determine trend
    let trend: "increasing" | "stable" | "decreasing" = "stable";
    if (cycles.length >= 2 && "trend" in categoryDef && categoryDef.trend) {
      trend = categoryDef.trend;
    } else if (cycles.length >= 2) {
      // Compare first half vs second half
      const midpoint = Math.floor(cycles.length / 2);
      const firstHalfAmounts: number[] = [];
      const secondHalfAmounts: number[] = [];

      for (let i = 0; i < midpoint; i++) {
        const cycleCatId = categoryMap.get(`${cycles[i].id}:${categoryName}`);
        if (cycleCatId) {
          const amounts = transactions
            .filter((t) => t.category_id === cycleCatId)
            .map((t) => t.amount);
          firstHalfAmounts.push(...amounts);
        }
      }

      for (let i = midpoint; i < cycles.length; i++) {
        const cycleCatId = categoryMap.get(`${cycles[i].id}:${categoryName}`);
        if (cycleCatId) {
          const amounts = transactions
            .filter((t) => t.category_id === cycleCatId)
            .map((t) => t.amount);
          secondHalfAmounts.push(...amounts);
        }
      }

      if (firstHalfAmounts.length > 0 && secondHalfAmounts.length > 0) {
        const firstAvg =
          firstHalfAmounts.reduce((sum, a) => sum + a, 0) /
          firstHalfAmounts.length;
        const secondAvg =
          secondHalfAmounts.reduce((sum, a) => sum + a, 0) /
          secondHalfAmounts.length;
        const changeRatio = secondAvg / firstAvg;

        if (changeRatio > 1.1) trend = "increasing";
        else if (changeRatio < 0.9) trend = "decreasing";
      }
    }

    spendingPatterns.push({
      user_id: persona.userId,
      category_id: mostRecentCatId!,
      cycle_id: mostRecentCycle.id,
      avg_spent: Math.round(avgSpent * 100) / 100,
      trend,
      variance: Math.round(variance * 100) / 100,
      last_calculated_at: new Date().toISOString(),
    });
  }

  // Insert spending patterns
  if (spendingPatterns.length > 0) {
    const { error: patternError } = await supabase
      .from("spending_patterns")
      .upsert(spendingPatterns, {
        onConflict: "category_id,cycle_id",
      });

    if (patternError) {
      console.error(`  ✗ Spending Patterns: ${patternError.message}`);
    } else {
      console.log(`  ✓ ${spendingPatterns.length} Spending Patterns`);
    }
  }

  console.log(`  ✅ ${persona.name} seeded successfully!\n`);
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Seeding Budget Data for 3 Test Personas\n");
  console.log("═══════════════════════════════════════════════════════════\n");

  for (const persona of PERSONAS) {
    try {
      await seedPersona(persona);
    } catch (error) {
      console.error(`\n❌ Error seeding ${persona.name}:`, error);
    }
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ Seeding complete!\n");
}

main().catch((err) => {
  console.error("\n❌ Unexpected error:", err);
  process.exit(1);
});
