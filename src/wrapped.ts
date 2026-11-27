/** Opt-in encrypted recovery of an existing raw nsec. See WRAPPED-NSEC.md. */
import { schnorr } from '@noble/curves/secp256k1.js'
import { gcm } from '@noble/ciphers/aes.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { utf8ToBytes } from '@noble/hashes/utils.js'
import { base64urlnopad } from '@scure/base'
import { encodeNpub } from './encoding.js'
import { getSecret, NsecTreeError } from './types.js'
import type { TreeRoot } from './types.js'

const PREFIX = 'nstw1:'
const MAGIC = new Uint8Array([78, 83, 84, 87, 1, 1, 1]) // NSTW, version, suite, raw-nsec kind
const INFO = utf8ToBytes('nsec-tree/wrapped-nsec/v1')
const HEADER_LENGTH = 51
const RECORD_LENGTH = 131
const TEXT_LENGTH = 181

/** An imported key, deliberately without derivation provenance or an nsec string. */
export interface UnwrappedNsec {
  /** Caller owns these bytes and must zeroise them after use. */
  readonly privateKey: Uint8Array
  readonly publicKey: Uint8Array
  readonly npub: string
}

function publicKeyOf(key: Uint8Array): Uint8Array {
  if (!(key instanceof Uint8Array) || key.length !== 32) {
    throw new NsecTreeError('Expected a valid 32-byte raw private key')
  }
  try { return schnorr.getPublicKey(key) }
  catch { throw new NsecTreeError('Expected a valid 32-byte raw private key') }
}

function cipherKey(root: TreeRoot, salt: Uint8Array): Uint8Array {
  // Consume the root synchronously; never retain its secret reference.
  return hkdf(sha256, getSecret(root), salt, INFO, 32)
}

/**
 * Encrypt a raw key under a dedicated key derived from the tree root.
 * Recovery needs this record AND the same root construction/backup.
 * Caller input is copied synchronously and is never zeroised by this function.
 */
export async function wrapNsec(root: TreeRoot, privateKey: Uint8Array): Promise<string> {
  const publicKey = publicKeyOf(privateKey)
  const payload = new Uint8Array(64)
  payload.set(privateKey)
  payload.set(publicKey, 32)
  let key: Uint8Array | undefined
  try {
    const header = new Uint8Array(HEADER_LENGTH)
    header.set(MAGIC)
    crypto.getRandomValues(header.subarray(7, 39))
    crypto.getRandomValues(header.subarray(39, 51))
    key = cipherKey(root, header.slice(7, 39))
    const encrypted = gcm(key, header.slice(39), header).encrypt(payload)
    const record = new Uint8Array(RECORD_LENGTH)
    record.set(header)
    record.set(encrypted, HEADER_LENGTH)
    return PREFIX + base64urlnopad.encode(record)
  } finally { key?.fill(0); payload.fill(0) }
}

/**
 * Authenticate and recover the exact raw key. This does not derive a child.
 * Supply expectedNpub when restoring a record associated with a known account.
 * No private-key strings are created. Zeroise the returned privateKey after use.
 */
export async function unwrapNsec(root: TreeRoot, record: string, expectedNpub?: string): Promise<UnwrappedNsec> {
  if (typeof record !== 'string' || record.length !== TEXT_LENGTH || !record.startsWith(PREFIX)) {
    throw new NsecTreeError('Invalid wrapped-nsec record')
  }
  let bytes: Uint8Array
  try {
    bytes = base64urlnopad.decode(record.slice(PREFIX.length))
    if (bytes.length !== RECORD_LENGTH || PREFIX + base64urlnopad.encode(bytes) !== record) throw new Error()
  } catch { throw new NsecTreeError('Invalid wrapped-nsec record') }
  if (!MAGIC.every((byte, i) => bytes[i] === byte)) {
    throw new NsecTreeError('Unsupported wrapped-nsec version, suite or key kind')
  }
  const key = cipherKey(root, bytes.slice(7, 39))
  let payload: Uint8Array
  try {
    payload = gcm(key, bytes.slice(39, 51), bytes.slice(0, HEADER_LENGTH)).decrypt(bytes.slice(HEADER_LENGTH))
  } catch { throw new NsecTreeError('Cannot authenticate wrapped nsec with this root') }
  finally { key.fill(0) }
  try {
    const publicKey = publicKeyOf(payload.subarray(0, 32))
    if (payload.length !== 64 || !publicKey.every((byte, i) => payload[32 + i] === byte)) {
      throw new NsecTreeError('Invalid wrapped-nsec key payload')
    }
    const npub = encodeNpub(publicKey)
    if (expectedNpub !== undefined && expectedNpub !== npub) {
      throw new NsecTreeError('Wrapped nsec does not match the expected identity')
    }
    return { privateKey: payload.slice(0, 32), publicKey, npub }
  } finally { payload.fill(0) }
}
