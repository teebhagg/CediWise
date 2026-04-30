-- Add new template keys to the email_campaigns_template_key_check constraint
alter table public.email_campaigns
  drop constraint if exists email_campaigns_template_key_check;

alter table public.email_campaigns
  add constraint email_campaigns_template_key_check
  check (template_key in (
    'general_update', 
    'support_response', 
    'feedback_followup', 
    'join_beta', 
    'app_update', 
    'customer_checkin', 
    'maintenance_notice', 
    'educational_tip'
  ));
