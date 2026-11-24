'use client'

import {
  PauseIcon,
  PlayIcon,
  VideoReplayIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMute02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { r2PublicObjectUrl } from '@/lib/r2Public'
import { cn } from '@/lib/utils'

const INTRO_OBJECT_KEY = 'cediwise-intro/cediwise-intro.mp4'
const CONTROL_HIDE_DELAY = 2600

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function IntroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const labelId = useId()
  const seekId = useId()
  const volumeId = useId()
  const reduceMotion = useReducedMotion()

  const [src, setSrc] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [muted, setMuted] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSrc(r2PublicObjectUrl(INTRO_OBJECT_KEY))
  }, [])

  useEffect(
    () => () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    },
    [],
  )

  const keepControlsVisible = useCallback(() => {
    setControlsVisible(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    if (videoRef.current && !videoRef.current.paused) {
      controlsTimerRef.current = setTimeout(
        () => setControlsVisible(false),
        CONTROL_HIDE_DELAY,
      )
    }
  }, [])

  const togglePlay = useCallback(async () => {
    const video = videoRef.current
    if (!video || !src) return

    if (video.ended) video.currentTime = 0

    if (video.paused) {
      try {
        await video.play()
        setError(null)
        keepControlsVisible()
      } catch {
        setError('Could not play this video. Please try again.')
        setPlaying(false)
        setControlsVisible(true)
      }
    } else {
      video.pause()
      setControlsVisible(true)
    }
  }, [keepControlsVisible, src])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.muted && video.volume === 0) {
      video.volume = 0.5
      setVolume(0.5)
    }
    video.muted = !video.muted
    setMuted(video.muted)
    keepControlsVisible()
  }, [keepControlsVisible])

  const updateVolume = useCallback(
    (nextValue: number) => {
      const video = videoRef.current
      if (!video) return
      const next = Math.min(1, Math.max(0, nextValue))
      video.volume = next
      video.muted = next === 0
      setVolume(next)
      setMuted(next === 0)
      keepControlsVisible()
    },
    [keepControlsVisible],
  )

  const seekTo = useCallback((nextTime: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = Math.min(video.duration, Math.max(0, nextTime))
    setCurrentTime(video.currentTime)
  }, [])

  const handleKeyboard = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target !== event.currentTarget &&
        target.matches(
          'button, input, select, textarea, [contenteditable="true"]',
        )
      ) {
        return
      }

      const key = event.key.toLowerCase()
      if (event.code === 'Space' || key === 'k') {
        event.preventDefault()
        void togglePlay()
      } else if (key === 'arrowleft' || key === 'arrowright') {
        event.preventDefault()
        seekTo(
          (videoRef.current?.currentTime ?? 0) + (key === 'arrowleft' ? -5 : 5),
        )
        keepControlsVisible()
      } else if (key === 'm') {
        event.preventDefault()
        toggleMute()
      }
    },
    [keepControlsVisible, seekTo, toggleMute, togglePlay],
  )

  if (!src) return null

  const VolumeIcon =
    muted || volume === 0
      ? VolumeMute02Icon
      : volume < 0.45
        ? VolumeLowIcon
        : VolumeHighIcon

  const showCenterControl = !playing || ended
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const volumeProgress = muted ? 0 : volume * 100

  return (
    <section className="relative bg-[#0A0A0A] px-5 py-14 sm:px-6 md:py-20">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-64px' }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-[42rem]"
      >
        <div
          tabIndex={0}
          role="group"
          aria-labelledby={labelId}
          onKeyDown={handleKeyboard}
          onPointerMove={keepControlsVisible}
          onPointerLeave={() => {
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
            if (videoRef.current && !videoRef.current.paused) {
              controlsTimerRef.current = setTimeout(
                () => setControlsVisible(false),
                500,
              )
            }
          }}
          onFocusCapture={() => {
            setControlsVisible(true)
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
          }}
          onBlurCapture={(event) => {
            if (
              videoRef.current &&
              !videoRef.current.paused &&
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            ) {
              keepControlsVisible()
            }
          }}
          className="group/player relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_64px_-28px_rgba(0,0,0,0.9)] ring-1 ring-white/5 outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:rounded-[1.35rem]"
        >
          <p id={labelId} className="sr-only">
            CediWise intro video. Use Space or K to play or pause, arrow keys to
            seek, and M to mute.
          </p>

          <div className="relative aspect-video w-full bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full cursor-pointer touch-manipulation bg-black object-contain [-webkit-tap-highlight-color:transparent]"
              playsInline
              preload="metadata"
              src={src}
              onClick={() => void togglePlay()}
              onPlay={() => {
                setPlaying(true)
                setEnded(false)
                keepControlsVisible()
              }}
              onPause={() => {
                setPlaying(false)
                setControlsVisible(true)
                if (controlsTimerRef.current)
                  clearTimeout(controlsTimerRef.current)
              }}
              onEnded={() => {
                setPlaying(false)
                setEnded(true)
                setControlsVisible(true)
              }}
              onTimeUpdate={(event) =>
                setCurrentTime(event.currentTarget.currentTime)
              }
              onLoadedMetadata={(event) =>
                setDuration(event.currentTarget.duration)
              }
              onVolumeChange={(event) => {
                setVolume(event.currentTarget.volume)
                setMuted(event.currentTarget.muted)
              }}
              onError={() => setError('Could not load this video.')}
            />

            {error ? (
              <p
                role="status"
                className="absolute left-4 right-4 top-1/2 -translate-y-1/2 text-center text-sm text-red-200"
              >
                {error}
              </p>
            ) : null}

            <div
              aria-hidden={!showCenterControl}
              className={cn(
                'pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300',
                showCenterControl ? 'opacity-100' : 'opacity-0',
              )}
            >
              <button
                type="button"
                aria-label={ended ? 'Replay video' : 'Play video'}
                tabIndex={showCenterControl ? 0 : -1}
                onClick={(event) => {
                  event.currentTarget.blur()
                  void togglePlay()
                }}
                className="pointer-events-auto flex size-14 touch-manipulation items-center justify-center rounded-full border border-white/25 bg-black/60 text-white shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-[transform,background-color] duration-200 hover:scale-105 hover:bg-black/75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:size-16"
              >
                <HugeiconsIcon
                  icon={ended ? VideoReplayIcon : PlayIcon}
                  className={ended ? 'size-6' : 'ml-0.5 size-6'}
                />
              </button>
            </div>

            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-linear-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-300',
                controlsVisible ? 'opacity-100' : 'opacity-0',
              )}
            />

            <div
              className={cn(
                'absolute inset-x-0 bottom-0 z-20 px-3 pb-3 pt-8 transition-opacity duration-300 sm:px-4 sm:pb-4',
                controlsVisible
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0',
              )}
            >
              <div className="flex items-center gap-2.5 text-white sm:gap-3">
                <button
                  type="button"
                  aria-label={
                    playing
                      ? 'Pause video'
                      : ended
                        ? 'Replay video'
                        : 'Play video'
                  }
                  onClick={() => void togglePlay()}
                  className="flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <HugeiconsIcon
                    icon={
                      playing ? PauseIcon : ended ? VideoReplayIcon : PlayIcon
                    }
                    className="size-[1.05rem]"
                  />
                </button>

                <span className="min-w-[3.2rem] select-none font-mono text-[0.68rem] tabular-nums text-white/75">
                  {formatTime(currentTime)}
                </span>

                <label className="sr-only" htmlFor={seekId}>
                  Seek through video
                </label>
                <input
                  id={seekId}
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  disabled={!duration}
                  onChange={(event) =>
                    seekTo(Number(event.currentTarget.value))
                  }
                  onPointerDown={keepControlsVisible}
                  style={{
                    background: `linear-gradient(to right, white ${progress}%, rgba(255,255,255,0.3) ${progress}%)`,
                  }}
                  className="h-1 min-w-0 flex-1 cursor-pointer touch-manipulation appearance-none rounded-full outline-none transition-[height] hover:h-1.5 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-4 focus-visible:ring-offset-black/50 [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.5)] [&::-moz-range-thumb]:size-2.5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
                />

                <span className="min-w-[3.2rem] select-none text-right font-mono text-[0.68rem] tabular-nums text-white/55">
                  −{formatTime(Math.max(0, duration - currentTime))}
                </span>

                <button
                  type="button"
                  aria-label={
                    muted || volume === 0 ? 'Unmute video' : 'Mute video'
                  }
                  onClick={toggleMute}
                  className="flex size-8 shrink-0 touch-manipulation items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <HugeiconsIcon icon={VolumeIcon} className="size-[1.05rem]" />
                </button>

                <label className="sr-only" htmlFor={volumeId}>
                  Video volume
                </label>
                <input
                  id={volumeId}
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={muted ? 0 : volume}
                  onChange={(event) =>
                    updateVolume(Number(event.currentTarget.value))
                  }
                  onPointerDown={keepControlsVisible}
                  style={{
                    background: `linear-gradient(to right, white ${volumeProgress}%, rgba(255,255,255,0.3) ${volumeProgress}%)`,
                  }}
                  className="hidden h-1 w-12 cursor-pointer touch-manipulation appearance-none rounded-full outline-none transition-[height] hover:h-1.5 focus-visible:ring-2 focus-visible:ring-white/80 sm:block sm:w-14 [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:size-2.5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
