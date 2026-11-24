import { useEffect } from 'react'
import { getWebMcpHost, registerWebMcpTools } from '@/lib/agent/webmcp'

/** Registers WebMCP tools in browsers that expose `document.modelContext`. Renders nothing. */
export function WebMcpRegistrar() {
  useEffect(() => {
    const host = getWebMcpHost(
      typeof document === 'undefined' ? undefined : document,
    )
    if (!host) return

    const controller = new AbortController()
    // Registration is optional: a browser may refuse it (for example when the
    // `tools` permission policy is off). The site works without it.
    registerWebMcpTools(host, controller.signal).catch(() => undefined)
    return () => controller.abort()
  }, [])

  return null
}
