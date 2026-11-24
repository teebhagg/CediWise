'use client'

import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import type { ChangelogRecord } from '@/serverFns/changelog.functions'
import { Footer } from '@/components/layout/Footer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createPageHead } from '@/lib/seo'
import { getChangelogEntries } from '@/serverFns/changelog.functions'

export const Route = createFileRoute('/changelog')({
  loader: () => getChangelogEntries(),
  component: ChangelogPage,
  head: () =>
    createPageHead({
      path: '/changelog',
      title: 'Changelog',
      description: 'Release notes and product updates from CediWise.',
    }),
})

type PlatformFilter = 'all' | 'mobile' | 'web'
type ReleaseGroup = {
  version: string
  releaseNotes: string
  createdAt: string | null
  platforms: Array<string>
}

const platformFilters: Array<{ label: string; value: PlatformFilter }> = [
  { label: 'All platforms', value: 'all' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Web', value: 'web' },
]

function normalizePlatform(platform: string) {
  return platform.toLowerCase()
}

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

function dateKeyFromValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Africa/Accra',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value
  const year = part('year')
  const month = part('month')
  const day = part('day')

  return year && month && day ? `${year}-${month}-${day}` : null
}

function dateFromKey(key: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return new Date(Number.NaN)

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return new Date(Number.NaN)
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return new Date(Number.NaN)
  }
  return date
}

function addDays(key: string, count: number) {
  const date = dateFromKey(key)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

function startOfWeek(key: string) {
  const date = dateFromKey(key)
  const mondayOffset = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - mondayOffset)
  return date.toISOString().slice(0, 10)
}

function formatWeekRange(weekStart: string) {
  const start = dateFromKey(weekStart)
  const end = dateFromKey(addDays(weekStart, 6))
  const monthName = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      timeZone: 'UTC',
    }).format(date)
  const startMonth = monthName(start)
  const endMonth = monthName(end)
  const startYear = start.getUTCFullYear()
  const endYear = end.getUTCFullYear()

  if (startYear !== endYear) {
    return `${startMonth} ${start.getUTCDate()}, ${startYear}–${endMonth} ${end.getUTCDate()}, ${endYear}`
  }

  return startMonth === endMonth
    ? `${startMonth} ${start.getUTCDate()}–${end.getUTCDate()}`
    : `${startMonth} ${start.getUTCDate()}–${endMonth} ${end.getUTCDate()}`
}

function formatWeekday(key: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(dateFromKey(key))
}

function formatReleaseDate(value: string | null) {
  const key = value ? dateKeyFromValue(value) : null
  if (!key) return null

  return new Intl.DateTimeFormat('en-GH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateFromKey(key))
}

function groupReleases(entries: Array<ChangelogRecord>): Array<ReleaseGroup> {
  const groups = new Map<string, ReleaseGroup>()

  for (const entry of entries) {
    const key = `${entry.version}\u0000${entry.releaseNotes}`
    const normalized = normalizePlatform(entry.platform)
    const displayPlatform = ['android', 'ios', 'mobile'].includes(normalized)
      ? 'mobile'
      : normalized
    const existing = groups.get(key)

    if (existing) {
      if (!existing.platforms.includes(displayPlatform)) {
        existing.platforms.push(displayPlatform)
      }
      if (
        entry.createdAt &&
        (!existing.createdAt || entry.createdAt > existing.createdAt)
      ) {
        existing.createdAt = entry.createdAt
      }
      continue
    }

    groups.set(key, {
      version: entry.version,
      releaseNotes: entry.releaseNotes,
      createdAt: entry.createdAt,
      platforms: [displayPlatform],
    })
  }

  return [...groups.values()].sort((left, right) => {
    const leftDate = left.createdAt ? dateKeyFromValue(left.createdAt) : null
    const rightDate = right.createdAt ? dateKeyFromValue(right.createdAt) : null
    if (leftDate && rightDate && leftDate !== rightDate) {
      return rightDate.localeCompare(leftDate)
    }
    if (leftDate && !rightDate) return -1
    if (!leftDate && rightDate) return 1
    return compareVersions(left.version, right.version)
  })
}

function parseReleaseNotes(notes: string) {
  return notes
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^#{1,6}\s*/, '')
        .replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, ''),
    )
    .filter(
      (line) =>
        line.length > 0 &&
        !/^what['’]?s new$/i.test(line) &&
        !/^cediwise v\d+(?:\.\d+)+ is here!?/i.test(line) &&
        !/^upgrade to sme today!?/i.test(line),
    )
}

function platformLabel(platform: string) {
  if (normalizePlatform(platform) === 'mobile') return 'Mobile'
  return platform.charAt(0).toUpperCase() + platform.slice(1)
}

function ChangelogPage() {
  const records = Route.useLoaderData()
  const shouldReduceMotion = useReducedMotion() ?? false
  const groupedReleases = useMemo(() => groupReleases(records), [records])
  const todayDateKey = dateKeyFromValue(new Date()) ?? '2026-01-01'
  const todayWeek = startOfWeek(todayDateKey)
  const releaseDateKeys = groupedReleases
    .map((release) =>
      release.createdAt ? dateKeyFromValue(release.createdAt) : null,
    )
    .filter((key): key is string => key !== null)
  const latestReleaseDate = releaseDateKeys[0] ?? todayDateKey
  const earliestReleaseDate = releaseDateKeys.at(-1) ?? todayDateKey
  const earliestWeek = startOfWeek(earliestReleaseDate)
  const [selectedDate, setSelectedDate] = useState(latestReleaseDate)
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(latestReleaseDate),
  )
  const [showAllVersions, setShowAllVersions] = useState(false)
  const [selectedPlatform, setSelectedPlatform] =
    useState<PlatformFilter>('all')
  const [selectedVersion, setSelectedVersion] = useState('all')
  const [activeRelease, setActiveRelease] = useState<ReleaseGroup | null>(null)
  const [pointerMotionEnabled, setPointerMotionEnabled] =
    useState(!shouldReduceMotion)

  const platformReleases = useMemo(
    () =>
      groupedReleases.filter(
        (release) =>
          selectedPlatform === 'all' ||
          release.platforms.some((platform) => {
            const normalized = normalizePlatform(platform)
            return selectedPlatform === 'mobile'
              ? ['mobile', 'android', 'ios'].includes(normalized)
              : normalized === selectedPlatform
          }),
      ),
    [groupedReleases, selectedPlatform],
  )
  const versionOptions = useMemo(
    () =>
      [...new Set(platformReleases.map((release) => release.version))].sort(
        compareVersions,
      ),
    [platformReleases],
  )
  const versionNavigationReleases = useMemo(() => {
    const seenVersions = new Set<string>()

    return platformReleases.filter((release) => {
      if (seenVersions.has(release.version)) return false
      seenVersions.add(release.version)
      return true
    })
  }, [platformReleases])
  const versionNavigationIndex = useMemo(() => {
    if (selectedVersion !== 'all') {
      const selectedIndex = versionNavigationReleases.findIndex(
        (release) => release.version === selectedVersion,
      )
      if (selectedIndex >= 0) return selectedIndex
    }

    const selectedDateIndex = versionNavigationReleases.findIndex(
      (release) =>
        release.createdAt &&
        dateKeyFromValue(release.createdAt) === selectedDate,
    )
    if (selectedDateIndex >= 0) return selectedDateIndex

    const selectedTimestamp = dateFromKey(selectedDate).getTime()
    let closestIndex = -1
    let closestDistance = Number.POSITIVE_INFINITY

    versionNavigationReleases.forEach((release, index) => {
      if (!release.createdAt) return
      const releaseDate = dateKeyFromValue(release.createdAt)
      if (!releaseDate) return
      const distance = Math.abs(
        dateFromKey(releaseDate).getTime() - selectedTimestamp,
      )
      if (distance < closestDistance) {
        closestIndex = index
        closestDistance = distance
      }
    })

    return closestIndex
  }, [selectedDate, selectedVersion, versionNavigationReleases])
  const selectedReleases = platformReleases.filter((release) => {
    const releaseDate = release.createdAt
      ? dateKeyFromValue(release.createdAt)
      : null
    const matchesVersion =
      selectedVersion === 'all' || release.version === selectedVersion
    return (showAllVersions || releaseDate === selectedDate) && matchesVersion
  })
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  )
  const canGoPrevious = weekStart > earliestWeek
  const canGoNext = weekStart < todayWeek
  const motionDuration = shouldReduceMotion || !pointerMotionEnabled ? 0 : 0.22
  const activeReleaseIndex = activeRelease
    ? platformReleases.findIndex(
        (release) =>
          release.version === activeRelease.version &&
          release.releaseNotes === activeRelease.releaseNotes,
      )
    : -1
  const canGoToNewerVersion = activeReleaseIndex > 0
  const canGoToOlderVersion =
    activeReleaseIndex >= 0 && activeReleaseIndex < platformReleases.length - 1
  const canGoToOlderListVersion =
    versionNavigationIndex >= 0 &&
    versionNavigationIndex < versionNavigationReleases.length - 1
  const canGoToNewerListVersion = versionNavigationIndex > 0

  function moveWeek(direction: -1 | 1, event: MouseEvent<HTMLButtonElement>) {
    setPointerMotionEnabled(!shouldReduceMotion && event.detail > 0)
    const nextWeek = addDays(weekStart, direction * 7)
    if (nextWeek < earliestWeek || nextWeek > todayWeek) return
    setWeekStart(nextWeek)
    setSelectedDate(nextWeek)
    setShowAllVersions(false)
  }

  function goToToday(event: MouseEvent<HTMLButtonElement>) {
    setPointerMotionEnabled(!shouldReduceMotion && event.detail > 0)
    setWeekStart(todayWeek)
    setSelectedDate(todayDateKey)
    setShowAllVersions(false)
  }

  function goToAllVersions(event: MouseEvent<HTMLButtonElement>) {
    setPointerMotionEnabled(!shouldReduceMotion && event.detail > 0)
    setSelectedVersion('all')
    setShowAllVersions(true)
  }

  function navigateListVersion(
    direction: 'newer' | 'older',
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (versionNavigationIndex < 0) return
    const nextIndex = versionNavigationIndex + (direction === 'older' ? 1 : -1)
    const nextRelease = versionNavigationReleases[nextIndex]
    if (!nextRelease) return

    setPointerMotionEnabled(!shouldReduceMotion && event.detail > 0)
    setSelectedVersion(nextRelease.version)
    setShowAllVersions(false)
    const nextReleaseDate = nextRelease.createdAt
      ? dateKeyFromValue(nextRelease.createdAt)
      : null
    if (nextReleaseDate) {
      setWeekStart(startOfWeek(nextReleaseDate))
      setSelectedDate(nextReleaseDate)
    }
  }

  function chooseVersion(
    value: string | null,
    eventDetails: { event: Event },
  ) {
    const nextVersion = value ?? 'all'
    setPointerMotionEnabled(
      !shouldReduceMotion && !eventDetails.event.type.startsWith('key'),
    )
    setSelectedVersion(nextVersion)
    setShowAllVersions(false)

    const nextRelease = versionNavigationReleases.find(
      (release) => release.version === nextVersion,
    )
    const nextReleaseDate = nextRelease?.createdAt
      ? dateKeyFromValue(nextRelease.createdAt)
      : null
    if (nextReleaseDate) {
      setWeekStart(startOfWeek(nextReleaseDate))
      setSelectedDate(nextReleaseDate)
    }
  }

  function navigateVersion(
    direction: 'newer' | 'older',
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (activeReleaseIndex < 0) return
    const nextIndex = activeReleaseIndex + (direction === 'older' ? 1 : -1)
    const nextRelease = platformReleases[nextIndex]
    if (!nextRelease) return

    setPointerMotionEnabled(!shouldReduceMotion && event.detail > 0)
    const nextReleaseDate = nextRelease.createdAt
      ? dateKeyFromValue(nextRelease.createdAt)
      : null
    if (nextReleaseDate) {
      setWeekStart(startOfWeek(nextReleaseDate))
      setSelectedDate(nextReleaseDate)
    }
    setSelectedVersion(nextRelease.version)
    setActiveRelease(nextRelease)
  }

  function choosePlatform(
    value: string | null,
    eventDetails: { event: Event },
  ) {
    if (value !== 'all' && value !== 'mobile' && value !== 'web') return
    setPointerMotionEnabled(
      !shouldReduceMotion && !eventDetails.event.type.startsWith('key'),
    )
    setSelectedPlatform(value)
    setSelectedVersion('all')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute right-0 top-0 h-[500px] w-[60dvw] rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute bottom-1/3 left-0 h-[300px] w-[40dvw] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <main className="relative pb-24 pt-[clamp(6.5rem,14vw,8rem)] md:pt-32">
        <section
          className="mx-auto max-w-[1280px] px-4 sm:px-12"
          aria-labelledby="changelog-heading"
        >
          <motion.h1
            id="changelog-heading"
            initial={
              shouldReduceMotion
                ? false
                : { opacity: 0, y: 16, filter: 'blur(8px)' }
            }
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-4xl font-medium tracking-[-0.055em] text-white sm:text-[56px] sm:leading-[1.04]"
          >
            Changelog
          </motion.h1>

          <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-9">
            <h2 className="text-xl font-medium leading-none tracking-[-0.045em] text-white sm:text-[28px]">
              {showAllVersions ? 'All releases' : formatWeekRange(weekStart)}
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="min-h-9 rounded-full border border-white/[0.06] bg-white/[0.045] px-4 text-xs font-medium text-zinc-300 transition-[background-color,color,transform] duration-200 hover:bg-emerald-400/10 hover:text-emerald-100 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Previous week"
                disabled={!canGoPrevious}
                onClick={(event) => moveWeek(-1, event)}
                className="flex size-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.045] text-zinc-300 transition-[background-color,color,transform] duration-200 hover:bg-emerald-400/10 hover:text-emerald-100 active:scale-[0.94] disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next week"
                disabled={!canGoNext}
                onClick={(event) => moveWeek(1, event)}
                className="flex size-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.045] text-zinc-300 transition-[background-color,color,transform] duration-200 hover:bg-emerald-400/10 hover:text-emerald-100 active:scale-[0.94] disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={showAllVersions}
                onClick={goToAllVersions}
                className={`min-h-9 rounded-full border px-4 text-xs font-medium transition-[background-color,color,transform] duration-200 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${showAllVersions ? 'border-emerald-300/20 bg-emerald-400/15 text-emerald-100' : 'border-white/[0.06] bg-white/[0.045] text-zinc-300 hover:bg-emerald-400/10 hover:text-emerald-100'}`}
              >
                All versions
              </button>
              <button
                type="button"
                aria-label="Previous version"
                disabled={!canGoToOlderListVersion}
                onClick={(event) => navigateListVersion('older', event)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.045] px-3 text-xs font-medium text-zinc-300 transition-[background-color,color,transform] duration-200 hover:bg-emerald-400/10 hover:text-emerald-100 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none motion-reduce:active:scale-100 sm:px-4"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
                Previous version
              </button>
              <button
                type="button"
                aria-label="Next version"
                disabled={!canGoToNewerListVersion}
                onClick={(event) => navigateListVersion('newer', event)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 text-xs font-medium text-emerald-100 transition-[background-color,color,transform] duration-200 hover:bg-emerald-400/15 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none motion-reduce:active:scale-100 sm:px-4"
              >
                Next version
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
              </button>
            </div>

            <div className="ml-auto flex w-full gap-3 sm:w-auto">
              <Select
                items={platformFilters}
                value={selectedPlatform}
                onValueChange={choosePlatform}
              >
                <SelectTrigger
                  aria-label="Filter by platform"
                  className="h-9 min-w-0 flex-1 rounded-full border-white/[0.06] bg-white/[0.045] px-4 text-sm font-medium text-zinc-200 shadow-none transition-colors hover:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-emerald-400/40 sm:min-w-[136px] sm:flex-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[18px] border border-white/10 bg-[#101613] text-zinc-100 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
                  <SelectGroup>
                    {platformFilters.map((filter) => (
                      <SelectItem
                        key={filter.value}
                        value={filter.value}
                        className="rounded-[13px] py-2.5 focus:bg-emerald-400/10 focus:text-emerald-100"
                      >
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                items={[
                  ...versionOptions.map((version) => ({
                    label: `v${version}`,
                    value: version,
                  })),
                ]}
                value={selectedVersion === 'all' ? null : selectedVersion}
                onValueChange={chooseVersion}
              >
                <SelectTrigger
                  aria-label="Jump to version"
                  className="h-9 min-w-0 flex-1 rounded-full border-white/[0.06] bg-white/[0.045] px-4 text-sm font-medium text-zinc-200 shadow-none transition-colors hover:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-emerald-400/40 sm:min-w-[136px] sm:flex-none"
                >
                  <SelectValue placeholder="Jump to version" />
                </SelectTrigger>
                <SelectContent className="rounded-[18px] border border-white/10 bg-[#101613] text-zinc-100 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
                  <SelectGroup>
                    {versionOptions.map((version) => (
                      <SelectItem
                        key={version}
                        value={version}
                        className="rounded-[13px] py-2.5 focus:bg-emerald-400/10 focus:text-emerald-100"
                      >
                        v{version}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className="mt-6 flex gap-1 overflow-x-auto rounded-[20px] border border-white/[0.05] bg-white/[0.035] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Choose a release date"
          >
            {weekDates.map((dateKey) => {
              const isSelected = dateKey === selectedDate
              const date = dateFromKey(dateKey)
              const isToday = dateKey === todayDateKey

              return (
                <button
                  key={dateKey}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`${formatWeekday(dateKey)}, ${dateKey}${isToday ? ', today' : ''}`}
                  onClick={(event) => {
                    setPointerMotionEnabled(
                      !shouldReduceMotion && event.detail > 0,
                    )
                    setSelectedDate(dateKey)
                    setShowAllVersions(false)
                  }}
                  className="relative flex min-w-[58px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[15px] px-2 py-2.5 text-center outline-none transition-colors duration-200 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-emerald-300/70 motion-reduce:transition-none sm:min-w-0"
                >
                  {isSelected ? (
                    <motion.span
                      layoutId="changelog-selected-date"
                      className="absolute inset-0 rounded-[15px] bg-emerald-400/85"
                      transition={
                        shouldReduceMotion || !pointerMotionEnabled
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 420, damping: 34 }
                      }
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={`relative z-10 text-[13px] font-medium ${isSelected ? 'text-emerald-950/75' : 'text-zinc-500'}`}
                  >
                    {formatWeekday(dateKey)}
                  </span>
                  <span
                    className={`relative z-10 text-2xl font-medium leading-none tracking-[-0.04em] ${isSelected ? 'text-[#07130D]' : 'text-zinc-200'}`}
                  >
                    {date.getUTCDate()}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-12">
            <div className="hidden grid-cols-[minmax(76px,0.7fr)_minmax(0,3.6fr)_minmax(96px,1fr)_minmax(72px,0.7fr)] gap-x-5 border-b border-white/10 pb-3 text-xs text-zinc-500 sm:grid">
              <span>Date</span>
              <span>Release</span>
              <span>Platform</span>
              <span>Updates</span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {selectedReleases.length > 0 ? (
                <motion.div
                  key={`${showAllVersions ? 'all' : selectedDate}-${selectedPlatform}-${selectedVersion}`}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{
                    duration: motionDuration,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {selectedReleases.map((release, index) => {
                    const notes = parseReleaseNotes(release.releaseNotes)
                    const releaseDate = formatReleaseDate(release.createdAt)

                    return (
                      <motion.article
                        key={`${release.version}-${index}`}
                        initial={
                          shouldReduceMotion ? false : { opacity: 0, y: 8 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: motionDuration,
                          delay:
                            shouldReduceMotion || !pointerMotionEnabled
                              ? 0
                              : Math.min(index * 0.025, 0.05),
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 border-b border-white/10 py-5 last:border-b-0 sm:grid-cols-[minmax(76px,0.7fr)_minmax(0,3.6fr)_minmax(96px,1fr)_minmax(72px,0.7fr)] sm:gap-x-5 sm:py-5"
                      >
                        <time
                          className="text-sm text-zinc-300 sm:pt-0.5"
                          dateTime={release.createdAt ?? undefined}
                        >
                          {releaseDate ?? 'Release notes'}
                        </time>
                        <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                          <h3 className="text-base font-medium tracking-[-0.035em] text-white">
                            v{release.version}
                          </h3>
                          <p className="mt-0.5 text-xs text-zinc-500 sm:hidden">
                            {release.platforms.map(platformLabel).join(' · ')}{' '}
                            release
                          </p>

                          {notes.length > 0 ? (
                            <ul className="mt-2 space-y-1">
                              {notes.map((note, noteIndex) => (
                                <li
                                  key={`${release.version}-${noteIndex}`}
                                  className="flex gap-2 text-sm leading-6 text-zinc-300"
                                >
                                  <span
                                    className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-emerald-400"
                                    aria-hidden="true"
                                  />
                                  <span>{note}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <button
                            type="button"
                            aria-label={`View entire release v${release.version}`}
                            onClick={() => setActiveRelease(release)}
                            className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 text-xs font-medium text-emerald-200 transition-[background-color,color,transform] duration-200 hover:bg-emerald-400/15 hover:text-emerald-100 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                          >
                            View entire release
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              className="size-3.5"
                            />
                          </button>
                        </div>
                        <span className="hidden text-sm text-zinc-300 sm:block sm:pt-0.5">
                          {release.platforms.map(platformLabel).join(' · ')}
                        </span>
                        <span className="row-start-1 inline-flex items-center gap-2 self-start text-right text-xs text-zinc-400 sm:row-auto sm:pt-0.5 sm:text-sm">
                          <span
                            className="size-1.5 rounded-full bg-emerald-300"
                            aria-hidden="true"
                          />
                          {notes.length} updates
                        </span>
                      </motion.article>
                    )
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key={`empty-${selectedDate}-${selectedPlatform}-${selectedVersion}`}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{
                    duration: motionDuration,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="border-b border-white/10 py-14 text-center sm:py-16"
                >
                  <p className="text-lg font-medium tracking-[-0.04em] text-zinc-200">
                    {showAllVersions
                      ? 'No release versions found.'
                      : 'No releases on this date.'}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {showAllVersions
                      ? 'Try another platform filter.'
                      : 'Choose another date or adjust the release filters.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <Dialog
        open={activeRelease !== null}
        onOpenChange={(open) => {
          if (!open) setActiveRelease(null)
        }}
      >
        {activeRelease ? (
          <DialogContent className="max-h-[min(82vh,52rem)] gap-0 overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d120f] p-6 text-white shadow-[0_32px_100px_rgba(0,0,0,0.65)] ring-white/10 sm:max-w-2xl sm:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${activeRelease.version}-${activeRelease.createdAt ?? 'undated'}-${activeRelease.releaseNotes}`}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{
                  duration: motionDuration,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <DialogHeader className="gap-2 pr-8 text-left">
                  <DialogTitle className="text-3xl font-medium tracking-[-0.05em] text-white sm:text-4xl">
                    v{activeRelease.version}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
                    <time dateTime={activeRelease.createdAt ?? undefined}>
                      {formatReleaseDate(activeRelease.createdAt) ??
                        'Release date unavailable'}
                    </time>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activeRelease.platforms.map(platformLabel).join(' · ')}
                      {' release'}
                    </span>
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                    Release notes
                  </h3>
                  {parseReleaseNotes(activeRelease.releaseNotes).length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {parseReleaseNotes(activeRelease.releaseNotes).map(
                        (note, noteIndex) => (
                          <li
                            key={`${activeRelease.version}-${noteIndex}`}
                            className="flex gap-3 text-sm leading-6 text-zinc-200 sm:text-base"
                          >
                            <span
                              className="mt-[0.68em] size-1.5 shrink-0 rounded-full bg-emerald-400"
                              aria-hidden="true"
                            />
                            <span>{note}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-400">
                      No release notes were published for this version.
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-between">
              <button
                type="button"
                disabled={!canGoToOlderVersion}
                onClick={(event) => navigateVersion('older', event)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 text-sm font-medium text-zinc-200 transition-[background-color,color,transform] duration-200 hover:bg-emerald-400/10 hover:text-emerald-100 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                Previous version
              </button>
              <button
                type="button"
                disabled={!canGoToNewerVersion}
                onClick={(event) => navigateVersion('newer', event)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 text-sm font-medium text-emerald-100 transition-[background-color,color,transform] duration-200 hover:bg-emerald-400/15 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Next version
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <Footer />
    </div>
  )
}
