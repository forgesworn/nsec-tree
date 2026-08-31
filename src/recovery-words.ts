import { schnorr } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { decodeNpub, decodeNsec, encodeNpub } from './encoding.js'
import { fromMnemonic } from './root-mnemonic.js'
import { fromNsec } from './root-nsec.js'
import { NsecTreeError } from './types.js'
import type { TreeRoot } from './types.js'

/** Version of the ForgeSworn recovery-word envelope, not the derivation protocol. */
export const RECOVERY_WORDS_VERSION = 1 as const

/** Seven header words make every supported payload length invalid as bare BIP-39. */
export const RECOVERY_HEADER_WORDS = 7

export type RecoveryKind =
  | 'nsec-tree-mnemonic-v1'
  | 'raw-nsec-v1'
  | 'nsec-tree-nsec-v1'

export interface DecodedRecoveryWords {
  readonly version: typeof RECOVERY_WORDS_VERSION
  readonly kind: RecoveryKind
  readonly passphraseRequired: boolean
  /** Eight lowercase hex digits. Error-detection only, not an authentication tag. */
  readonly fingerprint: string
  /** Secret payload. The caller owns this buffer and MUST zero-fill it after use. */
  readonly payload: Uint8Array
}

export type RestoredRecovery =
  | {
      readonly type: 'tree-root'
      readonly source: 'mnemonic' | 'nsec'
      readonly version: 1
      readonly fingerprint: string
      readonly root: TreeRoot
    }
  | {
      readonly type: 'raw-nsec'
      readonly version: 1
      readonly fingerprint: string
      readonly npub: string
      /** Secret key. The caller owns this buffer and MUST zero-fill it after use. */
      readonly privateKey: Uint8Array
    }

const MAGIC = 0x4653n // ASCII "FS"
const HEADER_BITS = BigInt(RECOVERY_HEADER_WORDS * 11)
const CHECKSUM_BITS = 17n
const CHECKSUM_MASK = (1n << CHECKSUM_BITS) - 1n
const FLAG_PASSPHRASE_REQUIRED = 0x1
const ALLOWED_FLAGS = FLAG_PASSPHRASE_REQUIRED
const FINGERPRINT_DOMAIN = new TextEncoder().encode('ForgeSworn recovery fingerprint v1\0')
const CHECKSUM_DOMAIN = new TextEncoder().encode('ForgeSworn recovery words v1\0')

const KIND_TO_CODE: Readonly<Record<RecoveryKind, number>> = {
  'nsec-tree-mnemonic-v1': 1,
  'raw-nsec-v1': 2,
  'nsec-tree-nsec-v1': 3,
}

const CODE_TO_KIND = new Map<number, RecoveryKind>(
  Object.entries(KIND_TO_CODE).map(([kind, code]) => [code, kind as RecoveryKind]),
)

const WORD_INDEX = new Map<string, number>()
for (let i = 0; i < wordlist.length; i++) WORD_INDEX.set(wordlist[i]!, i)

function normaliseWords(words: string): string {
  return words.trim().toLowerCase().replace(/\s+/g, ' ')
}

function fingerprintBytes(publicKey: Uint8Array): Uint8Array {
  if (publicKey.length !== 32) throw new NsecTreeError(`Expected 32-byte public key, got ${publicKey.length}`)
  const input = new Uint8Array(FINGERPRINT_DOMAIN.length + publicKey.length)
  input.set(FINGERPRINT_DOMAIN)
  input.set(publicKey, FINGERPRINT_DOMAIN.length)
  const digest = sha256(input)
  const result = digest.slice(0, 4)
  input.fill(0)
  digest.fill(0)
  return result
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function fingerprintNumber(bytes: Uint8Array): number {
  return (((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0)
}

function numberToFingerprint(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ])
}

function recoveryChecksum(
  kindCode: number,
  flags: number,
  fingerprint: Uint8Array,
  payload: Uint8Array,
): number {
  const input = new Uint8Array(CHECKSUM_DOMAIN.length + 3 + fingerprint.length + payload.length)
  input.set(CHECKSUM_DOMAIN)
  let at = CHECKSUM_DOMAIN.length
  input[at++] = RECOVERY_WORDS_VERSION
  input[at++] = kindCode
  input[at++] = flags
  input.set(fingerprint, at)
  input.set(payload, at + fingerprint.length)
  const digest = sha256(input)
  const result = ((digest[0]! << 9) | (digest[1]! << 1) | (digest[2]! >>> 7)) & 0x1ffff
  input.fill(0)
  digest.fill(0)
  return result
}

function encodeHeader(
  kind: RecoveryKind,
  passphraseRequired: boolean,
  fingerprint: Uint8Array,
  payload: Uint8Array,
): string[] {
  const kindCode = KIND_TO_CODE[kind]
  const flags = passphraseRequired ? FLAG_PASSPHRASE_REQUIRED : 0
  const checksum = recoveryChecksum(kindCode, flags, fingerprint, payload)

  let packed = MAGIC
  packed = (packed << 4n) | BigInt(RECOVERY_WORDS_VERSION)
  packed = (packed << 4n) | BigInt(kindCode)
  packed = (packed << 4n) | BigInt(flags)
  packed = (packed << 32n) | BigInt(fingerprintNumber(fingerprint))
  packed = (packed << CHECKSUM_BITS) | BigInt(checksum)

  const words: string[] = []
  for (let shift = HEADER_BITS - 11n; shift >= 0n; shift -= 11n) {
    const index = Number((packed >> shift) & 0x7ffn)
    words.push(wordlist[index]!)
  }
  return words
}

function decodeHeader(words: string[]): {
  kind: RecoveryKind
  flags: number
  fingerprint: Uint8Array
  checksum: number
} {
  if (words.length !== RECOVERY_HEADER_WORDS) {
    throw new NsecTreeError(`ForgeSworn recovery header must contain ${RECOVERY_HEADER_WORDS} words`)
  }
  let packed = 0n
  for (const word of words) {
    const index = WORD_INDEX.get(word)
    if (index === undefined) throw new NsecTreeError(`Unknown recovery word: ${word}`)
    packed = (packed << 11n) | BigInt(index)
  }

  const checksum = Number(packed & CHECKSUM_MASK)
  packed >>= CHECKSUM_BITS
  const fingerprint = numberToFingerprint(Number(packed & 0xffff_ffffn))
  packed >>= 32n
  const flags = Number(packed & 0xfn)
  packed >>= 4n
  const kindCode = Number(packed & 0xfn)
  packed >>= 4n
  const version = Number(packed & 0xfn)
  packed >>= 4n
  const magic = packed

  if (magic !== MAGIC) throw new NsecTreeError('Not ForgeSworn recovery words (bad magic)')
  if (version !== RECOVERY_WORDS_VERSION) {
    throw new NsecTreeError(`Unsupported ForgeSworn recovery words version: ${version}`)
  }
  if ((flags & ~ALLOWED_FLAGS) !== 0) throw new NsecTreeError('Unsupported ForgeSworn recovery flags')
  const kind = CODE_TO_KIND.get(kindCode)
  if (!kind) throw new NsecTreeError(`Unsupported ForgeSworn recovery kind: ${kindCode}`)
  if (kind !== 'nsec-tree-mnemonic-v1' && flags !== 0) {
    throw new NsecTreeError('Passphrase flag is only valid for mnemonic recovery')
  }
  return { kind, flags, fingerprint, checksum }
}

function validatePayload(kind: RecoveryKind, payload: Uint8Array): void {
  if (kind === 'nsec-tree-mnemonic-v1') {
    if (![16, 20, 24, 28, 32].includes(payload.length)) {
      throw new NsecTreeError(`Mnemonic recovery payload has invalid entropy length: ${payload.length}`)
    }
    return
  }
  if (payload.length !== 32) {
    throw new NsecTreeError(`Nsec recovery payload must contain 32 bytes, got ${payload.length}`)
  }
}

function encodeRecoveryWords(
  kind: RecoveryKind,
  payloadWords: string,
  passphraseRequired: boolean,
  publicKey: Uint8Array,
): string {
  const canonicalPayload = normaliseWords(payloadWords)
  if (!validateMnemonic(canonicalPayload, wordlist)) {
    throw new NsecTreeError('Recovery payload is not a valid English BIP-39 sequence')
  }
  const payload = mnemonicToEntropy(canonicalPayload, wordlist)
  const fingerprint = fingerprintBytes(publicKey)
  try {
    validatePayload(kind, payload)
    return [...encodeHeader(kind, passphraseRequired, fingerprint, payload), ...canonicalPayload.split(' ')].join(' ')
  } finally {
    payload.fill(0)
    fingerprint.fill(0)
  }
}

/**
 * Wrap an existing BIP-39 mnemonic in typed ForgeSworn recovery words.
 * The mnemonic derivation remains frozen at nsec-tree v1; the passphrase is
 * never included, only a flag and public fingerprint that detect omission or
 * a wrong value during recovery.
 */
export function createMnemonicRecoveryWords(mnemonic: string, passphrase = ''): string {
  const canonical = normaliseWords(mnemonic)
  if (!validateMnemonic(canonical, wordlist)) throw new NsecTreeError('Invalid BIP-39 mnemonic')
  const root = fromMnemonic(canonical, passphrase)
  const publicKey = decodeNpub(root.masterPubkey)
  try {
    return encodeRecoveryWords('nsec-tree-mnemonic-v1', canonical, passphrase.length > 0, publicKey)
  } finally {
    publicKey.fill(0)
    root.destroy()
  }
}

/** Wrap a raw nsec with an explicit exact-key or nsec-tree-v1 interpretation. */
export function createNsecRecoveryWords(
  nsec: string | Uint8Array,
  mode: 'raw' | 'tree',
): string {
  const privateKey = typeof nsec === 'string' ? decodeNsec(nsec) : new Uint8Array(nsec)
  let publicKey: Uint8Array | undefined
  let root: TreeRoot | undefined
  try {
    if (privateKey.length !== 32) throw new NsecTreeError(`Expected 32-byte nsec, got ${privateKey.length}`)
    // Both nsec recovery kinds claim that the payload is a Nostr secret key,
    // so validate the source scalar before either using it directly or as the
    // nsec-tree HMAC key.
    publicKey = schnorr.getPublicKey(privateKey)
    const payloadWords = entropyToMnemonic(privateKey, wordlist)
    if (mode === 'raw') {
      return encodeRecoveryWords('raw-nsec-v1', payloadWords, false, publicKey)
    }
    publicKey.fill(0)
    root = fromNsec(privateKey)
    publicKey = decodeNpub(root.masterPubkey)
    return encodeRecoveryWords('nsec-tree-nsec-v1', payloadWords, false, publicKey)
  } finally {
    privateKey.fill(0)
    publicKey?.fill(0)
    root?.destroy()
  }
}

/** Decode and checksum a typed sequence without deriving a key. */
export function decodeRecoveryWords(words: string): DecodedRecoveryWords {
  const canonical = normaliseWords(words)
  const parts = canonical ? canonical.split(' ') : []
  if (parts.length <= RECOVERY_HEADER_WORDS) {
    throw new NsecTreeError('Not ForgeSworn recovery words (missing typed header or payload)')
  }
  const header = decodeHeader(parts.slice(0, RECOVERY_HEADER_WORDS))
  const payloadWords = parts.slice(RECOVERY_HEADER_WORDS).join(' ')
  if (!validateMnemonic(payloadWords, wordlist)) {
    throw new NsecTreeError('ForgeSworn recovery payload has an invalid BIP-39 checksum')
  }
  const payload = mnemonicToEntropy(payloadWords, wordlist)
  try {
    validatePayload(header.kind, payload)
    const expected = recoveryChecksum(header.kind === 'nsec-tree-mnemonic-v1' ? 1 : header.kind === 'raw-nsec-v1' ? 2 : 3, header.flags, header.fingerprint, payload)
    if (expected !== header.checksum) throw new NsecTreeError('ForgeSworn recovery checksum mismatch')
    return {
      version: RECOVERY_WORDS_VERSION,
      kind: header.kind,
      passphraseRequired: (header.flags & FLAG_PASSPHRASE_REQUIRED) !== 0,
      fingerprint: bytesToHex(header.fingerprint),
      payload,
    }
  } catch (error) {
    payload.fill(0)
    throw error
  } finally {
    header.fingerprint.fill(0)
  }
}

/** Pack the complete typed word sequence into a compact byte string for
 * storage or Shamir sharing. Byte 0 is the word count; the remaining bytes are
 * the 11-bit BIP-39 indices, most-significant bit first, padded with zero bits.
 * The recovery header/checksum remains intact inside the packed sequence. */
export function recoveryWordsToBytes(words: string): Uint8Array {
  const canonical = normaliseWords(words)
  const decoded = decodeRecoveryWords(canonical)
  decoded.payload.fill(0)
  const parts = canonical.split(' ')
  const output = new Uint8Array(1 + Math.ceil(parts.length * 11 / 8))
  output[0] = parts.length
  let accumulator = 0
  let bits = 0
  let at = 1
  for (const word of parts) {
    const index = WORD_INDEX.get(word)
    if (index === undefined) throw new NsecTreeError(`Unknown recovery word: ${word}`)
    accumulator = ((accumulator << 11) | index) >>> 0
    bits += 11
    while (bits >= 8) {
      bits -= 8
      output[at++] = (accumulator >>> bits) & 0xff
      accumulator &= (1 << bits) - 1
    }
  }
  if (bits > 0) output[at] = (accumulator << (8 - bits)) & 0xff
  return output
}

/** Restore and validate typed words from {@link recoveryWordsToBytes}. The
 * returned string contains secret material and should be kept short-lived. */
export function recoveryWordsFromBytes(compact: Uint8Array): string {
  if (!(compact instanceof Uint8Array) || compact.length < 2) {
    throw new NsecTreeError('Compact recovery words must be a non-empty Uint8Array')
  }
  const count = compact[0]!
  if (![19, 22, 25, 28, 31].includes(count)) {
    throw new NsecTreeError(`Unsupported compact recovery word count: ${count}`)
  }
  const expectedLength = 1 + Math.ceil(count * 11 / 8)
  if (compact.length !== expectedLength) {
    throw new NsecTreeError(`Expected ${expectedLength} compact recovery bytes, got ${compact.length}`)
  }

  const indices: number[] = []
  let accumulator = 0
  let bits = 0
  for (let at = 1; at < compact.length; at++) {
    accumulator = ((accumulator << 8) | compact[at]!) >>> 0
    bits += 8
    while (bits >= 11 && indices.length < count) {
      bits -= 11
      indices.push((accumulator >>> bits) & 0x7ff)
      accumulator &= (1 << bits) - 1
    }
  }
  if (indices.length !== count) throw new NsecTreeError('Compact recovery sequence is truncated')
  if (bits > 0 && accumulator !== 0) {
    throw new NsecTreeError('Compact recovery sequence has non-zero padding bits')
  }
  const canonical = indices.map(index => wordlist[index]!).join(' ')
  const decoded = decodeRecoveryWords(canonical)
  decoded.payload.fill(0)
  return canonical
}

function publicKeyMatchesFingerprint(publicKey: Uint8Array, expectedHex: string): boolean {
  const actual = fingerprintBytes(publicKey)
  const actualHex = bytesToHex(actual)
  actual.fill(0)
  return actualHex === expectedHex
}

/**
 * Restore typed recovery words and verify the derived public fingerprint.
 * Bare BIP-39 is deliberately rejected; callers must expose it as an explicit
 * legacy path so a valid phrase can never silently choose the wrong meaning.
 */
export function restoreRecoveryWords(words: string, passphrase = ''): RestoredRecovery {
  const decoded = decodeRecoveryWords(words)
  if (decoded.passphraseRequired && passphrase.length === 0) {
    decoded.payload.fill(0)
    throw new NsecTreeError('Recovery passphrase required')
  }
  if (!decoded.passphraseRequired && passphrase.length > 0) {
    decoded.payload.fill(0)
    throw new NsecTreeError('Recovery words do not use a passphrase')
  }

  if (decoded.kind === 'nsec-tree-mnemonic-v1') {
    const mnemonic = entropyToMnemonic(decoded.payload, wordlist)
    decoded.payload.fill(0)
    const root = fromMnemonic(mnemonic, passphrase)
    const publicKey = decodeNpub(root.masterPubkey)
    const matches = publicKeyMatchesFingerprint(publicKey, decoded.fingerprint)
    publicKey.fill(0)
    if (!matches) {
      root.destroy()
      throw new NsecTreeError('Recovery fingerprint mismatch (wrong passphrase or words)')
    }
    return {
      type: 'tree-root',
      source: 'mnemonic',
      version: 1,
      fingerprint: decoded.fingerprint,
      root,
    }
  }

  if (decoded.kind === 'nsec-tree-nsec-v1') {
    let sourcePublicKey: Uint8Array
    try {
      sourcePublicKey = schnorr.getPublicKey(decoded.payload)
    } catch (error) {
      decoded.payload.fill(0)
      throw new NsecTreeError(`Recovery payload is not a valid nsec: ${String(error)}`)
    }
    sourcePublicKey.fill(0)
    const root = fromNsec(decoded.payload)
    decoded.payload.fill(0)
    const publicKey = decodeNpub(root.masterPubkey)
    const matches = publicKeyMatchesFingerprint(publicKey, decoded.fingerprint)
    publicKey.fill(0)
    if (!matches) {
      root.destroy()
      throw new NsecTreeError('Recovery fingerprint mismatch')
    }
    return {
      type: 'tree-root',
      source: 'nsec',
      version: 1,
      fingerprint: decoded.fingerprint,
      root,
    }
  }

  let publicKey: Uint8Array
  try {
    publicKey = schnorr.getPublicKey(decoded.payload)
  } catch (error) {
    decoded.payload.fill(0)
    throw new NsecTreeError(`Recovery payload is not a valid nsec: ${String(error)}`)
  }
  if (!publicKeyMatchesFingerprint(publicKey, decoded.fingerprint)) {
    publicKey.fill(0)
    decoded.payload.fill(0)
    throw new NsecTreeError('Recovery fingerprint mismatch')
  }
  const npub = encodeNpub(publicKey)
  publicKey.fill(0)
  return {
    type: 'raw-nsec',
    version: 1,
    fingerprint: decoded.fingerprint,
    npub,
    privateKey: decoded.payload,
  }
}
