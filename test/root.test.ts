import { describe, it, expect } from 'vitest'
import { schnorr } from '@noble/curves/secp256k1.js'
import { fromNsec, createTreeRoot } from '../src/root-nsec.js'
import { encodeNsec, decodeNpub } from '../src/encoding.js'
import { getSecret } from '../src/types.js'

describe('fromNsec', () => {
  const testKey = new Uint8Array(32).fill(0xab)

  it('creates a TreeRoot from raw bytes', () => {
    const root = fromNsec(testKey)
    expect(root.masterPubkey).toBeDefined()
    expect(root.masterPubkey.startsWith('npub1')).toBe(true)
    root.destroy()
  })

  it('creates a TreeRoot from bech32 nsec string', () => {
    const nsecStr = encodeNsec(testKey)
    const root = fromNsec(nsecStr)
    expect(root.masterPubkey).toBeDefined()
    root.destroy()
  })

  it('same nsec produces same masterPubkey', () => {
    const a = fromNsec(testKey)
    const b = fromNsec(testKey)
    expect(a.masterPubkey).toBe(b.masterPubkey)
    a.destroy()
    b.destroy()
  })

  it('different nsecs produce different masterPubkeys', () => {
    const otherKey = new Uint8Array(32).fill(0xcd)
    const a = fromNsec(testKey)
    const b = fromNsec(otherKey)
    expect(a.masterPubkey).not.toBe(b.masterPubkey)
    a.destroy()
    b.destroy()
  })

  it('masterPubkey differs from direct nsec pubkey (intermediate HMAC)', () => {
    const directPub = schnorr.getPublicKey(testKey)
    const root = fromNsec(testKey)
    const masterPubBytes = decodeNpub(root.masterPubkey)
    expect(masterPubBytes).not.toEqual(directPub)
    root.destroy()
  })

  it('destroy zeroes the internal secret', () => {
    const root = fromNsec(testKey)
    root.destroy()
    expect(() => getSecret(root)).toThrow('destroyed')
  })

  it('rejects invalid input', () => {
    expect(() => fromNsec(new Uint8Array(16))).toThrow()
  })
})
