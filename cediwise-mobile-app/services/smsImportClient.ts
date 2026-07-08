import { getSmsImportApiUrl, SMS_IMPORT_BATCH_MAX } from "@/constants/smsImport";
import { getStoredAuthData, refreshStoredSession } from "@/utils/auth";
import { log } from "@/utils/logger";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? null;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null;

export type SmsImportStatus = "parsed" | "duplicate" | "skipped" | "failed";

export type SmsImportApiResult = {
  ok: true;
  status: SmsImportStatus;
  importLogId?: string;
  transactionId?: string;
  parsed?: Record<string, unknown>;
  error?: string;
};

export type SmsImportBatchSummary = {
  total: number;
  parsed: number;
  duplicate: number;
  skipped: number;
  failed: number;
};

export type SmsImportBatchResult = {
  ok: true;
  results: SmsImportApiResult[];
  summary: SmsImportBatchSummary;
};

export type SmsImportMessagePayload = {
  message: string;
  sender?: string;
  receivedAt?: string;
};

export class SmsImportClientError extends Error {
  constructor(
    message: string,
    readonly code:
      | "unauthorized"
      | "no_active_budget_cycle"
      | "invalid_payload"
      | "network"
      | "server"
      | "unknown",
    readonly status?: number,
  ) {
    super(message);
    this.name = "SmsImportClientError";
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function logTokenDiagnostics(token: string): Record<string, unknown> {
  const claims = decodeJwtPayload(token);
  const exp = typeof claims?.exp === "number" ? claims.exp : null;
  const nowSec = Math.floor(Date.now() / 1000);
  const diagnostics = {
    supabaseUrl: SUPABASE_URL,
    tokenLength: token.length,
    tokenPrefix: token.slice(0, 8),
    sub: claims?.sub ?? null,
    role: claims?.role ?? null,
    iss: claims?.iss ?? null,
    aud: claims?.aud ?? null,
    exp,
    expiresInSec: exp != null ? exp - nowSec : null,
    isExpired: exp != null ? exp <= nowSec : null,
    issuerMatchesApp:
      typeof claims?.iss === "string" && SUPABASE_URL
        ? claims.iss.startsWith(SUPABASE_URL.replace(/\/$/, ""))
        : null,
  };
  log.warn("smsImportClient: token diagnostics", diagnostics);
  return diagnostics;
}

async function resolveAccessToken(): Promise<string> {
  await refreshStoredSession();
  const auth = await getStoredAuthData({ allowExpired: false });
  if (!auth?.accessToken?.trim()) {
    log.warn("smsImportClient: no valid access token after refresh");
    throw new SmsImportClientError("Not signed in", "unauthorized", 401);
  }
  return auth.accessToken;
}

function mapApiError(status: number, body: unknown): SmsImportClientError {
  const payload =
    body && typeof body === "object"
      ? (body as { error?: string; message?: string; code?: string })
      : {};
  const code = payload.error;
  const authCode = payload.code;

  if (status === 401) {
    const detail =
      authCode === "missing_authorization"
        ? "Missing Authorization header"
        : authCode === "invalid_token"
          ? "Invalid or expired session token"
          : payload.error ?? "Unauthorized";
    return new SmsImportClientError(detail, "unauthorized", status);
  }
  if (status === 422 || code === "no_active_budget_cycle") {
    return new SmsImportClientError(
      payload.message ?? "Set up an active budget cycle before importing MoMo expenses.",
      "no_active_budget_cycle",
      status,
    );
  }
  if (status === 400) {
    return new SmsImportClientError(
      payload.message ?? "Invalid SMS payload",
      "invalid_payload",
      status,
    );
  }
  if (status >= 500) {
    return new SmsImportClientError("Import service unavailable", "server", status);
  }
  const fallback =
    payload.message ??
    (code ? `Import failed (${code}, HTTP ${status})` : `Import failed (HTTP ${status})`);
  return new SmsImportClientError(
    fallback,
    "unknown",
    status,
  );
}

async function postSmsImportBody(
  body: Record<string, unknown>,
): Promise<SmsImportApiResult | SmsImportBatchResult> {
  const token = await resolveAccessToken();
  const url = getSmsImportApiUrl();
  const tokenDiagnostics = logTokenDiagnostics(token);

  log.warn("smsImportClient: POST request", {
    url,
    messageCount: Array.isArray((body as { messages?: unknown[] }).messages)
      ? ((body as { messages?: unknown[] }).messages as unknown[]).length
      : 1,
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    // Vercel/CDN may strip Authorization; send a fallback custom header too.
    "X-Supabase-Access-Token": token,
    "Content-Type": "application/json",
  };
  if (SUPABASE_ANON_KEY) {
    headers.apikey = SUPABASE_ANON_KEY;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    log.warn("smsImportClient: network error", error);
    throw new SmsImportClientError("Network error", "network");
  }

  const rawText = await response.text();
  let json: unknown = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    log.warn("smsImportClient: request failed", {
      url,
      status: response.status,
      statusText: response.statusText,
      wwwAuthenticate: response.headers.get("www-authenticate"),
      contentType: response.headers.get("content-type"),
      body: json ?? rawText.slice(0, 500),
      tokenDiagnostics,
    });
    throw mapApiError(response.status, json);
  }

  log.warn("smsImportClient: request ok", { url, status: response.status });
  return json as SmsImportApiResult | SmsImportBatchResult;
}

export async function importSmsMessage(
  payload: SmsImportMessagePayload,
): Promise<SmsImportApiResult> {
  const result = await postSmsImportBody(payload);
  if ("results" in result) {
    return result.results[0] ?? { ok: true, status: "failed", error: "empty_batch" };
  }
  return result;
}

export async function importSmsBatch(
  messages: SmsImportMessagePayload[],
): Promise<SmsImportBatchResult> {
  if (messages.length === 0) {
    return {
      ok: true,
      results: [],
      summary: { total: 0, parsed: 0, duplicate: 0, skipped: 0, failed: 0 },
    };
  }

  if (messages.length === 1) {
    const single = await importSmsMessage(messages[0]!);
    return {
      ok: true,
      results: [single],
      summary: {
        total: 1,
        parsed: single.status === "parsed" ? 1 : 0,
        duplicate: single.status === "duplicate" ? 1 : 0,
        skipped: single.status === "skipped" ? 1 : 0,
        failed: single.status === "failed" ? 1 : 0,
      },
    };
  }

  const chunks: SmsImportMessagePayload[][] = [];
  for (let i = 0; i < messages.length; i += SMS_IMPORT_BATCH_MAX) {
    chunks.push(messages.slice(i, i + SMS_IMPORT_BATCH_MAX));
  }

  const results: SmsImportApiResult[] = [];
  for (const chunk of chunks) {
    const batch = await postSmsImportBody({ messages: chunk });
    if ("results" in batch) {
      results.push(...batch.results);
    } else {
      results.push(batch);
    }
  }

  const summary = results.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    { parsed: 0, duplicate: 0, skipped: 0, failed: 0 },
  );

  return {
    ok: true,
    results,
    summary: {
      total: results.length,
      ...summary,
    },
  };
}

export function toImportPayload(message: {
  address?: string;
  body: string;
  date?: number;
}): SmsImportMessagePayload {
  return {
    message: message.body,
    sender: message.address,
    receivedAt:
      message.date != null && Number.isFinite(message.date)
        ? new Date(message.date).toISOString()
        : undefined,
  };
}
