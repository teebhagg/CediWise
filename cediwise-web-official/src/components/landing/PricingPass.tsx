'use client'

import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react'

type PricingPassProps = {
  name: string
  variant: 'free' | 'budget' | 'sme'
}

const passStyles = {
  free: {
    surface: 'from-[#fffefa] via-[#f4f4ed] to-[#e7e9df] text-[#202720]',
    edge: 'from-[#dce5dc] via-[#849589] to-[#34463a]',
    ink: '#202720',
    wave: 'rgba(16, 185, 129, 0.14)',
    waveLine: 'rgba(4, 120, 87, 0.36)',
    watermark: 'rgba(4, 120, 87, 0.10)',
    angle: '-0.5deg',
  },
  budget: {
    surface: 'from-[#34d399] via-[#10b981] to-[#047857] text-[#06251a]',
    edge: 'from-[#86efac] via-[#059669] to-[#064e3b]',
    ink: '#06251a',
    wave: 'rgba(4, 53, 36, 0.16)',
    waveLine: 'rgba(236, 253, 245, 0.55)',
    watermark: 'rgba(3, 49, 34, 0.18)',
    angle: '-4deg',
  },
  sme: {
    surface: 'from-[#080b09] via-[#111a14] to-[#064e3b] text-[#ecfdf5]',
    edge: 'from-[#657a69] via-[#193324] to-[#030b06]',
    ink: '#ecfdf5',
    wave: 'rgba(16, 185, 129, 0.22)',
    waveLine: 'rgba(110, 231, 183, 0.62)',
    watermark: 'rgba(110, 231, 183, 0.14)',
    angle: '0.5deg',
  },
} satisfies Record<PricingPassProps['variant'], Record<string, string>>

const cardSpring = { stiffness: 240, damping: 30, mass: 0.6 }
const lightSpring = { stiffness: 180, damping: 30, mass: 0.7 }

export function PricingPass({ name, variant }: PricingPassProps) {
  const style = passStyles[variant]
  const reduceMotion = useReducedMotion()
  const rotateXTarget = useMotionValue(0)
  const rotateYTarget = useMotionValue(0)
  const liftTarget = useMotionValue(0)
  const depthTarget = useMotionValue(0)
  const scaleTarget = useMotionValue(1)
  const highlightXTarget = useMotionValue(50)
  const highlightYTarget = useMotionValue(50)
  const highlightOpacityTarget = useMotionValue(0)
  const rotateX = useSpring(rotateXTarget, cardSpring)
  const rotateY = useSpring(rotateYTarget, cardSpring)
  const lift = useSpring(liftTarget, cardSpring)
  const depth = useSpring(depthTarget, cardSpring)
  const scale = useSpring(scaleTarget, cardSpring)
  const highlightX = useSpring(highlightXTarget, lightSpring)
  const highlightY = useSpring(highlightYTarget, lightSpring)
  const highlightOpacity = useSpring(highlightOpacityTarget, lightSpring)
  const highlightBackground = useMotionTemplate`radial-gradient(circle at ${highlightX}% ${highlightY}%, rgba(255,255,255,0.44), transparent 58%)`
  const transform = useMotionTemplate`perspective(1000px) rotate(${reduceMotion ? '0deg' : style.angle}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(0px, ${lift}px, ${depth}px) scale(${scale})`

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || reduceMotion) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const width = event.currentTarget.offsetWidth || bounds.width
    const height = event.currentTarget.offsetHeight || bounds.height
    if (!width || !height) return

    const x = Math.max(
      -1,
      Math.min(
        1,
        (event.clientX - (bounds.left + bounds.width / 2)) / (width / 2),
      ),
    )
    const y = Math.max(
      -1,
      Math.min(
        1,
        (event.clientY - (bounds.top + bounds.height / 2)) / (height / 2),
      ),
    )

    rotateXTarget.set(-y * 9)
    rotateYTarget.set(x * 12)
    liftTarget.set(-5)
    depthTarget.set(16)
    scaleTarget.set(1.025)
    highlightXTarget.set(50 + x * 55)
    highlightYTarget.set(50 + y * 55)
    highlightOpacityTarget.set(0.24)
  }

  function resetPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return

    rotateXTarget.set(0)
    rotateYTarget.set(0)
    liftTarget.set(0)
    depthTarget.set(0)
    scaleTarget.set(1)
    highlightXTarget.set(50)
    highlightYTarget.set(50)
    highlightOpacityTarget.set(0)
  }

  const passStyle = {
    '--pricing-pass-wave': style.wave,
    '--pricing-pass-wave-line': style.waveLine,
  } as CSSProperties

  return (
    <motion.div
      data-pricing-pass
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      onPointerCancel={resetPointer}
      className="relative isolate aspect-[1.62] w-full select-none"
      style={{
        ...passStyle,
        transform,
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        aria-hidden="true"
        className={
          'pointer-events-none absolute inset-0 rounded-[14px] border border-white/30 bg-gradient-to-b ' +
          style.edge +
          ' shadow-[0_16px_20px_-15px_rgba(0,0,0,0.78)]'
        }
        style={{ transform: 'translateZ(-14px) scale(0.985)' }}
      />

      <div
        className={
          'relative isolate h-full overflow-hidden rounded-[14px] border border-white/45 bg-gradient-to-br shadow-[0_14px_20px_-16px_rgba(5,35,22,0.68)] ' +
          style.surface
        }
        style={{ transform: 'translateZ(0px)', backfaceVisibility: 'hidden' }}
      >
        <div className="pointer-events-none absolute inset-[1px] rounded-[13px] border border-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.62),inset_0_-1px_0_rgba(26,38,28,0.12)]" />
        <div className="pointer-events-none absolute inset-x-[4%] top-px h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-80" />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 320 198"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M176 12C223 66 276 79 322 51C338 41 309 138 276 203"
            stroke="var(--pricing-pass-wave)"
            strokeWidth="42"
            strokeLinecap="round"
          />
          <path
            d="M176 12C223 66 276 79 322 51C338 41 309 138 276 203"
            stroke="var(--pricing-pass-wave-line)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity=".62"
          />
        </svg>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[55%] top-1/2 text-[196px] font-black leading-none tracking-[-0.16em]"
          style={{
            color: style.watermark,
            transform: 'translate(-50%, -50%) rotate(45deg)',
            transformOrigin: 'center',
          }}
        >
          CW
        </span>
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: highlightBackground, opacity: highlightOpacity }}
        />

        <div className="relative flex h-full flex-col justify-between px-[6.2%] py-[5.5%]">
          <div className="flex items-center gap-2">
            <img
              src="/cediwise-smooth-light-logo.png"
              alt=""
              className="size-7 rounded-[6px] object-cover shadow-[0_1px_3px_rgba(0,0,0,0.16)]"
              loading="lazy"
            />
            <span className="text-[13px] font-semibold tracking-[-0.045em]">
              CediWise
            </span>
          </div>

          <div
            className="absolute left-[6.2%] top-[43%] opacity-70"
            style={{ color: style.ink }}
          >
            <svg
              viewBox="0 0 22 24"
              className="h-6 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 7.5C9.5 10.2 9.5 13.8 5 16.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M9 4.5C15.1 8.4 15.1 15.6 9 19.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M13 2C20.4 7 20.4 17 13 22"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="absolute bottom-[12%] left-[6.2%]">
            <p className="text-[15px] font-medium tracking-[-0.035em]">
              {name}
            </p>
            <p className="mt-1 text-[7px] font-medium uppercase tracking-[0.18em] opacity-70">
              CediWise · Ghana
            </p>
          </div>

          <svg
            className="absolute bottom-[11%] right-[6.2%] h-[18%] w-[10%] drop-shadow-[0_1px_1px_rgba(0,0,0,0.16)]"
            viewBox="0 0 32 38"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="1"
              y="1"
              width="30"
              height="36"
              rx="5"
              fill={'url(#chip-metal-' + variant + ')'}
              stroke="rgba(80,91,79,0.52)"
            />
            <path
              d="M10 2V36M22 2V36M2 12H30M2 25H30"
              stroke="rgba(80,91,79,0.54)"
              strokeWidth="1"
            />
            <path
              d="M10 12H22V25H10z"
              fill="rgba(255,255,255,0.28)"
              stroke="rgba(80,91,79,0.34)"
            />
            <defs>
              <linearGradient
                id={'chip-metal-' + variant}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop stopColor="#f9fbf7" />
                <stop offset=".52" stopColor="#aeb7a9" />
                <stop offset="1" stopColor="#f0f3eb" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </motion.div>
  )
}
