import { describe, it, expect } from 'vitest'
import { deriveChildKey } from '../src/derive.js'

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
