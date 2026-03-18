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
