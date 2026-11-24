import { createServerFn } from '@tanstack/react-start'
import {
  newsletterSubscriptionSchema,
  subscribeToNewsletter,
} from '../../server/lib/newsletter'

export const subscribeNewsletter = createServerFn({ method: 'POST' })
  .inputValidator(newsletterSubscriptionSchema)
  .handler(async ({ data }) => {
    try {
      return await subscribeToNewsletter(data)
    } catch (error) {
      console.error('[newsletter] subscribe failed', error)
      return {
        success: false as const,
        message: 'Unable to subscribe right now. Please try again shortly.',
      }
    }
  })
