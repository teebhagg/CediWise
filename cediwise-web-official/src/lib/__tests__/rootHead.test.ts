import { describe, expect, it } from 'vitest'
import { Route } from '@/routes/__root'

describe('root route head', () => {
  it('does not add a canonical link, so each page emits exactly one from createPageHead', () => {
    const head = (
      Route.options.head as () => { links?: Array<{ rel?: string }> }
    )()
    const canonicals = (head.links ?? []).filter(
      (link) => link.rel === 'canonical',
    )
    expect(canonicals).toHaveLength(0)
  })
})
