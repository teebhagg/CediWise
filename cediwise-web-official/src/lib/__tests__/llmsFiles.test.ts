import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CEDIWISE_IOS_APP_STORE_URL } from '@/lib/storeLinks'

const publicDir = resolve(__dirname, '../../../public')
const read = (name: string) => readFileSync(resolve(publicDir, name), 'utf8')

describe.each(['llms.txt', 'llms-full.txt'])('%s', (file) => {
  const text = read(file)

  it('has a when-to-use section for agents', () => {
    expect(text).toMatch(/^## When to use CediWise$/m)
    expect(text).toContain('There is no public API')
    expect(text).toContain('Not a fit for')
  })

  it('links to the canonical www host only', () => {
    expect(text).not.toMatch(/https:\/\/cediwise\.app\b/)
  })

  it('states the current free calculator limit', () => {
    expect(text).not.toMatch(/5 (runs|calculations) per day/)
    expect(text).toMatch(/3 free checks per day/)
  })

  it('uses the iOS App Store URL from the site store links', () => {
    expect(text).toContain(CEDIWISE_IOS_APP_STORE_URL)
    expect(text).not.toContain('id6739578016')
  })
})

describe('robots.txt', () => {
  it('points the sitemap and llms references at the www host', () => {
    const robots = read('robots.txt')
    expect(robots).toContain('Sitemap: https://www.cediwise.app/sitemap.xml')
    expect(robots).not.toMatch(/https:\/\/cediwise\.app\b/)
  })
})
