import { defineEventHandler, getQuery, setResponseHeader, setResponseStatus } from 'nitro/h3'
import { unsubscribeFromNewsletter } from '../../lib/newsletter'

function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — CediWise</title></head><body style="margin:0;background:#0A0A0A;color:#e4e4e7;font-family:Arial,sans-serif"><main style="max-width:620px;margin:10vh auto;padding:32px;border:1px solid #27272a;border-radius:20px;background:#111"><p style="color:#34d399;font-weight:700">CEDIWISE MONEY BRIEF</p><h1 style="color:#fff">${title}</h1><p>${body}</p><p><a style="color:#34d399" href="/newsletter">Return to CediWise</a></p></main></body></html>`
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  const token = getQuery(event).token
  if (typeof token !== 'string') {
    setResponseStatus(event, 400)
    return page('This link is invalid', 'Please use the unsubscribe link from your email.')
  }

  try {
    const result = await unsubscribeFromNewsletter(token)
    if (!result.success) {
      setResponseStatus(event, 400)
      return page('This link is invalid', 'Please use the unsubscribe link from your email.')
    }
    return page('You have been unsubscribed', 'You will no longer receive the CediWise Money Brief. You can subscribe again anytime.')
  } catch (error) {
    console.error('[newsletter] unsubscribe failed', error)
    setResponseStatus(event, 500)
    return page('We could not update your subscription', 'Please try the link again shortly.')
  }
})
