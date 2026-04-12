"use server";

import { getCachedAuthUsers } from "@/lib/data/auth-users";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CompletionsByDay,
  CompletionsByModule,
  DashboardKpis,
  ProfileBreakdown,
  RecentUser,
  RegistrationsByDay,
  UserMetrics,
} from "@/lib/types/dashboard";

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  try {
    const admin = createAdminClient();
    const users = await getCachedAuthUsers();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [lessonsRes, progressRes, feedbackRes] = await Promise.all([
      admin.from("lessons").select("id", { count: "exact", head: true }),
      admin
        .from("user_lesson_progress")
        .select("id", { count: "exact", head: true })
        .not("completed_at", "is", null)
        .gte("completed_at", weekAgo.toISOString()),
      admin
        .from("lesson_feedback")
        .select("id", { count: "exact", head: true })
        .eq("is_resolved", false),
    ]);

    const completionsThisWeek = progressRes.count ?? 0;

    return {
      usersCount: users.length,
      lessonsCount: lessonsRes.count ?? 0,
      completionsThisWeek,
      pendingFeedback: feedbackRes.count ?? 0,
    };
  } catch {
    return {
      usersCount: 0,
      lessonsCount: 0,
      completionsThisWeek: 0,
      pendingFeedback: 0,
    };
  }
}

/** Lesson completions in the last 7 days vs the prior 7 days (for WoW trends). */
export async function fetchCompletionsWeekOverWeek(): Promise<{
  current: number;
  previous: number;
}> {
  try {
    const admin = createAdminClient();
    const now = new Date();
    const thisStart = new Date(now);
    thisStart.setDate(thisStart.getDate() - 7);
    const prevStart = new Date(now);
    prevStart.setDate(prevStart.getDate() - 14);

    const [curRes, prevRes] = await Promise.all([
      admin
        .from("user_lesson_progress")
        .select("id", { count: "exact", head: true })
        .not("completed_at", "is", null)
        .gte("completed_at", thisStart.toISOString()),
      admin
        .from("user_lesson_progress")
        .select("id", { count: "exact", head: true })
        .not("completed_at", "is", null)
        .gte("completed_at", prevStart.toISOString())
        .lt("completed_at", thisStart.toISOString()),
    ]);

    return {
      current: curRes.count ?? 0,
      previous: prevRes.count ?? 0,
    };
  } catch {
    return { current: 0, previous: 0 };
  }
}

export async function fetchCompletionsByDay(
  days = 14
): Promise<CompletionsByDay> {
  try {
    const admin = createAdminClient();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const { data } = await admin
      .from("user_lesson_progress")
      .select("completed_at")
      .not("completed_at", "is", null)
      .gte("completed_at", start.toISOString());

    const byDate = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      byDate.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of data ?? []) {
      const date = (row.completed_at as string)?.slice(0, 10);
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

export async function fetchCompletionsByModule(): Promise<CompletionsByModule> {
  try {
    const admin = createAdminClient();
    const { data: progress } = await admin
      .from("user_lesson_progress")
      .select("lesson_id")
      .not("completed_at", "is", null);

    const lessonIds = [...new Set((progress ?? []).map((p) => p.lesson_id))];
    if (lessonIds.length === 0) {
      return [];
    }

    const { data: lessons } = await admin
      .from("lessons")
      .select("id, module")
      .in("id", lessonIds);

    const moduleCounts = new Map<string, number>();
    const lessonToModule = new Map(
      (lessons ?? []).map((l) => [l.id, l.module])
    );
    for (const p of progress ?? []) {
      const mod = lessonToModule.get(p.lesson_id) ?? "Unknown";
      moduleCounts.set(mod, (moduleCounts.get(mod) ?? 0) + 1);
    }
    return Array.from(moduleCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([module, count]) => ({ module, count }));
  } catch {
    return [];
  }
}

export async function fetchUserMetrics(): Promise<UserMetrics> {
  try {
    const admin = createAdminClient();
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const users = await getCachedAuthUsers();
    const userIds = users.map((u) => u.id);
    const totalUsers = userIds.length;

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, setup_completed")
      .in("id", userIds);

    const profileRows = profiles ?? [];
    const profileIds = new Set(profileRows.map((p) => p.id));
    const setupCompletedIds = new Set(
      profileRows
        .filter((p) => (p as { setup_completed?: boolean }).setup_completed)
        .map((p) => p.id)
    );

    let newUsersThisWeek = 0;
    let newUsersThisMonth = 0;
    for (const u of users) {
      const created = new Date(u.created_at);
      if (created >= weekAgo) newUsersThisWeek++;
      if (created >= monthAgo) newUsersThisMonth++;
    }

    return {
      totalUsers,
      usersWithProfiles: profileIds.size,
      usersWithoutProfiles: totalUsers - profileIds.size,
      newUsersThisWeek,
      newUsersThisMonth,
      setupCompletedCount: setupCompletedIds.size,
    };
  } catch {
    return {
      totalUsers: 0,
      usersWithProfiles: 0,
      usersWithoutProfiles: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0,
      setupCompletedCount: 0,
    };
  }
}

export async function fetchRegistrationsByDay(
  days = 30
): Promise<RegistrationsByDay> {
  try {
    const users = await getCachedAuthUsers();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const byDate = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      byDate.set(d.toISOString().slice(0, 10), 0);
    }
    for (const u of users) {
      const date = u.created_at?.slice(0, 10);
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

export async function fetchProfileBreakdown(): Promise<ProfileBreakdown> {
  try {
    const metrics = await fetchUserMetrics();
    if (metrics.totalUsers === 0) return [];
    const colors = [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ];
    const profileIncomplete =
      metrics.usersWithProfiles - metrics.setupCompletedCount;
    return [
      {
        name: "Setup completed",
        value: metrics.setupCompletedCount,
        fill: colors[0],
      },
      {
        name: "Profile incomplete",
        value: profileIncomplete,
        fill: colors[1],
      },
      {
        name: "No profile",
        value: metrics.usersWithoutProfiles,
        fill: colors[2],
      },
    ].filter((d) => d.value > 0);
  } catch {
    return [];
  }
}

export async function fetchRecentUsers(limit = 10): Promise<RecentUser[]> {
  try {
    const admin = createAdminClient();
    const allUsers = await getCachedAuthUsers();
    const users = [...allUsers]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
    const userIds = users.map((u) => u.id);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, setup_completed")
      .in("id", userIds);
    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          setupCompleted: !!(p as { setup_completed?: boolean })
            .setup_completed,
        },
      ])
    );
    return users.map((u) => {
      const p = profileMap.get(u.id);
      const meta = (u as { user_metadata?: Record<string, unknown> })
        .user_metadata;
      const name =
        (meta?.full_name as string) ?? (meta?.name as string) ?? null;
      return {
        id: u.id,
        email: u.email ?? null,
        phone: u.phone ?? null,
        name: name ?? null,
        hasProfile: !!p,
        setupCompleted: p?.setupCompleted ?? false,
        createdAt: u.created_at,
      };
    });
  } catch {
    return [];
  }
}
