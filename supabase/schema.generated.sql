-- ============================================================================
-- GENERATED FILE — DO NOT EDIT BY HAND
-- Regenerate: supabase db dump --linked --schema public -f supabase/schema.generated.sql
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."config_status" AS ENUM (
    'draft',
    'active',
    'superseded'
);


ALTER TYPE "public"."config_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_analytics"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from literacy_events
  where created_at < now() - interval '90 days';
end;
$$;


ALTER FUNCTION "public"."cleanup_old_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_count"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select count(*) from (select 1 from auth.users limit 100) as t;
$$;


ALTER FUNCTION "public"."get_user_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_learning_summary"("target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  result json;
begin
  select json_build_object(
    'total_lessons_viewed', count(*) filter (where event_type = 'lesson_viewed'),
    'lessons_completed', count(distinct lesson_id) filter (where event_type = 'lesson_completed'),
    'quizzes_attempted', count(*) filter (where event_type = 'quiz_attempted'),
    'quizzes_passed', count(*) filter (where event_type = 'quiz_passed'),
    'modules_completed', count(distinct module_id) filter (where event_type = 'module_completed'),
    'calculators_used', count(distinct calculator_id) filter (where event_type = 'calculator_used'),
    'first_activity', min(created_at),
    'last_activity', max(created_at)
  ) into result
  from literacy_events
  where user_id = target_user_id;

  return result;
end;
$$;


ALTER FUNCTION "public"."get_user_learning_summary"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_learning_summary"("target_user_id" "uuid") IS 'Returns aggregated learning stats for a user';



CREATE OR REPLACE FUNCTION "public"."log_subscription_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  event text;
  old_tier text;
  new_tier text;
  old_status text;
  new_status text;
BEGIN
  old_tier := COALESCE(OLD.plan, 'free');
  new_tier := COALESCE(NEW.plan, 'free');
  old_status := COALESCE(OLD.status, 'active');
  new_status := COALESCE(NEW.status, 'active');

  IF TG_OP = 'INSERT' THEN
    IF new_status = 'trial' THEN
      -- Check if early bird (under 100 trials/active subs)
      IF (SELECT COUNT(*) FROM public.subscriptions WHERE plan != 'free' OR status = 'trial') < 100 THEN
        event := 'early_bird_claimed';
      ELSE
        event := 'trial_started';
      END IF;
    ELSIF new_status = 'pending_payment' THEN
      event := 'subscription_activated';
    ELSIF new_status = 'active' AND new_tier != 'free' THEN
      event := 'subscription_activated';
    ELSE
      event := 'subscription_activated';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Skip if nothing tier-relevant changed
    IF OLD.plan IS NOT DISTINCT FROM NEW.plan AND
       OLD.status IS NOT DISTINCT FROM NEW.status AND
       OLD.pending_tier IS NOT DISTINCT FROM NEW.pending_tier THEN
      RETURN NEW;
    END IF;

    -- Trial ended (janitor activated pending tier)
    IF old_status = 'trial' AND new_status IN ('active', 'expired') THEN
      event := 'trial_ended';

    -- Plan upgraded
    ELSIF old_tier <> new_tier AND new_status = 'active' THEN
      IF public.rank_tier(new_tier) > public.rank_tier(old_tier) THEN
        event := 'tier_upgraded';
      ELSE
        event := 'tier_downgraded';
      END IF;

    -- Pending tier was set (trial stacking)
    ELSIF NEW.pending_tier IS NOT NULL AND OLD.pending_tier IS NULL THEN
      event := 'tier_stacked';

    -- Pending tier was cleared (activation happened)
    ELSIF NEW.pending_tier IS NULL AND OLD.pending_tier IS NOT NULL AND old_tier <> new_tier THEN
      IF public.rank_tier(new_tier) < public.rank_tier(old_tier) THEN
        event := 'tier_downgraded';
      ELSE
        event := 'tier_upgraded';
      END IF;

    -- Subscription cancelled
    ELSIF old_status <> 'expired' AND new_status = 'expired' THEN
      event := 'subscription_cancelled';

    -- Subscription renewed/reactivated
    ELSIF old_status = 'expired' AND new_status = 'active' THEN
      event := 'subscription_renewed';

    -- Pending payment → active
    ELSIF old_status = 'pending_payment' AND new_status = 'active' THEN
      event := 'subscription_activated';

    -- Pending payment → trial
    ELSIF old_status = 'pending_payment' AND new_status = 'trial' THEN
      event := 'trial_started';

    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Insert log entry
  INSERT INTO public.subscription_activity_log (
    user_id, event_type, from_tier, to_tier,
    from_status, to_status, metadata, created_at
  ) VALUES (
    NEW.user_id,
    event,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE old_tier END,
    new_tier,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE old_status END,
    new_status,
    jsonb_build_object(
      'paystack_code', NEW.paystack_subscription_code,
      'cancel_at_period_end', COALESCE(NEW.cancel_at_period_end, false),
      'pending_tier', NEW.pending_tier
    ),
    now()
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_subscription_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rank_tier"("t" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT CASE t WHEN 'free' THEN 0 WHEN 'budget' THEN 1 WHEN 'sme' THEN 2 ELSE -1 END;
$$;


ALTER FUNCTION "public"."rank_tier"("t" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_from_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  sub_row RECORD;
BEGIN
  SELECT plan as tier, trial_ends_at, pending_tier, pending_tier_start_date 
  INTO sub_row 
  FROM public.subscriptions 
  WHERE user_id = NEW.id;

  IF FOUND THEN
    NEW.tier := sub_row.tier;
    NEW.trial_ends_at := sub_row.trial_ends_at;
    NEW.pending_tier := sub_row.pending_tier;
    NEW.pending_tier_start_date := sub_row.pending_tier_start_date;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_profile_from_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_subscription_to_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Skip if no tier-relevant fields changed (UPDATE only)
  IF TG_OP = 'UPDATE' AND
    OLD.plan IS NOT DISTINCT FROM NEW.plan AND
    OLD.trial_ends_at IS NOT DISTINCT FROM NEW.trial_ends_at AND
    OLD.pending_tier IS NOT DISTINCT FROM NEW.pending_tier AND
    OLD.pending_tier_start_date IS NOT DISTINCT FROM NEW.pending_tier_start_date
  THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles SET 
    tier = NEW.plan,
    trial_ends_at = NEW.trial_ends_at,
    pending_tier = NEW.pending_tier,
    pending_tier_start_date = NEW.pending_tier_start_date
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_subscription_to_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_users" IS 'Dashboard admin users. Role-first auth. To add an admin: insert into admin_users (user_id) select id from auth.users where email = ''your@email.com'';';



CREATE TABLE IF NOT EXISTS "public"."announcement_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "deep_link" "text",
    "audience_type" "text" DEFAULT 'all'::"text" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "sent_at" timestamp with time zone,
    "attempted_count" integer DEFAULT 0 NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "target_user_id" "uuid",
    CONSTRAINT "announcement_campaigns_audience_type_check" CHECK (("audience_type" = ANY (ARRAY['all'::"text", 'single_user'::"text"]))),
    CONSTRAINT "announcement_campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'queued'::"text", 'sending'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."announcement_campaigns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."announcement_campaigns"."target_user_id" IS 'When audience_type is single_user, only devices for this user receive the push.';



CREATE TABLE IF NOT EXISTS "public"."announcement_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "push_device_id" "uuid" NOT NULL,
    "expo_push_token" "text" NOT NULL,
    "status" "text" NOT NULL,
    "provider_ticket_id" "text",
    "error_code" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "announcement_deliveries_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."announcement_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "version" "text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "release_notes" "text",
    "requires_update" boolean DEFAULT false NOT NULL,
    CONSTRAINT "app_versions_platform_check" CHECK (("platform" = ANY (ARRAY['android'::"text", 'ios'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."app_versions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."app_versions"."release_notes" IS 'Release notes shown in update prompts and store metadata sync.';



COMMENT ON COLUMN "public"."app_versions"."requires_update" IS 'If true and the client is behind this active version, app should enforce a mandatory update gate.';



CREATE TABLE IF NOT EXISTS "public"."budget_adjustments_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cycle_id" "uuid",
    "adjustment_type" "text" NOT NULL,
    "changes" "jsonb" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "budget_adjustments_log_type_check" CHECK (("adjustment_type" = ANY (ARRAY['vitals_change'::"text", 'manual'::"text", 'auto_reallocation'::"text", 'template_applied'::"text", 'rollover'::"text", 'income_change'::"text", 'category_change'::"text"])))
);


ALTER TABLE "public"."budget_adjustments_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "bucket" "text" NOT NULL,
    "name" "text" NOT NULL,
    "limit_amount" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_custom" boolean DEFAULT false NOT NULL,
    "parent_id" "uuid",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "suggested_limit" numeric,
    "is_archived" boolean DEFAULT false NOT NULL,
    "manual_override" boolean DEFAULT false NOT NULL,
    "icon" "text",
    CONSTRAINT "budget_categories_bucket_check_v1" CHECK (("bucket" = ANY (ARRAY['needs'::"text", 'wants'::"text", 'savings'::"text"]))),
    CONSTRAINT "budget_categories_limit_amount_check" CHECK (("limit_amount" >= (0)::numeric)),
    CONSTRAINT "budget_categories_no_self_parent" CHECK ((("parent_id" IS NULL) OR ("parent_id" <> "id"))),
    CONSTRAINT "budget_categories_suggested_limit_check" CHECK ((("suggested_limit" IS NULL) OR ("suggested_limit" >= (0)::numeric)))
);


ALTER TABLE "public"."budget_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "payday_day" integer NOT NULL,
    "needs_pct" numeric NOT NULL,
    "wants_pct" numeric NOT NULL,
    "savings_pct" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rollover_from_previous" "jsonb" DEFAULT '{"needs": 0, "wants": 0, "savings": 0}'::"jsonb" NOT NULL,
    "reallocation_applied" boolean DEFAULT false NOT NULL,
    "reallocation_reason" "text",
    CONSTRAINT "budget_cycles_needs_pct_check" CHECK ((("needs_pct" >= (0)::numeric) AND ("needs_pct" <= (1)::numeric))),
    CONSTRAINT "budget_cycles_payday_day_check" CHECK ((("payday_day" >= 1) AND ("payday_day" <= 31))),
    CONSTRAINT "budget_cycles_savings_pct_check" CHECK ((("savings_pct" >= (0)::numeric) AND ("savings_pct" <= (1)::numeric))),
    CONSTRAINT "budget_cycles_wants_pct_check" CHECK ((("wants_pct" >= (0)::numeric) AND ("wants_pct" <= (1)::numeric)))
);


ALTER TABLE "public"."budget_cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "target_audience" "text" NOT NULL,
    "life_stage" "text",
    "needs_pct" numeric NOT NULL,
    "wants_pct" numeric NOT NULL,
    "savings_pct" numeric NOT NULL,
    "recommended_categories" "jsonb" DEFAULT '{"needs": [], "wants": [], "savings": []}'::"jsonb" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "budget_templates_life_stage_check" CHECK ((("life_stage" IS NULL) OR ("life_stage" = ANY (ARRAY['student'::"text", 'young_professional'::"text", 'family'::"text", 'retiree'::"text"])))),
    CONSTRAINT "budget_templates_needs_pct_check" CHECK ((("needs_pct" >= (0)::numeric) AND ("needs_pct" <= (1)::numeric))),
    CONSTRAINT "budget_templates_percentages_sum_check" CHECK (("abs"(((("needs_pct" + "wants_pct") + "savings_pct") - 1.0)) < 0.01)),
    CONSTRAINT "budget_templates_savings_pct_check" CHECK ((("savings_pct" >= (0)::numeric) AND ("savings_pct" <= (1)::numeric))),
    CONSTRAINT "budget_templates_wants_pct_check" CHECK ((("wants_pct" >= (0)::numeric) AND ("wants_pct" <= (1)::numeric)))
);


ALTER TABLE "public"."budget_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "bucket" "text" NOT NULL,
    "category_id" "uuid",
    "amount" numeric NOT NULL,
    "note" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "debt_id" "uuid",
    CONSTRAINT "budget_transactions_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "budget_transactions_bucket_check_v1" CHECK (("bucket" = ANY (ARRAY['needs'::"text", 'wants'::"text", 'savings'::"text"])))
);


ALTER TABLE "public"."budget_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."debts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "total_amount" numeric NOT NULL,
    "remaining_amount" numeric NOT NULL,
    "monthly_payment" numeric NOT NULL,
    "interest_rate" numeric,
    "start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "target_payoff_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "category_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_cycle_id" "uuid",
    CONSTRAINT "debts_interest_rate_check" CHECK ((("interest_rate" IS NULL) OR (("interest_rate" >= (0)::numeric) AND ("interest_rate" <= (100)::numeric)))),
    CONSTRAINT "debts_monthly_payment_check" CHECK (("monthly_payment" >= (0)::numeric)),
    CONSTRAINT "debts_remaining_amount_check" CHECK (("remaining_amount" >= (0)::numeric)),
    CONSTRAINT "debts_remaining_total_check" CHECK (("remaining_amount" <= "total_amount")),
    CONSTRAINT "debts_target_date_check" CHECK ((("target_payoff_date" IS NULL) OR ("target_payoff_date" >= "start_date"))),
    CONSTRAINT "debts_total_amount_check" CHECK (("total_amount" >= (0)::numeric))
);


ALTER TABLE "public"."debts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_key" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message_body" "text" NOT NULL,
    "cta_label" "text",
    "cta_url" "text",
    "audience_type" "text" NOT NULL,
    "recipient_count" integer DEFAULT 0 NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "status" "text" NOT NULL,
    "created_by" "uuid",
    "source" "text" DEFAULT 'emails_section'::"text" NOT NULL,
    "source_feedback_id" "uuid",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "message_body_html" "text" DEFAULT ''::"text" NOT NULL,
    "message_body_text" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "email_campaigns_audience_type_check" CHECK (("audience_type" = ANY (ARRAY['single'::"text", 'selected_users'::"text", 'feedback_reply'::"text"]))),
    CONSTRAINT "email_campaigns_source_check" CHECK (("source" = ANY (ARRAY['users_tab'::"text", 'user_profile'::"text", 'app_feedback'::"text", 'emails_section'::"text"]))),
    CONSTRAINT "email_campaigns_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'sending'::"text", 'sent'::"text", 'failed'::"text", 'partial_failed'::"text"]))),
    CONSTRAINT "email_campaigns_template_key_check" CHECK (("template_key" = ANY (ARRAY['general_update'::"text", 'support_response'::"text", 'feedback_followup'::"text", 'join_beta'::"text", 'app_update'::"text", 'customer_checkin'::"text", 'maintenance_notice'::"text", 'educational_tip'::"text"])))
);


ALTER TABLE "public"."email_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "recipient_name" "text",
    "delivery_status" "text" NOT NULL,
    "provider_message_id" "text",
    "error_code" "text",
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_recipients_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['queued'::"text", 'sent'::"text", 'failed'::"text", 'bounced'::"text", 'complained'::"text"])))
);


ALTER TABLE "public"."email_recipients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "rating" integer NOT NULL,
    "feedback_text" "text" NOT NULL,
    "email" "text" NOT NULL,
    "is_beta" boolean DEFAULT false NOT NULL,
    "version" "text" NOT NULL,
    "source" "text" DEFAULT 'website_feedback_page'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedback_category_check" CHECK (("category" = ANY (ARRAY['bug_report'::"text", 'feature_request'::"text", 'general_comment'::"text"]))),
    CONSTRAINT "feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."income_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "apply_deductions" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "income_sources_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "income_sources_type_check" CHECK (("type" = ANY (ARRAY['primary'::"text", 'side'::"text"])))
);


ALTER TABLE "public"."income_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_streaks" (
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_activity_date" "date",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."learning_streaks" OWNER TO "postgres";


COMMENT ON TABLE "public"."learning_streaks" IS 'Tracks user learning consistency and streaks';



CREATE TABLE IF NOT EXISTS "public"."lesson_feedback" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "text" NOT NULL,
    "rating" integer,
    "feedback_type" "text",
    "comment" "text",
    "is_resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lesson_feedback_feedback_type_check" CHECK (("feedback_type" = ANY (ARRAY['helpful'::"text", 'unclear'::"text", 'incorrect'::"text", 'suggestion'::"text", 'other'::"text"]))),
    CONSTRAINT "lesson_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."lesson_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."lesson_feedback" IS 'User feedback on lesson quality and clarity';



CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "module" "text" NOT NULL,
    "difficulty" "text" NOT NULL,
    "duration_minutes" integer NOT NULL,
    "languages" "text"[] DEFAULT '{en}'::"text"[] NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "content_url" "text",
    "calculator_id" "text",
    "sources" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "verified_by" "jsonb",
    "version" "text" NOT NULL,
    "last_updated" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "jsonb",
    CONSTRAINT "lessons_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"]))),
    CONSTRAINT "lessons_duration_minutes_check" CHECK ((("duration_minutes" >= 1) AND ("duration_minutes" <= 120))),
    CONSTRAINT "lessons_module_check" CHECK (("module" = ANY (ARRAY['MOD-01'::"text", 'MOD-02'::"text", 'MOD-03'::"text", 'MOD-04'::"text", 'MOD-05'::"text", 'MOD-06'::"text", 'MOD-07'::"text", 'MOD-08'::"text", 'MOD-09'::"text"])))
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lessons"."content" IS 'Structured lesson content: { schema_version, sections: [...] }. Same format as bundledLessons.json.';



CREATE TABLE IF NOT EXISTS "public"."literacy_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "lesson_id" "text",
    "module_id" "text",
    "calculator_id" "text",
    "trigger_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "literacy_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['lesson_viewed'::"text", 'lesson_completed'::"text", 'quiz_attempted'::"text", 'quiz_passed'::"text", 'module_completed'::"text", 'calculator_used'::"text", 'trigger_shown'::"text", 'trigger_dismissed'::"text", 'trigger_action_taken'::"text"])))
);


ALTER TABLE "public"."literacy_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."literacy_events" IS 'Tracks user interactions with Financial Literacy Module (90-day retention)';



CREATE TABLE IF NOT EXISTS "public"."live_tbill_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenor" "text" NOT NULL,
    "rate" numeric NOT NULL,
    "fetched_at" timestamp with time zone NOT NULL,
    "source_snapshot_id" "text",
    CONSTRAINT "live_tbill_rates_rate_check" CHECK ((("rate" >= (0)::numeric) AND ("rate" <= (100)::numeric)))
);


ALTER TABLE "public"."live_tbill_rates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."module_completion_stats" WITH ("security_invoker"='on') AS
 SELECT "module_id",
    "count"(DISTINCT "user_id") AS "total_users",
    "avg"(
        CASE
            WHEN ("event_type" = 'module_completed'::"text") THEN 1
            ELSE 0
        END) AS "completion_rate",
    "count"(*) FILTER (WHERE ("event_type" = 'lesson_viewed'::"text")) AS "total_views",
    "count"(*) FILTER (WHERE ("event_type" = 'quiz_attempted'::"text")) AS "total_quiz_attempts"
   FROM "public"."literacy_events"
  WHERE ("module_id" IS NOT NULL)
  GROUP BY "module_id";


ALTER VIEW "public"."module_completion_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "payday_day" integer,
    "interests" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "setup_completed" boolean DEFAULT false NOT NULL,
    "stable_salary" numeric DEFAULT 0 NOT NULL,
    "auto_tax" boolean DEFAULT false NOT NULL,
    "side_income" numeric DEFAULT 0 NOT NULL,
    "rent" numeric DEFAULT 0 NOT NULL,
    "tithe_remittance" numeric DEFAULT 0 NOT NULL,
    "utilities_mode" "text" DEFAULT 'general'::"text" NOT NULL,
    "utilities_total" numeric DEFAULT 0 NOT NULL,
    "utilities_ecg" numeric DEFAULT 0 NOT NULL,
    "utilities_water" numeric DEFAULT 0 NOT NULL,
    "primary_goal" "text",
    "strategy" "text",
    "needs_pct" numeric,
    "wants_pct" numeric,
    "savings_pct" numeric,
    "life_stage" "text",
    "dependents_count" integer DEFAULT 0 NOT NULL,
    "income_frequency" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "spending_style" "text",
    "financial_priority" "text",
    "enable_auto_reallocation" boolean DEFAULT false NOT NULL,
    "rollover_enabled" boolean DEFAULT false NOT NULL,
    "debt_obligations" numeric DEFAULT 0 NOT NULL,
    "tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "trial_ends_at" timestamp with time zone,
    "trial_granted" boolean DEFAULT false NOT NULL,
    "pending_tier" "text",
    "pending_tier_start_date" timestamp with time zone,
    "cash_flow_balance" numeric(12,2),
    "cash_flow_monthly_income" numeric(12,2),
    "cash_flow_last_reset" timestamp with time zone,
    "profile_version" integer DEFAULT 0,
    "initial_savings_balance" numeric DEFAULT 0 NOT NULL,
    "email" "text",
    CONSTRAINT "profiles_cash_flow_balance_nonneg" CHECK ((("cash_flow_balance" IS NULL) OR ("cash_flow_balance" >= (0)::numeric))),
    CONSTRAINT "profiles_cash_flow_income_nonneg" CHECK ((("cash_flow_monthly_income" IS NULL) OR ("cash_flow_monthly_income" >= (0)::numeric))),
    CONSTRAINT "profiles_debt_obligations_nonneg" CHECK (("debt_obligations" >= (0)::numeric)),
    CONSTRAINT "profiles_dependents_count_check" CHECK (("dependents_count" >= 0)),
    CONSTRAINT "profiles_financial_priority_check" CHECK ((("financial_priority" IS NULL) OR ("financial_priority" = ANY (ARRAY['debt_payoff'::"text", 'savings_growth'::"text", 'lifestyle'::"text", 'balanced'::"text"])))),
    CONSTRAINT "profiles_income_frequency_check" CHECK (("income_frequency" = ANY (ARRAY['weekly'::"text", 'bi_weekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "profiles_initial_savings_balance_check" CHECK (("initial_savings_balance" >= (0)::numeric)),
    CONSTRAINT "profiles_life_stage_check" CHECK ((("life_stage" IS NULL) OR ("life_stage" = ANY (ARRAY['student'::"text", 'young_professional'::"text", 'family'::"text", 'retiree'::"text"])))),
    CONSTRAINT "profiles_needs_pct_check" CHECK ((("needs_pct" IS NULL) OR (("needs_pct" >= (0)::numeric) AND ("needs_pct" <= (1)::numeric)))),
    CONSTRAINT "profiles_payday_day_check" CHECK ((("payday_day" >= 1) AND ("payday_day" <= 31))),
    CONSTRAINT "profiles_pending_tier_check" CHECK (("pending_tier" = ANY (ARRAY['free'::"text", 'budget'::"text", 'sme'::"text"]))),
    CONSTRAINT "profiles_primary_goal_check" CHECK (("primary_goal" = ANY (ARRAY['emergency_fund'::"text", 'project'::"text", 'investment'::"text"]))),
    CONSTRAINT "profiles_rent_nonneg" CHECK (("rent" >= (0)::numeric)),
    CONSTRAINT "profiles_savings_pct_check" CHECK ((("savings_pct" IS NULL) OR (("savings_pct" >= (0)::numeric) AND ("savings_pct" <= (1)::numeric)))),
    CONSTRAINT "profiles_side_income_nonneg" CHECK (("side_income" >= (0)::numeric)),
    CONSTRAINT "profiles_spending_style_check" CHECK ((("spending_style" IS NULL) OR ("spending_style" = ANY (ARRAY['conservative'::"text", 'moderate'::"text", 'liberal'::"text"])))),
    CONSTRAINT "profiles_stable_salary_nonneg" CHECK (("stable_salary" >= (0)::numeric)),
    CONSTRAINT "profiles_strategy_check" CHECK (("strategy" = ANY (ARRAY['survival'::"text", 'balanced'::"text", 'aggressive'::"text"]))),
    CONSTRAINT "profiles_tier_check" CHECK (("tier" = ANY (ARRAY['free'::"text", 'budget'::"text", 'sme'::"text"]))),
    CONSTRAINT "profiles_tithe_remittance_nonneg" CHECK (("tithe_remittance" >= (0)::numeric)),
    CONSTRAINT "profiles_utilities_ecg_nonneg" CHECK (("utilities_ecg" >= (0)::numeric)),
    CONSTRAINT "profiles_utilities_mode_check" CHECK (("utilities_mode" = ANY (ARRAY['general'::"text", 'precise'::"text"]))),
    CONSTRAINT "profiles_utilities_total_nonneg" CHECK (("utilities_total" >= (0)::numeric)),
    CONSTRAINT "profiles_utilities_water_nonneg" CHECK (("utilities_water" >= (0)::numeric)),
    CONSTRAINT "profiles_wants_pct_check" CHECK ((("wants_pct" IS NULL) OR (("wants_pct" >= (0)::numeric) AND ("wants_pct" <= (1)::numeric))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "expo_push_token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "app_version" "text",
    "device_label" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "push_devices_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text"])))
);


ALTER TABLE "public"."push_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "frequency" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "bucket" "text" NOT NULL,
    "category_id" "uuid",
    "start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "end_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "auto_allocate" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recurring_expenses_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "recurring_expenses_bucket_check" CHECK (("bucket" = ANY (ARRAY['needs'::"text", 'wants'::"text", 'savings'::"text"]))),
    CONSTRAINT "recurring_expenses_end_date_check" CHECK ((("end_date" IS NULL) OR ("end_date" >= "start_date"))),
    CONSTRAINT "recurring_expenses_frequency_check" CHECK (("frequency" = ANY (ARRAY['weekly'::"text", 'bi_weekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'annually'::"text"])))
);


ALTER TABLE "public"."recurring_expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."savings_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "target_amount" numeric NOT NULL,
    "current_amount" numeric DEFAULT 0 NOT NULL,
    "target_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "savings_goals_current_amount_check" CHECK (("current_amount" >= (0)::numeric)),
    CONSTRAINT "savings_goals_target_amount_check" CHECK (("target_amount" >= (0)::numeric))
);


ALTER TABLE "public"."savings_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sme_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "icon" "text",
    "color" "text",
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sme_categories_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."sme_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sme_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "business_name" "text" NOT NULL,
    "business_type" "text" DEFAULT 'goods'::"text" NOT NULL,
    "business_category" "text",
    "currency" "text" DEFAULT 'GHS'::"text" NOT NULL,
    "vat_registered" boolean DEFAULT false NOT NULL,
    "tin" "text",
    "fiscal_year_start_month" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sme_profiles_business_type_check" CHECK (("business_type" = ANY (ARRAY['goods'::"text", 'services'::"text", 'mixed'::"text"]))),
    CONSTRAINT "sme_profiles_fiscal_year_start_month_check" CHECK ((("fiscal_year_start_month" >= 1) AND ("fiscal_year_start_month" <= 12)))
);


ALTER TABLE "public"."sme_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sme_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "transaction_date" "date" NOT NULL,
    "payment_method" "text",
    "vat_applicable" boolean DEFAULT true NOT NULL,
    "vat_amount" numeric DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sme_transactions_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "sme_transactions_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'momo'::"text", 'bank'::"text", 'card'::"text", 'cheque'::"text", 'other'::"text"]))),
    CONSTRAINT "sme_transactions_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."sme_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_key" "text" NOT NULL,
    "message" "text" NOT NULL,
    "audience_type" "text" NOT NULL,
    "recipient_count" integer DEFAULT 0 NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "source" "text" NOT NULL,
    "created_by" "uuid",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    CONSTRAINT "sms_campaigns_audience_type_check" CHECK (("audience_type" = ANY (ARRAY['single'::"text", 'selected_users'::"text"]))),
    CONSTRAINT "sms_campaigns_source_check" CHECK (("source" = ANY (ARRAY['users_tab'::"text", 'user_profile'::"text", 'sms_section'::"text"]))),
    CONSTRAINT "sms_campaigns_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'sending'::"text", 'sent'::"text", 'failed'::"text", 'partial_failed'::"text"]))),
    CONSTRAINT "sms_campaigns_template_key_check" CHECK (("template_key" = ANY (ARRAY['general_update'::"text", 'support_response'::"text", 'feedback_followup'::"text", 'join_beta'::"text", 'app_update'::"text", 'customer_checkin'::"text", 'maintenance_notice'::"text", 'educational_tip'::"text"])))
);


ALTER TABLE "public"."sms_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "phone" "text" NOT NULL,
    "recipient_name" "text",
    "delivery_status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "provider_message_id" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sms_recipients_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['queued'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."sms_recipients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spending_patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "avg_spent" numeric DEFAULT 0 NOT NULL,
    "trend" "text" DEFAULT 'stable'::"text" NOT NULL,
    "variance" numeric DEFAULT 0 NOT NULL,
    "last_calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "spending_patterns_avg_spent_check" CHECK (("avg_spent" >= (0)::numeric)),
    CONSTRAINT "spending_patterns_trend_check" CHECK (("trend" = ANY (ARRAY['increasing'::"text", 'stable'::"text", 'decreasing'::"text"]))),
    CONSTRAINT "spending_patterns_variance_check" CHECK (("variance" >= (0)::numeric))
);


ALTER TABLE "public"."spending_patterns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "from_tier" "text",
    "to_tier" "text",
    "from_status" "text",
    "to_status" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscription_activity_log_event_type_check" CHECK (("event_type" = ANY (ARRAY['trial_started'::"text", 'trial_ended'::"text", 'trial_expired'::"text", 'tier_upgraded'::"text", 'tier_downgraded'::"text", 'tier_stacked'::"text", 'subscription_activated'::"text", 'subscription_cancelled'::"text", 'subscription_renewed'::"text", 'early_bird_claimed'::"text", 'payment_failed'::"text"])))
);


ALTER TABLE "public"."subscription_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "paystack_customer_id" "text",
    "paystack_subscription_code" "text",
    "paystack_plan_code" "text",
    "trial_ends_at" timestamp with time zone,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "pending_tier" "text",
    "pending_tier_start_date" timestamp with time zone,
    CONSTRAINT "subscriptions_pending_tier_check" CHECK (("pending_tier" = ANY (ARRAY['free'::"text", 'budget'::"text", 'sme'::"text"]))),
    CONSTRAINT "subscriptions_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'budget'::"text", 'sme'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'expired'::"text", 'trial'::"text", 'pending_payment'::"text", 'grace_period'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country" "text" NOT NULL,
    "currency" "text" DEFAULT 'GHS'::"text" NOT NULL,
    "year" integer NOT NULL,
    "status" "public"."config_status" DEFAULT 'draft'::"public"."config_status" NOT NULL,
    "bracket_period" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "employee_ssnit_rate" numeric(6,5) DEFAULT 0.05500 NOT NULL,
    "employer_ssnit_rate" numeric(6,5) DEFAULT 0.13000 NOT NULL,
    "employer_tier2_rate" numeric(6,5) DEFAULT 0.02500 NOT NULL,
    "ssnit_monthly_cap" numeric(12,2) DEFAULT 69000.00 NOT NULL,
    "paye_brackets" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_employee_ssnit" CHECK ((("employee_ssnit_rate" >= (0)::numeric) AND ("employee_ssnit_rate" <= (1)::numeric))),
    CONSTRAINT "valid_employer_ssnit" CHECK ((("employer_ssnit_rate" >= (0)::numeric) AND ("employer_ssnit_rate" <= (1)::numeric))),
    CONSTRAINT "valid_year" CHECK ((("year" >= 2000) AND ("year" <= 2100)))
);


ALTER TABLE "public"."tax_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trigger_dismissals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trigger_id" "text" NOT NULL,
    "dismissed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trigger_dismissals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cycle_id" "uuid",
    "action_type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text",
    "intended_amount" numeric DEFAULT 0 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_activity_log_action_type_check" CHECK (("action_type" = ANY (ARRAY['category_added'::"text", 'category_limit_updated'::"text", 'transaction_added'::"text"]))),
    CONSTRAINT "user_activity_log_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['category'::"text", 'transaction'::"text"])))
);


ALTER TABLE "public"."user_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_lesson_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "text" NOT NULL,
    "completed_at" timestamp with time zone,
    "quiz_score" numeric,
    "quiz_attempted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_lesson_progress_quiz_score_check" CHECK ((("quiz_score" IS NULL) OR (("quiz_score" >= (0)::numeric) AND ("quiz_score" <= (1)::numeric))))
);


ALTER TABLE "public"."user_lesson_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_onboarding_state" (
    "user_id" "uuid" NOT NULL,
    "onboarding_version" integer DEFAULT 1 NOT NULL,
    "state_1_status" "text" DEFAULT 'never_seen'::"text" NOT NULL,
    "state_1_seen_at" timestamp with time zone,
    "state_1_completed_at" timestamp with time zone,
    "state_1_dismissed_at" timestamp with time zone,
    "state_1_invalidated_at" timestamp with time zone,
    "state_2_status" "text" DEFAULT 'never_seen'::"text" NOT NULL,
    "state_2_seen_at" timestamp with time zone,
    "state_2_completed_at" timestamp with time zone,
    "state_2_dismissed_at" timestamp with time zone,
    "state_2_invalidated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "user_onboarding_state_state_1_status_check" CHECK (("state_1_status" = ANY (ARRAY['never_seen'::"text", 'in_progress'::"text", 'dismissed'::"text", 'completed'::"text", 'invalidated'::"text"]))),
    CONSTRAINT "user_onboarding_state_state_2_status_check" CHECK (("state_2_status" = ANY (ARRAY['never_seen'::"text", 'in_progress'::"text", 'dismissed'::"text", 'completed'::"text", 'invalidated'::"text"])))
);


ALTER TABLE "public"."user_onboarding_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."utility_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "utility" "text" NOT NULL,
    "units" numeric NOT NULL,
    "logged_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "utility_logs_units_check" CHECK (("units" >= (0)::numeric)),
    CONSTRAINT "utility_logs_utility_check" CHECK (("utility" = ANY (ARRAY['ecg'::"text", 'water'::"text", 'trash'::"text"])))
);


ALTER TABLE "public"."utility_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vault_deposits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "source_cycle_id" "uuid",
    "note" "text",
    "deposited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vault_deposits_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "vault_deposits_source_check" CHECK (("source" = ANY (ARRAY['initial'::"text", 'cycle_rollover'::"text"])))
);


ALTER TABLE "public"."vault_deposits" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."announcement_campaigns"
    ADD CONSTRAINT "announcement_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcement_deliveries"
    ADD CONSTRAINT "announcement_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_versions"
    ADD CONSTRAINT "app_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_adjustments_log"
    ADD CONSTRAINT "budget_adjustments_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_categories"
    ADD CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_cycles"
    ADD CONSTRAINT "budget_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_cycles"
    ADD CONSTRAINT "budget_cycles_user_id_start_date_end_date_key" UNIQUE ("user_id", "start_date", "end_date");



ALTER TABLE ONLY "public"."budget_templates"
    ADD CONSTRAINT "budget_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_transactions"
    ADD CONSTRAINT "budget_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_recipients"
    ADD CONSTRAINT "email_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."income_sources"
    ADD CONSTRAINT "income_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_streaks"
    ADD CONSTRAINT "learning_streaks_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."lesson_feedback"
    ADD CONSTRAINT "lesson_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."literacy_events"
    ADD CONSTRAINT "literacy_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_tbill_rates"
    ADD CONSTRAINT "live_tbill_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_expo_push_token_key" UNIQUE ("expo_push_token");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."savings_goals"
    ADD CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sme_categories"
    ADD CONSTRAINT "sme_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sme_categories"
    ADD CONSTRAINT "sme_categories_user_id_name_type_key" UNIQUE ("user_id", "name", "type");



ALTER TABLE ONLY "public"."sme_profiles"
    ADD CONSTRAINT "sme_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sme_profiles"
    ADD CONSTRAINT "sme_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."sme_transactions"
    ADD CONSTRAINT "sme_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_campaigns"
    ADD CONSTRAINT "sms_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_recipients"
    ADD CONSTRAINT "sms_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spending_patterns"
    ADD CONSTRAINT "spending_patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_activity_log"
    ADD CONSTRAINT "subscription_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."tax_config"
    ADD CONSTRAINT "tax_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trigger_dismissals"
    ADD CONSTRAINT "trigger_dismissals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trigger_dismissals"
    ADD CONSTRAINT "trigger_dismissals_user_id_trigger_id_key" UNIQUE ("user_id", "trigger_id");



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."user_onboarding_state"
    ADD CONSTRAINT "user_onboarding_state_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."utility_logs"
    ADD CONSTRAINT "utility_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_deposits"
    ADD CONSTRAINT "vault_deposits_pkey" PRIMARY KEY ("id");



CREATE INDEX "announcement_campaigns_status_idx" ON "public"."announcement_campaigns" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "announcement_deliveries_campaign_idx" ON "public"."announcement_deliveries" USING "btree" ("campaign_id");



CREATE INDEX "announcement_deliveries_created_idx" ON "public"."announcement_deliveries" USING "btree" ("created_at" DESC);



CREATE INDEX "announcement_deliveries_status_idx" ON "public"."announcement_deliveries" USING "btree" ("status");



CREATE INDEX "budget_adjustments_log_created_at_idx" ON "public"."budget_adjustments_log" USING "btree" ("created_at" DESC);



CREATE INDEX "budget_adjustments_log_cycle_id_idx" ON "public"."budget_adjustments_log" USING "btree" ("cycle_id");



CREATE INDEX "budget_adjustments_log_type_idx" ON "public"."budget_adjustments_log" USING "btree" ("adjustment_type");



CREATE INDEX "budget_adjustments_log_user_id_idx" ON "public"."budget_adjustments_log" USING "btree" ("user_id");



CREATE INDEX "budget_categories_is_archived_idx" ON "public"."budget_categories" USING "btree" ("is_archived");



CREATE INDEX "budget_categories_is_custom_idx" ON "public"."budget_categories" USING "btree" ("is_custom");



CREATE INDEX "budget_categories_parent_id_idx" ON "public"."budget_categories" USING "btree" ("parent_id");



CREATE INDEX "budget_categories_sort_order_idx" ON "public"."budget_categories" USING "btree" ("sort_order");



CREATE INDEX "budget_templates_is_default_idx" ON "public"."budget_templates" USING "btree" ("is_default");



CREATE INDEX "budget_templates_life_stage_idx" ON "public"."budget_templates" USING "btree" ("life_stage");



CREATE INDEX "debts_category_id_idx" ON "public"."debts" USING "btree" ("category_id");



CREATE INDEX "debts_is_active_idx" ON "public"."debts" USING "btree" ("is_active");



CREATE INDEX "debts_user_id_idx" ON "public"."debts" USING "btree" ("user_id");



CREATE INDEX "idx_app_versions_platform_active" ON "public"."app_versions" USING "btree" ("platform", "is_active", "updated_at" DESC);



CREATE INDEX "idx_email_campaigns_created_at" ON "public"."email_campaigns" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_email_campaigns_created_by" ON "public"."email_campaigns" USING "btree" ("created_by", "created_at" DESC);



CREATE INDEX "idx_email_campaigns_status" ON "public"."email_campaigns" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_email_recipients_campaign" ON "public"."email_recipients" USING "btree" ("campaign_id", "created_at" DESC);



CREATE INDEX "idx_email_recipients_email" ON "public"."email_recipients" USING "btree" ("email");



CREATE INDEX "idx_email_recipients_status" ON "public"."email_recipients" USING "btree" ("delivery_status", "created_at" DESC);



CREATE INDEX "idx_feedback_category_created_at" ON "public"."feedback" USING "btree" ("category", "created_at" DESC);



CREATE INDEX "idx_feedback_created_at" ON "public"."feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_feedback_is_beta_created_at" ON "public"."feedback" USING "btree" ("is_beta", "created_at" DESC);



CREATE INDEX "idx_feedback_rating_created_at" ON "public"."feedback" USING "btree" ("rating", "created_at" DESC);



CREATE INDEX "idx_lesson_feedback_is_resolved" ON "public"."lesson_feedback" USING "btree" ("is_resolved");



CREATE INDEX "idx_lesson_feedback_lesson_id" ON "public"."lesson_feedback" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_feedback_user_id" ON "public"."lesson_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_literacy_events_created_at" ON "public"."literacy_events" USING "btree" ("created_at");



CREATE INDEX "idx_literacy_events_lesson_id" ON "public"."literacy_events" USING "btree" ("lesson_id");



CREATE INDEX "idx_literacy_events_module_id" ON "public"."literacy_events" USING "btree" ("module_id");



CREATE INDEX "idx_literacy_events_type" ON "public"."literacy_events" USING "btree" ("event_type");



CREATE INDEX "idx_literacy_events_user_id" ON "public"."literacy_events" USING "btree" ("user_id");



CREATE INDEX "idx_sms_campaigns_created_at" ON "public"."sms_campaigns" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sms_campaigns_created_by" ON "public"."sms_campaigns" USING "btree" ("created_by", "created_at" DESC);



CREATE INDEX "idx_sms_campaigns_status" ON "public"."sms_campaigns" USING "btree" ("status");



CREATE INDEX "idx_sms_recipients_campaign_id" ON "public"."sms_recipients" USING "btree" ("campaign_id");



CREATE INDEX "idx_sms_recipients_phone" ON "public"."sms_recipients" USING "btree" ("phone");



CREATE INDEX "idx_sms_recipients_user_id" ON "public"."sms_recipients" USING "btree" ("user_id");



CREATE INDEX "idx_sub_log_created" ON "public"."subscription_activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sub_log_type" ON "public"."subscription_activity_log" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_sub_log_user" ON "public"."subscription_activity_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "lessons_difficulty_idx" ON "public"."lessons" USING "btree" ("difficulty");



CREATE INDEX "lessons_module_idx" ON "public"."lessons" USING "btree" ("module");



CREATE INDEX "live_tbill_rates_fetched_at_idx" ON "public"."live_tbill_rates" USING "btree" ("fetched_at" DESC);



CREATE UNIQUE INDEX "one_active_config_per_country_year" ON "public"."tax_config" USING "btree" ("country", "year") WHERE ("status" = 'active'::"public"."config_status");



CREATE INDEX "push_devices_active_last_seen_idx" ON "public"."push_devices" USING "btree" ("is_active", "last_seen_at" DESC);



CREATE INDEX "push_devices_user_active_idx" ON "public"."push_devices" USING "btree" ("user_id", "is_active");



CREATE INDEX "recurring_expenses_category_id_idx" ON "public"."recurring_expenses" USING "btree" ("category_id");



CREATE INDEX "recurring_expenses_is_active_idx" ON "public"."recurring_expenses" USING "btree" ("is_active");



CREATE INDEX "recurring_expenses_user_id_idx" ON "public"."recurring_expenses" USING "btree" ("user_id");



CREATE INDEX "sme_categories_user_type_idx" ON "public"."sme_categories" USING "btree" ("user_id", "type");



CREATE INDEX "sme_transactions_user_date_idx" ON "public"."sme_transactions" USING "btree" ("user_id", "transaction_date" DESC);



CREATE INDEX "sme_transactions_user_type_idx" ON "public"."sme_transactions" USING "btree" ("user_id", "type");



CREATE UNIQUE INDEX "spending_patterns_category_cycle_unique" ON "public"."spending_patterns" USING "btree" ("category_id", "cycle_id");



CREATE INDEX "spending_patterns_category_id_idx" ON "public"."spending_patterns" USING "btree" ("category_id");



CREATE INDEX "spending_patterns_cycle_id_idx" ON "public"."spending_patterns" USING "btree" ("cycle_id");



CREATE INDEX "spending_patterns_user_id_idx" ON "public"."spending_patterns" USING "btree" ("user_id");



CREATE INDEX "trigger_dismissals_user_id_idx" ON "public"."trigger_dismissals" USING "btree" ("user_id");



CREATE UNIQUE INDEX "uniq_active_app_version_per_platform" ON "public"."app_versions" USING "btree" ("platform") WHERE ("is_active" = true);



CREATE INDEX "user_activity_log_created_at_idx" ON "public"."user_activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "user_activity_log_cycle_id_idx" ON "public"."user_activity_log" USING "btree" ("cycle_id");



CREATE INDEX "user_activity_log_entity_id_idx" ON "public"."user_activity_log" USING "btree" ("entity_id") WHERE ("entity_id" IS NOT NULL);



CREATE INDEX "user_activity_log_user_id_idx" ON "public"."user_activity_log" USING "btree" ("user_id");



CREATE INDEX "user_lesson_progress_lesson_id_idx" ON "public"."user_lesson_progress" USING "btree" ("lesson_id");



CREATE INDEX "user_lesson_progress_user_id_idx" ON "public"."user_lesson_progress" USING "btree" ("user_id");



CREATE UNIQUE INDEX "vault_deposits_user_cycle_unique" ON "public"."vault_deposits" USING "btree" ("user_id", "source_cycle_id") WHERE (("source" = 'cycle_rollover'::"text") AND ("source_cycle_id" IS NOT NULL));



CREATE UNIQUE INDEX "vault_deposits_user_initial_unique" ON "public"."vault_deposits" USING "btree" ("user_id") WHERE ("source" = 'initial'::"text");



CREATE OR REPLACE TRIGGER "announcement_campaigns_updated_at" BEFORE UPDATE ON "public"."announcement_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "debts_updated_at" BEFORE UPDATE ON "public"."debts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "on_profile_inserted" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_from_subscription"();



CREATE OR REPLACE TRIGGER "on_subscription_changed" AFTER INSERT OR UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."log_subscription_change"();



CREATE OR REPLACE TRIGGER "on_subscription_updated" AFTER INSERT OR UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_subscription_to_profile"();



CREATE OR REPLACE TRIGGER "push_devices_updated_at" BEFORE UPDATE ON "public"."push_devices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "recurring_expenses_updated_at" BEFORE UPDATE ON "public"."recurring_expenses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_onboarding_state" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sme_categories_updated_at" BEFORE UPDATE ON "public"."sme_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "sme_profiles_updated_at" BEFORE UPDATE ON "public"."sme_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "sme_transactions_updated_at" BEFORE UPDATE ON "public"."sme_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "spending_patterns_updated_at" BEFORE UPDATE ON "public"."spending_patterns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_app_versions_updated_at" BEFORE UPDATE ON "public"."app_versions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_campaigns"
    ADD CONSTRAINT "announcement_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."announcement_campaigns"
    ADD CONSTRAINT "announcement_campaigns_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."announcement_deliveries"
    ADD CONSTRAINT "announcement_deliveries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."announcement_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_deliveries"
    ADD CONSTRAINT "announcement_deliveries_push_device_id_fkey" FOREIGN KEY ("push_device_id") REFERENCES "public"."push_devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_adjustments_log"
    ADD CONSTRAINT "budget_adjustments_log_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."budget_cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budget_adjustments_log"
    ADD CONSTRAINT "budget_adjustments_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_categories"
    ADD CONSTRAINT "budget_categories_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."budget_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_categories"
    ADD CONSTRAINT "budget_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."budget_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_categories"
    ADD CONSTRAINT "budget_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_cycles"
    ADD CONSTRAINT "budget_cycles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_transactions"
    ADD CONSTRAINT "budget_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budget_transactions"
    ADD CONSTRAINT "budget_transactions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."budget_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_transactions"
    ADD CONSTRAINT "budget_transactions_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id");



ALTER TABLE ONLY "public"."budget_transactions"
    ADD CONSTRAINT "budget_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_source_cycle_id_fkey" FOREIGN KEY ("source_cycle_id") REFERENCES "public"."budget_cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_campaigns"
    ADD CONSTRAINT "email_campaigns_source_feedback_id_fkey" FOREIGN KEY ("source_feedback_id") REFERENCES "public"."feedback"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_recipients"
    ADD CONSTRAINT "email_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_recipients"
    ADD CONSTRAINT "email_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."income_sources"
    ADD CONSTRAINT "income_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."learning_streaks"
    ADD CONSTRAINT "learning_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_feedback"
    ADD CONSTRAINT "lesson_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."literacy_events"
    ADD CONSTRAINT "literacy_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recurring_expenses"
    ADD CONSTRAINT "recurring_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."savings_goals"
    ADD CONSTRAINT "savings_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sme_categories"
    ADD CONSTRAINT "sme_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sme_profiles"
    ADD CONSTRAINT "sme_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sme_transactions"
    ADD CONSTRAINT "sme_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_campaigns"
    ADD CONSTRAINT "sms_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sms_recipients"
    ADD CONSTRAINT "sms_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."sms_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_recipients"
    ADD CONSTRAINT "sms_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."spending_patterns"
    ADD CONSTRAINT "spending_patterns_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."budget_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spending_patterns"
    ADD CONSTRAINT "spending_patterns_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."budget_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spending_patterns"
    ADD CONSTRAINT "spending_patterns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_activity_log"
    ADD CONSTRAINT "subscription_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trigger_dismissals"
    ADD CONSTRAINT "trigger_dismissals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."budget_cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_lesson_progress"
    ADD CONSTRAINT "user_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_onboarding_state"
    ADD CONSTRAINT "user_onboarding_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."utility_logs"
    ADD CONSTRAINT "utility_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vault_deposits"
    ADD CONSTRAINT "vault_deposits_source_cycle_id_fkey" FOREIGN KEY ("source_cycle_id") REFERENCES "public"."budget_cycles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vault_deposits"
    ADD CONSTRAINT "vault_deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Public Read Active Configs" ON "public"."tax_config" FOR SELECT USING (("status" = 'active'::"public"."config_status"));



CREATE POLICY "Users can insert lesson feedback" ON "public"."lesson_feedback" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own onboarding state" ON "public"."user_onboarding_state" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own learning streaks" ON "public"."learning_streaks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own literacy events" ON "public"."literacy_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own onboarding state" ON "public"."user_onboarding_state" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own onboarding state" ON "public"."user_onboarding_state" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own learning streaks" ON "public"."learning_streaks" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own learning streaks" ON "public"."learning_streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own lesson feedback" ON "public"."lesson_feedback" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own literacy events" ON "public"."literacy_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users cannot delete onboarding state" ON "public"."user_onboarding_state" FOR DELETE USING (false);



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcement_campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcement_campaigns_admin_insert" ON "public"."announcement_campaigns" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE ("a"."user_id" = "auth"."uid"()))));



CREATE POLICY "announcement_campaigns_admin_read" ON "public"."announcement_campaigns" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE ("a"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."announcement_deliveries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcement_deliveries_admin_read" ON "public"."announcement_deliveries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "a"
  WHERE ("a"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."budget_adjustments_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budget_adjustments_log_self" ON "public"."budget_adjustments_log" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."budget_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budget_categories_self" ON "public"."budget_categories" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."budget_cycles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budget_cycles_self" ON "public"."budget_cycles" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."budget_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budget_templates_read_all" ON "public"."budget_templates" FOR SELECT USING (true);



ALTER TABLE "public"."budget_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budget_transactions_self" ON "public"."budget_transactions" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."debts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "debts_self" ON "public"."debts" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."income_sources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "income_sources_self" ON "public"."income_sources" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."learning_streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lessons_read_all" ON "public"."lessons" FOR SELECT USING (true);



ALTER TABLE "public"."literacy_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_tbill_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "live_tbill_rates_read_all" ON "public"."live_tbill_rates" FOR SELECT USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_self" ON "public"."profiles" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."push_devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_devices_self_insert" ON "public"."push_devices" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "push_devices_self_select" ON "public"."push_devices" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "push_devices_self_update" ON "public"."push_devices" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."recurring_expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recurring_expenses_self" ON "public"."recurring_expenses" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."savings_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "savings_goals_self" ON "public"."savings_goals" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "service_role_sub_log" ON "public"."subscription_activity_log" USING (true);



ALTER TABLE "public"."sme_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sme_categories_self" ON "public"."sme_categories" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."sme_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sme_profiles_self" ON "public"."sme_profiles" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."sme_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sme_transactions_self" ON "public"."sme_transactions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."spending_patterns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "spending_patterns_self" ON "public"."spending_patterns" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."subscription_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_self" ON "public"."subscriptions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."tax_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trigger_dismissals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trigger_dismissals_self" ON "public"."trigger_dismissals" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_activity_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_activity_log_self" ON "public"."user_activity_log" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_lesson_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_lesson_progress_self" ON "public"."user_lesson_progress" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_onboarding_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."utility_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "utility_logs_self" ON "public"."utility_logs" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."vault_deposits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vault_deposits_self" ON "public"."vault_deposits" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_learning_summary"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_learning_summary"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_learning_summary"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_subscription_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_subscription_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_subscription_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rank_tier"("t" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."rank_tier"("t" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rank_tier"("t" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_from_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_from_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_from_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_subscription_to_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_subscription_to_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_subscription_to_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."announcement_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."announcement_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."announcement_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."announcement_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."announcement_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."announcement_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."app_versions" TO "anon";
GRANT ALL ON TABLE "public"."app_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."app_versions" TO "service_role";



GRANT ALL ON TABLE "public"."budget_adjustments_log" TO "anon";
GRANT ALL ON TABLE "public"."budget_adjustments_log" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_adjustments_log" TO "service_role";



GRANT ALL ON TABLE "public"."budget_categories" TO "anon";
GRANT ALL ON TABLE "public"."budget_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_categories" TO "service_role";



GRANT ALL ON TABLE "public"."budget_cycles" TO "anon";
GRANT ALL ON TABLE "public"."budget_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_cycles" TO "service_role";



GRANT ALL ON TABLE "public"."budget_templates" TO "anon";
GRANT ALL ON TABLE "public"."budget_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_templates" TO "service_role";



GRANT ALL ON TABLE "public"."budget_transactions" TO "anon";
GRANT ALL ON TABLE "public"."budget_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."debts" TO "anon";
GRANT ALL ON TABLE "public"."debts" TO "authenticated";
GRANT ALL ON TABLE "public"."debts" TO "service_role";



GRANT ALL ON TABLE "public"."email_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."email_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."email_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."email_recipients" TO "anon";
GRANT ALL ON TABLE "public"."email_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."email_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON TABLE "public"."income_sources" TO "anon";
GRANT ALL ON TABLE "public"."income_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."income_sources" TO "service_role";



GRANT ALL ON TABLE "public"."learning_streaks" TO "anon";
GRANT ALL ON TABLE "public"."learning_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_feedback" TO "anon";
GRANT ALL ON TABLE "public"."lesson_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."literacy_events" TO "anon";
GRANT ALL ON TABLE "public"."literacy_events" TO "authenticated";
GRANT ALL ON TABLE "public"."literacy_events" TO "service_role";



GRANT ALL ON TABLE "public"."live_tbill_rates" TO "anon";
GRANT ALL ON TABLE "public"."live_tbill_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."live_tbill_rates" TO "service_role";



GRANT ALL ON TABLE "public"."module_completion_stats" TO "anon";
GRANT ALL ON TABLE "public"."module_completion_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."module_completion_stats" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_devices" TO "anon";
GRANT ALL ON TABLE "public"."push_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."push_devices" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_expenses" TO "anon";
GRANT ALL ON TABLE "public"."recurring_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_expenses" TO "service_role";



GRANT ALL ON TABLE "public"."savings_goals" TO "anon";
GRANT ALL ON TABLE "public"."savings_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."savings_goals" TO "service_role";



GRANT ALL ON TABLE "public"."sme_categories" TO "anon";
GRANT ALL ON TABLE "public"."sme_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."sme_categories" TO "service_role";



GRANT ALL ON TABLE "public"."sme_profiles" TO "anon";
GRANT ALL ON TABLE "public"."sme_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."sme_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sme_transactions" TO "anon";
GRANT ALL ON TABLE "public"."sme_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."sme_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."sms_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."sms_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."sms_recipients" TO "anon";
GRANT ALL ON TABLE "public"."sms_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."spending_patterns" TO "anon";
GRANT ALL ON TABLE "public"."spending_patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."spending_patterns" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."subscription_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."tax_config" TO "anon";
GRANT ALL ON TABLE "public"."tax_config" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_config" TO "service_role";



GRANT ALL ON TABLE "public"."trigger_dismissals" TO "anon";
GRANT ALL ON TABLE "public"."trigger_dismissals" TO "authenticated";
GRANT ALL ON TABLE "public"."trigger_dismissals" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."user_lesson_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_lesson_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_lesson_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_onboarding_state" TO "anon";
GRANT ALL ON TABLE "public"."user_onboarding_state" TO "authenticated";
GRANT ALL ON TABLE "public"."user_onboarding_state" TO "service_role";



GRANT ALL ON TABLE "public"."utility_logs" TO "anon";
GRANT ALL ON TABLE "public"."utility_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."utility_logs" TO "service_role";



GRANT ALL ON TABLE "public"."vault_deposits" TO "anon";
GRANT ALL ON TABLE "public"."vault_deposits" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_deposits" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







