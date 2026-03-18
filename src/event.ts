import type { LinkageProof } from './types.js'
import { NsecTreeError } from './types.js'

/** NIP-78 application-specific data kind. */
export const NSEC_TREE_EVENT_KIND = 30078

/** Namespace prefix for nsec-tree d-tags. */
export const NSEC_TREE_D_PREFIX = 'nsec-tree:'

/** Unsigned Nostr event — the application signs and publishes this. */
export interface UnsignedEvent {
  kind: number
  pubkey: string
  created_at: number
  tags: string[][]
  content: string
}

/**
 * Convert a LinkageProof to an unsigned NIP-78 (Kind 30078) Nostr event.
 * The application signs and publishes this with their own Nostr library.
 * Does not validate the proof — the caller is responsible for passing a valid LinkageProof.
 */
export function toUnsignedEvent(proof: LinkageProof): UnsignedEvent {
  const tags: string[][] = [
    ['d', `${NSEC_TREE_D_PREFIX}${proof.childPubkey}`],
    ['p', proof.childPubkey],
  ]

  if (proof.purpose !== undefined && proof.index !== undefined) {
    tags.push(['purpose', proof.purpose])
    tags.push(['index', String(proof.index)])
  }

  tags.push(['attestation', proof.attestation])
  tags.push(['proof-sig', proof.signature])

  return {
    kind: NSEC_TREE_EVENT_KIND,
    pubkey: proof.masterPubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '',
  }
}
