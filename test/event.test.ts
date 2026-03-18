import { describe, it, expect } from 'vitest'
import { NSEC_TREE_EVENT_KIND, NSEC_TREE_D_PREFIX, toUnsignedEvent } from '../src/event.js'
import { fromNsec } from '../src/root-nsec.js'
import { derive } from '../src/derive.js'
import { createFullProof, createBlindProof } from '../src/proof.js'

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
