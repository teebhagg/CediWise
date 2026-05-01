/**
 * Value required by Postgres RLS policy `feedback_insert_mobile_app`
 * (`WITH CHECK (source = 'mobile_app')`) on `public.feedback`.
 * Use this for all authenticated mobile client inserts.
 */
export const FEEDBACK_SOURCE_MOBILE_APP = "mobile_app" as const;
