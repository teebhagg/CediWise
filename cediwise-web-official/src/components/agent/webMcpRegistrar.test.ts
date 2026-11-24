import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WebMcpRegistrar } from './WebMcpRegistrar'

describe('WebMcpRegistrar', () => {
  it('renders nothing in the server markup', () => {
    expect(renderToStaticMarkup(createElement(WebMcpRegistrar))).toBe('')
  })
})
