import { describe, it, expect } from 'vitest'
import { fromNsec, fromMnemonic, derive } from '../src/index.js'
import { derivePersona } from '../src/persona.js'
import { hexToBytes } from '../src/encoding.js'

/**
 * FROZEN TEST VECTORS — DO NOT MODIFY
 * Any conformant nsec-tree implementation must produce identical outputs.
 * Generated: 2026-03-18
 */
describe('frozen test vectors', () => {
  it('vector 1: nsec root 0x01-fill, purpose=social, index=0', () => {
    const root = fromNsec(new Uint8Array(32).fill(0x01))
    expect(root.masterPubkey).toBe('npub13sp7q3awvrqpa9p2svm7w8ghudghlnrraekwl7qh8w7j8747vjwskvzy2u')
    const child = derive(root, 'social', 0)
    expect(child.nsec).toBe('nsec1nr5ck3mw4v7zhj6syrj2v7dyrd6wa0anpgregnzrv8ysv5qjvhnsafv7mx')
    expect(child.npub).toBe('npub1ehzv62sphgdc4lfjnxmxcwx3xpp6rxktdp7rxnc9yl8l4arykdeqyfhrxy')
    expect(child.index).toBe(0)
    root.destroy()
  })

  it('vector 2: nsec root 0x01-fill, purpose=commerce, index=0', () => {
    const root = fromNsec(new Uint8Array(32).fill(0x01))
    const child = derive(root, 'commerce', 0)
    expect(child.nsec).toBe('nsec1l3329mrljxtscjzln469xf5drf4qwfe7aq5u73xgw6zl0p6c7p8sd6vumk')
    root.destroy()
  })

  it('vector 3: nsec root 0x01-fill, purpose=social, index=1', () => {
    const root = fromNsec(new Uint8Array(32).fill(0x01))
    const child = derive(root, 'social', 1)
    expect(child.nsec).toBe('nsec1sq4zl5cay4ghh54mndcedsmhumxz7vnj3wgkctp75uw2wqmk0yts3ny5vz')
    root.destroy()
  })

  it('vector 4: mnemonic root (abandon x11 + about), purpose=social, index=0', () => {
    const root = fromMnemonic(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    )
    expect(root.masterPubkey).toBe('npub186c5ke7vjsk98z8qx4ctdrggsl2qlu627g6xvg6yumrj5c5c6etqcfaclx')
    const child = derive(root, 'social', 0)
    expect(child.nsec).toBe('nsec17rnusheefhuryyhpprnq5l3zvpzhg24xm9n7588amun6uedvdtyqnpcsm4')
    root.destroy()
  })

  it('vector 5: path independence — mnemonic vs nsec produce different trees', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    const mnemonicRoot = fromMnemonic(mnemonic)
    // NIP-06 derived key from the same mnemonic (m/44'/1237'/0'/0/0)
    const nsecRoot = fromNsec(hexToBytes('5f29af3b9676180290e77a4efad265c4c2ff28a5302461f73597fda26bb25731'))
    expect(mnemonicRoot.masterPubkey).toBe('npub186c5ke7vjsk98z8qx4ctdrggsl2qlu627g6xvg6yumrj5c5c6etqcfaclx')
    expect(nsecRoot.masterPubkey).toBe('npub1fezyufqcfk9nqwamc6n6fwtm3yr2hrj8tc5xf0t3qs75tqvkz2hq40tnpd')
    expect(mnemonicRoot.masterPubkey).not.toBe(nsecRoot.masterPubkey)
    mnemonicRoot.destroy()
    nsecRoot.destroy()
  })

  it('vector 6: mnemonic root, persona=social (purpose nostr:persona:social), index=0', () => {
    const root = fromMnemonic(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    )
    const persona = derivePersona(root, 'social')
    expect(persona.identity.npub).toBe('npub1qdztfxg9z46k8qg4707n747y9rt7kl3f954lju2pneesmc3ypf2q83gm0e')
    expect(persona.identity.nsec).toBe('nsec1dlvcyslke58xf6h3l78h8jj2gh7d50ksjrejgfvryh0d0zzzsk7q3j90f2')
    // A persona is exactly the child at purpose `nostr:persona:<name>` (§3.1) —
    // and distinct from the raw purpose `social` (vector 1/4).
    const raw = derive(root, 'nostr:persona:social', 0)
    expect(raw.npub).toBe(persona.identity.npub)
    expect(derive(root, 'social', 0).npub).not.toBe(persona.identity.npub)
    root.destroy()
  })
})
