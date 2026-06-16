'use client'

import {
  FullScreenIcon,
  MinimizeScreenIcon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMute02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Browser often leaves duration as NaN until enough bytes load; read live from the element. */
function readDuration(el: HTMLVideoElement): number {
  const d = el.duration
  return Number.isFinite(d) && d > 0 ? d : 0
}

export interface IosStyleVideoPlayerProps {
  /** Resolved HTTPS URL to the MP4, or null if unavailable */
  src: string | null
  /** Accessible label / captions track title hint */
  title: string
  className?: string
}

export function IosStyleVideoPlayer({
  src,
  title,
  className,
}: IosStyleVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const labelId = useId()

  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intrinsicSize, setIntrinsicSize] = useState<{
    w: number
    h: number
  } | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const togglePlay = useCallback(async () => {
    const el = videoRef.current
    if (!el || !src) return
    if (el.paused) {
      try {
        await el.play()
        setPlaying(true)
        setError(null)
      } catch {
        setError('Playback was blocked or failed.')
        setPlaying(false)
      }
    } else {
      el.pause()
      setPlaying(false)
    }
  }, [src])

  const onSeek = useCallback((value: number) => {
    const el = videoRef.current
    if (!el) return
    const d = readDuration(el)
    if (d <= 0) return
    const next = Math.min(Math.max(0, value), d)
    el.currentTime = next
    setCurrentTime(next)
  }, [])

  const onVolumeSlider = useCallback(
    (v: number) => {
      const el = videoRef.current
      if (!el) return
      const next = Math.min(1, Math.max(0, v))
      el.volume = next
      el.muted = next === 0
      setVolume(next)
      setMuted(next === 0)
    },
    [],
  )

  const toggleMute = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current
    const video = videoRef.current
    if (!shell || !video) return

    try {
      if (!document.fullscreenElement) {
        await shell.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      if (
        !document.fullscreenElement &&
        'webkitEnterFullscreen' in video &&
        typeof video.webkitEnterFullscreen === 'function'
      ) {
        try {
          video.webkitEnterFullscreen()
        } catch {
          /* noop */
        }
      }
    }
  }, [])

  useEffect(() => {
    const syncFs = () => {
      const shell = shellRef.current
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null
      }
      const active = document.fullscreenElement ?? doc.webkitFullscreenElement
      setFullscreen(active === shell)
    }
    document.addEventListener('fullscreenchange', syncFs)
    document.addEventListener('webkitfullscreenchange', syncFs)
    return () => {
      document.removeEventListener('fullscreenchange', syncFs)
      document.removeEventListener('webkitfullscreenchange', syncFs)
    }
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onTime = () => setCurrentTime(el.currentTime)

    const syncDuration = () => {
      const d = readDuration(el)
      if (d > 0) {
        setDuration(d)
      }
    }

    const onMeta = () => {
      syncDuration()
      setVolume(el.volume)
      setMuted(el.muted)
      if (el.videoWidth > 0 && el.videoHeight > 0) {
        setIntrinsicSize({ w: el.videoWidth, h: el.videoHeight })
      }
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVol = () => {
      setVolume(el.volume)
      setMuted(el.muted)
    }
    const onErr = () => setError('Could not load this video.')

    el.addEventListener('timeupdate', onTime)
    el.addEventListener('durationchange', syncDuration)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('loadeddata', syncDuration)
    el.addEventListener('canplay', syncDuration)
    el.addEventListener('progress', syncDuration)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('volumechange', onVol)
    el.addEventListener('error', onErr)

    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onMeta()
    } else {
      syncDuration()
    }

    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('durationchange', syncDuration)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('loadeddata', syncDuration)
      el.removeEventListener('canplay', syncDuration)
      el.removeEventListener('progress', syncDuration)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('volumechange', onVol)
      el.removeEventListener('error', onErr)
    }
  }, [src])

  useEffect(() => {
    setIntrinsicSize(null)
  }, [src])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const active = document.activeElement
      if (shell.contains(active) || active === shell) {
        e.preventDefault()
        void togglePlay()
      }
    }
    shell.addEventListener('keydown', onKey)
    return () => shell.removeEventListener('keydown', onKey)
  }, [togglePlay])

  if (!src) {
    return (
      <div
        className={cn(
          'flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-8 text-center text-zinc-400 backdrop-blur-sm md:rounded-3xl',
          className,
        )}
        role="status"
      >
        <p className="max-w-md text-sm leading-relaxed">
          Video is unavailable. Set{' '}
          <code className="rounded-md bg-white/10 px-1.5 py-0.5 text-zinc-200">
            VITE_R2_PUBLIC_URL
          </code>{' '}
          to your public R2 base URL and rebuild.
        </p>
      </div>
    )
  }

  const VolumeIcon =
    muted || volume === 0
      ? VolumeMute02Icon
      : volume < 0.45
        ? VolumeLowIcon
        : VolumeHighIcon

  const showPausedChrome = !playing

  return (
    <div
      ref={shellRef}
      tabIndex={0}
      role="group"
      aria-labelledby={labelId}
      className={cn(
        'group/player relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/5 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 md:rounded-3xl [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:ring-0',
        className,
      )}
    >
      <p id={labelId} className="sr-only">
        Video: {title}
      </p>

      {/* Tall portrait-first stage on mobile (viewport height); intrinsic ratio from md up */}
      <div
        className={cn(
          'relative w-full bg-black',
          'max-md:min-h-[min(55dvh,calc(100svh-6.5rem))]',
          'md:[aspect-ratio:var(--player-ar)]',
        )}
        style={
          {
            '--player-ar': intrinsicSize
              ? `${intrinsicSize.w} / ${intrinsicSize.h}`
              : '16 / 9',
          } as CSSProperties
        }
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full cursor-pointer touch-manipulation bg-black object-contain [-webkit-tap-highlight-color:transparent]"
          playsInline
          preload="auto"
          src={src}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('[data-player-controls]')) {
              return
            }
            if ((e.target as HTMLElement).closest('[data-fullscreen-btn]')) {
              return
            }
            void togglePlay()
          }}
        />
      </div>

      {/* Fullscreen — visible while playing (control bar hidden) or anytime */}
      <div className="pointer-events-none absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-20 md:right-5 md:top-5">
        <button
          type="button"
          data-fullscreen-btn
          aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
          onClick={(e) => {
            e.stopPropagation()
            void toggleFullscreen()
          }}
          className="pointer-events-auto flex size-12 touch-manipulation items-center justify-center rounded-xl border border-white/15 bg-black/55 text-white shadow-lg backdrop-blur-md transition-colors active:scale-[0.97] active:bg-black/70 min-[480px]:size-11 md:hover:bg-black/65"
        >
          <HugeiconsIcon
            icon={fullscreen ? MinimizeScreenIcon : FullScreenIcon}
            className="size-[1.35rem] min-[480px]:size-5"
          />
        </button>
      </div>

      {/* Bottom gradient — only when paused */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/80 via-black/25 to-transparent transition-opacity duration-300',
          showPausedChrome ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Center play / pause — only when paused */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300',
          showPausedChrome
            ? 'opacity-100'
            : 'pointer-events-none opacity-0',
        )}
      >
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={(e) => {
            e.stopPropagation()
            void togglePlay()
          }}
          className="pointer-events-auto flex size-[4.75rem] touch-manipulation items-center justify-center rounded-full bg-white/18 text-white shadow-lg backdrop-blur-xl transition-transform active:scale-95 min-[480px]:size-[4.25rem] md:size-18 md:hover:scale-105"
        >
          <HugeiconsIcon
            icon={playing ? PauseIcon : PlayIcon}
            className="size-9 min-[480px]:size-8 md:size-9"
          />
        </button>
      </div>

      {/* Glass control bar — only when paused */}
      <div
        data-player-controls
        className={cn(
          'absolute inset-x-0 bottom-0 z-10 px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-9 transition-opacity duration-300 max-md:pt-8 md:px-5 md:pb-5 md:pr-5 md:pt-12',
          showPausedChrome ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div className="select-none rounded-xl border border-white/12 bg-black/55 px-3 py-3 shadow-inner backdrop-blur-xl min-[480px]:px-4 md:rounded-2xl md:px-5 md:py-3">
          {/* Seek */}
          <div className="mb-3 flex items-center gap-2 min-[480px]:gap-3">
            <span className="min-w-[2.75rem] shrink-0 text-left font-mono text-xs tabular-nums text-zinc-200 min-[480px]:min-w-[2.85rem] md:text-xs">
              {formatTime(currentTime)}
            </span>
            <label className="sr-only" htmlFor={`${labelId}-seek`}>
              Seek
            </label>
            <input
              id={`${labelId}-seek`}
              type="range"
              min={0}
              max={duration > 0 ? duration : 1}
              disabled={duration <= 0}
              step="any"
              value={
                duration > 0
                  ? Math.min(Math.max(currentTime, 0), duration)
                  : 0
              }
              onInput={(e) => onSeek(Number(e.currentTarget.value))}
              onChange={(e) => onSeek(Number(e.currentTarget.value))}
              className={cn(
                'box-border h-3 flex-1 cursor-pointer touch-manipulation appearance-none rounded-full bg-white/15 py-2 md:h-1 md:py-0',
                '[&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md md:[&::-webkit-slider-thumb]:size-3.5',
                '[&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md md:[&::-moz-range-thumb]:size-3.5',
                '[&::-moz-range-progress]:h-3 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-primary md:[&::-moz-range-progress]:h-1',
                '[&::-moz-range-track]:h-3 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15 md:[&::-moz-range-track]:h-1',
              )}
              style={{
                background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${
                  duration > 0 ? (currentTime / duration) * 100 : 0
                }%, rgba(255,255,255,0.15) ${
                  duration > 0 ? (currentTime / duration) * 100 : 0
                }%, rgba(255,255,255,0.15) 100%)`,
              }}
            />
            <span className="min-w-[2.75rem] shrink-0 text-right font-mono text-xs tabular-nums text-zinc-200 min-[480px]:min-w-[2.85rem] md:text-xs">
              {duration > 0 ? formatTime(duration) : '—:——'}
            </span>
          </div>

          <div className="flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-3">
            <button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={(e) => {
                e.stopPropagation()
                void togglePlay()
              }}
              className="hidden min-[480px]:flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-xl bg-white/10 text-white transition-colors min-[480px]:hover:bg-white/15"
            >
              <HugeiconsIcon
                icon={playing ? PauseIcon : PlayIcon}
                className="size-5"
              />
            </button>

            <div className="flex w-full flex-row items-center gap-3 min-[480px]:w-auto min-[480px]:flex-1 min-[480px]:justify-end">
              <button
                type="button"
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMute()
                }}
                className="flex size-12 shrink-0 touch-manipulation items-center justify-center rounded-xl bg-white/10 text-white transition-colors active:bg-white/18 min-[480px]:size-10 min-[480px]:hover:bg-white/15"
              >
                <HugeiconsIcon
                  icon={VolumeIcon}
                  className="size-[1.35rem] min-[480px]:size-5"
                />
              </button>
              <label className="sr-only" htmlFor={`${labelId}-volume`}>
                Volume
              </label>
              <input
                id={`${labelId}-volume`}
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={muted ? 0 : volume}
                onInput={(e) =>
                  onVolumeSlider(Number(e.currentTarget.value))
                }
                onChange={(e) =>
                  onVolumeSlider(Number(e.currentTarget.value))
                }
                className={cn(
                  'box-border h-2 w-full min-h-5 flex-1 cursor-pointer touch-manipulation appearance-none rounded-full bg-white/15 py-1 min-[480px]:h-1 min-[480px]:min-h-0 min-[480px]:w-32 min-[480px]:flex-none min-[480px]:py-0 md:w-32',
                  '[&::-webkit-slider-thumb]:size-[13px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white min-[480px]:[&::-webkit-slider-thumb]:size-3 md:[&::-webkit-slider-thumb]:size-3',
                  '[&::-moz-range-thumb]:size-[13px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white min-[480px]:[&::-moz-range-thumb]:size-3 md:[&::-moz-range-thumb]:size-3',
                  '[&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-primary min-[480px]:[&::-moz-range-progress]:h-1 md:[&::-moz-range-progress]:h-1',
                  '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15 min-[480px]:[&::-moz-range-track]:h-1 md:[&::-moz-range-track]:h-1',
                )}
                style={{
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${
                    (muted ? 0 : volume) * 100
                  }%, rgba(255,255,255,0.15) ${
                    (muted ? 0 : volume) * 100
                  }%, rgba(255,255,255,0.15) 100%)`,
                }}
              />
            </div>
          </div>

          {error ? (
            <p className="mt-2 text-center text-xs text-red-300">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
