import type { Identity, TreeRoot } from './types.js'
import { derive } from './derive.js'

/** A named persona derived from a TreeRoot. */
export interface Persona {
  /** The derived Nostr identity for this persona. */
  readonly identity: Identity
  /** The persona name (e.g. 'personal', 'work'). */
  readonly name: string
  /** The derivation index (0 = first, 1+ = rotated). */
  readonly index: number
}

/**
 * Derive a persona from a TreeRoot.
 *
 * Uses purpose string `nostr:persona:{name}` for deterministic derivation.
 * The index parameter enables persona rotation (default 0).
 */
export function derivePersona(root: TreeRoot, name: string, index = 0): Persona {
  const purpose = `nostr:persona:${name}`
  const identity = derive(root, purpose, index)

  return {
    identity,
    name,
    index: identity.index,
  }
}
