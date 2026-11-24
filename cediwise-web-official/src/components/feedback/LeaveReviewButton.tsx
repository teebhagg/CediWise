'use client'

import { useEffect, useState } from 'react'
import type { ReviewStore } from '@/lib/storeLinks'
import {
  CEDIWISE_IOS_APP_STORE_REVIEW_URL,
  reviewStoreForUserAgent,
} from '@/lib/storeLinks'

/** Server render and first client render use the App Store; Android switches to Google Play after mount. */
const DEFAULT_STORE: ReviewStore = {
  name: 'App Store',
  url: CEDIWISE_IOS_APP_STORE_REVIEW_URL,
}

export function LeaveReviewButton() {
  const [store, setStore] = useState<ReviewStore>(DEFAULT_STORE)

  useEffect(() => {
    setStore(reviewStoreForUserAgent(navigator.userAgent))
  }, [])

  return (
    <a
      href={store.url}
      rel="noopener noreferrer"
      className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      Leave a review on {store.name}
    </a>
  )
}
