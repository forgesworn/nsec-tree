import { describe, it, expect } from 'vitest'
import { NSEC_TREE_EVENT_KIND, NSEC_TREE_D_PREFIX } from '../src/event.js'

describe('event constants', () => {
  it('exports NIP-78 kind', () => {
    expect(NSEC_TREE_EVENT_KIND).toBe(30078)
  })

  it('exports d-tag prefix', () => {
    expect(NSEC_TREE_D_PREFIX).toBe('nsec-tree:')
  })
})
