import { defineEventHandler, sendRedirect, setResponseHeaders, setResponseStatus } from "nitro/h3"

const GITHUB_REPO = process.env.GITHUB_REPO ?? 'teebhagg/CediWise'
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

// Cache for 5 minutes
const CACHE_MAX_AGE = 300

export default defineEventHandler(async (event) => {
  try {
    const res = await fetch(API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    })

    if (!res.ok) {
      throw new Error(`GitHub API: ${res.status}`)
    }

    const data = await res.json()
    const apk = data.assets?.find((a: { name: string }) =>
      a.name.endsWith('.apk'),
    )

    if (!apk?.browser_download_url) {
      setResponseStatus(event, 404)
      return { error: 'No APK asset found' }
    }

    setResponseHeaders(event, {
      'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate`,
    })

    return sendRedirect(event, apk.browser_download_url, 302)
  } catch {
    setResponseStatus(event, 500)
    return { error: 'Download temporarily unavailable' }
  }
})
