/**
 * Public Cloudflare R2 base URL (custom domain or r2.dev).
 * Set VITE_R2_PUBLIC_URL in env — trailing slash optional.
 */
export function getR2PublicBase(): string {
  const raw = import.meta.env.VITE_R2_PUBLIC_URL
  if (typeof raw !== 'string' || !raw.trim()) {
    return ''
  }
  return raw.trim().replace(/\/+$/, '')
}

/**
 * Build a public object URL, encoding each path segment (handles `&` etc. in keys).
 */
export function r2PublicObjectUrl(objectKey: string): string | null {
  const base = getR2PublicBase()
  if (!base) {
    return null
  }
  const segments = objectKey
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
  if (segments.length === 0) {
    return null
  }
  return `${base}/${segments.join('/')}`
}
