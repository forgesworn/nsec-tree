/** Custom error for nsec-tree operations. */
export class NsecTreeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NsecTreeError'
  }
}

/** Opaque tree root. Only masterPubkey and destroy() are public. */
export interface TreeRoot {
  readonly masterPubkey: string
  destroy(): void
}

/**
 * Module-private WeakMap for accessing the tree root secret internally.
 * This keeps _getSecret() off the public TreeRoot interface while allowing
 * derive(), proof functions, etc. to access the secret.
 */
export const rootSecrets = new WeakMap<TreeRoot, Uint8Array>()

/** Retrieve the secret for a TreeRoot, or throw if destroyed. */
export function getSecret(root: TreeRoot): Uint8Array {
  const secret = rootSecrets.get(root)
  if (!secret || secret.every(b => b === 0)) {
    throw new NsecTreeError('TreeRoot has been destroyed')
  }
  return secret
}

/** A derived Nostr identity with derivation provenance. */
export interface Identity {
  /** NIP-19 bech32-encoded private key */
  readonly nsec: string
  /** NIP-19 bech32-encoded public key */
  readonly npub: string
  /** Raw 32-byte secp256k1 scalar */
  readonly privateKey: Uint8Array
  /** Raw 32-byte x-only public key (BIP-340) */
  readonly publicKey: Uint8Array
  /** Derivation purpose string */
  readonly purpose: string
  /** Derivation index (actual index used, may differ from requested if curve-order skip occurred) */
  readonly index: number
}

/** Cryptographic proof that a master identity owns a child identity. */
export interface LinkageProof {
  /** Lowercase hex x-only master pubkey (64 chars) */
  readonly masterPubkey: string
  /** Lowercase hex x-only child pubkey (64 chars) */
  readonly childPubkey: string
  /** Purpose string (present in full proofs, absent in blind proofs) */
  readonly purpose?: string
  /** Index (present in full proofs, absent in blind proofs) */
  readonly index?: number
  /** The signed attestation message (UTF-8) */
  readonly attestation: string
  /** BIP-340 Schnorr signature (lowercase hex, 128 chars) */
  readonly signature: string
}

/** Maximum uint32 value for index bounds checking. */
export const MAX_INDEX = 0xFFFFFFFF

/** Default scan range for recovery (BIP-44 gap limit). */
export const DEFAULT_SCAN_RANGE = 20

/** Maximum scan range for recovery (prevents self-DoS). */
export const MAX_SCAN_RANGE = 10_000
