import { describe, expect, it } from 'vitest'
import { derive, zeroise } from '../src/derive.js'
import { fromNsec } from '../src/root-nsec.js'
import { deriveRendezvous, RENDEZVOUS_PURPOSE } from '../src/rendezvous.js'

describe('deriveRendezvous', () => {
  it('uses the sole root-child purpose and preserves the requested rotation index', () => {
    const root = fromNsec(new Uint8Array(32).fill(0x61))
    const rendezvous = deriveRendezvous(root, 3)
    const generic = derive(root, 'rendezvous', 3)

    expect(RENDEZVOUS_PURPOSE).toBe('rendezvous')
    expect(rendezvous.purpose).toBe(RENDEZVOUS_PURPOSE)
    expect(rendezvous.index).toBe(3)
    expect(rendezvous.publicKey).toEqual(generic.publicKey)
    expect(rendezvous.privateKey).toEqual(generic.privateKey)

    zeroise(rendezvous)
    zeroise(generic)
    root.destroy()
  })

  it('rotates by index without changing the person root', () => {
    const root = fromNsec(new Uint8Array(32).fill(0x62))
    const current = deriveRendezvous(root, 0)
    const rotated = deriveRendezvous(root, 1)

    expect(rotated.publicKey).not.toEqual(current.publicKey)
    expect(rotated.npub).not.toBe(current.npub)

    zeroise(current)
    zeroise(rotated)
    root.destroy()
  })

  it('cannot derive after the root is destroyed', () => {
    const root = fromNsec(new Uint8Array(32).fill(0x63))
    root.destroy()
    expect(() => deriveRendezvous(root)).toThrow('destroyed')
  })
})
