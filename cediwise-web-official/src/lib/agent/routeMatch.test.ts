import { describe, expect, it } from 'vitest'
import { isKnownRoute } from './routeMatch'

describe('isKnownRoute', () => {
  it.each([
    '/',
    '/about',
    '/pricing',
    '/pricing/',
    '/salary-calculator',
    '/salary-calculator/5000',
    '/try-salary-calculator/12000',
    '/financial-literacy',
  ])('treats %s as a page', (pathname) => {
    expect(isKnownRoute(pathname)).toBe(true)
  })

  it.each([
    '/__ora-404-probe-27v5y5ix',
    '/nope',
    '/about/extra',
    '/pricing/unknown/deeper',
  ])('treats %s as unknown', (pathname) => {
    expect(isKnownRoute(pathname)).toBe(false)
  })
})
