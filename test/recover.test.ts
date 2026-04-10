import { describe, it, expect } from 'vitest'
import { fromNsec } from '../src/root-nsec.js'
import { derive } from '../src/derive.js'
import { recover } from '../src/recover.js'
import { MAX_RECOVERY_PURPOSES } from '../src/types.js'

describe('recover', () => {
  const root = fromNsec(new Uint8Array(32).fill(0xab))

  it('recovers identities for given purposes', () => {
    const result = recover(root, ['social', 'commerce'], 3)
    expect(result.get('social')?.length).toBe(3)
    expect(result.get('commerce')?.length).toBe(3)
  })

  it('recovered identities match direct derivation', () => {
    const result = recover(root, ['social'], 5)
    const social = result.get('social')!
    for (let i = 0; i < 5; i++) {
      const direct = derive(root, 'social', i)
      expect(social[i]!.nsec).toBe(direct.nsec)
    }
  })

  it('defaults scanRange to 20', () => {
    const result = recover(root, ['social'])
    expect(result.get('social')?.length).toBe(20)
  })

  it('returns empty map for empty purposes', () => {
    const result = recover(root, [])
    expect(result.size).toBe(0)
  })

  it('rejects zero scanRange', () => {
    expect(() => recover(root, ['social'], 0)).toThrow('scanRange')
  })

  it('rejects negative scanRange', () => {
    expect(() => recover(root, ['social'], -1)).toThrow('scanRange')
  })

  it('rejects NaN scanRange', () => {
    expect(() => recover(root, ['social'], NaN)).toThrow()
  })

  it('rejects scanRange exceeding MAX_SCAN_RANGE', () => {
    expect(() => recover(root, ['social'], 10_001)).toThrow()
  })

  it('rejects non-array purposes', () => {
    expect(() => recover(root, 'social' as unknown as string[])).toThrow('array')
  })

  it('rejects purposes array exceeding MAX_RECOVERY_PURPOSES (security fix)', () => {
    const huge = new Array(MAX_RECOVERY_PURPOSES + 1).fill('p')
    expect(() => recover(root, huge, 1)).toThrow('exceeds maximum')
  })

  it('accepts purposes array of exactly MAX_RECOVERY_PURPOSES', () => {
    const max = new Array(MAX_RECOVERY_PURPOSES).fill(0).map((_, i) => `p${i}`)
    expect(() => recover(root, max, 1)).not.toThrow()
  })
})
