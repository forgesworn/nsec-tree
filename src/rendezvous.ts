import { derive } from './derive.js'
import type { Identity, TreeRoot } from './types.js'

/** The sole root-child purpose used for a person's Vennel rendezvous key. */
export const RENDEZVOUS_PURPOSE = 'rendezvous'

/**
 * Derive one rotated rendezvous identity directly from the person's tree root.
 *
 * This deliberately accepts a `TreeRoot`, not a persona or ordinary identity:
 * Link tags and quiet drops must not use an account identity key. The returned
 * private key is caller-owned and must be zeroised after private provisioning.
 */
export function deriveRendezvous(root: TreeRoot, index = 0): Identity {
  return derive(root, RENDEZVOUS_PURPOSE, index)
}
