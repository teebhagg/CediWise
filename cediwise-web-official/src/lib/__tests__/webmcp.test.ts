import { describe, expect, it, vi } from 'vitest'
import type { WebMcpHost, WebMcpTool } from '@/lib/agent/webmcp'
import { computeGhanaTax2026Monthly } from '@/lib/ghanaTax'
import {
  WEBMCP_TOOLS,
  getWebMcpHost,
  registerWebMcpTools,
} from '@/lib/agent/webmcp'

function fakeHost() {
  const registered: Array<{
    tool: WebMcpTool
    options?: { signal?: AbortSignal }
  }> = []
  const host: WebMcpHost = {
    registerTool: vi.fn(async (tool, options) => {
      registered.push({ tool, options })
      return undefined
    }),
  }
  return { host, registered }
}

const tool = (name: string) => {
  const found = WEBMCP_TOOLS.find((item) => item.name === name)
  if (!found) throw new Error(`missing tool ${name}`)
  return found
}

const run = (name: string, input: unknown) =>
  tool(name).execute(input, { signal: new AbortController().signal })

describe('getWebMcpHost', () => {
  it('returns undefined when the document has no modelContext', () => {
    expect(getWebMcpHost({})).toBeUndefined()
    expect(getWebMcpHost(undefined)).toBeUndefined()
  })

  it('returns undefined when modelContext has no registerTool', () => {
    expect(getWebMcpHost({ modelContext: {} })).toBeUndefined()
  })

  it('returns the host when registerTool is available', () => {
    const { host } = fakeHost()
    expect(getWebMcpHost({ modelContext: host })).toBe(host)
  })
})

describe('registerWebMcpTools', () => {
  it('registers both tools with read-only annotations and the abort signal', async () => {
    const { host, registered } = fakeHost()
    const controller = new AbortController()
    const names = await registerWebMcpTools(host, controller.signal)

    expect(names).toEqual(['estimate_ghana_take_home', 'list_public_pages', 'search_site'])
    for (const entry of registered) {
      expect(entry.tool.annotations?.readOnlyHint).toBe(true)
      expect(entry.options?.signal).toBe(controller.signal)
    }
  })
})

describe('estimate_ghana_take_home', () => {
  it('matches the web calculator for a valid salary', async () => {
    const result = (await run('estimate_ghana_take_home', {
      grossMonthlySalary: 5000,
    })) as Record<string, number | string>
    const breakdown = computeGhanaTax2026Monthly(5000)
    expect(result.currency).toBe('GHS')
    expect(result.grossMonthly).toBe(5000)
    expect(result.netTakeHome).toBeCloseTo(breakdown.netTakeHome, 2)
    expect(result.paye).toBeCloseTo(breakdown.paye, 2)
    expect(String(result.note)).toMatch(/Estimate only/)
  })

  it.each([
    ['missing salary', {}],
    ['zero', { grossMonthlySalary: 0 }],
    ['negative', { grossMonthlySalary: -10 }],
    ['text', { grossMonthlySalary: '5000' }],
    ['not finite', { grossMonthlySalary: Number.NaN }],
    ['above the limit', { grossMonthlySalary: 500_001 }],
    ['not an object', null],
  ])('rejects %s', async (_label, input) => {
    await expect(run('estimate_ghana_take_home', input)).rejects.toThrow(
      /grossMonthlySalary/,
    )
  })
})

describe('list_public_pages', () => {
  it('lists the pricing page with an absolute URL', async () => {
    const result = (await run('list_public_pages', {})) as {
      pages: Array<{ title: string; url: string }>
    }
    expect(result.pages.map((page) => page.url)).toContain(
      'https://www.cediwise.app/pricing',
    )
    expect(result.pages.map((page) => page.url)).toContain(
      'https://www.cediwise.app',
    )
  })
})
