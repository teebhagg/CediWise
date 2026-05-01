drop extension if exists "pg_net";

drop trigger if exists "announcement_campaigns_updated_at" on "public"."announcement_campaigns";

drop trigger if exists "trg_app_versions_updated_at" on "public"."app_versions";

drop trigger if exists "debts_updated_at" on "public"."debts";

drop trigger if exists "on_profile_inserted" on "public"."profiles";

drop trigger if exists "push_devices_updated_at" on "public"."push_devices";

drop trigger if exists "recurring_expenses_updated_at" on "public"."recurring_expenses";

drop trigger if exists "sme_categories_updated_at" on "public"."sme_categories";

drop trigger if exists "sme_profiles_updated_at" on "public"."sme_profiles";

drop trigger if exists "sme_transactions_updated_at" on "public"."sme_transactions";

drop trigger if exists "spending_patterns_updated_at" on "public"."spending_patterns";

drop trigger if exists "on_subscription_changed" on "public"."subscriptions";

drop trigger if exists "on_subscription_updated" on "public"."subscriptions";

drop trigger if exists "subscriptions_updated_at" on "public"."subscriptions";

drop trigger if exists "set_updated_at" on "public"."user_onboarding_state";

drop policy "announcement_campaigns_admin_insert" on "public"."announcement_campaigns";

drop policy "announcement_campaigns_admin_read" on "public"."announcement_campaigns";

drop policy "announcement_deliveries_admin_read" on "public"."announcement_deliveries";

drop policy "Public Read Active Configs" on "public"."tax_config";

alter table "public"."announcement_deliveries" drop constraint "announcement_deliveries_campaign_id_fkey";

alter table "public"."announcement_deliveries" drop constraint "announcement_deliveries_push_device_id_fkey";

alter table "public"."budget_adjustments_log" drop constraint "budget_adjustments_log_cycle_id_fkey";

alter table "public"."budget_categories" drop constraint "budget_categories_cycle_id_fkey";

alter table "public"."budget_categories" drop constraint "budget_categories_parent_id_fkey";

alter table "public"."budget_transactions" drop constraint "budget_transactions_category_id_fkey";

alter table "public"."budget_transactions" drop constraint "budget_transactions_cycle_id_fkey";

alter table "public"."budget_transactions" drop constraint "budget_transactions_debt_id_fkey";

alter table "public"."debts" drop constraint "debts_category_id_fkey";

alter table "public"."debts" drop constraint "debts_source_cycle_id_fkey";

alter table "public"."email_campaigns" drop constraint "email_campaigns_source_feedback_id_fkey";

alter table "public"."email_recipients" drop constraint "email_recipients_campaign_id_fkey";

alter table "public"."recurring_expenses" drop constraint "recurring_expenses_category_id_fkey";

alter table "public"."sms_recipients" drop constraint "sms_recipients_campaign_id_fkey";

alter table "public"."spending_patterns" drop constraint "spending_patterns_category_id_fkey";

alter table "public"."spending_patterns" drop constraint "spending_patterns_cycle_id_fkey";

alter table "public"."user_activity_log" drop constraint "user_activity_log_cycle_id_fkey";

alter table "public"."user_lesson_progress" drop constraint "user_lesson_progress_lesson_id_fkey";

alter table "public"."vault_deposits" drop constraint "vault_deposits_source_cycle_id_fkey";

drop index if exists "public"."one_active_config_per_country_year";

alter table "public"."lesson_feedback" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."literacy_events" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."tax_config" alter column "status" set default 'draft'::public.config_status;

alter table "public"."tax_config" alter column "status" set data type public.config_status using "status"::text::public.config_status;

CREATE UNIQUE INDEX one_active_config_per_country_year ON public.tax_config USING btree (country, year) WHERE (status = 'active'::public.config_status);

alter table "public"."announcement_deliveries" add constraint "announcement_deliveries_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.announcement_campaigns(id) ON DELETE CASCADE not valid;

alter table "public"."announcement_deliveries" validate constraint "announcement_deliveries_campaign_id_fkey";

alter table "public"."announcement_deliveries" add constraint "announcement_deliveries_push_device_id_fkey" FOREIGN KEY (push_device_id) REFERENCES public.push_devices(id) ON DELETE CASCADE not valid;

alter table "public"."announcement_deliveries" validate constraint "announcement_deliveries_push_device_id_fkey";

alter table "public"."budget_adjustments_log" add constraint "budget_adjustments_log_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.budget_cycles(id) ON DELETE SET NULL not valid;

alter table "public"."budget_adjustments_log" validate constraint "budget_adjustments_log_cycle_id_fkey";

alter table "public"."budget_categories" add constraint "budget_categories_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.budget_cycles(id) ON DELETE CASCADE not valid;

alter table "public"."budget_categories" validate constraint "budget_categories_cycle_id_fkey";

alter table "public"."budget_categories" add constraint "budget_categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.budget_categories(id) ON DELETE CASCADE not valid;

alter table "public"."budget_categories" validate constraint "budget_categories_parent_id_fkey";

alter table "public"."budget_transactions" add constraint "budget_transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.budget_categories(id) ON DELETE SET NULL not valid;

alter table "public"."budget_transactions" validate constraint "budget_transactions_category_id_fkey";

alter table "public"."budget_transactions" add constraint "budget_transactions_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.budget_cycles(id) ON DELETE CASCADE not valid;

alter table "public"."budget_transactions" validate constraint "budget_transactions_cycle_id_fkey";

alter table "public"."budget_transactions" add constraint "budget_transactions_debt_id_fkey" FOREIGN KEY (debt_id) REFERENCES public.debts(id) not valid;

alter table "public"."budget_transactions" validate constraint "budget_transactions_debt_id_fkey";

alter table "public"."debts" add constraint "debts_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.budget_categories(id) ON DELETE SET NULL not valid;

alter table "public"."debts" validate constraint "debts_category_id_fkey";

alter table "public"."debts" add constraint "debts_source_cycle_id_fkey" FOREIGN KEY (source_cycle_id) REFERENCES public.budget_cycles(id) ON DELETE SET NULL not valid;

alter table "public"."debts" validate constraint "debts_source_cycle_id_fkey";

alter table "public"."email_campaigns" add constraint "email_campaigns_source_feedback_id_fkey" FOREIGN KEY (source_feedback_id) REFERENCES public.feedback(id) ON DELETE SET NULL not valid;

alter table "public"."email_campaigns" validate constraint "email_campaigns_source_feedback_id_fkey";

alter table "public"."email_recipients" add constraint "email_recipients_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id) ON DELETE CASCADE not valid;

alter table "public"."email_recipients" validate constraint "email_recipients_campaign_id_fkey";

alter table "public"."recurring_expenses" add constraint "recurring_expenses_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.budget_categories(id) ON DELETE SET NULL not valid;

alter table "public"."recurring_expenses" validate constraint "recurring_expenses_category_id_fkey";

alter table "public"."sms_recipients" add constraint "sms_recipients_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.sms_campaigns(id) ON DELETE CASCADE not valid;

alter table "public"."sms_recipients" validate constraint "sms_recipients_campaign_id_fkey";

alter table "public"."spending_patterns" add constraint "spending_patterns_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.budget_categories(id) ON DELETE CASCADE not valid;

alter table "public"."spending_patterns" validate constraint "spending_patterns_category_id_fkey";

alter table "public"."spending_patterns" add constraint "spending_patterns_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.budget_cycles(id) ON DELETE CASCADE not valid;

alter table "public"."spending_patterns" validate constraint "spending_patterns_cycle_id_fkey";

alter table "public"."user_activity_log" add constraint "user_activity_log_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES public.budget_cycles(id) ON DELETE SET NULL not valid;

alter table "public"."user_activity_log" validate constraint "user_activity_log_cycle_id_fkey";

alter table "public"."user_lesson_progress" add constraint "user_lesson_progress_lesson_id_fkey" FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE not valid;

alter table "public"."user_lesson_progress" validate constraint "user_lesson_progress_lesson_id_fkey";

alter table "public"."vault_deposits" add constraint "vault_deposits_source_cycle_id_fkey" FOREIGN KEY (source_cycle_id) REFERENCES public.budget_cycles(id) ON DELETE SET NULL not valid;

alter table "public"."vault_deposits" validate constraint "vault_deposits_source_cycle_id_fkey";

create or replace view "public"."module_completion_stats" as  SELECT module_id,
    count(DISTINCT user_id) AS total_users,
    avg(
        CASE
            WHEN (event_type = 'module_completed'::text) THEN 1
            ELSE 0
        END) AS completion_rate,
    count(*) FILTER (WHERE (event_type = 'lesson_viewed'::text)) AS total_views,
    count(*) FILTER (WHERE (event_type = 'quiz_attempted'::text)) AS total_quiz_attempts
   FROM public.literacy_events
  WHERE (module_id IS NOT NULL)
  GROUP BY module_id;



  create policy "announcement_campaigns_admin_insert"
  on "public"."announcement_campaigns"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.admin_users a
  WHERE (a.user_id = auth.uid()))));



  create policy "announcement_campaigns_admin_read"
  on "public"."announcement_campaigns"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.admin_users a
  WHERE (a.user_id = auth.uid()))));



  create policy "announcement_deliveries_admin_read"
  on "public"."announcement_deliveries"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.admin_users a
  WHERE (a.user_id = auth.uid()))));



  create policy "Public Read Active Configs"
  on "public"."tax_config"
  as permissive
  for select
  to public
using ((status = 'active'::public.config_status));


CREATE TRIGGER announcement_campaigns_updated_at BEFORE UPDATE ON public.announcement_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_app_versions_updated_at BEFORE UPDATE ON public.app_versions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TRIGGER debts_updated_at BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_profile_inserted BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_subscription();

CREATE TRIGGER push_devices_updated_at BEFORE UPDATE ON public.push_devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER recurring_expenses_updated_at BEFORE UPDATE ON public.recurring_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sme_categories_updated_at BEFORE UPDATE ON public.sme_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sme_profiles_updated_at BEFORE UPDATE ON public.sme_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sme_transactions_updated_at BEFORE UPDATE ON public.sme_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER spending_patterns_updated_at BEFORE UPDATE ON public.spending_patterns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_subscription_changed AFTER INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();

CREATE TRIGGER on_subscription_updated AFTER INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_to_profile();

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_onboarding_state FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


