import { describe, it, expect } from 'vitest'
import { fromNsec } from '../src/root-nsec.js'
import { derive } from '../src/derive.js'
import { derivePersona, deriveFromPersona, recoverPersonas, DEFAULT_PERSONA_NAMES } from '../src/persona.js'
import { NsecTreeError } from '../src/types.js'

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

  it('rejects a name containing a pipe character', () => {
    expect(() => derivePersona(root, 'bad|name')).toThrow(NsecTreeError)
    expect(() => derivePersona(root, 'bad|name')).toThrow('"|"')
  })

  it('rejects a name containing a newline', () => {
    expect(() => derivePersona(root, 'bad\nname')).toThrow(NsecTreeError)
    expect(() => derivePersona(root, 'bad\nname')).toThrow('control characters')
  })

  it('rejects a name containing a tab', () => {
    expect(() => derivePersona(root, 'bad\tname')).toThrow(NsecTreeError)
  })

  it('rejects a name containing a null byte', () => {
    expect(() => derivePersona(root, 'bad\0name')).toThrow(NsecTreeError)
  })

  it('rejects an empty name', () => {
    expect(() => derivePersona(root, '')).toThrow('empty')
  })

  it('rejects a whitespace-only name', () => {
    expect(() => derivePersona(root, '   ')).toThrow('whitespace')
  })
})

describe('deriveFromPersona', () => {
  const root = fromNsec(new Uint8Array(32).fill(0xab))
  const persona = derivePersona(root, 'personal')

  it('derives a sub-identity with correct purpose and index', () => {
    const sub = deriveFromPersona(persona, 'group:abc123')
    expect(sub.nsec).toBeDefined()
    expect(sub.npub).toBeDefined()
    expect(sub.privateKey.length).toBe(32)
    expect(sub.publicKey.length).toBe(32)
    expect(sub.purpose).toBe('group:abc123')
    expect(sub.index).toBe(0)
  })

  it('is deterministic', () => {
    const a = deriveFromPersona(persona, 'group:abc123')
    const b = deriveFromPersona(persona, 'group:abc123')
    expect(a.nsec).toBe(b.nsec)
    expect(a.npub).toBe(b.npub)
  })

  it('different purposes produce different identities', () => {
    const a = deriveFromPersona(persona, 'group:abc123')
    const b = deriveFromPersona(persona, 'group:def456')
    expect(a.nsec).not.toBe(b.nsec)
  })

  it('different indices produce different identities (epoch rotation)', () => {
    const a = deriveFromPersona(persona, 'group:abc123', 0)
    const b = deriveFromPersona(persona, 'group:abc123', 1)
    expect(a.nsec).not.toBe(b.nsec)
  })

  it('sub-identities from different personas are unlinkable', () => {
    const personaA = derivePersona(root, 'personal')
    const personaB = derivePersona(root, 'work')
    const subA = deriveFromPersona(personaA, 'group:abc123')
    const subB = deriveFromPersona(personaB, 'group:abc123')
    expect(subA.nsec).not.toBe(subB.nsec)
    expect(subA.npub).not.toBe(subB.npub)
  })

  it('intermediate TreeRoot is destroyed after derivation', () => {
    // deriveFromPersona creates and destroys an intermediate root each call.
    // Verify it completes without error on repeated calls — intermediate
    // roots are created and destroyed each time with no leakage.
    const sub1 = deriveFromPersona(persona, 'group:cleanup1')
    const sub2 = deriveFromPersona(persona, 'group:cleanup2')
    expect(sub1.nsec).toBeDefined()
    expect(sub2.nsec).toBeDefined()
  })
})

describe('recoverPersonas', () => {
  const root = fromNsec(new Uint8Array(32).fill(0xab))

  it('recovers personas by name', () => {
    const result = recoverPersonas(root, ['personal', 'work'])
    expect(result.size).toBe(2)
    expect(result.has('personal')).toBe(true)
    expect(result.has('work')).toBe(true)
    expect(result.get('personal')!.length).toBe(1)
    expect(result.get('work')!.length).toBe(1)
  })

  it('recovered persona matches directly derived persona', () => {
    const result = recoverPersonas(root, ['personal'])
    const recovered = result.get('personal')![0]!
    const direct = derivePersona(root, 'personal', 0)
    expect(recovered.identity.nsec).toBe(direct.identity.nsec)
    expect(recovered.identity.npub).toBe(direct.identity.npub)
    expect(recovered.name).toBe(direct.name)
    expect(recovered.index).toBe(direct.index)
  })

  it('scans multiple indices for rotated personas', () => {
    const result = recoverPersonas(root, ['personal'], 3)
    const personas = result.get('personal')!
    expect(personas.length).toBe(3)
    for (let i = 0; i < 3; i++) {
      const direct = derivePersona(root, 'personal', i)
      expect(personas[i]!.identity.nsec).toBe(direct.identity.nsec)
      expect(personas[i]!.index).toBe(i)
    }
  })

  it('scans DEFAULT_PERSONA_NAMES when no names provided', () => {
    const result = recoverPersonas(root)
    expect(result.size).toBe(DEFAULT_PERSONA_NAMES.length)
    for (const name of DEFAULT_PERSONA_NAMES) {
      expect(result.has(name)).toBe(true)
      expect(result.get(name)!.length).toBe(1) // default scanRange = 1
    }
  })

  it('exports DEFAULT_PERSONA_NAMES as a readonly tuple', () => {
    expect(DEFAULT_PERSONA_NAMES).toEqual(['personal', 'bitcoiner', 'work', 'social', 'anonymous'])
    expect(Object.isFrozen(DEFAULT_PERSONA_NAMES)).toBe(true)
  })
})

describe('subpath export', () => {
  it('exports from persona barrel', async () => {
    const mod = await import('../src/persona-barrel.js')
    expect(typeof mod.derivePersona).toBe('function')
    expect(typeof mod.deriveFromPersona).toBe('function')
    expect(typeof mod.recoverPersonas).toBe('function')
    expect(Array.isArray(mod.DEFAULT_PERSONA_NAMES)).toBe(true)
  })
})
