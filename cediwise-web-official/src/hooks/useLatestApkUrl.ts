import { useEffect, useState } from 'react'

const GITHUB_REPO =
  typeof import.meta !== 'undefined' &&
  (import.meta as any).env?.VITE_GITHUB_REPO
    ? (import.meta as any).env.VITE_GITHUB_REPO
    : 'teebhagg/CediWise'

const APK_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

export interface UseLatestApkUrlReturn {
  url: string | null
  version: string | null
  isLoading: boolean
  error: Error | null
}

/**
 * Fetches the latest CediWise Android APK URL from GitHub Releases.
 * The downloaded file will have the version in its name (e.g. CediWise-0.0.1.apk).
 */
export function useLatestApkUrl(): UseLatestApkUrlReturn {
  const [url, setUrl] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(APK_API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const apk = data.assets?.find(
          (a: { name: string }) =>
            a.name.startsWith('CediWise-') && a.name.endsWith('.apk'),
        )
        if (apk) {
          setUrl(apk.browser_download_url)
          const ver = apk.name.replace('CediWise-', '').replace('.apk', '')
          setVersion(ver)
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { url, version, isLoading, error }
}
