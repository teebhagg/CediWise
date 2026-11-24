import { describe, expect, it } from 'vitest'
import { a2aAgentCard, a2aSendMessageReply, answerForMessage } from './a2a'

const send = (text: string, id: number | string = 7) => ({
  jsonrpc: '2.0',
  id,
  method: 'SendMessage',
  params: {
    message: { role: 'ROLE_USER', parts: [{ text }], messageId: 'm1' },
  },
})

describe('A2A agent card', () => {
  it('declares a JSON-RPC interface at /a2a with the required fields', () => {
    const card = a2aAgentCard()
    expect(card.supportedInterfaces).toEqual([
      {
        url: 'https://www.cediwise.app/a2a',
        protocolBinding: 'JSONRPC',
        protocolVersion: '1.0',
      },
    ])
    for (const field of [
      'name',
      'description',
      'version',
      'capabilities',
      'defaultInputModes',
      'defaultOutputModes',
      'skills',
    ]) {
      expect(card).toHaveProperty(field)
    }
    expect((card.skills as Array<unknown>).length).toBeGreaterThan(0)
  })
})

describe('answerForMessage', () => {
  it('estimates the breakdown for a salary question', () => {
    const text = answerForMessage(
      'What is my take-home on GHS 5,000 gross salary?',
    )
    expect(text).toMatch(/Estimated monthly breakdown for GHS 5,000\.00/)
    expect(text).toMatch(/Net take-home: GHS/)
  })

  it('points to pages for a topic question', () => {
    expect(answerForMessage('how does VAT work for my small business')).toMatch(
      /sme-ledger/,
    )
  })

  it('says so when nothing matches', () => {
    expect(answerForMessage('zzqx')).toMatch(/could not find/)
  })
})

describe('a2aSendMessageReply', () => {
  it('replies with an agent message that echoes the request id', () => {
    const reply = a2aSendMessageReply(send('budgeting tips'), () => 'msg-1')
    expect(reply.status).toBe(200)
    expect(reply.body).toMatchObject({
      jsonrpc: '2.0',
      id: 7,
      result: { message: { role: 'ROLE_AGENT', messageId: 'msg-1' } },
    })
  })

  it('rejects other methods and empty text', () => {
    expect(
      a2aSendMessageReply(
        { jsonrpc: '2.0', id: 1, method: 'GetTask' },
        () => 'x',
      ),
    ).toMatchObject({
      status: 400,
      body: { error: { code: -32601 } },
    })
    expect(a2aSendMessageReply(send('   '), () => 'x')).toMatchObject({
      status: 400,
      body: { error: { code: -32602 } },
    })
    expect(a2aSendMessageReply(null, () => 'x')).toMatchObject({
      status: 400,
      body: { error: { code: -32600 } },
    })
  })
})
