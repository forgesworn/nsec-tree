import { describe, it, expect } from 'vitest'
import { validatePurpose, validateProofPurpose } from '../src/validate.js'

describe('validatePurpose', () => {
  it('accepts valid purpose strings', () => {
    expect(() => validatePurpose('social')).not.toThrow()
    expect(() => validatePurpose('trott:rider')).not.toThrow()
    expect(() => validatePurpose('402:api:v2:prod')).not.toThrow()
    expect(() => validatePurpose('a')).not.toThrow()
  })

  it('rejects empty string', () => {
    expect(() => validatePurpose('')).toThrow('non-empty')
  })

  it('rejects strings with embedded null bytes', () => {
    expect(() => validatePurpose('social\0extra')).toThrow('null')
  })

  it('rejects whitespace-only strings', () => {
    expect(() => validatePurpose('   ')).toThrow('whitespace')
    expect(() => validatePurpose('\t\n')).toThrow('whitespace')
  })

  it('rejects strings exceeding 255 bytes', () => {
    const long = 'a'.repeat(256)
    expect(() => validatePurpose(long)).toThrow('255')
  })

  it('accepts 255-byte string', () => {
    expect(() => validatePurpose('a'.repeat(255))).not.toThrow()
  })

  it('is case-sensitive', () => {
    expect(() => validatePurpose('Social')).not.toThrow()
    expect(() => validatePurpose('social')).not.toThrow()
  })

  it('rejects non-string input', () => {
    expect(() => validatePurpose(undefined as unknown as string)).toThrow('string')
    expect(() => validatePurpose(null as unknown as string)).toThrow('string')
    expect(() => validatePurpose(42 as unknown as string)).toThrow('string')
  })

  it('still accepts pipes — protocol §3 does not forbid them for derivation', () => {
    // Derivation uses null-byte framing so `|` is cryptographically safe.
    // Only the linkage-proof attestation layer reserves the pipe.
    expect(() => validatePurpose('foo|bar')).not.toThrow()
  })
})

describe('validateProofPurpose', () => {
  it('accepts purposes that pass base validation and contain no reserved chars', () => {
    expect(() => validateProofPurpose('social')).not.toThrow()
    expect(() => validateProofPurpose('nostr:persona:alice')).not.toThrow()
    expect(() => validateProofPurpose('trott:rider')).not.toThrow()
  })

  it('rejects purposes containing pipe (attestation delimiter)', () => {
    expect(() => validateProofPurpose('foo|bar')).toThrow('"|"')
  })

  it('rejects purposes containing control characters', () => {
    expect(() => validateProofPurpose('foo\nbar')).toThrow('control characters')
    expect(() => validateProofPurpose('foo\tbar')).toThrow('control characters')
    expect(() => validateProofPurpose('foo\rbar')).toThrow('control characters')
    expect(() => validateProofPurpose('foo\x01bar')).toThrow('control characters')
    expect(() => validateProofPurpose('foo\x7fbar')).toThrow('control characters')
  })

  it('still enforces base-layer rules (empty, null, length)', () => {
    expect(() => validateProofPurpose('')).toThrow('non-empty')
    expect(() => validateProofPurpose('a\0b')).toThrow('null')
    expect(() => validateProofPurpose('a'.repeat(256))).toThrow('255')
  })
})
