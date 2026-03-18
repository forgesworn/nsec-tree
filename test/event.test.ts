import { describe, it, expect } from 'vitest'
import { finalizeEvent, verifyEvent } from 'nostr-tools'
import { NSEC_TREE_EVENT_KIND, NSEC_TREE_D_PREFIX, toUnsignedEvent, fromEvent } from '../src/event.js'
import { fromNsec } from '../src/root-nsec.js'
import { derive } from '../src/derive.js'
import { createFullProof, createBlindProof, verifyProof } from '../src/proof.js'
import { NsecTreeError, getSecret } from '../src/types.js'

describe('event constants', () => {
  it('exports NIP-78 kind', () => {
    expect(NSEC_TREE_EVENT_KIND).toBe(30078)
  })

  it('exports d-tag prefix', () => {
    expect(NSEC_TREE_D_PREFIX).toBe('nsec-tree:')
  })
})

describe('toUnsignedEvent', () => {
  const root = fromNsec(new Uint8Array(32).fill(0xab))
  const child = derive(root, 'social', 0)

  it('converts a full proof to an unsigned event', () => {
    const proof = createFullProof(root, child)
    const event = toUnsignedEvent(proof)

    expect(event.kind).toBe(NSEC_TREE_EVENT_KIND)
    expect(event.pubkey).toBe(proof.masterPubkey)
    expect(event.content).toBe('')
    const now = Math.floor(Date.now() / 1000)
    expect(event.created_at).toBeGreaterThan(now - 5)
    expect(event.created_at).toBeLessThanOrEqual(now)

    const dTag = event.tags.find(t => t[0] === 'd')
    expect(dTag).toEqual(['d', `${NSEC_TREE_D_PREFIX}${proof.childPubkey}`])

    const pTag = event.tags.find(t => t[0] === 'p')
    expect(pTag).toEqual(['p', proof.childPubkey])

    const purposeTag = event.tags.find(t => t[0] === 'purpose')
    expect(purposeTag).toEqual(['purpose', 'social'])

    const indexTag = event.tags.find(t => t[0] === 'index')
    expect(indexTag).toEqual(['index', '0'])

    const attTag = event.tags.find(t => t[0] === 'attestation')
    expect(attTag).toEqual(['attestation', proof.attestation])

    const sigTag = event.tags.find(t => t[0] === 'proof-sig')
    expect(sigTag).toEqual(['proof-sig', proof.signature])
  })

  it('converts a blind proof (no purpose/index tags)', () => {
    const proof = createBlindProof(root, child)
    const event = toUnsignedEvent(proof)

    const purposeTag = event.tags.find(t => t[0] === 'purpose')
    expect(purposeTag).toBeUndefined()

    const indexTag = event.tags.find(t => t[0] === 'index')
    expect(indexTag).toBeUndefined()

    // d, p, attestation, proof-sig still present
    expect(event.tags).toHaveLength(4)
  })
})

describe('fromEvent', () => {
  const root = fromNsec(new Uint8Array(32).fill(0xab))
  const child = derive(root, 'social', 0)

  describe('round-trip', () => {
    it('full proof survives toUnsignedEvent → fromEvent → verifyProof', () => {
      const proof = createFullProof(root, child)
      const event = toUnsignedEvent(proof)
      const restored = fromEvent(event)
      expect(verifyProof(restored)).toBe(true)
    })

    it('blind proof survives toUnsignedEvent → fromEvent → verifyProof', () => {
      const proof = createBlindProof(root, child)
      const event = toUnsignedEvent(proof)
      const restored = fromEvent(event)
      expect(verifyProof(restored)).toBe(true)
      expect(restored.purpose).toBeUndefined()
      expect(restored.index).toBeUndefined()
    })
  })

  describe('validation', () => {
    it('throws on missing d tag', () => {
      expect(() => fromEvent({
        pubkey: 'aa'.repeat(32),
        tags: [['p', 'bb'.repeat(32)]],
      })).toThrow(NsecTreeError)
    })

    it('throws on d tag with wrong prefix', () => {
      expect(() => fromEvent({
        pubkey: 'aa'.repeat(32),
        tags: [['d', 'wrong:prefix']],
      })).toThrow(NsecTreeError)
    })

    it('throws on missing attestation tag', () => {
      const proof = createFullProof(root, child)
      const event = toUnsignedEvent(proof)
      event.tags = event.tags.filter(t => t[0] !== 'attestation')
      expect(() => fromEvent(event)).toThrow(NsecTreeError)
    })

    it('throws on missing proof-sig tag', () => {
      const proof = createFullProof(root, child)
      const event = toUnsignedEvent(proof)
      event.tags = event.tags.filter(t => t[0] !== 'proof-sig')
      expect(() => fromEvent(event)).toThrow(NsecTreeError)
    })

    it('throws on non-numeric index', () => {
      const proof = createFullProof(root, child)
      const event = toUnsignedEvent(proof)
      const indexTag = event.tags.find(t => t[0] === 'index')!
      indexTag[1] = 'not-a-number'
      expect(() => fromEvent(event)).toThrow(NsecTreeError)
    })

    it('throws on negative index', () => {
      const proof = createFullProof(root, child)
      const event = toUnsignedEvent(proof)
      const indexTag = event.tags.find(t => t[0] === 'index')!
      indexTag[1] = '-1'
      expect(() => fromEvent(event)).toThrow(NsecTreeError)
    })

    it('throws when purpose present without index', () => {
      const proof = createFullProof(root, child)
      const event = toUnsignedEvent(proof)
      event.tags = event.tags.filter(t => t[0] !== 'index')
      expect(() => fromEvent(event)).toThrow(NsecTreeError)
    })

    it('throws when index present without purpose', () => {
      const proof = createFullProof(root, child)
      const event = toUnsignedEvent(proof)
      event.tags = event.tags.filter(t => t[0] !== 'purpose')
      expect(() => fromEvent(event)).toThrow(NsecTreeError)
    })
  })
})

describe('nostr-tools integration', () => {
  it('produces a valid signed Nostr event when finalised with nostr-tools', () => {
    const root = fromNsec(new Uint8Array(32).fill(0xab))
    const child = derive(root, 'social', 0)
    const proof = createFullProof(root, child)
    const unsigned = toUnsignedEvent(proof)

    // getSecret retrieves the HMAC-derived tree root secret from the WeakMap.
    // This is the actual signing key whose pubkey matches proof.masterPubkey.
    // Using the raw 0xab bytes directly would produce a different pubkey
    // because fromNsec runs HMAC-SHA256(raw, "nsec-tree-root") internally.
    const secret = getSecret(root)
    const signed = finalizeEvent(unsigned, secret)

    expect(signed.id).toHaveLength(64)
    expect(signed.sig).toHaveLength(128)
    expect(verifyEvent(signed)).toBe(true)

    // The linkage proof inside is still valid
    const restored = fromEvent(signed)
    expect(verifyProof(restored)).toBe(true)
  })
})
