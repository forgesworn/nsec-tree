import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { schnorr } from '@noble/curves/secp256k1.js'
import { NsecTreeError, MAX_INDEX } from './types.js'
import type { Identity, TreeRoot } from './types.js'
import { getSecret } from './types.js'
import { validatePurpose } from './validate.js'
import { encodeNsec, encodeNpub } from './encoding.js'

const DOMAIN_PREFIX = new TextEncoder().encode('nsec-tree\0')
const NULL_BYTE = new Uint8Array([0])

export interface DerivedKey {
  privateKey: Uint8Array
  publicKey: Uint8Array
  actualIndex: number
}

function buildContext(purpose: string, index: number): Uint8Array {
  const purposeBytes = new TextEncoder().encode(purpose)
  const indexBytes = new Uint8Array(4)
  new DataView(indexBytes.buffer).setUint32(0, index, false) // big-endian

  const msg = new Uint8Array(DOMAIN_PREFIX.length + purposeBytes.length + 1 + 4)
  msg.set(DOMAIN_PREFIX, 0)
  msg.set(purposeBytes, DOMAIN_PREFIX.length)
  msg.set(NULL_BYTE, DOMAIN_PREFIX.length + purposeBytes.length)
  msg.set(indexBytes, DOMAIN_PREFIX.length + purposeBytes.length + 1)
  return msg
}

export function deriveChildKey(root: Uint8Array, purpose: string, index = 0): DerivedKey {
  if (!Number.isInteger(index) || index < 0 || index > MAX_INDEX) {
    throw new NsecTreeError(`Index must be an integer in [0, ${MAX_INDEX}], got ${index}`)
  }
  validatePurpose(purpose)

  let currentIndex = index
  while (currentIndex <= MAX_INDEX) {
    const context = buildContext(purpose, currentIndex)
    const derived = hmac(sha256, root, context)

    try {
      const publicKey = schnorr.getPublicKey(derived) // 32-byte x-only (BIP-340)
      return { privateKey: derived, publicKey, actualIndex: currentIndex }
    } catch {
      currentIndex++
    }
  }

  throw new NsecTreeError(`Index overflow: no valid key found at or after index ${index}`)
}

export function derive(root: TreeRoot, purpose: string, index = 0): Identity {
  const secret = getSecret(root)
  const { privateKey, publicKey, actualIndex } = deriveChildKey(secret, purpose, index)

  return {
    nsec: encodeNsec(privateKey),
    npub: encodeNpub(publicKey),
    privateKey,
    publicKey,
    purpose,
    index: actualIndex,
  }
}

export function zeroise(identity: Identity): void {
  identity.privateKey.fill(0)
}
