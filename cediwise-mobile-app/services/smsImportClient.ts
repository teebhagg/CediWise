import * as Crypto from "expo-crypto";
import { getSmsImportApiUrl, SMS_IMPORT_BATCH_MAX } from "@/constants/smsImport";
import { getStoredAuthData, refreshStoredSession } from "@/utils/auth";
import { log } from "@/utils/logger";
import { buildMoMoImportCandidate, type MoMoImportCandidate } from "@/services/momoImportCandidate";
import { supabasePublicKey } from "@/utils/supabase";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? null;

export type SmsImportStatus = "parsed" | "duplicate" | "skipped" | "failed" | "needs_review" | "retryable" | "reversed";

export type SmsImportApiResult = {
  ok: true;
  status: SmsImportStatus;
  importLogId?: string;
  transactionId?: string;
  parsed?: Record<string, unknown>;
  error?: string;
  errorCode?: "internal_error" | "no_active_budget_cycle";
};

export type SmsImportBatchSummary = {
  total: number;
  parsed: number;
  duplicate: number;
  skipped: number;
  failed: number;
  needs_review: number;
  retryable: number;
  reversed: number;
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
export type SmsImportCandidatePayload = {
  candidate: MoMoImportCandidate;
};
export type SmsImportPayload = SmsImportMessagePayload | SmsImportCandidatePayload;

export class SmsImportClientError extends Error {
  constructor(
    message: string,
    readonly code:
      | "unauthorized"
      | "no_active_budget_cycle"
      | "invalid_payload"
      | "invalid_candidate"
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
      authCode === "invalid_candidate" || code === "invalid_candidate"
        ? "invalid_candidate"
        : "invalid_payload",
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
  const url = getSmsImportApiUrl();
  if (!url) {
    throw new SmsImportClientError(
      "MoMo SMS import is not configured for this build.",
      "server",
    );
  }
  const token = await resolveAccessToken();
  const tokenDiagnostics = logTokenDiagnostics(token);

  log.warn("smsImportClient: POST request", {
    url,
    messageCount: Array.isArray((body as { messages?: unknown[] }).messages)
      ? ((body as { messages?: unknown[] }).messages as unknown[]).length
      : 1,
    hasPublicKey: Boolean(supabasePublicKey),
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    // Vercel/CDN may strip Authorization; send a fallback custom header too.
    "X-Supabase-Access-Token": token,
    "Content-Type": "application/json",
  };
  if (supabasePublicKey) {
    headers.apikey = supabasePublicKey;
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

function isCandidatePayload(payload: SmsImportPayload): payload is SmsImportCandidatePayload {
  return "candidate" in payload;
}

function candidateForApi(payload: SmsImportCandidatePayload): Record<string, unknown> {
  return { ...payload.candidate };
}

function unwrapImportResult(result: SmsImportApiResult | SmsImportBatchResult): SmsImportApiResult {
  if ("results" in result) {
    return result.results[0] ?? { ok: true, status: "failed", error: "empty_batch" };
  }
  return result;
}

export async function importSmsMessage(
  payload: SmsImportPayload,
): Promise<SmsImportApiResult> {
  const result = await postSmsImportBody(isCandidatePayload(payload) ? { candidate: candidateForApi(payload) } : payload);
  return unwrapImportResult(result);
}

export async function importSmsBatch(
  messages: SmsImportPayload[],
): Promise<SmsImportBatchResult> {
  if (messages.length === 0) {
    return {
      ok: true,
      results: [],
      summary: { total: 0, parsed: 0, duplicate: 0, skipped: 0, failed: 0, needs_review: 0, retryable: 0, reversed: 0 },
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
        needs_review: single.status === "needs_review" ? 1 : 0,
        retryable: single.status === "retryable" ? 1 : 0,
        reversed: single.status === "reversed" ? 1 : 0,
      },
    };
  }

  const chunks: SmsImportPayload[][] = [];
  for (let i = 0; i < messages.length; i += SMS_IMPORT_BATCH_MAX) {
    chunks.push(messages.slice(i, i + SMS_IMPORT_BATCH_MAX));
  }

  const results: SmsImportApiResult[] = [];
  for (const chunk of chunks) {
    const rawMessages = chunk.filter((item): item is SmsImportMessagePayload => !isCandidatePayload(item));
    const candidates = chunk.filter(isCandidatePayload).map(candidateForApi);
    const batch = await postSmsImportBody({
      ...(rawMessages.length ? { messages: rawMessages } : {}),
      ...(candidates.length ? { candidates } : {}),
    });
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
    { parsed: 0, duplicate: 0, skipped: 0, failed: 0, needs_review: 0, retryable: 0, reversed: 0 },
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
  address?: string | null;
  body: string;
  date?: number;
}, categoryId: string | null = null, classification?: "expense" | "transfer" | null): Promise<SmsImportCandidatePayload | null> {
  return buildImportPayload(message, categoryId, classification);
}

async function buildImportPayload(
  message: { address?: string | null; body: string; date?: number },
  categoryId: string | null,
  classification?: "expense" | "transfer" | null,
): Promise<SmsImportCandidatePayload | null> {
  const receivedAt = message.date != null && Number.isFinite(message.date)
    ? new Date(message.date)
    : null;
  const hasValidDate = receivedAt != null && Number.isFinite(receivedAt.getTime());
  if (!hasValidDate || !receivedAt || message.body.length > 4000) return null;
  const candidate = buildMoMoImportCandidate(
    { address: message.address ?? undefined, body: message.body, date: receivedAt.getTime() },
    categoryId,
  );
  if (!candidate) return null;

  const legacyDedupeKey = candidate.eventType !== "reversal" && !candidate.receiptId
    ? `hash:${await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      message.body.replace(/\s+/g, " ").trim(),
    )}`
    : undefined;
  return {
    candidate: {
      ...candidate,
      ...(legacyDedupeKey ? { legacyDedupeKey } : {}),
      ...(classification === undefined ? {} : { classification }),
    },
  };
}
