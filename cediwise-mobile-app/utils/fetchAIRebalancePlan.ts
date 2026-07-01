import type { BudgetCategory } from "@/types/budget";
import type { BudgetPlanValidationResult } from "@/utils/budgetPlanValidation";
import type { RebalanceContext, AIRebalanceResult } from "@/utils/budgetRebalance";
import { isCategoryRelevantForProfile } from "@/utils/categoryProfileRelevance";
import { getStoredAuthData, refreshStoredSession } from "@/utils/auth";
import { supabase } from "@/utils/supabase";
import { log } from "@/utils/logger";

export type FetchAIRebalancePlanParams = {
  categories: BudgetCategory[];
  validation: BudgetPlanValidationResult;
  context: RebalanceContext;
  lockedCategoryIds?: Set<string>;
  proposedByCategoryId?: Map<string, number>;
  mergeIntoWinner?: Map<string, string>;
};

async function resolveAccessToken(): Promise<string | null> {
  await refreshStoredSession();
  const s = await getStoredAuthData();
  return s?.accessToken ?? null;
}

function isRpcErrorPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return typeof p.error === "string" || typeof p.detail === "string";
}

function rpcErrorMessage(payload: unknown, fallback?: string): string {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.detail === "string") return p.detail;
    if (typeof p.error === "string") return p.error;
  }
  return fallback ?? "ai_rebalance_failed";
}

/**
 * AI allocation for flexible categories after recurring bills are anchored.
 * Falls back silently if the edge function is unavailable.
 */
export async function fetchAIRebalancePlan(
  params: FetchAIRebalancePlanParams,
): Promise<AIRebalanceResult | null> {
  const token = await resolveAccessToken();
  if (!token || !supabase) return null;

  const spentByCategoryId = params.context.spentByCategoryId ?? {};
  const locked = params.lockedCategoryIds ?? new Set<string>();
  const proposed = params.proposedByCategoryId;
  const mergeIntoWinner = params.mergeIntoWinner;
  const profileCtx = {
    lifeStage: params.context.lifeStage ?? null,
    spendingStyle: params.context.spendingStyle ?? null,
    financialPriority: params.context.financialPriority ?? null,
    interests: params.context.interests,
    spentByCategoryId: params.context.spentByCategoryId,
    lockedCategoryIds: locked,
  };

  const irrelevantCategoryIds = params.categories
    .filter(
      (c) =>
        !locked.has(c.id) &&
        !isCategoryRelevantForProfile(c.name, c.bucket, profileCtx, c),
    )
    .map((c) => c.id);

  const body = {
    takeHome: params.validation.takeHome,
    overflow: Math.max(
      0,
      (proposed
        ? Array.from(proposed.values()).reduce((s, v) => s + v, 0)
        : params.validation.totalPlanned) - params.validation.takeHome,
    ),
    bucketEnvelopes: {
      needs: params.validation.buckets.needs.envelope,
      wants: params.validation.buckets.wants.envelope,
      savings: params.validation.buckets.savings.envelope,
    },
    categories: params.categories.map((c) => ({
      id: c.id,
      name: c.name,
      bucket: c.bucket,
      limit: proposed?.get(c.id) ?? c.limitAmount,
      currentLimit: c.limitAmount,
      manualOverride: c.manualOverride,
      locked: locked.has(c.id),
      spent: spentByCategoryId[c.id] ?? 0,
    })),
    lockedCategoryIds: Array.from(locked),
    irrelevantCategoryIds,
    duplicateMerges: params.categories
      .filter((c) => mergeIntoWinner?.has(c.id))
      .map((c) => ({
        categoryId: c.id,
        mergeInto: mergeIntoWinner?.get(c.id),
        name: c.name,
      })),
    preferences: {
      lifeStage: params.context.lifeStage ?? null,
      spendingStyle: params.context.spendingStyle ?? null,
      financialPriority: params.context.financialPriority ?? null,
      interests: params.context.interests ?? [],
    },
  };

  try {
    const { data, error } = await supabase.functions.invoke("ai-rebalance-plan", {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = data;
    if (error || isRpcErrorPayload(payload)) {
      log.warn(
        "[rebalance] AI plan unavailable",
        rpcErrorMessage(payload, error?.message),
      );
      return null;
    }

    if (!payload?.adjustments) {
      log.warn("[rebalance] AI plan empty response", payload);
      return null;
    }

    const adjustments = (payload.adjustments as unknown[])
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        const categoryId = String(r.category_id ?? r.categoryId ?? "");
        const proposedLimit = Number(r.proposed_limit ?? r.proposedLimit);
        if (!categoryId || !Number.isFinite(proposedLimit)) return null;
        if (locked.has(categoryId)) return null;
        return { categoryId, proposedLimit };
      })
      .filter((x): x is { categoryId: string; proposedLimit: number } => !!x);

    if (adjustments.length === 0) return null;

    return {
      adjustments,
      rationale:
        typeof payload.rationale === "string" ? payload.rationale : undefined,
    };
  } catch (e) {
    log.warn("[rebalance] AI plan failed", e);
    return null;
  }
}
