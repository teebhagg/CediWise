"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { TIER_PRICES, EARLY_BIRD_SLOTS_TOTAL } from "@/lib/constants/pricing";
import type {
  SubscriptionMetrics,
  TierDistribution,
  SubscriptionActivityEntry,
  SubscriptionActivityByDay,
} from "@/lib/types/dashboard";

const ZERO_METRICS: SubscriptionMetrics = {
  totalSubscriptions: 0,
  freeCount: 0,
  budgetCount: 0,
  smeCount: 0,
  trialCount: 0,
  paidActiveCount: 0,
  earlyBirdUsed: 0,
  earlyBirdTotal: EARLY_BIRD_SLOTS_TOTAL,
  mrr: 0,
  projectedArr: 0,
};

export async function fetchSubscriptionMetrics(): Promise<SubscriptionMetrics> {
  try {
    const admin = createAdminClient();

    const { data: subs } = await admin
      .from("subscriptions")
      .select("plan, status, pending_tier");

    const rows = subs ?? [];
    const freeCount = rows.filter((r) => r.plan === "free").length;
    const budgetCount = rows.filter((r) => r.plan === "budget").length;
    const smeCount = rows.filter((r) => r.plan === "sme").length;
    const trialCount = rows.filter((r) => r.status === "trial").length;
    const paidActiveCount = rows.filter(
      (r) => r.status === "active" && r.plan !== "free"
    ).length;

    // Early bird: count trials + paid subs (users who got the trial)
    const earlyBirdUsed = rows.filter(
      (r) => r.plan !== "free" || r.status === "trial"
    ).length;

    // MRR: sum prices for active paid subs
    const mrr = rows
      .filter((r) => r.status === "active" && r.plan !== "free")
      .reduce((sum, r) => sum + (TIER_PRICES[r.plan] ?? 0), 0);

    return {
      totalSubscriptions: rows.length,
      freeCount,
      budgetCount,
      smeCount,
      trialCount,
      paidActiveCount,
      earlyBirdUsed,
      earlyBirdTotal: EARLY_BIRD_SLOTS_TOTAL,
      mrr,
      projectedArr: mrr * 12,
    };
  } catch {
    return ZERO_METRICS;
  }
}

export async function fetchTierDistribution(): Promise<TierDistribution> {
  const metrics = await fetchSubscriptionMetrics();
  if (metrics.totalSubscriptions === 0) return [];

  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];
  return [
    { name: "Free", value: metrics.freeCount, fill: colors[0] },
    { name: "Budget", value: metrics.budgetCount, fill: colors[1] },
    { name: "SME", value: metrics.smeCount, fill: colors[2] },
  ].filter((d) => d.value > 0);
}

export async function fetchSubscriptionActivityLog(
  page = 1,
  perPage = 20,
  eventTypeFilter?: string
): Promise<{ entries: SubscriptionActivityEntry[]; total: number }> {
  try {
    const admin = createAdminClient();

    let query = admin
      .from("subscription_activity_log")
      .select(
        "id, user_id, event_type, from_tier, to_tier, from_status, to_status, metadata, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (eventTypeFilter && eventTypeFilter !== "all") {
      query = query.eq("event_type", eventTypeFilter);
    }

    const { data, count } = await query;
    const userIds = [...new Set((data ?? []).map((r) => r.user_id))];

    const userMap = new Map<string, { name: string | null; email: string | null }>();
    if (userIds.length > 0) {
      try {
        await Promise.all(
          userIds.map(async (uid) => {
            const { data: authData } = await admin.auth.admin.getUserById(uid);
            const u = authData?.user;
            if (!u) return;
            const meta = u.user_metadata as Record<string, unknown> | undefined;
            const name =
              (meta?.full_name as string) ??
              (meta?.name as string) ??
              (u.phone ? u.phone : null);
            userMap.set(u.id, { name, email: u.email ?? null });
          })
        );
      } catch {
        // Auth fetch failed — continue without user names
      }
    }

    const entries: SubscriptionActivityEntry[] = (data ?? []).map((r) => {
      const user = userMap.get(r.user_id);
      return {
        id: r.id,
        userId: r.user_id,
        userName: user?.name ?? null,
        userEmail: user?.email ?? null,
        eventType: r.event_type,
        fromTier: r.from_tier,
        toTier: r.to_tier,
        fromStatus: r.from_status,
        toStatus: r.to_status,
        createdAt: r.created_at,
        metadata: (r.metadata as Record<string, unknown>) ?? null,
      };
    });

    return { entries, total: count ?? 0 };
  } catch {
    return { entries: [], total: 0 };
  }
}

export async function fetchSubscriptionActivityByDay(
  days = 30
): Promise<SubscriptionActivityByDay> {
  try {
    const admin = createAdminClient();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const { data } = await admin
      .from("subscription_activity_log")
      .select("created_at")
      .gte("created_at", start.toISOString());

    const byDate = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      byDate.set(d.toISOString().slice(0, 10), 0);
    }

    for (const row of data ?? []) {
      const date = (row.created_at as string)?.slice(0, 10);
      if (date && byDate.has(date)) {
        byDate.set(date, (byDate.get(date) ?? 0) + 1);
      }
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  } catch {
    return [];
  }
}
