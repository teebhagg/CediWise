import { createServerFn } from '@tanstack/react-start'
import { ReportRateLimitError, submitWebsiteReport } from '../../server/lib/reports'
import { websiteReportSchema } from '../lib/websiteReport'

export const submitReport = createServerFn({ method: 'POST' })
  .inputValidator(websiteReportSchema)
  .handler(async ({ data }) => {
    try {
      return await submitWebsiteReport(data)
    } catch (error) {
      if (error instanceof ReportRateLimitError) {
        return { success: false as const, message: error.message }
      }
      console.error('[reports] submit failed', error)
      return {
        success: false as const,
        message: 'Unable to send your report right now. Please try again shortly.',
      }
    }
  })
