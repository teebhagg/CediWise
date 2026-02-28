import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Download01Icon,
  SmartPhone01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { cn } from '~/lib/utils'

interface JoinBetaButtonProps {
  className?: string
  children?: React.ReactNode
}

export function JoinBetaButton({ className, children }: JoinBetaButtonProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            size="lg"
            className={cn(
              'h-14 gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer',
              className,
            )}
          />
        }
      >
        {children || (
          <>
            <HugeiconsIcon icon={SmartPhone01Icon} className="size-5" />
            Join Beta Test
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Join the CediWise Android Beta
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Get early access and help improve smart budgeting in Ghana 🇬🇭
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <a
                href="https://groups.google.com/g/cediwise-tester"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center justify-between w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <HugeiconsIcon icon={UserGroupIcon} className="size-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white">
                      1. Join Tester Group
                    </p>
                    <p className="text-xs text-zinc-400">
                      Join our Google Group to get access
                    </p>
                  </div>
                </div>
                <div className="text-zinc-500 group-hover:text-primary transition-colors">
                  <HugeiconsIcon icon={SmartPhone01Icon} className="size-4" />
                </div>
              </a>
              <p className="text-[11px] text-zinc-500 px-1">
                Make sure you join using the same Google account on your Android
                device.
              </p>
            </div>

            <a
              href="https://play.google.com/apps/testing/com.cediwise.app"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center justify-between w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                  <HugeiconsIcon icon={Download01Icon} className="size-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">
                    2. Download the app
                  </p>
                  <p className="text-xs text-zinc-400">
                    Directly download from Play Store
                  </p>
                </div>
              </div>
              <div className="text-zinc-500 group-hover:text-emerald-500 transition-colors">
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-4" />
              </div>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
