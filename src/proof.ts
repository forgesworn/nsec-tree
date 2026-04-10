import { schnorr } from '@noble/curves/secp256k1.js'
import type { LinkageProof, Identity, TreeRoot } from './types.js'
import { MAX_INDEX } from './types.js'
import { getSecret } from './types.js'
import { bytesToHex, hexToBytes } from './encoding.js'
import { validateProofPurpose } from './validate.js'

const encoder = new TextEncoder()
const HEX_KEY_RE = /^[0-9a-f]{64}$/
const HEX_SIGNATURE_RE = /^[0-9a-f]{128}$/

function blindAttestation(masterHex: string, childHex: string): string {
  return `nsec-tree:own|${masterHex}|${childHex}`
}

function fullAttestation(masterHex: string, childHex: string, purpose: string, index: number): string {
  return `nsec-tree:link|${masterHex}|${childHex}|${purpose}|${index}`
}

export function createBlindProof(root: TreeRoot, child: Identity): LinkageProof {
  const secret = getSecret(root)
  const masterPub = schnorr.getPublicKey(secret)
  const masterHex = bytesToHex(masterPub)
  const childHex = bytesToHex(child.publicKey)
  const attestation = blindAttestation(masterHex, childHex)
  const msgBytes = encoder.encode(attestation)
  const signature = bytesToHex(schnorr.sign(msgBytes, secret))

  return {
    masterPubkey: masterHex,
    childPubkey: childHex,
    attestation,
    signature,
  }
}

export function createFullProof(root: TreeRoot, child: Identity): LinkageProof {
  validateProofPurpose(child.purpose)
  const secret = getSecret(root)
  const masterPub = schnorr.getPublicKey(secret)
  const masterHex = bytesToHex(masterPub)
  const childHex = bytesToHex(child.publicKey)
  const attestation = fullAttestation(masterHex, childHex, child.purpose, child.index)
  const msgBytes = encoder.encode(attestation)
  const signature = bytesToHex(schnorr.sign(msgBytes, secret))

  return {
    masterPubkey: masterHex,
    childPubkey: childHex,
    purpose: child.purpose,
    index: child.index,
    attestation,
    signature,
  }
}

/**
 * Reconstruct the canonical attestation string from a LinkageProof's fields,
 * or return null if the fields are structurally invalid. Used by both
 * `verifyProof` and (via an internal re-export) `toUnsignedEvent` for
 * shape validation before event serialisation.
 */
export function canonicalAttestation(proof: LinkageProof): string | null {
  if (typeof proof.masterPubkey !== 'string' || typeof proof.childPubkey !== 'string') {
    return null
  }
  if (!HEX_KEY_RE.test(proof.masterPubkey) || !HEX_KEY_RE.test(proof.childPubkey)) {
    return null
  }

  const hasPurpose = proof.purpose !== undefined
  const hasIndex = proof.index !== undefined
  if (hasPurpose !== hasIndex) {
    return null
  }

  if (!hasPurpose) {
    return blindAttestation(proof.masterPubkey, proof.childPubkey)
  }

  const purpose = proof.purpose
  const index = proof.index
  if (purpose === undefined || index === undefined) {
    return null
  }

  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > MAX_INDEX) {
    return null
  }

  try {
    validateProofPurpose(purpose)
  } catch {
    return null
  }

  return fullAttestation(proof.masterPubkey, proof.childPubkey, purpose, index)
}

export function verifyProof(proof: LinkageProof): boolean {
  try {
    if (proof === null || typeof proof !== 'object') {
      return false
    }
    const attestation = canonicalAttestation(proof)
    if (!attestation || proof.attestation !== attestation) {
      return false
    }
    if (typeof proof.signature !== 'string' || !HEX_SIGNATURE_RE.test(proof.signature)) {
      return false
    }

    // Sign/verify over the RECONSTRUCTED canonical attestation, not the
    // caller-supplied proof.attestation. These are proven equal above via
    // strict equality; using the local `attestation` makes the invariant
    // explicit and resilient to future refactors of that comparison.
    const msgBytes = encoder.encode(attestation)
    const sigBytes = hexToBytes(proof.signature)
    const pubBytes = hexToBytes(proof.masterPubkey)
    return schnorr.verify(sigBytes, msgBytes, pubBytes)
  } catch {
    return false
  }
}
