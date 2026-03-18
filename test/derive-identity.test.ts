import { describe, it, expect } from 'vitest'
import { fromMnemonic, derivePersona, deriveFromIdentity } from '../src/index.js'

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('deriveFromIdentity', () => {
  it('derives a child identity from any identity', () => {
    const root = fromMnemonic(MNEMONIC)
    const persona = derivePersona(root, 'work', 0)
    const child = deriveFromIdentity(persona.identity, 'client-a', 0)
    expect(child.nsec).toMatch(/^nsec1/)
    expect(child.npub).toMatch(/^npub1/)
    expect(child.purpose).toBe('client-a')
    expect(child.privateKey).toBeInstanceOf(Uint8Array)
    expect(child.privateKey.length).toBe(32)
    root.destroy()
  })

  it('is deterministic — same inputs produce same keys', () => {
    const root = fromMnemonic(MNEMONIC)
    const persona = derivePersona(root, 'work', 0)
    const a = deriveFromIdentity(persona.identity, 'client-a', 0)
    const b = deriveFromIdentity(persona.identity, 'client-a', 0)
    expect(a.nsec).toBe(b.nsec)
    expect(a.npub).toBe(b.npub)
    root.destroy()
  })

  it('derives at depth 3 — chains through multiple levels', () => {
    const root = fromMnemonic(MNEMONIC)
    const persona = derivePersona(root, 'work', 0)
    const level2 = deriveFromIdentity(persona.identity, 'client-a', 0)
    const level3 = deriveFromIdentity(level2, 'project-x', 0)
    expect(level3.nsec).toMatch(/^nsec1/)
    const keys = new Set([persona.identity.npub, level2.npub, level3.npub])
    expect(keys.size).toBe(3)
    root.destroy()
  })

  it('different purposes produce different keys', () => {
    const root = fromMnemonic(MNEMONIC)
    const persona = derivePersona(root, 'work', 0)
    const a = deriveFromIdentity(persona.identity, 'client-a', 0)
    const b = deriveFromIdentity(persona.identity, 'client-b', 0)
    expect(a.npub).not.toBe(b.npub)
    root.destroy()
  })

  it('different indices produce different keys', () => {
    const root = fromMnemonic(MNEMONIC)
    const persona = derivePersona(root, 'work', 0)
    const a = deriveFromIdentity(persona.identity, 'client-a', 0)
    const b = deriveFromIdentity(persona.identity, 'client-a', 1)
    expect(a.npub).not.toBe(b.npub)
    root.destroy()
  })

  it('rejects invalid private key length', () => {
    const badIdentity = {
      nsec: 'nsec1fake',
      npub: 'npub1fake',
      privateKey: new Uint8Array(16),
      publicKey: new Uint8Array(32),
      purpose: 'test',
      index: 0,
    }
    expect(() => deriveFromIdentity(badIdentity, 'test', 0)).toThrow()
  })
})
