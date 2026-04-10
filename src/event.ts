import type { LinkageProof } from './types.js'
import { NsecTreeError, MAX_INDEX } from './types.js'
import { canonicalAttestation } from './proof.js'

const HEX_KEY_RE = /^[0-9a-f]{64}$/
const HEX_SIGNATURE_RE = /^[0-9a-f]{128}$/
const STRICT_UINT_RE = /^(?:0|[1-9]\d*)$/

/**
 * Get the single tag value for `name`. Throws on duplicates to prevent
 * "duplicate tag smuggling" where a crafted event contains two copies of an
 * nsec-tree tag and different verifiers pick different ones.
 */
function getSingleTagValue(tags: string[][], name: string): string | undefined {
  const matches = tags.filter(t => t[0] === name)
  if (matches.length > 1) {
    throw new NsecTreeError(`Duplicate "${name}" tag: event must contain at most one`)
  }
  return matches[0]?.[1]
}

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
 *
 * Performs a structural sanity check (hex formats, purpose/index consistency,
 * purpose does not contain reserved characters, and `proof.attestation` matches
 * the canonical reconstruction) but does NOT verify the Schnorr signature.
 * Run `verifyProof` if you need full cryptographic validation.
 */
export function toUnsignedEvent(proof: LinkageProof): UnsignedEvent {
  const expected = canonicalAttestation(proof)
  if (expected === null) {
    throw new NsecTreeError('Invalid proof: structurally malformed')
  }
  if (proof.attestation !== expected) {
    throw new NsecTreeError('Invalid proof: attestation does not match canonical form')
  }

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

/**
 * Extract a LinkageProof from a NIP-78 event's tags.
 * Pass the result to verifyProof() to check cryptographic validity.
 * Throws NsecTreeError if the event does not contain a valid nsec-tree proof.
 */
export function fromEvent(event: { pubkey: string; tags: string[][] }): LinkageProof {
  const dValue = getSingleTagValue(event.tags, 'd')
  if (!dValue || !dValue.startsWith(NSEC_TREE_D_PREFIX)) {
    throw new NsecTreeError('Missing or invalid d tag: expected nsec-tree: prefix')
  }

  const attestation = getSingleTagValue(event.tags, 'attestation')
  if (!attestation) {
    throw new NsecTreeError('Missing attestation tag')
  }

  const signature = getSingleTagValue(event.tags, 'proof-sig')
  if (!signature) {
    throw new NsecTreeError('Missing proof-sig tag')
  }

  const childPubkey = dValue.slice(NSEC_TREE_D_PREFIX.length)
  if (!HEX_KEY_RE.test(childPubkey)) {
    throw new NsecTreeError(`Invalid childPubkey in d tag: expected 64-char lowercase hex`)
  }

  const pValue = getSingleTagValue(event.tags, 'p')
  if (!pValue) {
    throw new NsecTreeError('Missing p tag')
  }
  if (pValue !== childPubkey) {
    throw new NsecTreeError('p tag does not match childPubkey in d tag')
  }

  if (!HEX_KEY_RE.test(event.pubkey)) {
    throw new NsecTreeError(`Invalid pubkey: expected 64-char lowercase hex`)
  }
  if (!HEX_SIGNATURE_RE.test(signature)) {
    throw new NsecTreeError(`Invalid proof-sig: expected 128-char lowercase hex`)
  }

  const purposeValue = getSingleTagValue(event.tags, 'purpose')
  const indexValue = getSingleTagValue(event.tags, 'index')

  const hasPurpose = purposeValue !== undefined
  const hasIndex = indexValue !== undefined
  if (hasPurpose !== hasIndex) {
    throw new NsecTreeError('purpose and index tags must both be present or both absent')
  }

  let purpose: string | undefined
  let index: number | undefined

  if (hasPurpose) {
    purpose = purposeValue
  }

  if (hasIndex) {
    if (!STRICT_UINT_RE.test(indexValue!)) {
      throw new NsecTreeError(`Invalid index tag: ${indexValue}`)
    }
    index = Number(indexValue)
    if (index > MAX_INDEX) {
      throw new NsecTreeError(`Index exceeds maximum (${MAX_INDEX}): ${indexValue}`)
    }
  }

  return {
    masterPubkey: event.pubkey,
    childPubkey,
    attestation,
    signature,
    ...(purpose !== undefined ? { purpose } : {}),
    ...(index !== undefined ? { index } : {}),
  }
}
