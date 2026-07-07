import { createHash, timingSafeEqual } from 'node:crypto'

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

export function secureCompareHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex')
    const bufB = Buffer.from(b, 'hex')
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}
