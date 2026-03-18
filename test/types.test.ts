import { describe, it, expect } from 'vitest'
import { NsecTreeError, MAX_INDEX, DEFAULT_SCAN_RANGE } from '../src/types.js'

describe('types', () => {
  it('NsecTreeError has correct name', () => {
    const err = new NsecTreeError('test')
    expect(err.name).toBe('NsecTreeError')
    expect(err.message).toBe('test')
    expect(err).toBeInstanceOf(Error)
  })

  it('MAX_INDEX is uint32 max', () => {
    expect(MAX_INDEX).toBe(4294967295)
  })

  it('DEFAULT_SCAN_RANGE is 20', () => {
    expect(DEFAULT_SCAN_RANGE).toBe(20)
  })
})
