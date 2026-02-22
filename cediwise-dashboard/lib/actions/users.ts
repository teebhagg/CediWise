"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type UserWithProfile = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  createdAt: string;
  lastSignInAt: string | null;
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
};

export type ListUsersResult = {
  users: UserWithProfile[];
  total: number;
};

export async function listUsersWithProfiles(
  page = 1,
  perPage = 20
): Promise<ListUsersResult> {
  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.listUsers(
    { perPage: 1000 }
  );

  if (authError) throw new Error(authError.message);

  const allUsers = authData.users;
  const total = allUsers.length;
  const start = (page - 1) * perPage;
  const paginatedUsers = allUsers.slice(start, start + perPage);
  const userIds = paginatedUsers.map((u) => u.id);

  const { data: profiles } = await admin
    .from("profiles")
    .select(
      "id, setup_completed, payday_day, stable_salary, rent, side_income, tithe_remittance, life_stage, dependents_count, income_frequency, spending_style, financial_priority"
    )
    .in("id", userIds);

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

  const users: UserWithProfile[] = paginatedUsers.map((u) => {
    const meta = (u as { user_metadata?: Record<string, unknown> })
      .user_metadata;
    const name = (meta?.full_name as string) ?? (meta?.name as string) ?? null;
    const lastSignIn =
      (u as { last_sign_in_at?: string }).last_sign_in_at ?? null;
    return {
      id: u.id,
      email: u.email ?? null,
      phone: u.phone ?? null,
      name: name ?? null,
      createdAt: u.created_at,
      lastSignInAt: lastSignIn ?? null,
      profile: profileMap.get(u.id) ?? null,
    };
  });

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
