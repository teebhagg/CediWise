"use server";

import { fetchDashboardKpis } from "@/lib/actions/dashboard";
import { fetchSubscriptionMetrics } from "@/lib/actions/subscriptions";

export type DashboardAlert = {
  level: "warning" | "info";
  message: string;
  href?: string;
};

const PENDING_FEEDBACK_WARN = 5;

export async function fetchDashboardAlerts(): Promise<DashboardAlert[]> {
  const alerts: DashboardAlert[] = [];
  try {
    const [kpis, subs] = await Promise.all([
      fetchDashboardKpis(),
      fetchSubscriptionMetrics(),
    ]);

    if (kpis.pendingFeedback >= PENDING_FEEDBACK_WARN) {
      alerts.push({
        level: "warning",
        message: `${kpis.pendingFeedback} lesson feedback item(s) need attention.`,
        href: "/learning-data/feedback",
      });
    }

    if (subs.earlyBirdUsed >= subs.earlyBirdTotal && subs.earlyBirdTotal > 0) {
      alerts.push({
        level: "info",
        message: "Early bird allocation is full.",
        href: "/users",
      });
    }
  } catch {
    // Non-fatal: omit alerts if metrics fail
  }
  return alerts;
}
