import { schnorr } from '@noble/curves/secp256k1.js'
import type { LinkageProof, Identity, TreeRoot } from './types.js'
import { getSecret } from './types.js'
import { bytesToHex, hexToBytes } from './encoding.js'

const encoder = new TextEncoder()

function blindAttestation(masterHex: string, childHex: string): string {
  return `nsec-tree:own:${masterHex}:${childHex}`
}

function fullAttestation(masterHex: string, childHex: string, purpose: string, index: number): string {
  return `nsec-tree:link:${masterHex}:${childHex}:${purpose}:${index}`
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

export function verifyProof(proof: LinkageProof): boolean {
  try {
    const msgBytes = encoder.encode(proof.attestation)
    const sigBytes = hexToBytes(proof.signature)
    const pubBytes = hexToBytes(proof.masterPubkey)
    return schnorr.verify(sigBytes, msgBytes, pubBytes)
  } catch {
    return false
  }
}
