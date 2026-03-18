import type { Identity, TreeRoot } from './types.js'
import { NsecTreeError, MAX_SCAN_RANGE } from './types.js'
import { derive } from './derive.js'
import { fromNsec } from './root-nsec.js'

/** Default persona names scanned during recovery. */
export const DEFAULT_PERSONA_NAMES = Object.freeze(
  ['personal', 'bitcoiner', 'work', 'social', 'anonymous'] as const,
)

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

/**
 * Derive a sub-identity within a persona (two-level hierarchy).
 *
 * Creates an intermediate TreeRoot from the persona's private key,
 * derives the child identity, then destroys the intermediate root.
 * Useful for group signing where each persona needs isolated sub-keys.
 */
export function deriveFromPersona(persona: Persona, purpose: string, index = 0): Identity {
  const intermediateRoot = fromNsec(persona.identity.privateKey)
  try {
    return derive(intermediateRoot, purpose, index)
  } finally {
    intermediateRoot.destroy()
  }
}

/**
 * Recover personas by scanning known names at multiple indices.
 *
 * When no names are provided, scans {@link DEFAULT_PERSONA_NAMES}.
 * Default scanRange is 1 (index 0 only).
 */
export function recoverPersonas(
  root: TreeRoot,
  names: readonly string[] = DEFAULT_PERSONA_NAMES,
  scanRange = 1,
): Map<string, Persona[]> {
  if (!Number.isInteger(scanRange) || scanRange < 1 || scanRange > MAX_SCAN_RANGE) {
    throw new NsecTreeError(`scanRange must be an integer in [1, ${MAX_SCAN_RANGE}], got ${scanRange}`)
  }

  const result = new Map<string, Persona[]>()

  for (const name of names) {
    const personas: Persona[] = []
    for (let i = 0; i < scanRange; i++) {
      personas.push(derivePersona(root, name, i))
    }
    result.set(name, personas)
  }

  return result
}
