import { describe, it, expect } from 'vitest'
import { fromNsec } from '../src/root-nsec.js'
import { derive } from '../src/derive.js'
import { derivePersona } from '../src/persona.js'

describe('derivePersona', () => {
  const root = fromNsec(new Uint8Array(32).fill(0xab))

  it('returns correct name and index on output', () => {
    const persona = derivePersona(root, 'personal')
    expect(persona.name).toBe('personal')
    expect(persona.index).toBe(0)
    expect(persona.identity).toBeDefined()
    expect(persona.identity.nsec).toBeDefined()
    expect(persona.identity.npub).toBeDefined()
    expect(persona.identity.privateKey.length).toBe(32)
    expect(persona.identity.publicKey.length).toBe(32)
  })

  it('is deterministic — same root + name = same persona', () => {
    const a = derivePersona(root, 'personal')
    const b = derivePersona(root, 'personal')
    expect(a.identity.nsec).toBe(b.identity.nsec)
    expect(a.identity.npub).toBe(b.identity.npub)
    expect(a.name).toBe(b.name)
    expect(a.index).toBe(b.index)
  })

  it('different names produce different personas', () => {
    const a = derivePersona(root, 'personal')
    const b = derivePersona(root, 'work')
    expect(a.identity.nsec).not.toBe(b.identity.nsec)
    expect(a.identity.npub).not.toBe(b.identity.npub)
  })

  it('different indices produce different personas (rotation)', () => {
    const a = derivePersona(root, 'personal', 0)
    const b = derivePersona(root, 'personal', 1)
    expect(a.identity.nsec).not.toBe(b.identity.nsec)
    expect(a.index).toBe(0)
    expect(b.index).toBe(1)
  })

  it('defaults index to 0', () => {
    const a = derivePersona(root, 'personal')
    const b = derivePersona(root, 'personal', 0)
    expect(a.identity.nsec).toBe(b.identity.nsec)
  })

  it('uses purpose string nostr:persona:{name}', () => {
    const persona = derivePersona(root, 'social')
    const direct = derive(root, 'nostr:persona:social', 0)
    expect(persona.identity.nsec).toBe(direct.nsec)
  })
})
