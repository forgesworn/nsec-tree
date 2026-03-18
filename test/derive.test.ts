import { describe, it, expect } from 'vitest'
import { deriveChildKey, derive, zeroise } from '../src/derive.js'
import { fromNsec } from '../src/root-nsec.js'

describe('deriveChildKey', () => {
  const root = new Uint8Array(32).fill(1)

  it('derives a 32-byte private key', () => {
    const result = deriveChildKey(root, 'social', 0)
    expect(result.privateKey).toBeInstanceOf(Uint8Array)
    expect(result.privateKey.length).toBe(32)
  })

  it('derives a 32-byte x-only public key', () => {
    const result = deriveChildKey(root, 'social', 0)
    expect(result.publicKey).toBeInstanceOf(Uint8Array)
    expect(result.publicKey.length).toBe(32)
  })

  it('is deterministic — same inputs produce same output', () => {
    const a = deriveChildKey(root, 'social', 0)
    const b = deriveChildKey(root, 'social', 0)
    expect(a.privateKey).toEqual(b.privateKey)
    expect(a.publicKey).toEqual(b.publicKey)
  })

  it('different purposes produce different keys', () => {
    const a = deriveChildKey(root, 'social', 0)
    const b = deriveChildKey(root, 'commerce', 0)
    expect(a.privateKey).not.toEqual(b.privateKey)
  })

  it('different indices produce different keys', () => {
    const a = deriveChildKey(root, 'social', 0)
    const b = deriveChildKey(root, 'social', 1)
    expect(a.privateKey).not.toEqual(b.privateKey)
  })

  it('different roots produce different keys', () => {
    const otherRoot = new Uint8Array(32).fill(2)
    const a = deriveChildKey(root, 'social', 0)
    const b = deriveChildKey(otherRoot, 'social', 0)
    expect(a.privateKey).not.toEqual(b.privateKey)
  })

  it('index defaults to 0', () => {
    const a = deriveChildKey(root, 'social')
    const b = deriveChildKey(root, 'social', 0)
    expect(a.privateKey).toEqual(b.privateKey)
  })

  it('returns the actual index used', () => {
    const result = deriveChildKey(root, 'social', 5)
    expect(result.actualIndex).toBe(5)
  })

  it('rejects invalid purpose strings', () => {
    expect(() => deriveChildKey(root, '')).toThrow()
    expect(() => deriveChildKey(root, 'bad\0purpose')).toThrow()
  })
})

describe('derive (public API)', () => {
  const testKey = new Uint8Array(32).fill(0xab)
  const root = fromNsec(testKey)

  it('returns a full Identity object', () => {
    const id = derive(root, 'social')
    expect(id.nsec).toBeDefined()
    expect(id.nsec.startsWith('nsec1')).toBe(true)
    expect(id.npub).toBeDefined()
    expect(id.npub.startsWith('npub1')).toBe(true)
    expect(id.privateKey.length).toBe(32)
    expect(id.publicKey.length).toBe(32)
    expect(id.purpose).toBe('social')
    expect(id.index).toBe(0)
  })

  it('index defaults to 0', () => {
    const a = derive(root, 'social')
    const b = derive(root, 'social', 0)
    expect(a.nsec).toBe(b.nsec)
  })
})

describe('zeroise', () => {
  it('fills privateKey with zeros', () => {
    const root = fromNsec(new Uint8Array(32).fill(0xab))
    const id = derive(root, 'test')
    expect(id.privateKey.some(b => b !== 0)).toBe(true)
    zeroise(id)
    expect(id.privateKey.every(b => b === 0)).toBe(true)
    root.destroy()
  })
})
