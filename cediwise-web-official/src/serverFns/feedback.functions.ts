import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const FeedbackCategorySchema = z.enum([
  'bug_report',
  'feature_request',
  'general_comment',
])

const FeedbackSubmissionSchema = z.object({
  category: FeedbackCategorySchema,
  rating: z
    .number()
    .int()
    .min(1, 'Rating is required')
    .max(5, 'Rating must be between 1 and 5'),
  feedback_text: z
    .string()
    .trim()
    .min(10, 'Feedback must be at least 10 characters')
    .max(2000, 'Feedback must be at most 2000 characters'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
})

const FeedbackListFiltersSchema = z.object({
  category: FeedbackCategorySchema.optional(),
  rating: z.number().int().min(1).max(5).optional(),
  is_beta: z.boolean().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().trim().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})

export type FeedbackSubmissionInput = z.infer<typeof FeedbackSubmissionSchema>
export type FeedbackCategory = z.infer<typeof FeedbackCategorySchema>
export type FeedbackListFilters = z.infer<typeof FeedbackListFiltersSchema>

export type FeedbackRecord = {
  id: string
  category: FeedbackCategory
  rating: number
  feedback_text: string
  email: string
  is_beta: boolean
  version: string
  source: string
  created_at: string
}

function getSupabaseConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase is not configured for feedback submission.')
  }

  return { supabaseUrl, serviceRoleKey }
}

async function supabaseRest<T>(
  path: string,
  init: RequestInit & { searchParams?: Record<string, string> } = {},
): Promise<T> {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()

  const url = new URL(`/rest/v1/${path}`, supabaseUrl)
  if (init.searchParams) {
    for (const [key, value] of Object.entries(init.searchParams)) {
      url.searchParams.set(key, value)
    }
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(init.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase request failed: ${response.status} ${text}`)
  }

  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

export async function getLatestMobileVersion(): Promise<string> {
  const rows = await supabaseRest<Array<{ version: string }>>('app_versions', {
    method: 'GET',
    headers: { Prefer: 'count=exact' },
    searchParams: {
      platform: 'eq.android',
      is_active: 'eq.true',
      order: 'updated_at.desc',
      limit: '1',
      select: 'version',
    },
  })

  const version = rows[0]?.version
  if (!version) {
    throw new Error('Version unavailable, try again shortly.')
  }

  return version
}

export const submitFeedback = createServerFn({ method: 'POST' })
  .inputValidator(FeedbackSubmissionSchema)
  .handler(async ({ data }) => {
    try {
      const version = await getLatestMobileVersion()
      const insertPayload = {
        category: data.category,
        rating: data.rating,
        feedback_text: data.feedback_text.trim(),
        email: data.email.trim().toLowerCase(),
        is_beta: true,
        version,
        source: 'website_feedback_page',
      }

      const rows = await supabaseRest<Array<{ id: string }>>('feedback', {
        method: 'POST',
        body: JSON.stringify(insertPayload),
        headers: {
          Prefer: 'return=representation',
        },
        searchParams: {
          select: 'id',
        },
      })

      return { success: true as const, feedbackId: rows[0]?.id ?? null }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to submit feedback. Please try again.'

      return {
        success: false as const,
        message,
      }
    }
  })

export const listFeedback = createServerFn({ method: 'POST' })
  .inputValidator(FeedbackListFiltersSchema)
  .handler(async ({ data }) => {
    const filters = FeedbackListFiltersSchema.parse(data)
    const from = (filters.page - 1) * filters.pageSize
    const to = from + filters.pageSize - 1

    const searchParams: Record<string, string> = {
      select: 'id,category,rating,feedback_text,email,is_beta,version,source,created_at',
      order: 'created_at.desc',
      offset: String(from),
      limit: String(filters.pageSize),
    }

    if (filters.category) searchParams.category = `eq.${filters.category}`
    if (filters.rating) searchParams.rating = `eq.${filters.rating}`
    if (typeof filters.is_beta === 'boolean') {
      searchParams.is_beta = `eq.${filters.is_beta}`
    }
    if (filters.fromDate) searchParams.created_at = `gte.${filters.fromDate}`
    if (filters.toDate) {
      searchParams.created_at = searchParams.created_at
        ? `${searchParams.created_at},lte.${filters.toDate}`
        : `lte.${filters.toDate}`
    }
    if (filters.search) {
      const safe = filters.search.replaceAll(',', ' ')
      searchParams.or = `email.ilike.*${safe}*,feedback_text.ilike.*${safe}*`
    }

    const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
    const url = new URL('/rest/v1/feedback', supabaseUrl)
    for (const [k, v] of Object.entries(searchParams)) {
      url.searchParams.set(k, v)
    }

    const response = await fetch(url.toString(), {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'count=exact',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to load feedback list.')
    }

    const totalHeader = response.headers.get('content-range')
    const total = totalHeader ? Number(totalHeader.split('/')[1] || '0') : 0
    const rows = (await response.json()) as Array<FeedbackRecord>

    return { data: rows, total }
  })
