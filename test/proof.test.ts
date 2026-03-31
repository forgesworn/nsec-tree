import { describe, it, expect } from 'vitest'
import { fromNsec } from '../src/root-nsec.js'
import { derive } from '../src/derive.js'
import { createBlindProof, createFullProof, verifyProof } from '../src/proof.js'
import { bytesToHex } from '../src/encoding.js'

describe('linkage proofs', () => {
  const root = fromNsec(new Uint8Array(32).fill(0xab))
  const child = derive(root, 'social', 0)

  describe('blind proof', () => {
    it('creates a valid blind proof', () => {
      const proof = createBlindProof(root, child)
      expect(proof.masterPubkey).toHaveLength(64)
      expect(proof.childPubkey).toHaveLength(64)
      expect(proof.purpose).toBeUndefined()
      expect(proof.index).toBeUndefined()
      expect(proof.attestation).toMatch(/^nsec-tree:own\|/)
      expect(proof.signature).toHaveLength(128)
    })

    it('verifies successfully', () => {
      const proof = createBlindProof(root, child)
      expect(verifyProof(proof)).toBe(true)
    })
  })

  describe('full proof', () => {
    it('creates a valid full proof with purpose and index', () => {
      const proof = createFullProof(root, child)
      expect(proof.purpose).toBe('social')
      expect(proof.index).toBe(0)
      expect(proof.attestation).toMatch(/^nsec-tree:link\|/)
    })

    it('verifies successfully', () => {
      const proof = createFullProof(root, child)
      expect(verifyProof(proof)).toBe(true)
    })

    it('correctly handles persona purpose containing colons (nostr:persona:alice)', () => {
      // Purpose strings like nostr:persona:alice contain colons.
      // With the old colon delimiter the attestation would be ambiguous:
      //   nsec-tree:link:abc:def:nostr:persona:alice:0  (8 fields, parser expects 6)
      // With pipe delimiter the attestation is unambiguous:
      //   nsec-tree:link|abc|def|nostr:persona:alice|0
      const personaChild = derive(root, 'nostr:persona:alice', 0)
      const proof = createFullProof(root, personaChild)
      expect(proof.purpose).toBe('nostr:persona:alice')
      expect(proof.index).toBe(0)
      // Attestation uses pipe delimiters — colons in the purpose are not separators
      expect(proof.attestation).toMatch(/^nsec-tree:link\|/)
      expect(proof.attestation).toContain('|nostr:persona:alice|')
      // Proof must still verify correctly
      expect(verifyProof(proof)).toBe(true)
    })
  })

  describe('verification', () => {
    it('rejects tampered attestation', () => {
      const proof = createBlindProof(root, child)
      const tampered = { ...proof, attestation: proof.attestation + 'x' }
      expect(verifyProof(tampered)).toBe(false)
    })

    it('rejects wrong signature', () => {
      const proof = createBlindProof(root, child)
      const tampered = { ...proof, signature: '00'.repeat(64) }
      expect(verifyProof(tampered)).toBe(false)
    })

    it('rejects proof with wrong master pubkey', () => {
      const proof = createBlindProof(root, child)
      const tampered = { ...proof, masterPubkey: '00'.repeat(32) }
      expect(verifyProof(tampered)).toBe(false)
    })

    it('rejects proof with mismatched child pubkey field', () => {
      const proof = createBlindProof(root, child)
      const otherChild = derive(root, 'social', 1)
      const tampered = { ...proof, childPubkey: bytesToHex(otherChild.publicKey) }
      expect(verifyProof(tampered)).toBe(false)
    })

    it('rejects full proof with mismatched purpose field', () => {
      const proof = createFullProof(root, child)
      const tampered = { ...proof, purpose: 'commerce' }
      expect(verifyProof(tampered)).toBe(false)
    })

    it('rejects proof signed by a different root', () => {
      const otherRoot = fromNsec(new Uint8Array(32).fill(0xcd))
      const otherChild = derive(otherRoot, 'social', 0)
      const otherProof = createBlindProof(otherRoot, otherChild)
      // Swap masterPubkey to claim it came from the first root
      const tampered = { ...otherProof, masterPubkey: createBlindProof(root, child).masterPubkey }
      expect(verifyProof(tampered)).toBe(false)
    })

    it('returns false for null or undefined input', () => {
      expect(verifyProof(null as unknown as Parameters<typeof verifyProof>[0])).toBe(false)
      expect(verifyProof(undefined as unknown as Parameters<typeof verifyProof>[0])).toBe(false)
    })
  })
})
