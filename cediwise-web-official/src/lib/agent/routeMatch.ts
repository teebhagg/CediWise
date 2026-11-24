import { getRouter } from '@/router'

/**
 * True when a pathname resolves to a page route. Leftover path segments after
 * a page (e.g. `/about/extra`) count as unknown, the same way the router
 * treats them as not found.
 */
export function isKnownRoute(pathname: string): boolean {
  const { foundRoute, routeParams } = getRouter().getMatchedRoutes(pathname)
  if (!foundRoute) return false
  return !(foundRoute.path !== '/' && routeParams['**'])
}
