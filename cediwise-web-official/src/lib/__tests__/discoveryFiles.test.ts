import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { siteDocuments } from '@/lib/agent/search'
import { schemaFeedJsonl } from '@/lib/agent/feed'

const root = resolve(__dirname, '../../..')
const read = (...parts: Array<string>) =>
  readFileSync(resolve(root, ...parts), 'utf8')

describe('schema feed and schemamap', () => {
  it('lists the feed in a Schema Map with the schema feed namespace', () => {
    const xml = read('public', 'schemamap.xml')
    expect(xml).toContain('xmlns:sf="http://schema.org/schemas/schemafeed/0.1"')
    expect(xml).toContain(
      '<loc>https://www.cediwise.app/feeds/pages.jsonl</loc>',
    )
    expect(xml).toContain(
      '<sf:contentType>structuredData/schema.org</sf:contentType>',
    )
  })

  it('is referenced from robots.txt with the schemamap directive', () => {
    expect(read('public', 'robots.txt')).toContain(
      'Schemamap: https://www.cediwise.app/schemamap.xml',
    )
  })

  it('has one WebPage per Markdown page, each a JSON line', () => {
    const lines = schemaFeedJsonl().trim().split('\n')
    expect(lines).toHaveLength(siteDocuments().length)
    for (const line of lines) {
      const item = JSON.parse(line) as Record<string, string>
      expect(item['@type']).toBe('WebPage')
      expect((item.url ?? '').startsWith('https://www.cediwise.app')).toBe(true)
    }
  })
})

describe('OpenAPI description of /ask', () => {
  it('documents POST /ask with the request and response schemas', () => {
    const spec = JSON.parse(read('public', 'openapi.json')) as {
      openapi: string
      paths: Record<string, any>
    }
    expect(spec.openapi.startsWith('3.1')).toBe(true)
    expect(spec.paths['/ask'].post.requestBody.required).toBe(true)
    expect(spec.paths['/ask'].post.responses['200']).toBeDefined()
  })
})

describe('agent plugin', () => {
  const manifest = JSON.parse(read('agent-plugin', 'plugin.json')) as Record<
    string,
    any
  >
  const mcp = JSON.parse(read('agent-plugin', 'mcp.json')) as Record<
    string,
    any
  >

  it('has a valid plugin.json for schema 1.0.0', () => {
    expect(manifest.$schema).toBe(
      'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    )
    expect(manifest.name).toMatch(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/)
  })

  it('points mcp.json at the streamable HTTP endpoint', () => {
    expect(mcp.$schema).toBe(
      'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
    )
    expect(mcp.mcpServers.cediwise).toEqual({
      type: 'streamable-http',
      url: 'https://www.cediwise.app/mcp',
    })
  })

  it.each(['salary-check', 'page-finder'])(
    'skill %s has frontmatter that matches its directory',
    (skill) => {
      const text = read('agent-plugin', 'skills', skill, 'SKILL.md')
      const match = text.match(
        /^---\nname: ([^\n]+)\ndescription: ([^\n]+)\n---/,
      )
      expect(match).not.toBeNull()
      expect(match?.[1]).toBe(skill)
      expect((match?.[2] ?? '').length).toBeGreaterThanOrEqual(1)
      expect((match?.[2] ?? '').length).toBeLessThanOrEqual(1024)
    },
  )
})
