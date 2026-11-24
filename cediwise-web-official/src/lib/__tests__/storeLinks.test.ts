import { describe, expect, it } from 'vitest'
import {
  CEDIWISE_ANDROID_PLAY_STORE_URL,
  CEDIWISE_IOS_APP_STORE_REVIEW_URL,
  CEDIWISE_IOS_APP_STORE_URL,
  reviewStoreForUserAgent,
} from '@/lib/storeLinks'

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const WINDOWS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

describe('reviewStoreForUserAgent', () => {
  it('sends Android devices to Google Play', () => {
    expect(reviewStoreForUserAgent(ANDROID_UA)).toEqual({
      name: 'Google Play',
      url: CEDIWISE_ANDROID_PLAY_STORE_URL,
    })
  })

  it('sends iPhone and iPad to the App Store review page', () => {
    expect(reviewStoreForUserAgent(IPHONE_UA)).toEqual({
      name: 'App Store',
      url: CEDIWISE_IOS_APP_STORE_REVIEW_URL,
    })
    expect(reviewStoreForUserAgent(IPAD_UA).name).toBe('App Store')
  })

  it('sends desktop browsers to the App Store', () => {
    expect(reviewStoreForUserAgent(MAC_UA).name).toBe('App Store')
    expect(reviewStoreForUserAgent(WINDOWS_UA).name).toBe('App Store')
  })

  it('falls back to the App Store when the user agent is missing', () => {
    expect(reviewStoreForUserAgent(undefined).name).toBe('App Store')
    expect(reviewStoreForUserAgent(null).name).toBe('App Store')
    expect(reviewStoreForUserAgent('').name).toBe('App Store')
  })

  it('links the review page to the canonical App Store listing', () => {
    expect(CEDIWISE_IOS_APP_STORE_REVIEW_URL).toBe(`${CEDIWISE_IOS_APP_STORE_URL}?action=write-review`)
  })
})
