import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '../supabase/admin'
import { secureCompareHex, sha256Hex } from './crypto'
import type { SmsImportBody } from './types'

export type AuthResult =
  | { ok: true; userId: string; method: 'jwt' | 'webhook_key' }
  | { ok: false; status: 401; message: string }

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1]?.trim() ?? null
}

async function authWithJwt(token: string): Promise<AuthResult> {
  // Service-role client can validate user JWTs; avoids relying on a separate anon key
  // being present in server env (common gap on Vercel vs mobile builds).
  const client = createAdminClient()
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user?.id) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }
  return { ok: true, userId: data.user.id, method: 'jwt' }
}

async function authWithWebhookKey(
  admin: SupabaseClient,
  userId: string,
  webhookApiKey: string,
): Promise<AuthResult> {
  const { data, error } = await admin
    .from('sms_webhook_credentials')
    .select('key_hash, enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data?.enabled) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const candidateHash = sha256Hex(webhookApiKey)
  if (!secureCompareHex(candidateHash, data.key_hash)) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  await admin
    .from('sms_webhook_credentials')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_id', userId)

  return { ok: true, userId, method: 'webhook_key' }
}

export async function authenticateSmsImportRequest(
  authorizationHeader: string | undefined,
  body: SmsImportBody,
): Promise<AuthResult> {
  const bearer = extractBearerToken(authorizationHeader)
  if (bearer) {
    return authWithJwt(bearer)
  }

  if (!body.userId || !body.webhookApiKey) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const admin = createAdminClient()
  return authWithWebhookKey(admin, body.userId, body.webhookApiKey)
}
