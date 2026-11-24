import { searchSite } from './search'
import {
  MAX_GROSS_MONTHLY_SALARY,
  computeGhanaTax2026Monthly,
} from '@/lib/ghanaTax'
import { SITE_URL } from '@/lib/seo'

/**
 * WebMCP tools for in-page agents (proposed W3C WebMCP API). Tools are
 * registered through `document.modelContext.registerTool()` only where the
 * browser exposes that API. Nothing is registered elsewhere.
 */

export interface WebMcpTool {
  name: string
  title?: string
  description: string
  inputSchema?: Record<string, unknown>
  annotations?: {
    readOnlyHint?: boolean
    untrustedContentHint?: boolean
    consequentialHint?: boolean
  }
  execute: (
    input: unknown,
    options: { signal: AbortSignal },
  ) => Promise<unknown>
}

export interface WebMcpHost {
  registerTool: (
    tool: WebMcpTool,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown>
}

/** Returns the WebMCP host when the document exposes one, otherwise `undefined`. */
export function getWebMcpHost(doc: object | undefined): WebMcpHost | undefined {
  if (!doc || !('modelContext' in doc)) return undefined
  const host = (doc as { modelContext?: Partial<WebMcpHost> }).modelContext
  return host && typeof host.registerTool === 'function'
    ? (host as WebMcpHost)
    : undefined
}

const PUBLIC_PAGES = [
  { path: '/', title: 'Home' },
  { path: '/pricing', title: 'Pricing' },
  { path: '/salary-calculator', title: 'Salary calculator guide' },
  { path: '/try-salary-calculator', title: 'Try salary calculator' },
  { path: '/budgeting-tool', title: 'Budgeting tool' },
  { path: '/sme-ledger', title: 'SME ledger' },
  { path: '/financial-literacy', title: 'Financial literacy' },
  { path: '/about', title: 'About' },
  { path: '/contact', title: 'Contact' },
] as const

const round2 = (value: number) => Math.round(value * 100) / 100

function readSalary(input: unknown): number {
  const value =
    typeof input === 'object' && input !== null
      ? (input as { grossMonthlySalary?: unknown }).grossMonthlySalary
      : undefined
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > MAX_GROSS_MONTHLY_SALARY
  ) {
    throw new Error(
      `grossMonthlySalary must be a number from 1 to ${MAX_GROSS_MONTHLY_SALARY} (GHS).`,
    )
  }
  return value
}

export const WEBMCP_TOOLS: ReadonlyArray<WebMcpTool> = [
  {
    name: 'estimate_ghana_take_home',
    title: 'Estimate Ghana take-home pay',
    description:
      'Estimate monthly SSNIT, NHIS, PAYE, and net take-home pay in Ghana from a gross monthly salary in GHS, using the 2026 GRA rules. This is an estimate, not tax advice.',
    inputSchema: {
      type: 'object',
      properties: {
        grossMonthlySalary: {
          type: 'number',
          minimum: 1,
          maximum: MAX_GROSS_MONTHLY_SALARY,
          description: 'Gross monthly salary in GHS',
        },
      },
      required: ['grossMonthlySalary'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (input) => {
      const gross = readSalary(input)
      const breakdown = computeGhanaTax2026Monthly(gross)
      return {
        currency: 'GHS',
        grossMonthly: round2(gross),
        ssnit: round2(breakdown.ssnit),
        nhis: round2(breakdown.nhis),
        paye: round2(breakdown.paye),
        netTakeHome: round2(breakdown.netTakeHome),
        rules:
          '2026 GRA PAYE bands and SSNIT rules (fallback 2026 tax configuration in the web calculator)',
        note: 'Estimate only. Check it against your payslip and official GRA guidance.',
      }
    },
  },
  {
    name: 'list_public_pages',
    title: 'List public CediWise pages',
    description:
      'List the public CediWise pages with their absolute URLs. Use it to find the page for a topic.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async () => ({
      pages: PUBLIC_PAGES.map((page) => ({
        title: page.title,
        url: `${SITE_URL}${page.path === '/' ? '' : page.path}`,
      })),
    }),
  },
  {
    name: 'search_site',
    title: 'Search CediWise pages',
    description:
      'Search the public CediWise pages by keyword (for example "PAYE", "SME VAT", "budget"). Returns matching page titles, URLs, and descriptions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          minLength: 1,
          maxLength: 500,
          description: 'Keywords or a short question',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (input) => {
      const query =
        typeof input === 'object' && input !== null
          ? (input as { query?: unknown }).query
          : undefined
      if (
        typeof query !== 'string' ||
        query.trim().length === 0 ||
        query.length > 500
      ) {
        throw new Error(
          'query must be a non-empty string of at most 500 characters.',
        )
      }
      return { results: searchSite(query, 5) }
    },
  },
]

/** Registers every WebMCP tool on the host. Returns the registered tool names. */
export async function registerWebMcpTools(
  host: WebMcpHost,
  signal?: AbortSignal,
): Promise<Array<string>> {
  const names: Array<string> = []
  for (const tool of WEBMCP_TOOLS) {
    await host.registerTool(tool, signal ? { signal } : undefined)
    names.push(tool.name)
  }
  return names
}
