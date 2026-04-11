'use client'

import { AndroidIcon, AppleIcon } from '@/components/icons/StoreBrandIcons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CEDIWISE_ANDROID_PLAY_STORE_URL,
  CEDIWISE_IOS_APP_STORE_URL,
} from '@/lib/storeLinks'
import { cn } from '@/lib/utils'

export type DownloadAppDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DownloadAppDialog({ open, onOpenChange }: DownloadAppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'gap-5 border-white/10 bg-zinc-950/95 p-6 text-white shadow-2xl ring-white/10 sm:max-w-md',
          'data-open:animate-in data-closed:animate-out',
        )}
      >
        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="text-lg font-semibold text-white">
            Get CediWise
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-zinc-400">
            Choose your device. We&apos;ll open the official store in a new tab.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <a
            href={CEDIWISE_ANDROID_PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className={cn(
              'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-base font-semibold text-white backdrop-blur-md transition-colors duration-200 hover:border-white/30 hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            )}
          >
            <AndroidIcon className="size-6 shrink-0" aria-hidden />
            Google Play
          </a>
          <a
            href={CEDIWISE_IOS_APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpenChange(false)}
            className={cn(
              'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-600/70 px-4 py-3 text-base font-semibold text-white backdrop-blur-md transition-colors duration-200 hover:border-emerald-400/60 hover:bg-emerald-600/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40',
            )}
          >
            <AppleIcon className="size-5 shrink-0" aria-hidden />
            App Store
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
