import { bech32 } from '@scure/base'
import { bytesToHex as _bytesToHex, hexToBytes as _hexToBytes } from '@noble/hashes/utils.js'
import { NsecTreeError } from './types.js'

export const bytesToHex = _bytesToHex
export const hexToBytes = _hexToBytes

const BECH32_LIMIT = 1500

function encodeBech32(prefix: string, bytes: Uint8Array): string {
  if (bytes.length !== 32) {
    throw new NsecTreeError(`Expected 32-byte key, got ${bytes.length}`)
  }
  const words = bech32.toWords(bytes)
  // @scure/base encode() has a template-literal return type; cast to string for internal use
  return bech32.encode(prefix as `${string}1${string}`, words, BECH32_LIMIT) as string
}

function decodeBech32(expectedPrefix: string, encoded: string): Uint8Array {
  let result: { prefix: string; bytes: Uint8Array }
  try {
    result = bech32.decodeToBytes(encoded)
  } catch {
    throw new NsecTreeError('Invalid bech32 encoding')
  }
  if (result.prefix !== expectedPrefix) {
    throw new NsecTreeError(`Expected prefix "${expectedPrefix}", got "${result.prefix}"`)
  }
  if (result.bytes.length !== 32) {
    throw new NsecTreeError(`Expected 32-byte payload, got ${result.bytes.length}`)
  }
  return result.bytes
}

/** Encode a 32-byte private key as a NIP-19 nsec bech32 string. */
export function encodeNsec(privateKey: Uint8Array): string {
  return encodeBech32('nsec', privateKey)
}

/** Decode a NIP-19 nsec bech32 string to a 32-byte private key. */
export function decodeNsec(nsec: string): Uint8Array {
  return decodeBech32('nsec', nsec)
}

/** Encode a 32-byte public key as a NIP-19 npub bech32 string. */
export function encodeNpub(publicKey: Uint8Array): string {
  return encodeBech32('npub', publicKey)
}

/** Decode a NIP-19 npub bech32 string to a 32-byte public key. */
export function decodeNpub(npub: string): Uint8Array {
  return decodeBech32('npub', npub)
}
