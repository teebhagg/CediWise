import type { H3Event } from 'nitro/h3'
import { getHeader } from 'nitro/h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient, createAuthClient } from '../supabase/admin'
import { secureCompareHex, sha256Hex } from './crypto'
import type { SmsImportBody } from './types'

export type AuthFailureCode =
  | 'missing_authorization'
  | 'invalid_token'
  | 'webhook_unauthorized'

export type AuthResult =
  | { ok: true; userId: string; method: 'jwt' | 'webhook_key' }
  | { ok: false; status: 401; message: string; code: AuthFailureCode }

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  const token = match?.[1]?.trim()
  return token ? token : null
}

export function readAuthorizationHeader(event: H3Event): string | undefined {
  const fromH3 =
    getHeader(event, 'authorization') ?? getHeader(event, 'Authorization')
  if (fromH3) return fromH3

  const raw = event.node?.req?.headers?.authorization
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0]
  return undefined
}

async function validateJwtWithClient(
  client: SupabaseClient,
  token: string,
  label: string,
): Promise<{ userId: string } | null> {
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user?.id) {
    console.error(`[sms-import] getUser failed (${label})`, error?.message ?? error)
    return null
  }
  return { userId: data.user.id }
}

async function authWithJwt(token: string): Promise<AuthResult> {
  try {
    const admin = createAdminClient()
    const adminResult = await validateJwtWithClient(admin, token, 'admin')
    if (adminResult) {
      return { ok: true, userId: adminResult.userId, method: 'jwt' }
    }

    try {
      const authClient = createAuthClient()
      const anonResult = await validateJwtWithClient(authClient, token, 'anon')
      if (anonResult) {
        return { ok: true, userId: anonResult.userId, method: 'jwt' }
      }
    } catch (anonConfigError) {
      console.warn('[sms-import] anon auth client unavailable', anonConfigError)
    }

    return {
      ok: false,
      status: 401,
      message: 'Invalid or expired session token',
      code: 'invalid_token',
    }
  } catch (configError) {
    console.error('[sms-import] auth configuration error', configError)
    return {
      ok: false,
      status: 401,
      message: 'Auth service misconfigured',
      code: 'invalid_token',
    }
  }
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
    return {
      ok: false,
      status: 401,
      message: 'Unauthorized',
      code: 'webhook_unauthorized',
    }
  }

  const candidateHash = sha256Hex(webhookApiKey)
  if (!secureCompareHex(candidateHash, data.key_hash)) {
    return {
      ok: false,
      status: 401,
      message: 'Unauthorized',
      code: 'webhook_unauthorized',
    }
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
    return {
      ok: false,
      status: 401,
      message: 'Missing Authorization header',
      code: 'missing_authorization',
    }
  }

  const admin = createAdminClient()
  return authWithWebhookKey(admin, body.userId, body.webhookApiKey)
}
