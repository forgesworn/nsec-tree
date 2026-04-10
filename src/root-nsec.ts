import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { schnorr } from '@noble/curves/secp256k1.js'
import { NsecTreeError, rootSecrets } from './types.js'
import type { TreeRoot } from './types.js'
import { decodeNsec, encodeNpub } from './encoding.js'

const NSEC_ROOT_LABEL = new TextEncoder().encode('nsec-tree-root')

const registry = new FinalizationRegistry((secret: Uint8Array) => {
  secret.fill(0)
})

/**
 * Internal: create a TreeRoot from a 32-byte tree-root secret.
 *
 * **Takes ownership of `secret`:** the input buffer is copied, then the
 * original is zero-filled in place. Callers MUST pass an owned buffer (not a
 * view/subarray of a larger shared ArrayBuffer) because the `fill(0)` zeroes
 * the underlying bytes the caller sees. Every internal caller (`fromNsec`,
 * `fromMnemonic`) constructs a fresh `Uint8Array` specifically for this call.
 */
export function createTreeRoot(secret: Uint8Array): TreeRoot {
  const ownedSecret = new Uint8Array(secret)
  secret.fill(0)
  const publicKey = schnorr.getPublicKey(ownedSecret)
  const masterPubkey = encodeNpub(publicKey)

  const root: TreeRoot = {
    masterPubkey,
    destroy() {
      ownedSecret.fill(0)
      rootSecrets.delete(root)
      registry.unregister(root)
    },
  }

  rootSecrets.set(root, ownedSecret)
  registry.register(root, ownedSecret, root)
  return root
}

/**
 * Create a TreeRoot from an existing Nostr nsec.
 *
 * Accepts either a bech32 nsec string or a 32-byte `Uint8Array` of raw
 * private key bytes. Internally applies the intermediate HMAC step
 * (`HMAC-SHA256(key = nsec, msg = "nsec-tree-root")`) described in
 * PROTOCOL.md §1.2.
 *
 * **Ownership of the input:**
 * - **String input:** the internally decoded byte buffer is zero-filled
 *   before the function returns. The original JS string cannot be
 *   zeroised (strings are immutable).
 * - **`Uint8Array` input:** the caller retains ownership of the buffer —
 *   it is NOT zero-filled. Sub-identity helpers (`deriveFromIdentity`,
 *   `deriveFromPersona`) depend on this behaviour so the parent identity
 *   remains usable. If you want the raw bytes scrubbed, call
 *   `nsec.fill(0)` yourself after `fromNsec` returns.
 */
export function fromNsec(nsec: string | Uint8Array): TreeRoot {
  let keyBytes: Uint8Array

  if (typeof nsec === 'string') {
    keyBytes = decodeNsec(nsec)
  } else {
    if (nsec.length !== 32) throw new NsecTreeError(`Expected 32-byte nsec, got ${nsec.length}`)
    keyBytes = nsec
  }

  // Intermediate HMAC: tree_root = HMAC-SHA256(key=nsec, msg="nsec-tree-root")
  const treeRootSecret = hmac(sha256, keyBytes, NSEC_ROOT_LABEL)
  if (typeof nsec === 'string') keyBytes.fill(0)
  const root = createTreeRoot(treeRootSecret)
  treeRootSecret.fill(0)
  return root
}
