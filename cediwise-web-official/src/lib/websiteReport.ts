import { z } from 'zod'

/** Client-safe schema for the public "Report an issue" form. Shared by the page and the server function. */

export const WEBSITE_REPORT_CATEGORIES = [
  'app_problem',
  'account_or_payment',
  'content_or_data',
  'safety_or_abuse',
  'other',
] as const

export type WebsiteReportCategory = (typeof WEBSITE_REPORT_CATEGORIES)[number]

export const WEBSITE_REPORT_CATEGORY_LABELS: Record<WebsiteReportCategory, string> = {
  app_problem: 'App problem',
  account_or_payment: 'Account or payment',
  content_or_data: 'Content or data',
  safety_or_abuse: 'Abuse or safety',
  other: 'Something else',
}

export const websiteReportSchema = z.object({
  category: z.enum(WEBSITE_REPORT_CATEGORIES, { message: 'Please select a category' }),
  name: z
    .string()
    .trim()
    .max(120, 'Name must be at most 120 characters')
    .nullish()
    .transform((value) => (value ? value : null)),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  page: z
    .string()
    .trim()
    .max(300, 'Page must be at most 300 characters')
    .nullish()
    .transform((value) => (value ? value : null)),
  message: z
    .string()
    .trim()
    .min(10, 'Please describe the problem in at least 10 characters')
    .max(3000, 'Message must be at most 3000 characters'),
  /** Honeypot. Hidden from people and autofill; bots that fill it are dropped. */
  do_not_fill: z.string().max(500).optional(),
})

export type WebsiteReportInput = z.input<typeof websiteReportSchema>
export type WebsiteReportData = z.output<typeof websiteReportSchema>
