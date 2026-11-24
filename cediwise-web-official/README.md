# CediWise public website

## CediWise Money Brief

The public newsletter stores subscriber consent in Supabase and sends mail through Resend.

Before deploying the newsletter:

1. Apply `supabase/migrations/20260922233335_newsletter_subscribers.sql`.
2. Verify the `cediwise.app` domain in Resend and authorize `hello@cediwise.app` as the From address.
3. Set these server-only environment variables for the public website and `send-email-campaign` Supabase Edge Function:
   - `RESEND_API_KEY`
   - `NEWSLETTER_UNSUBSCRIBE_SECRET` (a unique random value of at least 32 characters)
   - `PUBLIC_SITE_URL=https://cediwise.app`
4. Set `EMAIL_FROM_ADDRESS=hello@cediwise.app` on `send-email-campaign`.
5. Subscribe a real test address in the existing website footer, confirm the welcome email arrives, then use its unsubscribe link. The address must be excluded from a subsequent dashboard newsletter campaign.

The website service role key is server-only. Do not expose it, the Resend key, or the unsubscribe secret through `VITE_` or other browser-visible environment variables.
