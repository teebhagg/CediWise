'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MenuVertical } from '@/components/ui/menu-vertical'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Salary & Tax', href: '#salary' },
  { label: 'Budgeting', href: '#budgeting' },
  { label: 'SME Ledger', href: '#ledger' },
  { label: 'Financial Literacy', href: '#literacy' },
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <header
      className={cn(
        'fixed top-5 z-50 w-full transition-all duration-500 ease-in-out',
        scrolled ? 'py-3' : 'py-6',
      )}
    >
      <div className=" mx-auto px-6 sm:px-12">
        <nav className="relative flex items-center justify-between">
          {/* Desktop Left Nav */}
          <div className="hidden flex-1 items-center gap-10 lg:flex">
            {navItems.slice(0, 2).map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="group relative text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="absolute left-5 lg:left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95">
            <div className="flex items-center justify-center gap-2.5 backdrop-blur-md">
              <img
                src="/cediwise-smooth-light-logo.png"
                alt="CediWise Logo"
                className="h-10 w-auto"
              />
            </div>
          </div>

          {/* Desktop Right Nav & CTA */}
          <div className="hidden flex-1 items-center justify-end gap-10 lg:flex">
            {navItems.slice(2).map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="group relative text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <Button
              size="sm"
              className="h-10 rounded-xl bg-primary px-6 text-sm font-bold text-black shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:scale-105 hover:bg-primary/90 active:scale-95"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Burger (Framer Component Style) */}
          <div className="lg:hidden ml-auto">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="group relative z-60 flex size-12 items-center justify-center rounded-2xl bg-white/5 backdrop-blur-md transition-all hover:bg-white/10"
            >
              <div className="flex flex-col gap-1.5 items-end justify-center">
                <motion.span
                  animate={
                    isOpen
                      ? { rotate: 45, y: 6, width: '24px' }
                      : { rotate: 0, y: 0, width: '24px' }
                  }
                  className="h-[2px] rounded-full bg-white"
                />
                <motion.span
                  animate={
                    isOpen
                      ? { opacity: 0, x: -10 }
                      : { opacity: 1, x: 0, width: '16px' }
                  }
                  className="h-[2px] rounded-full bg-white"
                />
                <motion.span
                  animate={
                    isOpen
                      ? { rotate: -45, y: -6, width: '24px' }
                      : { rotate: 0, y: 0, width: '24px' }
                  }
                  className="h-[2px] rounded-full bg-white"
                />
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* Floating Glass Container background (Aave inspired) */}
      <div
        className={cn(
          'absolute inset-x-4 top-1 lg:top-0 -z-10 h-16 rounded-3xl border border-white/5 bg-white/2 backdrop-blur-2xl transition-all duration-700 ease-out sm:inset-x-10',
          scrolled
            ? 'translate-y-0 opacity-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]'
            : '-translate-y-full opacity-0',
        )}
      />

      {/* Mobile Menu Overlay (Berlix style) */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="fixed inset-0 z-55 flex flex-col justify-center bg-zinc-950 px-6 pt-24 pb-12"
            >
              <div className="absolute top-8 left-8">
                <div className="flex items-center gap-3">
                  <img
                    src="/cediwise-smooth-light-logo.png"
                    alt="CediWise"
                    className="h-10 w-auto"
                  />
                  <span className="text-2xl font-bold text-white tracking-tighter">
                    CediWise
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <MenuVertical menuItems={navItems} skew={10} />
              </div>

              <div className="mt-12 px-10">
                <Button className="h-16 w-full max-w-sm rounded-[2rem] bg-primary text-xl font-bold text-black shadow-lg">
                  Install App
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
