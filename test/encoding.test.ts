import { describe, it, expect } from 'vitest'
import { encodeNsec, decodeNsec, encodeNpub, decodeNpub, bytesToHex, hexToBytes } from '../src/encoding.js'

describe('encoding', () => {
  const zeroKey = new Uint8Array(32)

  it('encodeNsec produces valid bech32 nsec prefix', () => {
    const nsec = encodeNsec(zeroKey)
    expect(nsec.startsWith('nsec1')).toBe(true)
  })

  it('decodeNsec round-trips with encodeNsec', () => {
    const nsec = encodeNsec(zeroKey)
    const decoded = decodeNsec(nsec)
    expect(decoded).toEqual(zeroKey)
  })

  it('encodeNpub produces valid bech32 npub prefix', () => {
    const npub = encodeNpub(zeroKey)
    expect(npub.startsWith('npub1')).toBe(true)
  })

  it('decodeNpub round-trips with encodeNpub', () => {
    const npub = encodeNpub(zeroKey)
    const decoded = decodeNpub(npub)
    expect(decoded).toEqual(zeroKey)
  })

  it('rejects wrong prefix on decode', () => {
    const nsec = encodeNsec(zeroKey)
    expect(() => decodeNpub(nsec)).toThrow()
  })

  it('rejects invalid length on encode', () => {
    expect(() => encodeNsec(new Uint8Array(16))).toThrow()
  })

  it('rejects non-32-byte payload on decode', async () => {
    // Encode a 20-byte payload with nsec prefix to craft an invalid-length nsec string
    const { bech32 } = await import('@scure/base')
    const shortPayload = new Uint8Array(20)
    const words = bech32.toWords(shortPayload)
    const crafted = bech32.encode('nsec' as `${string}1${string}`, words, 1500) as string
    expect(() => decodeNsec(crafted)).toThrow('32-byte')
  })

  it('bytesToHex produces lowercase hex', () => {
    expect(bytesToHex(new Uint8Array([0xab, 0xcd]))).toBe('abcd')
  })

  it('hexToBytes round-trips with bytesToHex', () => {
    const bytes = new Uint8Array([1, 2, 255])
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes)
  })
})
