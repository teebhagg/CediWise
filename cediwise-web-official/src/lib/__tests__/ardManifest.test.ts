import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../public/.well-known/ard.json'),
    'utf8',
  ),
) as { entries: Array<Record<string, unknown>> }

describe('ARD manifest', () => {
  it('has an entries array with at least one entry', () => {
    expect(Array.isArray(manifest.entries)).toBe(true)
    expect(manifest.entries.length).toBeGreaterThan(0)
  })

  it.each(
    manifest.entries.map((entry) => [String(entry.identifier), entry] as const),
  )('%s has the required ARD fields', (_id, entry) => {
    expect(entry.identifier).toMatch(/^urn:air:cediwise\.app:[a-z-]+:[a-z-]+$/)
    expect(typeof entry.displayName).toBe('string')
    expect(entry.type).toMatch(/^(text|application)\/[a-z0-9.+-]+$/)
    // Exactly one of url or data.
    expect(
      Number(entry.url !== undefined) + Number(entry.data !== undefined),
    ).toBe(1)
    expect(String(entry.url)).toMatch(/^https:\/\/www\.cediwise\.app\//)
    const queries = entry.representativeQueries as Array<string>
    expect(queries.length).toBeGreaterThanOrEqual(2)
    expect(queries.length).toBeLessThanOrEqual(5)
  })
})
