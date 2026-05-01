# Legacy SQL inventory

**Source of truth for live schema:** run `supabase db pull` after linking — the generated `*_remote_schema.sql` supersedes everything here.

| Path (under `legacy/`) | Classification | Notes |
| --- | --- | --- |
| `cediwise-dashboard_db_migrations/*.sql` | applied (historical) | Assumed applied to shared prod Postgres; kept for audit. |
| `cediwise-web-official_db_migrations/*.sql` | applied (historical) | Same. |
| `cediwise-mobile-app_supabase_migrations/*.sql` | applied (historical) | Ordered migrations previously used from mobile repo. |
| `cediwise-mobile-app_supabase_loose/*.sql` | orphan / applied | Ad-hoc DDL; likely applied via SQL editor or one-off runs — **verify against `db pull` baseline**. |
| `cediwise-mobile-app_supabase_schema_sql.sql` | dead (reference) | Old offline-first snapshot; **known stale** vs production. Do not use as baseline. |
| `supabase/seeds/seed_*.sql` (repo root) | seed | Loaded only on `supabase db reset` via `config.toml`; not production migrations. |

## Per-file listing

### cediwise-dashboard_db_migrations

| File | Classification |
| --- | --- |
| `2026-03-02_email_campaigns.sql` | applied (historical) |
| `2026-03-03_email_rich_body_join_beta.sql` | applied (historical) |
| `2026-03-16_add_new_email_templates.sql` | applied (historical) |
| `2026-03-19_add_user_onboarding_state.sql` | applied (historical) |
| `20260330000000_subscription_activity_log.sql` | applied (historical) |
| `20260411120000_announcement_target_user.sql` | applied (historical) |
| `20260415_create_sms_campaigns.sql` | applied (historical) |

### cediwise-web-official_db_migrations

| File | Classification |
| --- | --- |
| `2026-03-02_feedback_and_app_versions.sql` | applied (historical) |

### cediwise-mobile-app_supabase_loose

| File | Classification |
| --- | --- |
| `2026-02-02_profiles_budget_personalization_vitals.sql` | orphan / applied |
| `2026-02-03_budget_utilities_under_needs.sql` | orphan / applied |
| `2026-02-04_budget_adjustments_log_table.sql` | orphan / applied |
| `2026-02-04_budget_categories_enhancements.sql` | orphan / applied |
| `2026-02-04_budget_cycles_enhancements.sql` | orphan / applied |
| `2026-02-04_budget_templates_table.sql` | orphan / applied |
| `2026-02-04_debts_table.sql` | orphan / applied |
| `2026-02-04_profiles_enhancements.sql` | orphan / applied |
| `2026-02-04_recurring_expenses_table.sql` | orphan / applied |
| `2026-02-04_spending_patterns_table.sql` | orphan / applied |
| `2026-02-04_user_activity_log_table.sql` | orphan / applied |
| `2026-02-16_flm_tables.sql` | orphan / applied |
| `2026-02-17_flm_analytics.sql` | orphan / applied |
| `2026-02-18_profiles_debt_obligations.sql` | orphan / applied |
| `2026-02-22_admin_users.sql` | orphan / applied |
| `2026-02-22_lessons_content.sql` | orphan / applied |
| `2026-03-01_push_notifications.sql` | orphan / applied |
| `2026-03-02_feedback_and_app_versions.sql` | orphan / applied |
| `2026-03-25_budget_engine_mode.sql` | orphan / applied |
| `20260407235057_profiles_version.sql` | orphan / applied |

### cediwise-mobile-app_supabase_migrations

| File | Classification |
| --- | --- |
| `20260327000000_subscriptions.sql` | applied (historical) |
| `20260327000100_profiles_tier.sql` | applied (historical) |
| `20260327000200_sme_profiles.sql` | applied (historical) |
| `20260327000300_sme_categories.sql` | applied (historical) |
| `20260327000400_sme_transactions.sql` | applied (historical) |
| `20260327000500_seed_sme_categories.sql` | applied (historical) |
| `20260327000600_sme_categories_updated_at.sql` | applied (historical) |
| `20260329000100_get_user_count_rpc.sql` | applied (historical) |
| `20260329000200_fix_debts_cycle_fk.sql` | applied (historical) |
| `20260329000300_subscription_refactor.sql` | applied (historical) |
| `2026-03-08_budget_category_icon.sql` | applied (historical) |
| `2026-03-10_budget_transaction_debt_id.sql` | applied (historical) |
| `2026-03-10_debt_source_cycle_id.sql` | applied (historical) |
| `20260402_cash_flow_columns.sql` | applied (historical) |
| `20260408023500_app_versions_release_notes_requires_update.sql` | applied (historical) |
| `20260410120000_recurring_expenses_auto_allocate.sql` | applied (historical) |
| `20260410140000_vault_initial_balance.sql` | applied (historical) |
| `20260410140100_vault_deposits.sql` | applied (historical) |

### Schema snapshot (stale)

| File | Classification |
| --- | --- |
| `cediwise-mobile-app_supabase_schema_sql.sql` | dead (reference only) |

**Total legacy `.sql` files:** 47 under `legacy/` (includes one archived `schema` snapshot file).  
**Active seeds:** `supabase/seeds/seed_budget_templates.sql`, `supabase/seeds/seed_flm_lessons.sql`.
