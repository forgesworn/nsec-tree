import { describe, it, expect } from 'vitest'
import { validatePurpose } from '../src/validate.js'

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
})
