"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type PAYEBracket = {
  band_width: number | null;
  rate: number;
};

export type ConfigStatus = "draft" | "active" | "superseded";

export type TaxConfigRow = {
  id: string;
  country: string;
  currency: string;
  year: number;
  status: ConfigStatus;
  bracket_period: string;
  employee_ssnit_rate: number;
  employer_ssnit_rate: number;
  employer_tier2_rate: number;
  ssnit_monthly_cap: number;
  paye_brackets: PAYEBracket[];
  created_at: string;
  updated_at: string;
};

export async function listTaxConfigs(page = 1, perPage = 20) {
  const admin = createAdminClient();
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await admin
    .from("tax_config")
    .select("*", { count: "exact" })
    .order("year", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { data: (data ?? []) as TaxConfigRow[], total: count ?? 0 };
}

export async function createTaxConfig(params: {
  country: string;
  currency: string;
  year: number;
  status: ConfigStatus;
  bracket_period: string;
  employee_ssnit_rate: number;
  employer_ssnit_rate: number;
  employer_tier2_rate: number;
  ssnit_monthly_cap: number;
  paye_brackets: PAYEBracket[];
}) {
  const admin = createAdminClient();

  // If activating, supersede existing active configs for same country+year
  if (params.status === "active") {
    await admin
      .from("tax_config")
      .update({ status: "superseded" })
      .eq("country", params.country)
      .eq("status", "active");
  }

  const { data, error } = await admin
    .from("tax_config")
    .insert([params])
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/tax-config");
  return { data: data as TaxConfigRow };
}

export async function activateTaxConfig(id: string, country: string) {
  const admin = createAdminClient();

  // Supersede current active for this country
  await admin
    .from("tax_config")
    .update({ status: "superseded" })
    .eq("country", country)
    .eq("status", "active");

  // Activate this one
  const { error } = await admin
    .from("tax_config")
    .update({ status: "active" })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/tax-config");
  return { success: true };
}

export async function updateTaxConfig(id: string, params: Partial<TaxConfigRow>) {
  const admin = createAdminClient();

  // If activating, supersede others for same country
  if (params.status === "active") {
    const { data: current } = await admin.from("tax_config").select("country").eq("id", id).single();
    if (current) {
      await admin
        .from("tax_config")
        .update({ status: "superseded" })
        .eq("country", current.country)
        .eq("status", "active")
        .neq("id", id);
    }
  }

  const { data, error } = await admin
    .from("tax_config")
    .update(params)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/tax-config");
  return { data: data as TaxConfigRow };
}

export async function deleteTaxConfig(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("tax_config").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/tax-config");
  return { success: true };
}
