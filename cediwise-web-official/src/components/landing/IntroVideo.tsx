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
import { motion } from 'framer-motion'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { r2PublicObjectUrl } from '@/lib/r2Public'
import { cn } from '@/lib/utils'

const INTRO_OBJECT_KEY = 'cediwise-intro/cediwise-intro.mp4'

export function IntroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const labelId = useId()

  const [src, setSrc] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volumeOpen, setVolumeOpen] = useState(false)
  const hasAutoPlayed = useRef(false)

  useEffect(() => {
    setSrc(r2PublicObjectUrl(INTRO_OBJECT_KEY))
  }, [])

  const playOnView = useCallback(() => {
    if (hasAutoPlayed.current) return
    hasAutoPlayed.current = true
    const el = videoRef.current
    if (!el || !src) return
    el.volume = 0.5
    void el.play().catch(() => {
      /* browser may block autoplay; user tap will start it */
    })
  }, [src])

  const togglePlay = useCallback(async () => {
    const el = videoRef.current
    if (!el || !src) return

    if (ended) {
      el.currentTime = 0
      setEnded(false)
    }

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
  }, [src, ended])

  const toggleMute = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
  }, [])

  const onVolumeSlider = useCallback((v: number) => {
    const el = videoRef.current
    if (!el) return
    const next = Math.min(1, Math.max(0, v))
    el.volume = next
    el.muted = next === 0
    setVolume(next)
    setMuted(next === 0)
  }, [])

  const onReplay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    el.currentTime = 0
    setEnded(false)
    setPlaying(true)
    void el.play()
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const onPlay = () => {
      setPlaying(true)
      setEnded(false)
    }
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setEnded(true)
    }
    const onVol = () => {
      setVolume(el.volume)
      setMuted(el.muted)
    }
    const onErr = () => setError('Could not load this video.')

    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    el.addEventListener('volumechange', onVol)
    el.addEventListener('error', onErr)

    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('volumechange', onVol)
      el.removeEventListener('error', onErr)
    }
  }, [src])

  if (!src) {
    return null
  }

  const VolumeIcon =
    muted || volume === 0
      ? VolumeMute02Icon
      : volume < 0.45
        ? VolumeLowIcon
        : VolumeHighIcon

  const showCenter = !playing || ended

  return (
    <section className="relative bg-[#0A0A0A] px-6 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        onViewportEnter={playOnView}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="mx-auto max-w-5xl"
      >
        <div
          ref={shellRef}
          tabIndex={0}
          role="group"
          aria-labelledby={labelId}
          className={cn(
            'group/player relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/5 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 md:rounded-3xl',
          )}
        >
          <p id={labelId} className="sr-only">
            CediWise intro video
          </p>

          <div className="relative w-full aspect-video bg-black max-md:min-h-[min(55dvh,calc(100svh-6.5rem))] max-md:aspect-auto">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full cursor-pointer touch-manipulation bg-black object-contain [-webkit-tap-highlight-color:transparent]"
              playsInline
              preload="auto"
              src={src}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-vol-trigger]')) return
                if ((e.target as HTMLElement).closest('[data-vol-panel]')) return
                void togglePlay()
              }}
            />

            {error ? (
              <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <div
              className={cn(
                'pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300',
                showCenter ? 'opacity-100' : 'opacity-0',
              )}
            >
              <button
                type="button"
                aria-label={
                  ended ? 'Replay video' : playing ? 'Pause' : 'Play'
                }
                onClick={(e) => {
                  e.stopPropagation()
                  if (ended) {
                    onReplay()
                  } else {
                    void togglePlay()
                  }
                }}
                className="pointer-events-auto flex size-[4.75rem] touch-manipulation items-center justify-center rounded-full bg-white/35 text-zinc-300 shadow-lg backdrop-blur-xl transition-transform active:scale-95 min-[480px]:size-[4.25rem] md:size-18 md:hover:scale-105"
              >
                <HugeiconsIcon
                  icon={ended ? VideoReplayIcon : playing ? PauseIcon : PlayIcon}
                  className="size-9 min-[480px]:size-8 md:size-9"
                />
              </button>
            </div>

            <div
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/80 via-black/25 to-transparent transition-opacity duration-300',
                showCenter ? 'opacity-100' : 'opacity-0',
              )}
            />

            <button
              type="button"
              data-vol-trigger
              aria-label={volumeOpen ? 'Close volume' : 'Volume'}
              onClick={(e) => {
                e.stopPropagation()
                setVolumeOpen((v) => !v)
              }}
              className={cn(
                'absolute bottom-4 right-4 z-30 flex size-11 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg backdrop-blur-xl transition-colors active:bg-black/75 md:size-11 md:hover:bg-black/70',
                volumeOpen && 'ring-1 ring-white/20',
              )}
            >
              <HugeiconsIcon
                icon={VolumeIcon}
                className="size-[1.15rem] md:size-[1.15rem]"
              />
            </button>

            {volumeOpen && (
              <div
                data-vol-panel
                className="absolute bottom-16 right-4 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/12 bg-black/70 px-4 py-4 shadow-xl backdrop-blur-xl min-[480px]:px-5 min-[480px]:py-4">
                  <button
                    type="button"
                    aria-label={muted ? 'Unmute' : 'Mute'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMute()
                    }}
                    className="flex size-10 touch-manipulation items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/15 active:bg-white/18 min-[480px]:size-10"
                  >
                    <HugeiconsIcon
                      icon={VolumeIcon}
                      className="size-5 min-[480px]:size-5"
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
                      'h-20 w-1 cursor-pointer touch-manipulation appearance-none rounded-full bg-white/15 py-0 min-[480px]:h-24',
                      '[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md',
                      '[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md',
                      '[&::-moz-range-progress]:w-1 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-primary',
                      '[&::-moz-range-track]:w-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15',
                    )}
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      background: `linear-gradient(to top, var(--primary) 0%, var(--primary) ${
                        (muted ? 0 : volume) * 100
                      }%, rgba(255,255,255,0.15) ${
                        (muted ? 0 : volume) * 100
                      }%, rgba(255,255,255,0.15) 100%)`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
