import { createServerFn } from '@tanstack/react-start'

export type ChangelogRecord = {
  version: string
  platform: string
  releaseNotes: string
  createdAt: string | null
}

type AppVersionRow = {
  version?: unknown
  platform?: unknown
  release_notes?: unknown
  created_at?: unknown
}

const distributionReleaseFiles = import.meta.glob<string>(
  '../../../cediwise-mobile-app/distribution/*.txt',
  { eager: true, query: '?raw', import: 'default' },
)

// Distribution notes contain no dates; these are the source-control dates for
// each note file. Database release timestamps override them when available.
const distributionRecordDates: Record<string, string> = {
  '0.1.14': '2026-03-11',
  '0.1.15': '2026-03-11',
  '0.1.16': '2026-03-13',
  '0.1.17': '2026-03-14',
  '0.1.18': '2026-03-15',
  '0.2.0': '2026-03-28',
  '0.2.1': '2026-04-03',
  '0.2.2': '2026-04-06',
  '0.2.3': '2026-04-09',
  '0.2.4': '2026-04-11',
  '0.2.5': '2026-04-17',
  '0.2.6': '2026-05-01',
  '0.2.7': '2026-05-05',
  '0.3.0': '2026-05-13',
  '0.3.1': '2026-06-12',
  '0.3.2': '2026-07-03',
}

const distributionReleases: Array<ChangelogRecord> = Object.entries(
  distributionReleaseFiles,
).flatMap(([file, releaseNotes]) => {
  const version = file.match(/\/distribution\/([^/]+)\.txt$/)?.[1]
  if (!version || !releaseNotes.trim()) return []
  const recordDate = distributionRecordDates[version]

  return [
    {
      version,
      platform: 'mobile',
      releaseNotes: releaseNotes.trim(),
      createdAt: recordDate ? `${recordDate}T12:00:00.000Z` : null,
    },
  ]
})

const mobilePlatforms = new Set(['android', 'ios', 'mobile'])
const distributionVersions = new Set(
  distributionReleases.map(({ version }) => version),
)

function compareVersions(left: string, right: string) {
  const leftParts = left.split('.').map(Number)
  const rightParts = right.split('.').map(Number)

  for (
    let index = 0;
    index < Math.max(leftParts.length, rightParts.length);
    index += 1
  ) {
    const difference = (rightParts[index] ?? 0) - (leftParts[index] ?? 0)
    if (difference !== 0) return difference
  }

  return 0
}

function normalizeRows(rows: unknown): Array<ChangelogRecord> {
  if (!Array.isArray(rows)) return []

  return rows.flatMap((value: AppVersionRow) => {
    const version =
      typeof value.version === 'string' ? value.version.trim() : ''
    const platform =
      typeof value.platform === 'string' ? value.platform.trim() : ''
    const releaseNotes =
      typeof value.release_notes === 'string' ? value.release_notes.trim() : ''

    if (!version || !platform || !releaseNotes) return []

    return [
      {
        version,
        platform,
        releaseNotes,
        createdAt:
          typeof value.created_at === 'string' ? value.created_at : null,
      },
    ]
  })
}

function mergeReleaseHistory(databaseReleases: Array<ChangelogRecord>) {
  const databaseMobileDates = new Map(
    databaseReleases
      .filter(
        (release) =>
          mobilePlatforms.has(release.platform.toLowerCase()) &&
          release.createdAt,
      )
      .map((release) => [release.version, release.createdAt as string]),
  )
  const additionalDatabaseReleases = databaseReleases.filter((release) => {
    const platform = release.platform.toLowerCase()
    return (
      !mobilePlatforms.has(platform) ||
      !distributionVersions.has(release.version)
    )
  })
  const datedDistributionReleases = distributionReleases.map((release) => ({
    ...release,
    createdAt: databaseMobileDates.get(release.version) ?? release.createdAt,
  }))

  return [...datedDistributionReleases, ...additionalDatabaseReleases].sort(
    (left, right) => {
      const dateDifference =
        new Date(right.createdAt ?? 0).getTime() -
        new Date(left.createdAt ?? 0).getTime()
      return dateDifference || compareVersions(left.version, right.version)
    },
  )
}

export const getChangelogEntries = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) return distributionReleases

    try {
      const url = new URL('/rest/v1/app_versions', supabaseUrl)
      url.searchParams.set(
        'select',
        'version,platform,release_notes,created_at',
      )
      url.searchParams.set('release_notes', 'not.is.null')
      url.searchParams.set('order', 'created_at.desc')

      const response = await fetch(url, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Supabase returned ${response.status}`)
      }

      const entries = normalizeRows(await response.json())
      return mergeReleaseHistory(entries)
    } catch (error) {
      console.error('[changelog] unable to load release history', error)
      return distributionReleases
    }
  },
)
