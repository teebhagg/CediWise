/**
 * Paystack webhook handler.
 * Receives payment events and updates subscriptions.
 * The database trigger syncs subscription data to profiles automatically.
 *
 * - charge.success idempotent by Paystack transaction reference (paystack_applied_charges)
 * - MoMo: preserves paystack_subscription_code when charge has no subscription object
 * - Trial stack: only when DB status is still trial
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCustomerDisplayName } from "../_shared/customerDisplayName.ts";
import { PLAN_KEY_TO_TIER } from "../_shared/plans.ts";
import {
  computeProratedTierUpgrade,
  planKeyToCadence,
} from "../_shared/proration.ts";

const WEBHOOK_LOG = "[webhook]";

function safePreview(value: unknown, maxChars = 800): string {
  try {
    const s = JSON.stringify(value);
    if (s.length <= maxChars) return s;
    return `${s.slice(0, maxChars)}…(len=${s.length})`;
  } catch {
    return String(value);
  }
}

function shortId(id: string | undefined | null): string {
  if (!id) return "?";
  return `${String(id).slice(0, 8)}…`;
}

const META_USER_ID = "userId";
const META_PLAN_KEY = "planKey";

function metadataUserId(metadata: Record<string, unknown>): string | undefined {
  return (metadata[META_USER_ID] ||
    metadata.user_id ||
    metadata.userId) as string | undefined;
}

function metadataPlanKey(metadata: Record<string, unknown>): string | undefined {
  return (metadata[META_PLAN_KEY] ||
    metadata.plan_key ||
    metadata.planKey) as string | undefined;
}

function graceEndIso(graceDays: number): string {
  const d = new Date();
  d.setTime(d.getTime() + graceDays * 86400000);
  return d.toISOString();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function verifySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hash = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hash === signature;
}

function addMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const anchorDay = from.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== anchorDay) {
    result.setDate(0);
  }
  return result;
}

function normalizePeriodEndForCompare(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.trim();
  return d.toISOString();
}

function paystackChargeAmountPesewas(data: Record<string, unknown>): number {
  const raw = data.amount ?? data.paid_amount;
  if (typeof raw === "number" && !isNaN(raw)) return Math.round(raw);
  if (typeof raw === "string") {
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function permanentError(reason: string) {
  console.warn(`${WEBHOOK_LOG} Permanent error (no retry): ${reason}`);
  return new Response(JSON.stringify({ received: true, ignored: reason }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function authErrorResponse(reason: string) {
  console.warn(`${WEBHOOK_LOG} Auth/signature: ${reason}`);
  return new Response(JSON.stringify({ error: reason }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function reconcileMomoByReference(
  admin: ReturnType<typeof createClient>,
  reference: string | undefined,
  outcome: "success" | "failed",
  paystackPayload: unknown,
  errorMessage: string | null
) {
  if (!reference) return;
  const { error } = await admin
    .from("momo_charge_attempts")
    .update({
      status: outcome,
      paystack_response: paystackPayload,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("paystack_reference", reference);
  if (error) {
    console.warn(`${WEBHOOK_LOG} momo_charge_attempts reconcile failed`, {
      reference,
      outcome,
      message: error.message,
    });
  } else {
    console.log(`${WEBHOOK_LOG} momo_charge_attempts reconciled`, {
      reference,
      outcome,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!supabaseUrl || !serviceRoleKey || !paystackSecretKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();

    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return authErrorResponse("Missing x-paystack-signature header");
    }

    const isValid = await verifySignature(rawBody, signature, paystackSecretKey);
    if (!isValid) {
      return authErrorResponse("Invalid webhook signature");
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event as string;
    const evData = event.data as Record<string, unknown> | undefined;

    console.log(`${WEBHOOK_LOG} Event received`, {
      eventType,
      dataReference: (evData?.reference as string) ?? null,
      dataId: evData?.id ?? null,
      domain: (evData?.domain as string) ?? null,
    });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    switch (eventType) {
      case "subscription.create": {
        const data = event.data;
        const metadata = data?.metadata || {};
        const userId = metadataUserId(metadata);
        const planKey = metadataPlanKey(metadata);
        const subscriptionCode = data?.subscription_code as string;

        console.log(`${WEBHOOK_LOG} subscription.create parse`, {
          user: shortId(userId),
          planKey: planKey ?? null,
          hasSubscriptionCode: !!subscriptionCode,
          metadataKeys: Object.keys(metadata),
        });

        if (!userId || !planKey || !subscriptionCode) {
          console.log(`${WEBHOOK_LOG} subscription.create: missing metadata, skipping`);
          break;
        }

        const tier = PLAN_KEY_TO_TIER[planKey] || "free";
        const now = new Date().toISOString();

        const { error: subError } = await admin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              plan: tier,
              status: "pending_payment",
              paystack_subscription_code: subscriptionCode,
              paystack_customer_id: data?.customer?.customer_code || null,
              paystack_plan_code: data?.plan?.plan_code || null,
              updated_at: now,
            },
            { onConflict: "user_id", ignoreDuplicates: false }
          );

        if (subError) {
          console.error(`${WEBHOOK_LOG} subscription.create upsert failed`, {
            user: shortId(userId),
            message: subError.message,
            code: subError.code,
            details: subError.details,
          });
          throw new Error(`Subscription init failed: ${subError.message}`);
        }

        console.log(`${WEBHOOK_LOG} subscription.create ok`, {
          user: shortId(userId),
          tier,
          subscriptionCode: subscriptionCode.slice(0, 12) + "…",
        });
        break;
      }

      case "charge.success": {
        const data = event.data;
        const metadata = data?.metadata || {};

        const userId = metadataUserId(metadata);
        const planKey = metadataPlanKey(metadata);

        console.log(`${WEBHOOK_LOG} charge.success metadata`, {
          user: shortId(userId),
          planKey: planKey ?? null,
          reference: (data?.reference as string) ?? null,
          channel: (data?.channel as string) ?? null,
          metadataKeys: Object.keys(metadata),
          metadataHasFullName: !!(metadata.full_name || metadata.customer_name),
          metadataPreview: safePreview(metadata, 400),
        });

        if (!userId || !planKey) {
          return permanentError("charge.success: missing userId or planKey in metadata");
        }

        const resolvedName = await resolveCustomerDisplayName(admin, userId);
        console.log(`${WEBHOOK_LOG} charge.success auth profile`, {
          user: shortId(userId),
          resolvedDisplayNameFromAuth: !!resolvedName,
        });

        const { data: sub, error: subFetchErr } = await admin
          .from("subscriptions")
          .select(
            "plan, trial_ends_at, grace_period_days, status, paystack_subscription_code, paystack_plan_code, paystack_customer_id, cancel_at_period_end, billing_cycle, pending_billing_cycle, current_period_start, current_period_end, next_billing_date"
          )
          .eq("user_id", userId)
          .single();

        if (subFetchErr) {
          console.warn(`${WEBHOOK_LOG} charge.success subscription fetch`, {
            user: shortId(userId),
            message: subFetchErr.message,
            code: subFetchErr.code,
          });
        }
        console.log(`${WEBHOOK_LOG} charge.success current row`, {
          user: shortId(userId),
          hasRow: !!sub,
          plan: sub?.plan ?? null,
          status: sub?.status ?? null,
          hasTrialEnd: !!sub?.trial_ends_at,
          paystackSubCode: sub?.paystack_subscription_code
            ? `${String(sub.paystack_subscription_code).slice(0, 10)}…`
            : null,
        });

        const trialExpiry = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
        const isTrialStacking =
          sub?.status === "trial" &&
          trialExpiry !== null &&
          !isNaN(trialExpiry.getTime()) &&
          trialExpiry > new Date();

        const tier = PLAN_KEY_TO_TIER[planKey];
        if (!tier) {
          return permanentError(`charge.success: unknown planKey "${planKey}"`);
        }

        const reference = data?.reference as string | undefined;
        if (reference) {
          const { data: already, error: idemErr } = await admin
            .from("paystack_applied_charges")
            .select("reference")
            .eq("reference", reference)
            .maybeSingle();
          if (idemErr) {
            console.warn(`${WEBHOOK_LOG} charge.success idempotency lookup`, {
              reference,
              message: idemErr.message,
            });
          }
          if (already) {
            console.log(`${WEBHOOK_LOG} charge.success duplicate reference, skip`, {
              reference,
              user: shortId(userId),
            });
            break;
          }
        } else {
          console.warn(`${WEBHOOK_LOG} charge.success no reference on payload`, {
            user: shortId(userId),
            dataPreview: safePreview(data, 500),
          });
        }

        const billingIntent = String(metadata.billingIntent ?? "");

        if (billingIntent === "prorated_upgrade") {
          if (!sub) {
            return permanentError("charge.success proration: no subscription row");
          }
          if (sub.status !== "active" || sub.plan !== "budget") {
            return permanentError("charge.success proration: invalid subscription state");
          }
          if (!sub.current_period_start || !sub.current_period_end) {
            return permanentError("charge.success proration: missing period bounds");
          }
          const periodEndMeta = String(metadata.periodEnd ?? "");
          if (
            !periodEndMeta ||
            normalizePeriodEndForCompare(periodEndMeta) !==
              normalizePeriodEndForCompare(sub.current_period_end)
          ) {
            return permanentError("charge.success proration: periodEnd mismatch");
          }
          const currentCadence = (sub.billing_cycle ?? "monthly") as
            | "monthly"
            | "quarterly";
          const targetCadence = planKeyToCadence(planKey);
          const pr = computeProratedTierUpgrade({
            fromTier: "budget",
            toTier: "sme",
            periodCadence: currentCadence,
            toCadence: targetCadence,
            periodStartIso: sub.current_period_start,
            periodEndIso: sub.current_period_end,
            now: new Date(),
          });
          if (!pr) {
            return permanentError("charge.success proration: ineligible");
          }
          const paid = paystackChargeAmountPesewas(data as Record<string, unknown>);
          if (paid <= 0 || Math.abs(paid - pr.amountPesewas) > 1) {
            console.warn(`${WEBHOOK_LOG} proration amount mismatch`, {
              paid,
              expected: pr.amountPesewas,
              user: shortId(userId),
            });
            return permanentError("charge.success proration: amount mismatch");
          }
          const pendingBillingOut =
            targetCadence !== currentCadence
              ? targetCadence
              : (sub.pending_billing_cycle ?? null);

          await reconcileMomoByReference(admin, reference, "success", event.data, null);

          const prChannel = (data?.channel as string) || "";
          const prPaymentPreference = prChannel === "mobile_money" ? "momo" : "card";
          const prMomoPhone = (metadata.momo_phone as string) || null;
          const prMomoProvider = (metadata.momo_provider as string) || null;
          const prSubCode = data?.subscription?.subscription_code as string | undefined;
          const prPlanCode = data?.plan?.plan_code as string | undefined;
          const prCustCode = data?.customer?.customer_code as string | undefined;
          const prPaystackSub = prSubCode ?? sub.paystack_subscription_code ?? null;
          const prPaystackPlan = prPlanCode ?? sub.paystack_plan_code ?? null;
          const prPaystackCust = prCustCode ?? sub.paystack_customer_id ?? null;

          const prNowISO = new Date().toISOString();
          const prPreserveCancel = sub.cancel_at_period_end ?? false;
          const prNextBill =
            sub.next_billing_date ?? sub.current_period_end ?? null;

          const { error: prUpErr, data: prRows } = await admin
            .from("subscriptions")
            .upsert(
              {
                user_id: userId,
                plan: "sme",
                status: "active",
                paystack_customer_id: prPaystackCust,
                paystack_subscription_code: prPaystackSub,
                paystack_plan_code: prPaystackPlan,
                current_period_start: sub.current_period_start,
                current_period_end: sub.current_period_end,
                next_billing_date: prNextBill,
                pending_tier: null,
                pending_tier_start_date: null,
                trial_ends_at: null,
                cancel_at_period_end: prPreserveCancel,
                cancelled_at: null,
                payment_preference: prPaymentPreference,
                momo_phone: prMomoPhone,
                momo_provider: prMomoProvider &&
                    ["mtn", "vod", "tgo"].includes(prMomoProvider)
                  ? prMomoProvider
                  : null,
                last_payment_failed_at: null,
                grace_period_end: null,
                billing_cycle: currentCadence,
                pending_billing_cycle: pendingBillingOut,
                updated_at: prNowISO,
              },
              { onConflict: "user_id" }
            )
            .select("user_id, plan, status, updated_at");

          if (prUpErr) {
            throw new Error(`Proration upsert failed: ${prUpErr.message}`);
          }

          console.log(`${WEBHOOK_LOG} charge.success proration ok`, {
            user: shortId(userId),
            snapshot: prRows?.[0],
          });

          if (reference) {
            const { error: prRefErr } = await admin
              .from("paystack_applied_charges")
              .insert({ reference, user_id: userId });
            if (prRefErr && (prRefErr as { code?: string }).code !== "23505") {
              console.warn(`${WEBHOOK_LOG} paystack_applied_charges (proration)`, {
                reference,
                message: prRefErr.message,
              });
            }
          }

          break;
        }

        const now = new Date();
        const nowISO = now.toISOString();
        const keyCadence = planKey.indexOf("quarterly") !== -1
          ? "quarterly"
          : "monthly";
        const isQuarterly = keyCadence === "quarterly";
        const periodEnd = addMonths(now, isQuarterly ? 3 : 1).toISOString();
        const pendingBillingResolved =
          sub?.pending_billing_cycle === keyCadence
            ? null
            : (sub?.pending_billing_cycle ?? null);

        const channel = (data?.channel as string) || "";
        const paymentPreference = channel === "mobile_money" ? "momo" : "card";
        const momoPhone = (metadata.momo_phone as string) || null;
        const momoProvider = (metadata.momo_provider as string) || null;

        const subCode = data?.subscription?.subscription_code as string | undefined;
        const planCode = data?.plan?.plan_code as string | undefined;
        const custCode = data?.customer?.customer_code as string | undefined;

        const paystack_subscription_code =
          subCode ?? sub?.paystack_subscription_code ?? null;
        const paystack_plan_code = planCode ?? sub?.paystack_plan_code ?? null;
        const paystack_customer_id = custCode ?? sub?.paystack_customer_id ?? null;

        let subPlan = tier;
        let subStatus = "active";
        let subPendingTier: string | null = null;
        let subPendingStartDate: string | null = null;
        let trialEndsOut: string | null = null;

        if (isTrialStacking) {
          subPlan = sub!.plan || tier;
          subStatus = "trial";
          subPendingTier = tier;
          subPendingStartDate = sub!.trial_ends_at;
          trialEndsOut = sub!.trial_ends_at;
          console.log(`${WEBHOOK_LOG} Trial active — stacking`, {
            tier,
            user: shortId(userId),
          });
        } else {
          console.log(`${WEBHOOK_LOG} Immediate activation`, {
            tier,
            user: shortId(userId),
          });
          trialEndsOut = null;
        }

        await reconcileMomoByReference(admin, reference, "success", event.data, null);

        const preserveCancel = sub?.cancel_at_period_end ?? false;

        console.log(`${WEBHOOK_LOG} charge.success upsert payload`, {
          user: shortId(userId),
          subPlan,
          subStatus,
          isTrialStacking,
          periodEnd,
          paymentPreference,
          preserveCancel,
          paystack_subscription_code: paystack_subscription_code
            ? `${String(paystack_subscription_code).slice(0, 12)}…`
            : null,
          paystack_plan_code: paystack_plan_code ?? null,
          reference: reference ?? null,
        });

        const { error: subError, data: upsertRows } = await admin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              plan: subPlan,
              status: subStatus,
              paystack_customer_id,
              paystack_subscription_code,
              paystack_plan_code,
              current_period_start: nowISO,
              current_period_end: periodEnd,
              next_billing_date: periodEnd,
              pending_tier: subPendingTier,
              pending_tier_start_date: subPendingStartDate,
              trial_ends_at: trialEndsOut,
              cancel_at_period_end: preserveCancel,
              cancelled_at: null,
              payment_preference: paymentPreference,
              momo_phone: momoPhone,
              momo_provider: momoProvider &&
                  ["mtn", "vod", "tgo"].includes(momoProvider)
                ? momoProvider
                : null,
              last_payment_failed_at: null,
              grace_period_end: null,
              billing_cycle: keyCadence,
              pending_billing_cycle: pendingBillingResolved,
              updated_at: nowISO,
            },
            { onConflict: "user_id" }
          )
          .select("user_id, plan, status, updated_at");

        if (subError) {
          console.error(`${WEBHOOK_LOG} Subscription upsert failed`, {
            user: shortId(userId),
            message: subError.message,
            code: subError.code,
            details: subError.details,
            hint: subError.hint,
          });
          throw new Error(`Subscription upsert failed: ${subError.message}`);
        }

        console.log(`${WEBHOOK_LOG} charge.success upsert ok`, {
          user: shortId(userId),
          rows: upsertRows?.length ?? 0,
          snapshot: upsertRows?.[0]
            ? {
                plan: upsertRows[0].plan,
                status: upsertRows[0].status,
                updated_at: upsertRows[0].updated_at,
              }
            : null,
        });

        if (reference) {
          const { error: refErr } = await admin
            .from("paystack_applied_charges")
            .insert({ reference, user_id: userId });
          if (refErr && (refErr as { code?: string }).code !== "23505") {
            console.warn(`${WEBHOOK_LOG} paystack_applied_charges insert`, {
              reference,
              message: refErr.message,
              code: refErr.code,
            });
          } else {
            console.log(`${WEBHOOK_LOG} paystack_applied_charges recorded`, {
              reference,
              user: shortId(userId),
            });
          }
        }

        break;
      }

      case "charge.failed": {
        const data = event.data;
        const metadata = data?.metadata || {};
        const userId = metadataUserId(metadata);
        const reference = data?.reference as string | undefined;

        console.log(`${WEBHOOK_LOG} charge.failed`, {
          user: shortId(userId),
          reference: reference ?? null,
          gateway: (data?.gateway_response as string) ?? null,
          metadataKeys: Object.keys(metadata),
        });

        await reconcileMomoByReference(
          admin,
          reference,
          "failed",
          event.data,
          (data?.gateway_response as string) || "charge.failed"
        );

        if (!userId) {
          console.log(`${WEBHOOK_LOG} charge.failed: no user in metadata, skip`);
          break;
        }

        const { data: sub, error: subFailFetchErr } = await admin
          .from("subscriptions")
          .select("status, plan, grace_period_days")
          .eq("user_id", userId)
          .single();

        if (subFailFetchErr) {
          console.warn(`${WEBHOOK_LOG} charge.failed subscription fetch`, {
            user: shortId(userId),
            message: subFailFetchErr.message,
          });
        }

        if (!sub || sub.plan === "free") {
          console.log(`${WEBHOOK_LOG} charge.failed skip (no sub or free)`, {
            user: shortId(userId),
            hasSub: !!sub,
            plan: sub?.plan ?? null,
          });
          break;
        }
        if (sub.status !== "active" && sub.status !== "pending_payment") {
          console.log(`${WEBHOOK_LOG} charge.failed skip (status)`, {
            user: shortId(userId),
            status: sub.status,
          });
          break;
        }

        const graceDays = sub.grace_period_days ?? 5;
        const now = new Date().toISOString();

        const { error: upErr } = await admin
          .from("subscriptions")
          .update({
            status: "grace_period",
            last_payment_failed_at: now,
            grace_period_end: graceEndIso(graceDays),
            updated_at: now,
          })
          .eq("user_id", userId)
          .in("status", ["active", "pending_payment"]);

        if (upErr) {
          console.error(`${WEBHOOK_LOG} charge.failed grace update failed`, {
            user: shortId(userId),
            message: upErr.message,
            code: upErr.code,
          });
          throw new Error(`charge.failed update: ${upErr.message}`);
        }
        console.log(`${WEBHOOK_LOG} charge.failed → grace_period`, {
          user: shortId(userId),
        });
        break;
      }

      case "subscription.disable": {
        const data = event.data;
        const subscriptionCode = data?.subscription_code as string;

        console.log(`${WEBHOOK_LOG} subscription.disable`, {
          subscriptionCode: subscriptionCode
            ? `${subscriptionCode.slice(0, 14)}…`
            : null,
        });

        if (!subscriptionCode) {
          return permanentError("subscription.disable: missing subscription_code");
        }

        const { data: sub, error: findErr } = await admin
          .from("subscriptions")
          .select(
            "user_id, cancel_at_period_end, pending_tier, grace_period_days, plan, payment_preference, status"
          )
          .eq("paystack_subscription_code", subscriptionCode)
          .maybeSingle();

        if (findErr) {
          console.error(`${WEBHOOK_LOG} subscription.disable lookup failed`, {
            message: findErr.message,
            code: findErr.code,
          });
          throw new Error(`subscription.disable lookup: ${findErr.message}`);
        }
        if (!sub) {
          return permanentError(`subscription.disable: sub ${subscriptionCode} not found`);
        }

        const userId = sub.user_id;
        const now = new Date().toISOString();

        console.log(`${WEBHOOK_LOG} subscription.disable matched row`, {
          user: shortId(userId),
          plan: sub.plan,
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
        });

        if (sub.cancel_at_period_end) {
          const newTier = sub.pending_tier || "free";
          console.log(`${WEBHOOK_LOG} Scheduled downgrade`, {
            user: shortId(userId),
            newTier,
          });

          const { error: subError } = await admin
            .from("subscriptions")
            .update({
              plan: newTier,
              status: (newTier === "free") ? "expired" : "active",
              cancel_at_period_end: false,
              pending_tier: null,
              pending_tier_start_date: null,
              next_billing_date: null,
              grace_period_end: null,
              last_payment_failed_at: null,
              updated_at: now,
            })
            .eq("user_id", userId);

          if (subError) {
            console.error(`${WEBHOOK_LOG} Scheduled downgrade failed`, {
              user: shortId(userId),
              message: subError.message,
            });
            throw new Error(`Scheduled downgrade failed: ${subError.message}`);
          }
          console.log(`${WEBHOOK_LOG} Scheduled downgrade ok`, { user: shortId(userId) });
        } else if (sub.plan !== "free" && sub.status !== "grace_period") {
          const graceDays = sub.grace_period_days ?? 5;
          console.log(`${WEBHOOK_LOG} subscription.disable → grace_period`, {
            user: shortId(userId),
            graceDays,
          });

          const { error: subError } = await admin
            .from("subscriptions")
            .update({
              status: "grace_period",
              last_payment_failed_at: now,
              grace_period_end: graceEndIso(graceDays),
              payment_preference: sub.payment_preference || "card",
              cancel_at_period_end: false,
              updated_at: now,
            })
            .eq("user_id", userId);

          if (subError) {
            console.error(`${WEBHOOK_LOG} Grace start failed`, {
              user: shortId(userId),
              message: subError.message,
            });
            throw new Error(`Grace start failed: ${subError.message}`);
          }
          console.log(`${WEBHOOK_LOG} Grace start ok`, { user: shortId(userId) });
        } else {
          console.log(`${WEBHOOK_LOG} subscription.disable no-op`, {
            user: shortId(userId),
            plan: sub.plan,
            status: sub.status,
          });
        }
        break;
      }

      case "subscription.not_renew":
        console.log(`${WEBHOOK_LOG} ${eventType} — no action`);
        break;

      default:
        console.log(`${WEBHOOK_LOG} Unhandled event`, {
          eventType,
          preview: safePreview(event.data, 400),
        });
    }

    console.log(`${WEBHOOK_LOG} handler complete`, { eventType });
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`${WEBHOOK_LOG} Transient error`, {
      err: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
