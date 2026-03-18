import { describe, it, expect } from 'vitest'
import { fromNsec } from '../src/root-nsec.js'
import { derive } from '../src/derive.js'
import { recover } from '../src/recover.js'

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
    expect(() => recover(root, ['social'], 0)).toThrow('positive integer')
  })

  it('rejects negative scanRange', () => {
    expect(() => recover(root, ['social'], -1)).toThrow('positive integer')
  })

  it('rejects NaN scanRange', () => {
    expect(() => recover(root, ['social'], NaN)).toThrow('positive integer')
  })
})
