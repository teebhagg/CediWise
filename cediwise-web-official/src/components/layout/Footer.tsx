'use client'

import {
  ArrowRight01Icon,
  InstagramIcon,
  Linkedin01Icon,
  TwitterIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

const footerLinks = [
  {
    title: 'Product',
    links: [
      { name: 'Salary Calculator', href: '/salary-calculator' },
      { name: 'Budgeting Tool', href: '/budgeting-tool' },
      { name: 'SME Ledger', href: '/sme-ledger' },
      { name: 'Financial Literacy', href: '/financial-literacy' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
    ],
  },
]

const socialLinks = [
  { icon: TwitterIcon, href: '#', label: 'Twitter' },
  { icon: InstagramIcon, href: '#', label: 'Instagram' },
  { icon: Linkedin01Icon, href: '#', label: 'LinkedIn' },
]

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-[#0A0A0A] pt-24 pb-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <img
                src="/cediwise-smooth-light-logo.png"
                alt="CediWise"
                className="h-10 w-auto"
              />
              <span className="text-2xl font-bold text-white tracking-tighter">
                CediWise
              </span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-8">
              Empowering Ghanaians with smart financial tools. Manage your
              salary, track your SME expenses, and build wealth with confidence.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ y: -3, color: 'var(--primary)' }}
                  className="size-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 transition-colors hover:bg-white/10"
                >
                  <HugeiconsIcon icon={social.icon} className="size-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          {footerLinks.map((section) => (
            <div key={section.title} className="lg:col-span-1">
              <h4 className="text-white font-bold mb-6">{section.title}</h4>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-zinc-400 text-sm hover:text-primary transition-colors duration-300"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter Section */}
          <div className="lg:col-span-1">
            <h4 className="text-white font-bold mb-6">Newsletter</h4>
            <p className="text-zinc-400 text-sm mb-6">
              Get financial tips and product updates directly in your inbox.
            </p>
            <div className="relative group">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 transition-all"
              />
              <button className="absolute right-2 top-2 size-10 rounded-xl bg-primary flex items-center justify-center text-black hover:bg-primary/90 transition-all">
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-24 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-500 text-xs">
            © {new Date().getFullYear()} CediWise. All rights reserved.
            <span className="ml-2 italic text-zinc-600">
              Built for Ghanaians.
            </span>
          </p>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-500 text-xs font-medium">
                Systems Operational
              </span>
            </div>
            <a
              href="#about"
              className="text-zinc-500 text-xs hover:text-white transition-colors"
            >
              Security
            </a>
            <a
              href="#about"
              className="text-zinc-500 text-xs hover:text-white transition-colors"
            >
              Compliance
            </a>
          </div>
        </div>
      </div>

      {/* Background Decorative Gradient */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -z-10 h-[300px] w-full max-w-4xl bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
    </footer>
  )
}
