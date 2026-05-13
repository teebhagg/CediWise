import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeDebtProjections, type DebtRow } from "./debtProjections.ts";

type CycleRow = {
  id: string;
  start_date: string;
  end_date: string;
  needs_pct: number;
  wants_pct: number;
  savings_pct: number;
};

type CatRow = {
  id: string;
  name: string;
  bucket: string;
  limit_amount: number;
  is_archived: boolean | null;
};

type TxRow = {
  amount: number;
  bucket: string;
  category_id: string | null;
  occurred_at: string;
  note: string | null;
};

type ProfileRow = {
  life_stage: string | null;
  dependents_count: number | null;
  financial_priority: string | null;
  spending_style: string | null;
};

function daysUntilEnd(endDate: string): number {
  const end = new Date(endDate + "T23:59:59");
  const now = new Date();
  return Math.max(
    0,
    Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function approximateHealthScore(opts: {
  needsSpent: number;
  wantsSpent: number;
  savingsSpent: number;
  needsLimit: number;
  wantsLimit: number;
  savingsLimit: number;
}): number {
  const ratios: number[] = [];
  if (opts.needsLimit > 0) ratios.push(opts.needsSpent / opts.needsLimit);
  if (opts.wantsLimit > 0) ratios.push(opts.wantsSpent / opts.wantsLimit);
  if (opts.savingsLimit > 0) {
    ratios.push(
      opts.savingsSpent > opts.savingsLimit
        ? 1 + (opts.savingsSpent - opts.savingsLimit) / opts.savingsLimit
        : opts.savingsSpent / opts.savingsLimit,
    );
  }
  if (ratios.length === 0) return 70;
  const avgOver = ratios.reduce((a, b) => a + Math.min(b, 2), 0) / ratios.length;
  return Math.round(Math.max(0, Math.min(100, 100 - avgOver * 35)));
}

/**
 * Unified, token-optimized AI context assembly.
 * Combines Budget, Debt, and Pre-computed Historical Insights into one tight block.
 */
export async function assembleUserContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ text: string; cycleId: string | null; healthApprox: number; memoryRow: any }> {
  return assembleBudgetContext(supabase, userId);
}

export async function assembleBudgetContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ text: string; cycleId: string | null; healthApprox: number; memoryRow: any }> {
  // 1. Fetch Parallel Data (R5)
  const [
    incRes,
    recRes,
    pRes,
    cycleRes,
    debtsRes,
    memoryRes
  ] = await Promise.all([
    supabase.from("income_sources").select("amount").eq("user_id", userId),
    supabase.from("recurring_expenses").select("amount").eq("user_id", userId),
    supabase.from("profiles").select("life_stage, dependents_count, financial_priority, spending_style").eq("id", userId).maybeSingle(),
    supabase.from("budget_cycles").select("id, start_date, end_date, needs_pct, wants_pct, savings_pct").eq("user_id", userId).order("start_date", { ascending: false }).limit(1),
    supabase.from("debts").select("id, name, total_amount, remaining_amount, monthly_payment, interest_rate").eq("user_id", userId).eq("is_active", true),
    supabase.from("ai_user_context").select("summary, preferences, key_facts, session_summaries").eq("user_id", userId).eq("context_type", "general").maybeSingle()
  ]);

  let income = 0;
  if (incRes.data) {
    income = incRes.data.reduce((s: number, r: any) => s + Math.max(0, Number(r.amount) || 0), 0);
  }

  let recurring = 0;
  if (recRes.data) {
    recurring = recRes.data.reduce((s: number, r: any) => s + Math.max(0, Number(r.amount) || 0), 0);
  }

  const profileParts = (pRes.data || {}) as ProfileRow;
  const cycle = (cycleRes.data?.[0] ?? null) as CycleRow | null;
  const debts = (debtsRes.data ?? []) as DebtRow[];
  const memoryRow = memoryRes.data;

  let activeCats: CatRow[] = [];
  const catName = new Map<string, string>();
  let needsSpent = 0, wantsSpent = 0, savingsSpent = 0;
  let healthApprox = 50;
  const spentByCat = new Map<string, number>();
  let recentTxList: string[] = [];

  if (cycle) {
    const [catRes, txRes] = await Promise.all([
      supabase.from("budget_categories").select("id, name, bucket, limit_amount, is_archived").eq("user_id", userId).eq("cycle_id", cycle.id),
      supabase.from("budget_transactions").select("amount, bucket, category_id, occurred_at").eq("user_id", userId).eq("cycle_id", cycle.id).order("occurred_at", { ascending: false }).limit(1000) // R8 limit increased to 1000 for accurate sum
    ]);
    
    activeCats = ((catRes.data ?? []) as CatRow[]).filter((c) => !c.is_archived);
    activeCats.forEach(c => catName.set(c.id, c.name));

    const txRows = (txRes.data ?? []) as TxRow[];
    let txCount = 0;
    for (const t of txRows) {
      const amt = Math.max(0, Number(t.amount) || 0);
      const bid = t.category_id ?? "_unassigned";
      spentByCat.set(bid, (spentByCat.get(bid) ?? 0) + amt);
      if (t.bucket === "needs") needsSpent += amt;
      else if (t.bucket === "wants") wantsSpent += amt;
      else savingsSpent += amt;

      if (txCount < 15) {
        const d = String(t.occurred_at ?? "").slice(5, 10); // just MM-DD
        const nm = t.category_id ? (catName.get(t.category_id) ?? "Uncat") : "Uncat";
        recentTxList.push(`${d}|${nm}|${Math.round(amt)}`);
        txCount++;
      }
    }

    const disposable = Math.max(0, income);
    healthApprox = approximateHealthScore({
      needsSpent, wantsSpent, savingsSpent,
      needsLimit: disposable * Number(cycle.needs_pct),
      wantsLimit: disposable * Number(cycle.wants_pct),
      savingsLimit: disposable * Number(cycle.savings_pct),
    });
  }

  // 3. Compute Debt Projections
  const extraBudget = income > 0 ? Math.max(100, Math.round(income * 0.1)) : 0;
  const projections = computeDebtProjections(debts, extraBudget);

  // 5. Assemble the Compressed Context Block
  const lines: string[] = [];
  
  lines.push(`=== FIN ===`);
  lines.push(`Inc:${income.toFixed(0)} | Rec:${recurring.toFixed(0)}`);
  if (cycle) {
    lines.push(`Cyc:${cycle.start_date}→${cycle.end_date}(${daysUntilEnd(cycle.end_date)}d left) | N:${Math.round(Number(cycle.needs_pct)*100)}% W:${Math.round(Number(cycle.wants_pct)*100)}% S:${Math.round(Number(cycle.savings_pct)*100)}% | HP:${healthApprox}`);
  } else {
    lines.push(`Cyc:None`);
  }

  if (activeCats.length > 0) {
    lines.push(`=== CAT(spent/lim) ===`);
    for (const c of activeCats.sort((a, b) => a.name.localeCompare(b.name))) {
      const sp = spentByCat.get(c.id) ?? 0;
      const lim = Math.max(0, Number(c.limit_amount) || 0);
      lines.push(`${c.name}(${c.bucket}):${Math.round(sp)}/${Math.round(lim)}`);
    }
  }

  if (recentTxList.length > 0) {
    lines.push(`=== TX(last15) ===`);
    lines.push(recentTxList.join(", "));
  }

  if (debts.length > 0) {
    lines.push(`=== DEBT ===`);
    const totalOwed = debts.reduce((s, d) => s + d.remaining_amount, 0);
    const minMo = debts.reduce((s, d) => s + d.monthly_payment, 0);
    lines.push(`Tot:${debts.length} | Owed:${Math.round(totalOwed)} | MinMo:${Math.round(minMo)}`);
    for (const d of debts.sort((a, b) => b.remaining_amount - a.remaining_amount)) {
      lines.push(`${d.name}(${d.interest_rate}%):${Math.round(d.remaining_amount)}rem,min${d.monthly_payment}`);
    }
    const s = projections.snowball;
    const a = projections.avalanche;
    lines.push(`Snow:${s.debtFreeDate.toISOString().slice(0, 7)},int₵${s.totalInterestPaid} | Aval:${a.debtFreeDate.toISOString().slice(0, 7)},int₵${a.totalInterestPaid}`);
    const warn = [s.simulationWarning, a.simulationWarning].filter(Boolean).join(" | ");
    if (warn) lines.push(`DebtSimWarn:${warn}`);
  }

  lines.push(`=== PROFILE ===`);
  lines.push(`Stage:${profileParts.life_stage ?? "unk"} | Dep:${profileParts.dependents_count ?? 0} | Pri:${profileParts.financial_priority ?? "unk"} | Style:${profileParts.spending_style ?? "unk"}`);

  // Memory & Historical Insights
  lines.push(`=== USER MEMORY & HISTORICAL INSIGHTS ===`);
  if (memoryRow) {
    if (memoryRow.summary) lines.push(`Summary: ${memoryRow.summary}`);
    if (memoryRow.preferences && Object.keys(memoryRow.preferences).length > 0) {
      lines.push(`Preferences: ${JSON.stringify(memoryRow.preferences)}`);
    }
    if (Array.isArray(memoryRow.key_facts) && memoryRow.key_facts.length > 0) {
      lines.push(`Key Facts: ${memoryRow.key_facts.join(", ")}`);
    }
    
    const summaries = Array.isArray(memoryRow.session_summaries) ? memoryRow.session_summaries : [];
    // Extract cycle insights to put them at the top of the memory block
    const cycleInsights = summaries.filter(s => typeof s === 'string' && s.startsWith('[CYCLE INSIGHT')).slice(0, 3);
    if (cycleInsights.length > 0) {
      cycleInsights.forEach(ins => lines.push(String(ins)));
    }
  }

  return { text: lines.join("\n"), cycleId: cycle?.id ?? null, healthApprox, memoryRow };
}
