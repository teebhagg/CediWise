import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPrimaryContact } from "@/lib/utils/users";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserProfileForm } from "./user-profile-form";

function formatLabel(s: string): string {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\s+/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(id);

  if (authError || !authUser?.user) notFound();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const user = authUser.user as {
    id: string;
    email?: string | null;
    phone?: string | null;
    created_at: string;
    last_sign_in_at?: string | null;
    user_metadata?: Record<string, unknown>;
  };
  const name =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    null;
  const { primary, secondary } = getPrimaryContact(user.email ?? null, user.phone ?? null);

  const p = profile as Record<string, unknown> | null;
  const profileDetails: { label: string; value: string | number | null }[] = [
    { label: "Life stage", value: (p?.life_stage as string) ?? null },
    { label: "Dependents", value: (p?.dependents_count as number) ?? null },
    { label: "Income frequency", value: (p?.income_frequency as string) ?? null },
    { label: "Spending style", value: (p?.spending_style as string) ?? null },
    { label: "Financial priority", value: (p?.financial_priority as string) ?? null },
    { label: "Side income (GHS)", value: (p?.side_income as number) ?? null },
    { label: "Tithe/Remittance (GHS)", value: (p?.tithe_remittance as number) ?? null },
    { label: "Utilities total (GHS)", value: (p?.utilities_total as number) ?? null },
    { label: "Primary goal", value: (p?.primary_goal as string) ?? null },
    { label: "Strategy", value: (p?.strategy as string) ?? null },
  ].filter((d) => d.value != null && d.value !== "");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="icon">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {name ?? primary}
          </h1>
          <p className="text-muted-foreground text-sm">
            {secondary ? `${secondary} · ` : ""}
            {user.id}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Auth and sign-in details for this user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Primary contact: </span>
              <span className="font-medium">{primary}</span>
            </div>
            {secondary && (
              <div>
                <span className="text-muted-foreground">Secondary: </span>
                <span>{secondary}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span>
                {new Date(user.created_at).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
              </span>
            </div>
            {user.last_sign_in_at && (
              <div>
                <span className="text-muted-foreground">Last sign-in: </span>
                <span>
                  {new Date(user.last_sign_in_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Edit budget and personalization settings for this user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserProfileForm
            userId={id}
            initialData={{
              paydayDay: (p?.payday_day as number) ?? null,
              setupCompleted: !!(p?.setup_completed),
              stableSalary: Number(p?.stable_salary ?? 0),
              rent: Number(p?.rent ?? 0),
            }}
          />
        </CardContent>
      </Card>

      {profileDetails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional profile details</CardTitle>
            <CardDescription>
              Read-only personalization and budget preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {profileDetails.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">{formatLabel(label)}</dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
