import { describe, it, expect } from 'vitest'
import { fromNsec } from '../src/root-nsec.js'
import { derive } from '../src/derive.js'
import { createBlindProof, createFullProof, verifyProof } from '../src/proof.js'

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
      expect(proof.attestation).toMatch(/^nsec-tree:own:/)
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
      expect(proof.attestation).toMatch(/^nsec-tree:link:/)
    })

    it('verifies successfully', () => {
      const proof = createFullProof(root, child)
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
  })
})
