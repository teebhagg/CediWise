import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmailComposerDialog } from "@/components/emails/email-composer-dialog";
import { SmsComposerDialog } from "@/components/sms/sms-composer-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPrimaryContact, isCediwisePhoneUser } from "@/lib/utils/users";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserProfileForm } from "./user-profile-form";
import { UserPushComposer } from "./user-push-composer";

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

  const { data: sub } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();

  const { data: pushDevices } = await admin
    .from("push_devices")
    .select("platform, app_version, device_label, is_active, last_seen_at, expo_push_token")
    .eq("user_id", id)
    .order("last_seen_at", { ascending: false });

  const { count: completedLessonCount } = await admin
    .from("user_lesson_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", id)
    .not("completed_at", "is", null);

  const { data: recentProgress } = await admin
    .from("user_lesson_progress")
    .select("lesson_id, completed_at")
    .eq("user_id", id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(5);

  const recentLessonIds = [...new Set((recentProgress ?? []).map((r) => r.lesson_id))];
  const { data: recentLessons } =
    recentLessonIds.length > 0
      ? await admin.from("lessons").select("id, title, module").in("id", recentLessonIds)
      : { data: [] as { id: string; title: string; module: string }[] };

  const lessonMeta = new Map((recentLessons ?? []).map((l) => [l.id, l]));

  const { data: subActivity } = await admin
    .from("subscription_activity_log")
    .select("id, event_type, from_tier, to_tier, from_status, to_status, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(8);

  const announcementsEnabled = process.env.ENABLE_ADMIN_ANNOUNCEMENTS !== "false";
  const hasActivePushDevice = (pushDevices ?? []).some((d) => (d as { is_active?: boolean }).is_active);

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
  const isPhoneAuth = isCediwisePhoneUser(user.email ?? null);

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
        <div className="ml-auto flex gap-2">
          {isPhoneAuth && (user.phone || primary) ? (
            <SmsComposerDialog
              triggerLabel="Send SMS"
              triggerVariant="default"
              triggerSize="default"
              recipients={[{ userId: user.id, phone: user.phone ?? primary, name: name ?? undefined }]}
              audienceType="single"
              source="user_profile"
              title="SMS user"
              description="Send an SMS directly to this user."
            />
          ) : user.email && !isPhoneAuth ? (
            <EmailComposerDialog
              triggerLabel="Send Email"
              triggerVariant="default"
              triggerSize="default"
              recipients={[{ userId: user.id, email: user.email ?? "", name: name ?? undefined }]}
              lockedRecipients={true}
              audienceType="single"
              source="user_profile"
              title="Email user"
              description="Send a branded email directly to this user."
            />
          ) : (
            <Button variant="ghost" disabled>
              No contact on file
            </Button>
          )}
        </div>
      </div>

      {announcementsEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Push notification</CardTitle>
            <CardDescription>
              Send a one-off push to this user&apos;s active devices (same pipeline as broadcast
              announcements).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserPushComposer userId={id} hasActiveDevice={hasActivePushDevice} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Mobile devices</CardTitle>
          <CardDescription>Registered push tokens from the mobile app.</CardDescription>
        </CardHeader>
        <CardContent>
          {!pushDevices?.length ? (
            <p className="text-sm text-muted-foreground">No devices registered.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {(pushDevices as Record<string, unknown>[]).map((row) => {
                const token = String(row.expo_push_token ?? "");
                const shortTok =
                  token.length > 14 ? `${token.slice(0, 8)}…${token.slice(-4)}` : token;
                return (
                  <li
                    key={String(row.expo_push_token)}
                    className="rounded-lg border border-border/80 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={row.is_active ? "default" : "secondary"}>
                        {row.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <span className="font-medium">
                        {String(row.platform ?? "unknown")} · v{String(row.app_version ?? "?")}
                      </span>
                    </div>
                    {row.device_label ? (
                      <p className="text-muted-foreground mt-1 text-xs">{String(row.device_label)}</p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 font-mono text-xs">{shortTok}</p>
                    {row.last_seen_at ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Last seen{" "}
                        {new Date(String(row.last_seen_at)).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learning</CardTitle>
          <CardDescription>Lesson completions for this user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Completed lessons: </span>
            <span className="font-semibold tabular-nums">{completedLessonCount ?? 0}</span>
          </p>
          {(recentProgress ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed lessons yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(recentProgress ?? []).map((row) => {
                const meta = lessonMeta.get(row.lesson_id);
                const label = meta?.title ?? row.lesson_id;
                return (
                  <li key={`${row.lesson_id}-${row.completed_at}`} className="flex flex-col gap-0.5">
                    <span className="font-medium">{label}</span>
                    {meta?.module ? (
                      <span className="text-muted-foreground text-xs">Module {meta.module}</span>
                    ) : null}
                    <span className="text-muted-foreground text-xs">
                      {row.completed_at
                        ? new Date(row.completed_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {(subActivity ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription activity</CardTitle>
            <CardDescription>Recent plan and status changes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(subActivity as Record<string, unknown>[]).map((ev) => (
                <li key={String(ev.id)} className="border-b border-border/60 pb-2 last:border-0">
                  <div className="font-medium">{formatLabel(String(ev.event_type ?? ""))}</div>
                  <div className="text-muted-foreground text-xs">
                    {ev.from_tier != null || ev.to_tier != null ? (
                      <span>
                        {String(ev.from_tier ?? "—")} → {String(ev.to_tier ?? "—")}
                      </span>
                    ) : null}
                    {ev.created_at
                      ? ` · ${new Date(String(ev.created_at)).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}`
                      : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Current plan and billing status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Tier: </span>
              <Badge
                variant={
                  (sub?.plan as string) === "sme"
                    ? "default"
                    : (sub?.plan as string) === "budget"
                      ? "secondary"
                      : "outline"
                }
              >
                {String(sub?.plan ?? "free").toUpperCase()}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Status: </span>
              <Badge
                variant={
                  (sub?.status as string) === "active"
                    ? "default"
                    : (sub?.status as string) === "trial"
                      ? "secondary"
                      : "destructive"
                }
              >
                {String(sub?.status ?? "active")}
              </Badge>
            </div>
            {sub?.trial_ends_at && (
              <div>
                <span className="text-muted-foreground">Trial ends: </span>
                <span>
                  {new Date(sub.trial_ends_at as string).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })}
                </span>
              </div>
            )}
            {sub?.pending_tier && (
              <div>
                <span className="text-muted-foreground">Pending: </span>
                <span>
                  {String(sub.pending_tier)}
                  {sub?.pending_tier_start_date
                    ? ` (effective ${new Date(sub.pending_tier_start_date as string).toLocaleDateString()})`
                    : ""}
                </span>
              </div>
            )}
            {sub?.cancel_at_period_end && (
              <div>
                <span className="text-muted-foreground">Cancel at period end: </span>
                <Badge variant="destructive">Yes</Badge>
              </div>
            )}
            {sub?.paystack_subscription_code && (
              <div>
                <span className="text-muted-foreground">Paystack code: </span>
                <span className="font-mono text-xs">
                  {String(sub.paystack_subscription_code)}
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
