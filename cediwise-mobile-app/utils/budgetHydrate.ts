import type {
  BudgetCategory,
  BudgetCycle,
  BudgetState,
  BudgetTransaction,
  IncomeSource,
} from "../types/budget";
import { isOnline } from "./connectivity";
import { supabase } from "./supabase";

type HydrateResult =
  | { ok: true; hydrated: true }
  | { ok: true; hydrated: false; reason: "offline" | "no_remote_data" }
  | { ok: false; error: string };

type HydrateMode = "replace" | "merge";

const toNumber = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

export async function fetchBudgetStateRemote(
  userId: string,
): Promise<BudgetState | null> {
  // Fetch profile prefs we mirror into local budget state.
  const profileRes = await supabase
    .from("profiles")
    .select("payday_day, interests")
    .eq("id", userId)
    .maybeSingle();
  if (profileRes.error) throw profileRes.error;

  const paydayDay =
    typeof (profileRes.data as any)?.payday_day === "number"
      ? ((profileRes.data as any).payday_day as number)
      : undefined;
  const interests = Array.isArray((profileRes.data as any)?.interests)
    ? ((profileRes.data as any).interests as string[]).filter(
        (x) => typeof x === "string",
      )
    : undefined;

  // Income sources
  const incomeRes = await supabase
    .from("income_sources")
    .select(
      "id, user_id, name, type, amount, apply_deductions, created_at, updated_at",
    )
    .eq("user_id", userId);
  if (incomeRes.error) throw incomeRes.error;

  const incomeSources: IncomeSource[] = (incomeRes.data ?? []).map(
    (r: any) => ({
      id: String(r.id),
      userId: String(r.user_id),
      name: String(r.name ?? "Income"),
      type: r.type === "side" ? "side" : "primary",
      amount: Math.max(0, toNumber(r.amount)),
      applyDeductions: !!r.apply_deductions,
      createdAt: String(r.created_at ?? new Date().toISOString()),
      updatedAt: String(r.updated_at ?? new Date().toISOString()),
    }),
  );

  // Cycles
  const cyclesRes = await supabase
    .from("budget_cycles")
    .select(
      "id, user_id, start_date, end_date, payday_day, needs_pct, wants_pct, savings_pct, created_at, updated_at",
    )
    .eq("user_id", userId);
  if (cyclesRes.error) throw cyclesRes.error;

  const cycles: BudgetCycle[] = (cyclesRes.data ?? []).map((r: any) => ({
    id: String(r.id),
    userId: String(r.user_id),
    startDate: String(r.start_date),
    endDate: String(r.end_date),
    paydayDay: Math.max(
      1,
      Math.min(31, Math.floor(toNumber(r.payday_day)) || 1),
    ),
    needsPct: Math.max(0, Math.min(1, toNumber(r.needs_pct))),
    wantsPct: Math.max(0, Math.min(1, toNumber(r.wants_pct))),
    savingsPct: Math.max(0, Math.min(1, toNumber(r.savings_pct))),
    rolloverFromPrevious: { needs: 0, wants: 0, savings: 0 },
    reallocationApplied: !!r.reallocation_applied,
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  }));

  // Categories
  const catsRes = await supabase
    .from("budget_categories")
    .select(
      "id, user_id, cycle_id, bucket, name, limit_amount, is_custom, parent_id, sort_order, suggested_limit, is_archived, manual_override, created_at, updated_at",
    )
    .eq("user_id", userId);
  if (catsRes.error) throw catsRes.error;

  const categories: BudgetCategory[] = (catsRes.data ?? []).map((r: any) => ({
    id: String(r.id),
    userId: String(r.user_id),
    cycleId: String(r.cycle_id),
    bucket:
      r.bucket === "needs" || r.bucket === "wants" || r.bucket === "savings"
        ? r.bucket
        : r.bucket === "utilities"
          ? "needs"
          : "needs",
    name: String(r.name ?? "Category"),
    limitAmount: Math.max(0, toNumber(r.limit_amount)),
    isCustom: !!r.is_custom,
    parentId: r.parent_id != null ? String(r.parent_id) : null,
    sortOrder:
      typeof r.sort_order === "number" && Number.isFinite(r.sort_order)
        ? r.sort_order
        : 0,
    suggestedLimit:
      r.suggested_limit != null && Number.isFinite(Number(r.suggested_limit))
        ? Number(r.suggested_limit)
        : null,
    isArchived: !!r.is_archived,
    manualOverride: !!r.manual_override,
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  }));

  // Transactions (cap to prevent huge pulls in seed phase)
  const txRes = await supabase
    .from("budget_transactions")
    .select(
      "id, user_id, cycle_id, bucket, category_id, amount, note, occurred_at, source, created_at",
    )
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (txRes.error) throw txRes.error;

  const transactions: BudgetTransaction[] = (txRes.data ?? []).map(
    (r: any) => ({
      id: String(r.id),
      userId: String(r.user_id),
      cycleId: String(r.cycle_id),
      // Utilities are treated as part of Needs (v1). Normalize older rows.
      bucket:
        r.bucket === "needs" || r.bucket === "wants" || r.bucket === "savings"
          ? r.bucket
          : r.bucket === "utilities"
            ? "needs"
            : "needs",
      categoryId: r.category_id ? String(r.category_id) : null,
      amount: Math.max(0, toNumber(r.amount)),
      note: r.note ? String(r.note) : undefined,
      occurredAt: String(
        r.occurred_at ?? r.created_at ?? new Date().toISOString(),
      ),
      source: "manual",
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }),
  );

  // If absolutely nothing exists remotely, treat as no data.
  const hasAny =
    !!profileRes.data ||
    incomeSources.length > 0 ||
    cycles.length > 0 ||
    categories.length > 0 ||
    transactions.length > 0;
  if (!hasAny) return null;

  const next: BudgetState = {
    version: 1,
    userId,
    prefs: {
      ...(paydayDay ? { paydayDay } : {}),
      ...(interests ? { interests } : {}),
    },
    incomeSources,
    cycles,
    categories,
    transactions,
    updatedAt: new Date().toISOString(),
  };

  return next;
}

function mergeById<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of remote) map.set(item.id, item);
  // Local wins for conflicts (keeps unsynced changes visible)
  for (const item of local) map.set(item.id, item);
  return Array.from(map.values());
}

export function mergeBudgetState(
  remote: BudgetState,
  local: BudgetState,
): BudgetState {
  return {
    version: 1,
    userId: local.userId,
    // Prefer local prefs, but keep any remote keys we don't have.
    prefs: { ...remote.prefs, ...local.prefs },
    incomeSources: mergeById(remote.incomeSources, local.incomeSources),
    cycles: mergeById(remote.cycles, local.cycles),
    categories: mergeById(remote.categories, local.categories),
    transactions: mergeById(remote.transactions, local.transactions),
    updatedAt: new Date().toISOString(),
  };
}

export async function hydrateBudgetStateFromRemote(
  userId: string,
  persist: (state: BudgetState) => Promise<void>,
  options?: {
    mode?: HydrateMode;
    getLocalState?: () => Promise<BudgetState>;
  },
): Promise<HydrateResult> {
  const online = await isOnline();
  if (!online) return { ok: true, hydrated: false, reason: "offline" };

  try {
    const remote = await fetchBudgetStateRemote(userId);
    if (!remote) return { ok: true, hydrated: false, reason: "no_remote_data" };
    const mode: HydrateMode = options?.mode ?? "replace";
    if (mode === "merge" && options?.getLocalState) {
      const local = await options.getLocalState();
      await persist(mergeBudgetState(remote, local));
    } else {
      await persist(remote);
    }
    return { ok: true, hydrated: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to hydrate budget";
    return { ok: false, error: msg };
  }
}
