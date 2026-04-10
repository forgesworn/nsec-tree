import { NsecTreeError } from './types.js'

const encoder = new TextEncoder()

// Control chars (C0 + DEL) or pipe — the pipe is the attestation field delimiter
// per PROTOCOL.md §5 and must not appear inside a purpose used in a proof.
const PROOF_UNSAFE_RE = /[\x00-\x1F\x7F|]/

export function validatePurpose(purpose: string): void {
  if (typeof purpose !== 'string') {
    throw new NsecTreeError('Purpose must be a string')
  }
  if (purpose.length === 0) {
    throw new NsecTreeError('Purpose must be non-empty')
  }
  if (purpose.includes('\0')) {
    throw new NsecTreeError('Purpose must not contain null bytes')
  }
  if (purpose.trim().length === 0) {
    throw new NsecTreeError('Purpose must not be whitespace-only')
  }
  const bytes = encoder.encode(purpose)
  if (bytes.length > 255) {
    throw new NsecTreeError(`Purpose exceeds 255 bytes (got ${bytes.length})`)
  }
}

/**
 * Extra validation for purposes embedded in linkage-proof attestations.
 *
 * The attestation format in PROTOCOL.md §5 is pipe-delimited; a purpose
 * containing `|`, newlines, or control chars would make the attestation
 * ambiguous to any verifier that parses by splitting on the delimiter.
 * Derivation itself (PROTOCOL.md §2) is unaffected — purposes can still
 * contain any non-null, non-whitespace-only UTF-8 for pure derivation use.
 */
export function validateProofPurpose(purpose: string): void {
  validatePurpose(purpose)
  if (PROOF_UNSAFE_RE.test(purpose)) {
    throw new NsecTreeError(
      'Purpose used in a linkage proof must not contain "|" or control characters',
    )
  }
}
