import { schnorr } from '@noble/curves/secp256k1.js'
import type { LinkageProof, Identity, TreeRoot } from './types.js'
import { MAX_INDEX } from './types.js'
import { getSecret } from './types.js'
import { bytesToHex, hexToBytes } from './encoding.js'
import { validatePurpose } from './validate.js'

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

function canonicalAttestation(proof: LinkageProof): string | null {
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

  if (!Number.isInteger(index) || index < 0 || index > MAX_INDEX) {
    return null
  }

  try {
    validatePurpose(purpose)
  } catch {
    return null
  }

  return fullAttestation(proof.masterPubkey, proof.childPubkey, purpose, index)
}

export function verifyProof(proof: LinkageProof): boolean {
  try {
    const attestation = canonicalAttestation(proof)
    if (!attestation || proof.attestation !== attestation || !HEX_SIGNATURE_RE.test(proof.signature)) {
      return false
    }

    const msgBytes = encoder.encode(proof.attestation)
    const sigBytes = hexToBytes(proof.signature)
    const pubBytes = hexToBytes(proof.masterPubkey)
    return schnorr.verify(sigBytes, msgBytes, pubBytes)
  } catch {
    return false
  }
}
