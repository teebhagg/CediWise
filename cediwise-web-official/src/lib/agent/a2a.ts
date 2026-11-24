import { searchSite } from './search'
import { SITE_URL } from '@/lib/seo'
import {
  MAX_GROSS_MONTHLY_SALARY,
  computeGhanaTax2026Monthly,
} from '@/lib/ghanaTax'

/** A2A agent card, served at `/.well-known/agent-card.json`. */
export function a2aAgentCard(): Record<string, unknown> {
  return {
    name: 'CediWise Assistant',
    description:
      'Answers questions about CediWise: PAYE and SSNIT estimates for Ghana, budgeting in cedis, the SME ledger and VAT, pricing, and money lessons. Read-only.',
    supportedInterfaces: [
      {
        url: `${SITE_URL}/a2a`,
        protocolBinding: 'JSONRPC',
        protocolVersion: '1.0',
      },
    ],
    provider: { organization: 'CediWise', url: SITE_URL },
    version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: [
      {
        id: 'ghana-take-home',
        name: 'Estimate take-home pay',
        description:
          'Estimate SSNIT, PAYE, and net pay from a gross monthly salary in GHS, using 2026 GRA rules.',
        tags: ['ghana', 'paye', 'ssnit', 'salary'],
        examples: ['What is take-home pay on GHS 5,000 gross?'],
      },
      {
        id: 'site-search',
        name: 'Find CediWise pages',
        description:
          'Find the public CediWise page that covers a topic such as budgeting, VAT, pricing, or lessons.',
        tags: ['budgeting', 'sme', 'vat', 'pricing', 'lessons'],
        examples: ['Which CediWise page explains VAT for small businesses?'],
      },
    ],
  }
}

const SALARY_HINT = /\b(salary|gross|paye|ssnit|net|take[- ]?home|pay)\b/i

function formatGhs(value: number): string {
  return `GHS ${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Builds the reply text for a user message. Read-only and stateless. */
export function answerForMessage(text: string): string {
  const amountMatch = text.match(/(\d[\d,]*(?:\.\d+)?)/)
  const amount = amountMatch?.[1]
    ? Number(amountMatch[1].replace(/,/g, ''))
    : Number.NaN
  if (
    SALARY_HINT.test(text) &&
    Number.isFinite(amount) &&
    amount > 0 &&
    amount <= MAX_GROSS_MONTHLY_SALARY
  ) {
    const b = computeGhanaTax2026Monthly(amount)
    return [
      `Estimated monthly breakdown for ${formatGhs(amount)} gross (2026 GRA rules):`,
      `- SSNIT: ${formatGhs(b.ssnit)}`,
      `- NHIS: ${formatGhs(b.nhis)}`,
      `- PAYE: ${formatGhs(b.paye)}`,
      `- Net take-home: ${formatGhs(b.netTakeHome)}`,
      'This is an estimate. Check it against your payslip and official GRA guidance.',
    ].join('\n')
  }

  const hits = searchSite(text, 3)
  if (hits.length === 0) {
    return 'I could not find a matching CediWise page. Try asking about PAYE, SSNIT, budgeting, the SME ledger, or pricing.'
  }
  return [
    'These CediWise pages may help:',
    ...hits.map((hit) => `- ${hit.title}: ${hit.url}`),
  ].join('\n')
}

export function a2aSendMessageReply(
  message: unknown,
  newId: () => string,
): { status: 200 | 400; body: Record<string, unknown> } {
  const id = (message as { id?: unknown } | null)?.id ?? null
  if (
    typeof message !== 'object' ||
    message === null ||
    (message as { jsonrpc?: unknown }).jsonrpc !== '2.0'
  ) {
    return {
      status: 400,
      body: {
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid JSON-RPC request.' },
      },
    }
  }
  const method = (message as { method?: unknown }).method
  if (method !== 'SendMessage') {
    return {
      status: 400,
      body: {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${String(method)}` },
      },
    }
  }

  const params = (message as { params?: { message?: { parts?: unknown } } })
    .params
  const parts = Array.isArray(params?.message?.parts)
    ? params.message.parts
    : []
  const text = parts
    .map((part) =>
      typeof part === 'object' &&
      part !== null &&
      typeof (part as { text?: unknown }).text === 'string'
        ? (part as { text: string }).text
        : '',
    )
    .join(' ')
    .trim()
  if (text.length === 0 || text.length > 2000) {
    return {
      status: 400,
      body: {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'message.parts must contain text of 1 to 2000 characters.',
        },
      },
    }
  }

  return {
    status: 200,
    body: {
      jsonrpc: '2.0',
      id,
      result: {
        message: {
          role: 'ROLE_AGENT',
          messageId: newId(),
          parts: [{ text: answerForMessage(text) }],
        },
      },
    },
  }
}
