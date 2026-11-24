/** Canonical mobile store URLs for CediWise marketing site. */
export const CEDIWISE_IOS_APP_STORE_URL =
  'https://apps.apple.com/gh/app/cediwise/id6761660784'

export const CEDIWISE_ANDROID_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.cediwise.app'

/** Opens the App Store review composer for CediWise (Apple's documented link parameter). */
export const CEDIWISE_IOS_APP_STORE_REVIEW_URL = `${CEDIWISE_IOS_APP_STORE_URL}?action=write-review`

export type ReviewStore = {
  name: 'Google Play' | 'App Store'
  url: string
}

/**
 * Android devices review on Google Play. Every other device (iPhone, iPad,
 * Mac, Windows, Linux, unknown) goes to the App Store.
 */
export function reviewStoreForUserAgent(userAgent: string | null | undefined): ReviewStore {
  if (userAgent && /android/i.test(userAgent)) {
    return { name: 'Google Play', url: CEDIWISE_ANDROID_PLAY_STORE_URL }
  }
  return { name: 'App Store', url: CEDIWISE_IOS_APP_STORE_REVIEW_URL }
}
