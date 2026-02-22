"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type TbillRateRow = {
  id: string;
  tenor: string;
  rate: number;
  fetched_at: string;
  source_snapshot_id: string | null;
};

export type ListTbillRatesResult = { data: TbillRateRow[]; total: number };

export async function listTbillRates(
  page = 1,
  perPage = 20
): Promise<ListTbillRatesResult> {
  const admin = createAdminClient();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  const { data, error, count } = await admin
    .from("live_tbill_rates")
    .select("*", { count: "exact" })
    .order("fetched_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error(error.message);
  const total = count ?? (data ?? []).length;
  return { data: (data ?? []) as TbillRateRow[], total };
}

export async function createTbillRate(
  tenor: string,
  rate: number,
  sourceSnapshotId?: string
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("live_tbill_rates").insert({
    tenor,
    rate,
    fetched_at: new Date().toISOString(),
    source_snapshot_id: sourceSnapshotId ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/learning-data");
  revalidatePath("/learning-data/tbill-rates");
  return {};
}
