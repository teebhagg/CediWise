import { createServerFn } from '@tanstack/react-start'
import { google } from 'googleapis'
import { z } from 'zod'

const GROUP_EMAIL = 'cediwise-test@googlegroups.com' // Fix if @googlegroups.com

const BetaJoinSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Invalid email'),
})

export const joinBetaGroup = createServerFn({ method: 'POST' })
  .inputValidator(BetaJoinSchema)
  .handler(async ({ data }) => {
    try {
      // Auth with service account (server-only secret)
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY || '{}'),
        scopes: ['https://www.googleapis.com/auth/admin.directory.group'],
      })
      const admin = google.admin({ version: 'directory_v1', auth })

      // Add member
      await admin.members.insert({
        groupKey: GROUP_EMAIL,
        requestBody: { email: data.email, role: 'MEMBER' },
      })

      // Optional: Log to console or DB (e.g., if using Supabase, insert here)
      console.log(`Added ${data.name} <${data.email}> to beta group`)

      return { success: true }
    } catch (err: any) {
      console.error('Group add error:', err)
      // Check for "Member already exists" error
      if (
        err.code === 409 ||
        (err.errors && err.errors[0]?.reason === 'duplicate')
      ) {
        return { success: true }
      }
      throw new Error('Failed to add to beta group — please try again later.')
    }
  })
