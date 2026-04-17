"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  isInactiveByDays,
  resolveLastActiveAt,
  resolveVersionStatus,
} from "@/lib/utils/user-filters";
import { revalidatePath } from "next/cache";

export type UserWithProfile = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  lastActiveAt: string | null;
  deviceAppVersion: string | null;
  devicePlatform: "ios" | "android" | null;
  versionStatus: "outdated" | "current" | "unknown";
  profile: {
    setupCompleted: boolean;
    paydayDay: number | null;
    stableSalary: number;
    rent: number;
    sideIncome: number;
    titheRemittance: number;
    lifeStage: string | null;
    dependentsCount: number;
    incomeFrequency: string;
    spendingStyle: string | null;
    financialPriority: string | null;
  } | null;
  subscription: {
    tier: string;
    status: string;
    trialEndsAt: string | null;
    pendingTier: string | null;
    monthlyPrice: number;
  } | null;
};

export type UsersListFilters = {
  search?: string;
  profileStatus?: "all" | "complete" | "incomplete" | "missing";
  tier?: "all" | "free" | "budget" | "sme";
  subscriptionStatus?: "all" | "active" | "trial" | "expired" | "canceled";
  inactiveDays?: 15 | 30 | 45 | 60 | 75 | 90;
  versionStatus?: "all" | "outdated" | "current" | "unknown";
};

export type ListUsersResult = {
  users: UserWithProfile[];
  total: number;
};

type PushDeviceRow = {
  user_id: string;
  platform: "ios" | "android";
  app_version: string | null;
  last_seen_at: string;
};

type AppVersionRow = {
  platform: "ios" | "android";
  version: string;
};

export async function listUsersWithProfiles(
  page = 1,
  perPage = 20,
  filters: UsersListFilters = {}
): Promise<ListUsersResult> {
  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.listUsers(
    { perPage: 1000 }
  );

  if (authError) throw new Error(authError.message);

  const authUsers = authData.users;
  const userIds = authUsers.map((u) => u.id);

  const { data: profiles } = await admin
    .from("profiles")
    .select(
      "id, setup_completed, payday_day, stable_salary, rent, side_income, tithe_remittance, life_stage, dependents_count, income_frequency, spending_style, financial_priority"
    )
    .in("id", userIds);

  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, plan, status, trial_ends_at, pending_tier")
    .in("user_id", userIds);

  const { data: pushDevices } = await admin
    .from("push_devices")
    .select("user_id, platform, app_version, last_seen_at")
    .in("user_id", userIds)
    .eq("is_active", true)
    .order("last_seen_at", { ascending: false });

  const { data: activeAppVersions } = await admin
    .from("app_versions")
    .select("platform, version")
    .eq("is_active", true)
    .in("platform", ["ios", "android"]);

  const subscriptionMap = new Map(
    (subs ?? []).map((s) => [
      (s as Record<string, unknown>).user_id as string,
      {
        tier: ((s as Record<string, unknown>).plan as string) ?? "free",
        status: ((s as Record<string, unknown>).status as string) ?? "active",
        trialEndsAt: (s as Record<string, unknown>).trial_ends_at as string | null,
        pendingTier: (s as Record<string, unknown>).pending_tier as string | null,
        monthlyPrice: 0,
      },
    ])
  );

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        setupCompleted: !!(p as Record<string, unknown>).setup_completed,
        paydayDay: (p as Record<string, unknown>).payday_day as number | null,
        stableSalary: Number((p as Record<string, unknown>).stable_salary ?? 0),
        rent: Number((p as Record<string, unknown>).rent ?? 0),
        sideIncome: Number((p as Record<string, unknown>).side_income ?? 0),
        titheRemittance: Number(
          (p as Record<string, unknown>).tithe_remittance ?? 0
        ),
        lifeStage: (p as Record<string, unknown>).life_stage as string | null,
        dependentsCount: Number(
          (p as Record<string, unknown>).dependents_count ?? 0
        ),
        incomeFrequency:
          ((p as Record<string, unknown>).income_frequency as string) ??
          "monthly",
        spendingStyle: (p as Record<string, unknown>).spending_style as
          | string
          | null,
        financialPriority: (p as Record<string, unknown>).financial_priority as
          | string
          | null,
      },
    ])
  );

  const latestDeviceMap = new Map<string, PushDeviceRow>();
  for (const device of (pushDevices ?? []) as PushDeviceRow[]) {
    if (!latestDeviceMap.has(device.user_id)) {
      latestDeviceMap.set(device.user_id, device);
    }
  }

  const activeVersionMap = new Map(
    ((activeAppVersions ?? []) as AppVersionRow[]).map((row) => [
      row.platform,
      row.version,
    ])
  ) as Map<"ios" | "android", string>;

  let filteredUsers: UserWithProfile[] = authUsers.map((u) => {
    const meta = (u as { user_metadata?: Record<string, unknown> })
      .user_metadata;
    const name = (meta?.full_name as string) ?? (meta?.name as string) ?? null;
    const lastSignIn =
      (u as { last_sign_in_at?: string }).last_sign_in_at ?? null;
    const latestDevice = latestDeviceMap.get(u.id);
    const devicePlatform = latestDevice?.platform ?? null;
    const deviceAppVersion = latestDevice?.app_version ?? null;
    const lastActiveAt = resolveLastActiveAt(
      latestDevice?.last_seen_at ?? null,
      lastSignIn ?? null
    );
    return {
      id: u.id,
      email: u.email ?? null,
      phone: u.phone ?? null,
      name: name ?? null,
      createdAt: u.created_at,
      lastSignInAt: lastSignIn ?? null,
      lastActiveAt,
      deviceAppVersion,
      devicePlatform,
      versionStatus: resolveVersionStatus(
        deviceAppVersion,
        devicePlatform,
        activeVersionMap
      ),
      profile: profileMap.get(u.id) ?? null,
      subscription: subscriptionMap.get(u.id) ?? null,
    };
  });

  const search = filters.search?.trim();
  if (search && search.length >= 3) {
    const q = search.toLowerCase();
    filteredUsers = filteredUsers.filter((u) => {
      const email = u.email?.toLowerCase() ?? "";
      const phone = u.phone?.toLowerCase() ?? "";
      const name = (u.name ?? "").toLowerCase();
      const id = u.id.toLowerCase();

      return email.includes(q) || phone.includes(q) || name.includes(q) || id.includes(q);
    });
  }

  if (filters.profileStatus && filters.profileStatus !== "all") {
    filteredUsers = filteredUsers.filter((u) => {
      if (filters.profileStatus === "missing") return u.profile === null;
      if (filters.profileStatus === "complete") return u.profile?.setupCompleted === true;
      return u.profile !== null && u.profile.setupCompleted === false;
    });
  }

  if (filters.tier && filters.tier !== "all") {
    filteredUsers = filteredUsers.filter((u) => {
      const tier = u.subscription?.tier ?? "free";
      return tier === filters.tier;
    });
  }

  if (filters.subscriptionStatus && filters.subscriptionStatus !== "all") {
    filteredUsers = filteredUsers.filter(
      (u) => u.subscription?.status === filters.subscriptionStatus
    );
  }

  if (filters.versionStatus && filters.versionStatus !== "all") {
    filteredUsers = filteredUsers.filter(
      (u) => u.versionStatus === filters.versionStatus
    );
  }

  if (filters.inactiveDays) {
    filteredUsers = filteredUsers.filter((u) =>
      isInactiveByDays(u.lastActiveAt, filters.inactiveDays)
    );
  }

  const total = filteredUsers.length;
  const start = (page - 1) * perPage;
  const users = filteredUsers.slice(start, start + perPage);

  return { users, total };
}

export type ProfileUpdate = {
  paydayDay?: number | null;
  setupCompleted?: boolean;
  stableSalary?: number;
  rent?: number;
};

export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.paydayDay !== undefined)
    row.payday_day =
      updates.paydayDay === null || updates.paydayDay === undefined
        ? null
        : updates.paydayDay;
  if (updates.setupCompleted !== undefined)
    row.setup_completed = updates.setupCompleted;
  if (updates.stableSalary !== undefined)
    row.stable_salary = updates.stableSalary;
  if (updates.rent !== undefined) row.rent = updates.rent;

  const payload = { id: userId, ...row };
  const { error } = await admin
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) return { error: error.message };
  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  return {};
}
