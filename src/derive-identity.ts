import type { Identity } from './types.js'
import { fromNsec } from './root-nsec.js'
import { derive } from './derive.js'

/**
 * Derive a child identity from any existing identity.
 *
 * Enables arbitrary-depth key hierarchies. Constructs a transient
 * TreeRoot from the parent identity's private key, derives the child,
 * and destroys the transient root in a finally block.
 */
export function deriveFromIdentity(identity: Identity, purpose: string, index = 0): Identity {
  const intermediateRoot = fromNsec(identity.privateKey)
  try {
    return derive(intermediateRoot, purpose, index)
  } finally {
    intermediateRoot.destroy()
  }
}
