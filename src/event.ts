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
